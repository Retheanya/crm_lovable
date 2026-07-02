const Joi = require('joi');
const { FOLLOW_UP_STATUS, FOLLOW_UP_PRIORITY } = require('../constants');

const createFollowUpSchema = Joi.object({
  followUpDate: Joi.date().iso().required(),
  notes: Joi.string().required(),
  priority: Joi.string().valid(...Object.values(FOLLOW_UP_PRIORITY)).optional()
});

const updateFollowUpSchema = Joi.object({
  status: Joi.string().valid(...Object.values(FOLLOW_UP_STATUS)).optional(),
  notes: Joi.string().optional(),
  followUpDate: Joi.date().iso().optional(),
  priority: Joi.string().valid(...Object.values(FOLLOW_UP_PRIORITY)).optional()
});

module.exports = {
  createFollowUpSchema,
  updateFollowUpSchema
};
