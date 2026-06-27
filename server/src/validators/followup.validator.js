const Joi = require('joi');
const { FOLLOW_UP_STATUS } = require('../constants');

const createFollowUpSchema = Joi.object({
  followUpDate: Joi.date().iso().required(),
  notes: Joi.string().required()
});

const updateFollowUpSchema = Joi.object({
  status: Joi.string().valid(...Object.values(FOLLOW_UP_STATUS)).optional(),
  notes: Joi.string().optional(),
  followUpDate: Joi.date().iso().optional()
});

module.exports = {
  createFollowUpSchema,
  updateFollowUpSchema
};
