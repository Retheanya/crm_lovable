const Activity = require('../models/Activity');

class ActivityRepository {
  async create(data) {
    return await Activity.create(data);
  }

  async findByLeadId(leadId, options = {}) {
    const { skip = 0, limit = 10, sort = { createdAt: -1 } } = options;
    return await Activity.find({ leadId })
      .populate('performedBy', 'name email')
      .populate('previousUser', 'name email')
      .populate('newUser', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit);
  }

  async count(query) {
    return await Activity.countDocuments(query);
  }

  async findRecent(query = {}, limit = 10) {
    return await Activity.find(query)
      .populate('performedBy', 'name email')
      .populate('leadId', 'leadName companyName')
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  async findAll(query = {}, options = {}) {
    const { skip = 0, limit = 50, sort = { createdAt: -1 } } = options;
    return await Activity.find(query)
      .populate('performedBy', 'name email')
      .populate('leadId', 'leadName companyName')
      .populate('newUser', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit);
  }

  async countAll(query = {}) {
    return await Activity.countDocuments(query);
  }
}

module.exports = new ActivityRepository();
