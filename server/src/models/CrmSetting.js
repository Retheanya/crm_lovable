const mongoose = require('mongoose');

/**
 * CrmSetting stores configurable dropdown lists used throughout the CRM.
 * category: 'LEAD_STATUS' | 'LEAD_SOURCE' | 'ACTIVITY_TYPE'
 */
const crmSettingSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    enum: ['LEAD_STATUS', 'LEAD_SOURCE', 'ACTIVITY_TYPE'],
    index: true
  },
  label: {
    type: String,
    required: [true, 'Please provide a label'],
    trim: true
  },
  value: {
    type: String,
    required: [true, 'Please provide a value key'],
    trim: true,
    uppercase: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  },
  isSystem: {
    // System defaults cannot be deleted, only deactivated
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

crmSettingSchema.index({ category: 1, value: 1 }, { unique: true });
crmSettingSchema.index({ category: 1, order: 1 });

module.exports = mongoose.model('CrmSetting', crmSettingSchema);
