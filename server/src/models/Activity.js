const mongoose = require('mongoose');
const { ACTIVITY_TYPES } = require('../constants');

const activitySchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  activityType: {
    type: String,
    enum: Object.values(ACTIVITY_TYPES),
    required: true
  },
  description: {
    type: String,
    required: true
  },
  previousUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  newUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

activitySchema.index({ leadId: 1 });
activitySchema.index({ createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);
