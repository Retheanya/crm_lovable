const leadRepository = require('../repositories/lead.repository');
const activityRepository = require('../repositories/activity.repository');
const followupRepository = require('../repositories/followup.repository');
const communicationRepository = require('../repositories/communication.repository');
const ErrorResponse = require('../utils/errorResponse');
const { ACTIVITY_TYPES, ROLES, LEAD_STATUS, FOLLOW_UP_STATUS, COMMUNICATION_TYPES } = require('../constants');

class LeadService {
  async createLead(data, userId) {
    const existingLead = await leadRepository.findByPhoneNumber(data.phoneNumber);
    if (existingLead) {
      throw new ErrorResponse('Lead with this phone number already exists', 400);
    }

    // Sanitize empty assignedUser
    if (!data.assignedUser || data.assignedUser.toString().trim() === '') {
      data.assignedUser = null;
    }

    const leadData = { ...data, createdBy: userId };
    const lead = await leadRepository.create(leadData);

    await activityRepository.create({
      leadId: lead._id,
      activityType: ACTIVITY_TYPES.LEAD_CREATED,
      description: 'Lead was created',
      performedBy: userId
    });

    if (data.assignedUser) {
      await activityRepository.create({
        leadId: lead._id,
        activityType: ACTIVITY_TYPES.LEAD_ASSIGNED,
        description: 'Lead was assigned',
        newUser: data.assignedUser,
        performedBy: userId
      });
    }

    return await leadRepository.findById(lead._id);
  }

  async getLeads(query, options, user) {
    let dbQuery = {};

    if (user.role === ROLES.USER) {
      dbQuery.assignedUser = user._id;
    }

    if (query.status) {
      dbQuery.status = query.status;
    }

    if (query.search) {
      dbQuery.$text = { $search: query.search };
    }

    const total = await leadRepository.count(dbQuery);
    const leads = await leadRepository.find(dbQuery, options);

    return { total, leads };
  }

  async getLeadById(id, user) {
    const lead = await leadRepository.findById(id);
    if (!lead) {
      throw new ErrorResponse('Lead not found', 404);
    }

    const assignedUserId = lead.assignedUser?._id?.toString() || lead.assignedUser?.toString();
    if (user.role === ROLES.USER && assignedUserId !== user._id.toString()) {
      throw new ErrorResponse('Not authorized to access this lead', 403);
    }

    return lead;
  }

  async updateLead(id, data, user) {
    const lead = await this.getLeadById(id, user);

    const updatedLead = await leadRepository.update(id, data);

    await activityRepository.create({
      leadId: lead._id,
      activityType: ACTIVITY_TYPES.LEAD_UPDATED,
      description: 'Lead details were updated',
      performedBy: user._id
    });

    return updatedLead;
  }

  async updateStatus(id, status, user) {
    const lead = await this.getLeadById(id, user);

    if (status === LEAD_STATUS.FOLLOW_UP) {
      // Handled in controller if followUpDate is missing
    }

    const updatedLead = await leadRepository.update(id, { status });

    await activityRepository.create({
      leadId: lead._id,
      activityType: ACTIVITY_TYPES.STATUS_CHANGED,
      description: `Lead status changed to ${status}`,
      performedBy: user._id
    });

    if (status === LEAD_STATUS.CLOSED) {
       await activityRepository.create({
        leadId: lead._id,
        activityType: ACTIVITY_TYPES.LEAD_CLOSED,
        description: 'Lead was closed',
        performedBy: user._id
      });
    }

    return updatedLead;
  }

  async assignLead(id, newUserId, user) {
    if (user.role !== ROLES.SUPER_ADMIN) {
      throw new ErrorResponse('Not authorized to assign leads', 403);
    }

    const lead = await leadRepository.findById(id);
    if (!lead) {
      throw new ErrorResponse('Lead not found', 404);
    }

    const previousUser = lead.assignedUser;
    
    const updatedLead = await leadRepository.update(id, { assignedUser: newUserId });

    const activityType = previousUser ? ACTIVITY_TYPES.LEAD_REASSIGNED : ACTIVITY_TYPES.LEAD_ASSIGNED;
    const description = previousUser ? 'Lead was reassigned' : 'Lead was assigned';

    await activityRepository.create({
      leadId: lead._id,
      activityType,
      description,
      previousUser: previousUser ? previousUser._id : null,
      newUser: newUserId,
      performedBy: user._id
    });

    return updatedLead;
  }

  async deleteLead(id, user) {
    if (user.role !== ROLES.SUPER_ADMIN) {
      throw new ErrorResponse('Not authorized to delete leads', 403);
    }
    
    const lead = await leadRepository.findById(id);
    if (!lead) {
      throw new ErrorResponse('Lead not found', 404);
    }

    // Hard delete the lead
    await leadRepository.delete(id);

    // Clean up associated records from other collections so they don't clutter the database
    await require('../models/Activity').deleteMany({ leadId: id });
    await require('../models/FollowUp').deleteMany({ leadId: id });
    await require('../models/Communication').deleteMany({ leadId: id });
  }

