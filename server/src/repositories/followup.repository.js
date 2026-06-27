const FollowUp = require('../models/FollowUp');

class FollowUpRepository {
  async create(data) {
    return await FollowUp.create(data);
  }

  async findById(id) {
    return await FollowUp.findById(id);
  }

  async update(id, updateData) {
    return await FollowUp.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    }).populate('createdBy', 'name email').populate('leadId');
  }

  async find(query, options = {}) {
    const { skip = 0, limit = 10, sort = { followUpDate: 1 } } = options;
    return await FollowUp.find(query)
      .populate('createdBy', 'name email')
      .populate({
        path: 'leadId',
        select: 'leadName companyName status'
      })
      .sort(sort)
      .skip(skip)
      .limit(limit);
  }

  async count(query) {
    return await FollowUp.countDocuments(query);
  }
}

module.exports = new FollowUpRepository();
