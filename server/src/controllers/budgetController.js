const Budget = require('../models/Budget');
const HttpError = require('../utils/HttpError');
const catchAsync = require('../utils/catchAsync');
const { currentMonth, budgetsForMonth } = require('../utils/stats');
const { EXPENSE_CATEGORIES } = require('../utils/constants');
const Category = require('../models/Category');

const list = catchAsync(async (req, res) => {
  const month = req.query.month || currentMonth();
  res.json(await budgetsForMonth(req.user.id, month, Budget));
});

// One overall budget per month (category ''), plus optional budgets per expense category.
const save = catchAsync(async (req, res) => {
  const { month, amount, category } = req.body;
  if (category && !EXPENSE_CATEGORIES.includes(category)) {
    const custom = await Category.exists({ user: req.user.id, type: 'Expense', name: category });
    if (!custom) {
      const err = new HttpError(400, `${category} is not an expense category.`);
      err.errors = { category: err.message };
      throw err;
    }
  }
  await Budget.findOneAndUpdate(
    { user: req.user.id, month, category },
    { amount },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
  res.json(await budgetsForMonth(req.user.id, month, Budget));
});

const remove = catchAsync(async (req, res) => {
  const budget = await Budget.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  if (!budget) throw new HttpError(404, 'Budget not found.');
  res.json({ message: 'Budget deleted.' });
});

module.exports = { list, save, remove };