  async logUpdate(id, data, user) {
    const lead = await this.getLeadById(id, user);

    const { actionTaken, summary, followUpDate, notes, status } = data;

    let detailLines = [];
    if (actionTaken) detailLines.push(`Action Taken: ${actionTaken}`);
    if (summary) detailLines.push(`Discussion Summary: ${summary}`);
    if (notes) detailLines.push(`Notes: ${notes}`);

    if (actionTaken) {
      // Map frontend action labels to valid COMMUNICATION_TYPES enum values
      const typeMap = {
        'Call': 'CALL',
        'WhatsApp': 'WHATSAPP',
        'Email': 'EMAIL',
        'Meeting': 'MEETING',
      };
      const mappedType = typeMap[actionTaken] || actionTaken.toUpperCase();
      const validTypes = Object.values(COMMUNICATION_TYPES);
      if (validTypes.includes(mappedType)) {
        await communicationRepository.create({
          leadId: lead._id,
          type: mappedType,
          remarks: summary || notes || actionTaken,
          createdBy: user._id
        });
      }
    }

    if (followUpDate) {
      await followupRepository.create({
        leadId: lead._id,
        followUpDate: new Date(followUpDate),
        notes: notes || summary || 'Created from activity update',
        status: FOLLOW_UP_STATUS.PENDING,
        createdBy: user._id
      });
      detailLines.push(`Next Follow-Up: ${new Date(followUpDate).toLocaleDateString()}`);
    }

    if (status && status !== lead.status) {
      await leadRepository.update(id, { status });
      detailLines.push(`Status changed to ${status}`);
      if (status === LEAD_STATUS.CLOSED) {
        await activityRepository.create({
          leadId: lead._id,
          activityType: ACTIVITY_TYPES.LEAD_CLOSED,
          description: 'Lead was closed',
          performedBy: user._id
        });
      }
    } else {
      // If no status provided but we created a followUp, it implies follow-up status
      if (followUpDate && lead.status !== LEAD_STATUS.FOLLOW_UP && lead.status !== LEAD_STATUS.CLOSED) {
         await leadRepository.update(id, { status: LEAD_STATUS.FOLLOW_UP });
         detailLines.push(`Status auto-changed to ${LEAD_STATUS.FOLLOW_UP}`);
      }
    }

    const description = detailLines.join(' | ');

    await activityRepository.create({
      leadId: lead._id,
      activityType: actionTaken ? ACTIVITY_TYPES.COMMUNICATION_ADDED : ACTIVITY_TYPES.LEAD_UPDATED,
      description: description || 'Lead updated',
      performedBy: user._id
    });

    return await leadRepository.findById(id);
  }

  async validateCsv(rows, user) {
    let validCount = 0;
    let duplicateCount = 0;
    const validatedRows = [];

    const LeadModel = require('../models/Lead');
    const existingLeads = await LeadModel.find({ isDeleted: false }, 'phoneNumber email');
    const existingPhones = new Set(existingLeads.map(l => l.phoneNumber).filter(Boolean));
    const existingEmails = new Set(existingLeads.map(l => l.email).filter(Boolean));

    for (const row of rows) {
      let isValid = true;
      let isDuplicate = false;
      const errors = [];

      const mappedRow = {
        leadName: row['Lead Name']?.trim(),
        companyName: row['Company Name']?.trim(),
        email: row['Email']?.trim() || undefined,
        phoneNumber: row['Phone Number']?.trim(),
        location: row['Location']?.trim(),
        status: row['Status']?.trim() || LEAD_STATUS.NEW,
        source: row['Source']?.trim() || 'Website',
        value: Number(row['Value'] || 0),
        notes: row['Notes']?.trim() || ''
      };

      if (!mappedRow.leadName) { isValid = false; errors.push('Missing Lead Name'); }
      if (!mappedRow.companyName) { isValid = false; errors.push('Missing Company Name'); }
      if (!mappedRow.phoneNumber) { isValid = false; errors.push('Missing Phone Number'); }
      if (!mappedRow.location) { isValid = false; errors.push('Missing Location'); }
      if (mappedRow.email && !/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(mappedRow.email)) {
        isValid = false; errors.push('Invalid Email format');
      }

      if (isValid) {
        if (existingPhones.has(mappedRow.phoneNumber)) {
          isDuplicate = true;
          isValid = false;
          errors.push('Duplicate Phone Number');
        } else if (mappedRow.email && existingEmails.has(mappedRow.email)) {
          isDuplicate = true;
          isValid = false;
          errors.push('Duplicate Email');
        }
      }

      if (isDuplicate) duplicateCount++;
      else if (isValid) validCount++;

      validatedRows.push({ ...mappedRow, originalRow: row, isValid, isDuplicate, errors });
    }

    return { validCount, duplicateCount, rows: validatedRows };
  }

  async importCsv(rows, user) {
    let imported = 0;
    let failed = 0;
    let duplicateCount = 0;

    for (const row of rows) {
      if (!row.isValid || row.isDuplicate) {
        if (row.isDuplicate) duplicateCount++;
        else failed++;
        continue;
      }
      
      try {
        const leadData = {
          leadName: row.leadName,
          companyName: row.companyName,
          email: row.email,
          phoneNumber: row.phoneNumber,
          location: row.location,
          status: row.status,
          source: row.source,
          value: row.value,
          notes: row.notes,
          createdBy: user._id,
          assignedUser: null
        };

        const lead = await leadRepository.create(leadData);

        await activityRepository.create({
          leadId: lead._id,
          activityType: ACTIVITY_TYPES.LEAD_CREATED,
          description: 'Lead was created via CSV Import',
          performedBy: user._id
        });
        
        imported++;
      } catch (err) {
        failed++;
        console.error('Failed to import row', err);
      }
    }

    return { total: rows.length, imported, failed, duplicateCount };
  }
}

module.exports = new LeadService();
