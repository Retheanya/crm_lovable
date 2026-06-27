const LeadCustomField = require('../models/LeadCustomField');

exports.getFields = async (req, res) => {
  try {
    const fields = await LeadCustomField.find().sort({ order: 1 });
    res.json(fields);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createField = async (req, res) => {
  try {
    const { label, type, options, isRequired } = req.body;
    const count = await LeadCustomField.countDocuments();
    const field = new LeadCustomField({
      label,
      type,
      options: options || [],
      isRequired: !!isRequired,
      order: count
    });
    await field.save();
    res.status(201).json(field);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create field' });
  }
};

exports.updateField = async (req, res) => {
  try {
    const { id } = req.params;
    const field = await LeadCustomField.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!field) {
      return res.status(404).json({ error: 'Field not found' });
    }
    res.json(field);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update field' });
  }
};

exports.deleteField = async (req, res) => {
  try {
    const { id } = req.params;
    const field = await LeadCustomField.findByIdAndDelete(id);
    if (!field) {
      return res.status(404).json({ error: 'Field not found' });
    }
    res.json({ message: 'Field deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete field' });
  }
};

exports.reorderFields = async (req, res) => {
  try {
    const { orderPayload } = req.body; // [{ id: '...', order: 0 }, ...]
    if (!Array.isArray(orderPayload)) {
      return res.status(400).json({ error: 'Invalid payload format' });
    }
    
    // Bulk update orders
    const bulkOps = orderPayload.map(item => ({
      updateOne: {
        filter: { _id: item.id },
        update: { order: item.order }
      }
    }));
    
    if (bulkOps.length > 0) {
      await LeadCustomField.bulkWrite(bulkOps);
    }
    
    res.json({ message: 'Order updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reorder fields' });
  }
};
