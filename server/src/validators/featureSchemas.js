const Joi = require('joi');

const month = Joi.string().pattern(/^\d{4}-(0[1-9]|1[0-2])$/).messages({
  'string.pattern.base': 'month must look like 2026-11',
});

const budget = Joi.object({
  month: month.required(),
  amount: Joi.number().min(1).max(1e9).precision(2).required(),
  category: Joi.string().trim().max(30).allow('').default(''),
});

const budgetQuery = Joi.object({ month });

const goal = Joi.object({
  name: Joi.string().trim().min(1).max(60).required(),
  targetAmount: Joi.number().min(1).max(1e9).precision(2).required(),
  targetDate: Joi.date().iso().allow(null, '').default(null),
});

const contribute = Joi.object({
  amount: Joi.number().positive().max(1e9).precision(2).required(),
});

const analyticsQuery = Joi.object({
  range: Joi.string().valid('week', 'month', '3months', 'year').default('month'),
});

module.exports = { budget, budgetQuery, goal, contribute, analyticsQuery };
