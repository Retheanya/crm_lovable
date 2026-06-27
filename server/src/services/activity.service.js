const activityRepository = require('../repositories/activity.repository');
const leadRepository = require('../repositories/lead.repository');
const ErrorResponse = require('../utils/errorResponse');
const { ROLES } = require('../constants');

class ActivityService {
  async getActivities(leadId, options, user) {
    const lead = await leadRepository.findById(leadId);
    if (!lead) {
      throw new ErrorResponse('Lead not found', 404);
    }

    const assignedUserId = lead.assignedUser?._id?.toString() || lead.assignedUser?.toString();
    if (user.role === ROLES.USER && assignedUserId !== user._id.toString()) {
      throw new ErrorResponse('Not authorized to access activities of this lead', 403);
    }

    const total = await activityRepository.count({ leadId });
    const activities = await activityRepository.findByLeadId(leadId, options);

    return { total, activities };
  }

  async getAllActivities(options, user) {
    let query = {};

    // If USER role, only show activities for leads assigned to them
    if (user.role === ROLES.USER) {
      const userLeads = await leadRepository.find({ assignedUser: user._id }, { limit: 0 });
      query.leadId = { $in: userLeads.map(l => l._id) };
    }

    // Activity type filter
    if (options.activityType) {
      query.activityType = options.activityType;
    }

    // Date range filter
    if (options.fromDate || options.toDate) {
      query.createdAt = {};
      if (options.fromDate) {
        const from = new Date(options.fromDate);
        from.setHours(0, 0, 0, 0);
        query.createdAt.$gte = from;
      }
      if (options.toDate) {
        const to = new Date(options.toDate);
        to.setHours(23, 59, 59, 999);
        query.createdAt.$lte = to;
      }
    }

    const total = await activityRepository.countAll(query);
    const activities = await activityRepository.findAll(query, {
      skip: options.skip || 0,
      limit: options.limit || 200,
      sort: { createdAt: -1 }
    });

    return { total, activities };
  }
}

module.exports = new ActivityService();
