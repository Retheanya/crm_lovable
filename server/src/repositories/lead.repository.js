const Lead = require('../models/Lead');

class LeadRepository {
  async create(leadData) {
    return await Lead.create(leadData);
  }

  async findById(id) {
    return await Lead.findById(id).populate('assignedUser', 'name email').populate('createdBy', 'name email');
  }

  async findByPhoneNumber(phoneNumber) {
    return await Lead.findOne({ phoneNumber });
  }

  async update(id, updateData) {
    return await Lead.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    }).populate('assignedUser', 'name email').populate('createdBy', 'name email');
  }

  async find(query, options = {}) {
    const { skip = 0, limit = 10, sort = { createdAt: -1 } } = options;
    return await Lead.find({ ...query, isDeleted: false })
      .populate('assignedUser', 'name email')
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit);
  }

  async count(query) {
    return await Lead.countDocuments({ ...query, isDeleted: false });
  }

  async delete(id) {
    return await Lead.findByIdAndDelete(id);
  }
}

module.exports = new LeadRepository();
