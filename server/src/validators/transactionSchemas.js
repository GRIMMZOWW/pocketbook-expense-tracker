const Joi = require('joi');
const { TX_TYPES, FREQUENCIES } = require('../utils/constants');

const objectId = Joi.string().hex().length(24);
const txDate = Joi.date().iso().min('2000-01-01').max('2100-01-01');

const base = {
  amount: Joi.number().positive().max(1e9).precision(2).required(),
  type: Joi.string().valid(...TX_TYPES).required(),
  category: Joi.string().trim().min(1).max(30).required(),
  account: objectId.required(),
  note: Joi.string().trim().max(200).allow('').default(''),
  recurring: Joi.boolean().default(false),
  frequency: Joi.when('recurring', {
    is: true,
    then: Joi.string().valid(...FREQUENCIES).required(),
    otherwise: Joi.any().strip(),
  }),
  removeAttachment: Joi.boolean().default(false),
};

// Create: date defaults to now. Update: date is required so an edit never resets it.
const transactionCreate = Joi.object({ ...base, date: txDate.default(() => new Date()) });
const transactionUpdate = Joi.object({ ...base, date: txDate.required() });

// Shared by the history list and the CSV export.
const transactionQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  type: Joi.string().valid(...TX_TYPES),
  category: Joi.string().trim().max(30),
  account: objectId,
  from: txDate,
  to: txDate.min(Joi.ref('from')),
  minAmount: Joi.number().min(0),
  maxAmount: Joi.number().min(Joi.ref('minAmount')),
  search: Joi.string().trim().max(50),
});

module.exports = { transactionCreate, transactionUpdate, transactionQuery };
