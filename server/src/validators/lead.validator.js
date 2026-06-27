const Joi = require('joi');

const createLeadSchema = Joi.object({
  leadName: Joi.string().required(),
  companyName: Joi.string().required(),
  email: Joi.string().email().optional().allow('', null),
  phoneNumber: Joi.string().required(),
  location: Joi.string().required(),
  status: Joi.string().optional(),
  source: Joi.string().required(),
  assignedUser: Joi.alternatives().try(
    Joi.string().hex().length(24),
    Joi.string().allow('', null)
  ).optional(),
  value: Joi.number().required(),
  notes: Joi.string().allow('').optional(),
  customFields: Joi.object().unknown().optional()
});

const updateLeadSchema = Joi.object({
  leadName: Joi.string().optional(),
  companyName: Joi.string().optional(),
  email: Joi.string().email().optional().allow('', null),
  phoneNumber: Joi.string().optional(),
  location: Joi.string().optional(),
  source: Joi.string().optional(),
  assignedUser: Joi.string().hex().length(24).optional().allow(null),
  value: Joi.number().optional(),
  notes: Joi.string().allow('').optional(),
  customFields: Joi.object().unknown().optional()
});

const updateStatusSchema = Joi.object({
  status: Joi.string().required()
});

const assignLeadSchema = Joi.object({
  assignedUser: Joi.string().hex().length(24).required()
});

module.exports = {
  createLeadSchema,
  updateLeadSchema,
  updateStatusSchema,
  assignLeadSchema
};
