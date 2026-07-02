const followupRepository = require('../repositories/followup.repository');
const leadRepository = require('../repositories/lead.repository');
const activityRepository = require('../repositories/activity.repository');
const ErrorResponse = require('../utils/errorResponse');
const { ACTIVITY_TYPES, LEAD_STATUS, ROLES } = require('../constants');

class FollowUpService {
  async addFollowUp(leadId, data, user) {
    const lead = await leadRepository.findById(leadId);
    if (!lead) {
      throw new ErrorResponse('Lead not found', 404);
    }

    const assignedUserId = lead.assignedUser?._id?.toString() || lead.assignedUser?.toString();
    if (user.role === ROLES.USER && assignedUserId !== user._id.toString()) {
      throw new ErrorResponse('Not authorized to add followup to this lead', 403);
    }

    const followUpData = {
      ...data,
      leadId,
      createdBy: user._id
    };

    const followUp = await followupRepository.create(followUpData);

    await activityRepository.create({
      leadId,
      activityType: ACTIVITY_TYPES.FOLLOWUP_ADDED,
      description: `Priority: ${followUpData.priority || 'MEDIUM'}\nScheduled: ${new Date(data.followUpDate).toLocaleString()}\nNotes:\n${data.notes || ''}`.trim(),
      performedBy: user._id
    });

    if (lead.status !== LEAD_STATUS.FOLLOW_UP) {
      await leadRepository.update(leadId, { status: LEAD_STATUS.FOLLOW_UP });
      await activityRepository.create({
        leadId,
        activityType: ACTIVITY_TYPES.STATUS_CHANGED,
        description: `Lead status auto-changed to ${LEAD_STATUS.FOLLOW_UP}`,
        performedBy: user._id
      });
    }

    return followUp;
  }

  async updateFollowUp(id, data, user) {
    const followUp = await followupRepository.findById(id);
    if (!followUp) {
      throw new ErrorResponse('Follow-up not found', 404);
    }

    const lead = await leadRepository.findById(followUp.leadId);
    const assignedUserId = lead.assignedUser?._id?.toString() || lead.assignedUser?.toString();
    if (user.role === ROLES.USER && assignedUserId !== user._id.toString()) {
      throw new ErrorResponse('Not authorized to update followup for this lead', 403);
    }

    const updatedFollowUp = await followupRepository.update(id, data);

    let descriptionLines = [];
    if (data.status === 'COMPLETED') {
      descriptionLines.push(`Priority: ${followUp.priority}`);
      descriptionLines.push(`Completed Date: ${new Date().toLocaleString()}`);
    } else if (data.status === 'CANCELLED') {
      descriptionLines.push(`Priority: ${followUp.priority}`);
      descriptionLines.push(`Scheduled Date: ${new Date(followUp.followUpDate).toLocaleString()}`);
      descriptionLines.push(`Cancellation status: Cancelled`);
    } else {
      let changed = false;
      if (data.followUpDate && new Date(data.followUpDate).getTime() !== new Date(followUp.followUpDate).getTime()) {
        descriptionLines.push(`${new Date(followUp.followUpDate).toLocaleString()} → ${new Date(data.followUpDate).toLocaleString()}`);
        changed = true;
      }
      if (data.priority && data.priority !== followUp.priority) {
        descriptionLines.push(`${followUp.priority} → ${data.priority}`);
        changed = true;
      }
      if (data.notes && data.notes !== followUp.notes) {
        descriptionLines.push(`Notes:\n${data.notes}`);
        changed = true;
      }
      if (!changed && data.status) {
        descriptionLines.push(`Status changed to ${data.status}`);
      }
    }
    const description = descriptionLines.join('\n');

    await activityRepository.create({
      leadId: followUp.leadId,
      activityType: ACTIVITY_TYPES.FOLLOWUP_UPDATED,
      description,
      performedBy: user._id
    });

    return updatedFollowUp;
  }

  async getFollowUps(query, options, user) {
    let dbQuery = {};

    if (user.role === ROLES.USER) {
      const userLeads = await leadRepository.find({ assignedUser: user._id }, { limit: 0 });
      const leadIds = userLeads.map(l => l._id);
      dbQuery.leadId = { $in: leadIds };
    }

    if (query.status) {
      dbQuery.status = query.status;
    }

    if (query.leadId) {
      dbQuery.leadId = query.leadId;
    }

    if (query.today) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      
      dbQuery.followUpDate = {
        $gte: startOfDay,
        $lte: endOfDay
      };
    }

    const total = await followupRepository.count(dbQuery);
    const followUps = await followupRepository.find(dbQuery, options);

    return { total, followUps };
  }
}

module.exports = new FollowUpService();
