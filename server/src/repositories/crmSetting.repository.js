const CrmSetting = require('../models/CrmSetting');

class CrmSettingRepository {
  async findByCategory(category) {
    return CrmSetting.find({ category }).sort({ order: 1, createdAt: 1 });
  }

  async findAll() {
    return CrmSetting.find({}).sort({ category: 1, order: 1 });
  }

  async findById(id) {
    return CrmSetting.findById(id);
  }

  async create(data) {
    // Auto-assign next order in category
    const maxOrder = await CrmSetting.findOne({ category: data.category }).sort({ order: -1 });
    data.order = maxOrder ? maxOrder.order + 1 : 0;
    return CrmSetting.create(data);
  }

  async update(id, data) {
    return CrmSetting.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async delete(id) {
    return CrmSetting.findByIdAndDelete(id);
  }

  async reorder(items) {
    // items: [{ id, order }]
    const ops = items.map(({ id, order }) =>
      CrmSetting.findByIdAndUpdate(id, { order })
    );
    return Promise.all(ops);
  }

  async count(query = {}) {
    return CrmSetting.countDocuments(query);
  }
}

module.exports = new CrmSettingRepository();
