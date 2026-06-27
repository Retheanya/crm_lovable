const communicationRepository = require('../repositories/communication.repository');
const leadRepository = require('../repositories/lead.repository');
const activityRepository = require('../repositories/activity.repository');
const ErrorResponse = require('../utils/errorResponse');
const { ACTIVITY_TYPES, LEAD_STATUS, ROLES } = require('../constants');

class CommunicationService {
  async addCommunication(leadId, data, user) {
    const lead = await leadRepository.findById(leadId);
    if (!lead) {
      throw new ErrorResponse('Lead not found', 404);
    }

    const assignedUserId = lead.assignedUser?._id?.toString() || lead.assignedUser?.toString();
    if (user.role === ROLES.USER && assignedUserId !== user._id.toString()) {
      throw new ErrorResponse('Not authorized to add communication to this lead', 403);
    }

    const communicationData = {
      ...data,
      leadId,
      createdBy: user._id
    };

    const communication = await communicationRepository.create(communicationData);

    await activityRepository.create({
      leadId,
      activityType: ACTIVITY_TYPES.COMMUNICATION_ADDED,
      description: `Added ${data.type} communication`,
      performedBy: user._id
    });

    // Business Logic: If first communication and status is NEW, change to CONTACTED
    const commCount = await communicationRepository.count({ leadId });
    if (commCount === 1 && lead.status === LEAD_STATUS.NEW) {
      await leadRepository.update(leadId, { status: LEAD_STATUS.CONTACTED });
      await activityRepository.create({
        leadId,
        activityType: ACTIVITY_TYPES.STATUS_CHANGED,
        description: `Lead status auto-changed to ${LEAD_STATUS.CONTACTED}`,
        performedBy: user._id
      });
    }

    return communication;
  }

  async getCommunications(leadId, options, user) {
    const lead = await leadRepository.findById(leadId);
    if (!lead) {
      throw new ErrorResponse('Lead not found', 404);
    }

    const assignedUserId = lead.assignedUser?._id?.toString() || lead.assignedUser?.toString();
    if (user.role === ROLES.USER && assignedUserId !== user._id.toString()) {
      throw new ErrorResponse('Not authorized to access communications of this lead', 403);
    }

    const total = await communicationRepository.count({ leadId });
    const communications = await communicationRepository.findByLeadId(leadId, options);

    return { total, communications };
  }
}

module.exports = new CommunicationService();
