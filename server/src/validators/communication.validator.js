const Joi = require('joi');
const { COMMUNICATION_TYPES } = require('../constants');

const createCommunicationSchema = Joi.object({
  type: Joi.string().valid(...Object.values(COMMUNICATION_TYPES)).required(),
  remarks: Joi.string().required()
});

module.exports = { createCommunicationSchema };
