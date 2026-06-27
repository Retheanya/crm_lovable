const mongoose = require('mongoose');

const leadCustomFieldSchema = new mongoose.Schema({
  label: {
    type: String,
    required: [true, 'Please provide a field label'],
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['TEXT', 'TEXTAREA', 'NUMBER', 'EMAIL', 'PHONE', 'DATE', 'DROPDOWN', 'MULTI_SELECT', 'CHECKBOX', 'RADIO', 'URL'],
    default: 'TEXT'
  },
  options: {
    type: [String],
    default: []
  },
  isRequired: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

leadCustomFieldSchema.index({ order: 1 });

module.exports = mongoose.model('LeadCustomField', leadCustomFieldSchema);
