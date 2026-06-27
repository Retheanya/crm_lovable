const mongoose = require('mongoose');
const { LEAD_STATUS } = require('../constants');

const leadSchema = new mongoose.Schema({
  leadName: {
    type: String,
    required: [true, 'Please add a lead name']
  },
  companyName: {
    type: String,
    required: [true, 'Please add a company name']
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  phoneNumber: {
    type: String,
    required: [true, 'Please add a phone number'],
    unique: true
  },
  location: {
    type: String,
    required: [true, 'Please add a location']
  },
  status: {
    type: String,
    default: 'NEW'
  },
  source: {
    type: String,
    default: 'Website'
  },
  assignedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  value: {
    type: Number,
    required: true,
    default: 0
  },
  notes: {
    type: String,
    default: ""
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customFields: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for search and sort
leadSchema.index({ leadName: 'text', companyName: 'text', phoneNumber: 'text' });
leadSchema.index({ status: 1 });
leadSchema.index({ assignedUser: 1 });
leadSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Lead', leadSchema);
