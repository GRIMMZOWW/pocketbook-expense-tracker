const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const HttpError = require('../utils/HttpError');
const catchAsync = require('../utils/catchAsync');
const { EXPENSE_CATEGORIES, INCOME_CATEGORIES } = require('../utils/constants');

const defaults = [
  ...EXPENSE_CATEGORIES.map((name) => ({ name, type: 'Expense', isDefault: true })),
  ...INCOME_CATEGORIES.map((name) => ({ name, type: 'Income', isDefault: true })),
];

const list = catchAsync(async (req, res) => {
  const custom = await Category.find({ user: req.user.id }).sort({ name: 1 }).lean();
  const mine = custom.map((c) => ({ id: c._id, name: c.name, type: c.type, isDefault: false }));
  res.json({ data: [...defaults, ...mine] });
});

const create = catchAsync(async (req, res) => {
  const { name, type } = req.body;
  const clash = defaults.some((d) => d.type === type && d.name.toLowerCase() === name.toLowerCase());
  if (clash) throw new HttpError(409, `${name} is already a default ${type.toLowerCase()} category.`);
  const category = await Category.create({ name, type, user: req.user.id });
  res.status(201).json({ id: category._id, name, type, isDefault: false });
});

const remove = catchAsync(async (req, res) => {
  const category = await Category.findOne({ _id: req.params.id, user: req.user.id });
  if (!category) throw new HttpError(404, 'Category not found.');
  const used = await Transaction.exists({ user: req.user.id, type: category.type, category: category.name });
  if (used) throw new HttpError(409, 'Transactions use this category. Change them first.');
  await category.deleteOne();
  res.json({ message: 'Category deleted.' });
});

module.exports = { list, create, remove, defaults };
