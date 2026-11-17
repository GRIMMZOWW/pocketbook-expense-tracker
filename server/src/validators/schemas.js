const Joi = require('joi');
const { ACCOUNT_TYPES, TX_TYPES } = require('../utils/constants');

const register = Joi.object({
  name: Joi.string().trim().min(1).max(60).required(),
  email: Joi.string().trim().lowercase().email().max(120).required(),
  password: Joi.string().min(8).max(72).required(),
});

const login = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
  password: Joi.string().max(72).required(),
});

const account = Joi.object({
  name: Joi.string().trim().min(1).max(40).required(),
  type: Joi.string().valid(...ACCOUNT_TYPES).required(),
});

const category = Joi.object({
  name: Joi.string().trim().min(1).max(30).required(),
  type: Joi.string().valid(...TX_TYPES).required(),
});

module.exports = { register, login, account, category };
