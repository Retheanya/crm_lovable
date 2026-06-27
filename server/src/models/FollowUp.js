const mongoose = require('mongoose');
const { FOLLOW_UP_STATUS } = require('../constants');

const followUpSchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  followUpDate: {
    type: Date,
    required: true
  },
  notes: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: Object.values(FOLLOW_UP_STATUS),
    default: FOLLOW_UP_STATUS.PENDING
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

followUpSchema.index({ leadId: 1 });
followUpSchema.index({ followUpDate: 1, status: 1 });

module.exports = mongoose.model('FollowUp', followUpSchema);
