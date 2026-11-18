const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');

const CURRENCY = '₹';
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const oid = (id) => new mongoose.Types.ObjectId(id);
const round = (n) => Math.round(n * 100) / 100;
const formatMoney = (n) =>
  `${CURRENCY}${Math.abs(round(n)).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const currentMonth = () => new Date().toISOString().slice(0, 7);

// "2026-11" -> { from: 2026-11-01, to: 2026-12-01 (exclusive) }
function monthRange(month) {
  const [y, m] = month.split('-').map(Number);
  return { from: new Date(Date.UTC(y, m - 1, 1)), to: new Date(Date.UTC(y, m, 1)) };
}

const monthName = (month) => MONTH_NAMES[Number(month.slice(5, 7)) - 1];

// Expense totals in [from, to): { total, byCategory: { Food: 120, ... } }
async function expensesInRange(userId, from, to) {
  const rows = await Transaction.aggregate([
    { $match: { user: oid(userId), type: 'Expense', date: { $gte: from, $lt: to } } },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
  ]);
  const byCategory = {};
  let total = 0;
  rows.forEach((r) => {
    byCategory[r._id] = round(r.total);
    total += r.total;
  });
  return { total: round(total), byCategory };
}

// Turns a budget and what was spent into the numbers and warning the UI shows.
function budgetStatus(budget, spent, month) {
  const percentUsed = Math.round((spent / budget.amount) * 1000) / 10;
  const remaining = round(budget.amount - spent);
  const whole = Math.floor(percentUsed);
  const label = budget.category ? `${budget.category} budget for ${monthName(month)}` : `${monthName(month)} budget`;

  let level = 'ok';
  let message = null;
  if (percentUsed >= 100) {
    level = 'exceeded';
    message = `${budget.category ? `${budget.category} budget exceeded` : 'Budget exceeded'} by ${formatMoney(spent - budget.amount)}.`;
  } else if (percentUsed >= 90) {
    level = 'danger';
    message = `You have used ${whole}% of your ${label}.`;
  } else if (percentUsed >= 75) {
    level = 'warning';
    message = `You have used ${whole}% of your ${label}.`;
  } else if (percentUsed >= 50) {
    level = 'notice';
    message = `You have used ${whole}% of your ${label}.`;
  }

  return {
    id: budget._id,
    month,
    category: budget.category,
    amount: budget.amount,
    spent: round(spent),
    remaining,
    percentUsed,
    level,
    message,
  };
}

// Overall budget + category budgets for one month, each with status.
async function budgetsForMonth(userId, month, Budget) {
  const { from, to } = monthRange(month);
  const [budgets, spent] = await Promise.all([
    Budget.find({ user: userId, month }).sort({ category: 1 }).lean(),
    expensesInRange(userId, from, to),
  ]);
  const overallDoc = budgets.find((b) => b.category === '');
  const overall = overallDoc ? budgetStatus(overallDoc, spent.total, month) : null;
  const categories = budgets
    .filter((b) => b.category !== '')
    .map((b) => budgetStatus(b, spent.byCategory[b.category] || 0, month));
  return { month, spent: spent.total, overall, categories };
}

module.exports = { CURRENCY, oid, round, currentMonth, monthRange, expensesInRange, budgetStatus, budgetsForMonth };
