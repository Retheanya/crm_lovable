const mongoose = require('mongoose');
const { COMMUNICATION_TYPES } = require('../constants');

const communicationSchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  type: {
    type: String,
    enum: Object.values(COMMUNICATION_TYPES),
    required: true
  },
  remarks: {
    type: String,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

communicationSchema.index({ leadId: 1 });

module.exports = mongoose.model('Communication', communicationSchema);
