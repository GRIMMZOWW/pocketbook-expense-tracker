const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const catchAsync = require('../utils/catchAsync');
const { createDueRecurring } = require('../utils/recurring');
const { oid, round, currentMonth, budgetsForMonth } = require('../utils/stats');

// Total balance = all income - all expenses. Same number as the sum of account balances.
async function totals(userId) {
  const rows = await Transaction.aggregate([
    { $match: { user: oid(userId) } },
    { $group: { _id: '$type', total: { $sum: '$amount' } } },
  ]);
  const sum = (type) => round((rows.find((r) => r._id === type) || { total: 0 }).total);
  const totalIncome = sum('Income');
  const totalExpenses = sum('Expense');
  return { totalIncome, totalExpenses, totalBalance: round(totalIncome - totalExpenses) };
}

// Income and expenses for each of the last 6 calendar months (months with no data show 0).
async function lastSixMonths(userId) {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
  const rows = await Transaction.aggregate([
    { $match: { user: oid(userId), date: { $gte: start } } },
    { $group: { _id: { month: { $dateToString: { format: '%Y-%m', date: '$date' } }, type: '$type' }, total: { $sum: '$amount' } } },
  ]);
  const months = [];
  for (let i = 0; i < 6; i += 1) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    const key = d.toISOString().slice(0, 7);
    const pick = (type) => round((rows.find((r) => r._id.month === key && r._id.type === type) || { total: 0 }).total);
    months.push({ month: key, income: pick('Income'), expenses: pick('Expense') });
  }
  return months;
}

const summary = catchAsync(async (req, res) => {
  const userId = req.user.id;
  await createDueRecurring(userId);
  const month = currentMonth();
  const [t, budgets, recent, chart] = await Promise.all([
    totals(userId),
    budgetsForMonth(userId, month, Budget),
    Transaction.find({ user: userId }).sort({ date: -1, _id: -1 }).limit(10).populate('account', 'name type').lean(),
    lastSixMonths(userId),
  ]);
  res.json({ ...t, month, budget: budgets.overall, monthSpent: budgets.spent, recent, chart });
});

module.exports = { summary };
