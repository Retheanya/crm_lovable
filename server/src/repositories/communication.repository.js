const Communication = require('../models/Communication');

class CommunicationRepository {
  async create(data) {
    return await Communication.create(data);
  }

  async findByLeadId(leadId, options = {}) {
    const { skip = 0, limit = 10, sort = { createdAt: -1 } } = options;
    return await Communication.find({ leadId })
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit);
  }

  async count(query) {
    return await Communication.countDocuments(query);
  }
}

module.exports = new CommunicationRepository();
