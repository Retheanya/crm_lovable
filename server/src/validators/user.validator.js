const Joi = require('joi');
const { ROLES } = require('../constants');

const createUserSchema = Joi.object({
  name: Joi.string().required().trim(),
  email: Joi.string().email().required().trim().lowercase(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid(...Object.values(ROLES)).default(ROLES.USER),
  isActive: Joi.boolean().default(true)
});

const updateUserSchema = Joi.object({
  name: Joi.string().trim(),
  email: Joi.string().email().trim().lowercase(),
  password: Joi.string().min(6),
  role: Joi.string().valid(...Object.values(ROLES)),
  isActive: Joi.boolean()
});

const updateUserStatusSchema = Joi.object({
  isActive: Joi.boolean().required()
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema
};
