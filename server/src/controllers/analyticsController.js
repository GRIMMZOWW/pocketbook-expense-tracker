const Transaction = require('../models/Transaction');
const catchAsync = require('../utils/catchAsync');
const { oid, round } = require('../utils/stats');

const DAY = 24 * 60 * 60 * 1000;

// Date window for each range. "to" is exclusive. Month ranges follow calendar months (UTC).
function rangeDates(range) {
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const to = new Date(todayStart.getTime() + DAY);
  if (range === 'week') return { from: new Date(todayStart.getTime() - 6 * DAY), to, bucket: 'day' };
  const back = { month: 0, '3months': 2, year: 11 }[range];
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
  return { from, to, bucket: range === 'month' ? 'day' : 'month' };
}

// List every bucket label in the window so empty days/months show as zero.
function bucketLabels(from, to, bucket) {
  const labels = [];
  const d = new Date(from);
  while (d < to) {
    labels.push(d.toISOString().slice(0, bucket === 'day' ? 10 : 7));
    if (bucket === 'day') d.setUTCDate(d.getUTCDate() + 1);
    else d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return labels;
}

const get = catchAsync(async (req, res) => {
  const { range } = req.query;
  const { from, to, bucket } = rangeDates(range);
  const match = { user: oid(req.user.id), date: { $gte: from, $lt: to } };
  const format = bucket === 'day' ? '%Y-%m-%d' : '%Y-%m';

  const [totalsRows, categoryRows, trendRows] = await Promise.all([
    Transaction.aggregate([{ $match: match }, { $group: { _id: '$type', total: { $sum: '$amount' } } }]),
    Transaction.aggregate([
      { $match: { ...match, type: 'Expense' } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ]),
    Transaction.aggregate([
      { $match: match },
      { $group: { _id: { label: { $dateToString: { format, date: '$date' } }, type: '$type' }, total: { $sum: '$amount' } } },
    ]),
  ]);

  const sum = (type) => round((totalsRows.find((r) => r._id === type) || { total: 0 }).total);
  const income = sum('Income');
  const expenses = sum('Expense');

  const categories = categoryRows.map((r) => ({
    category: r._id,
    total: round(r.total),
    percent: expenses ? Math.round((r.total / expenses) * 1000) / 10 : 0,
  }));

  const trend = bucketLabels(from, to, bucket).map((label) => {
    const pick = (type) => round((trendRows.find((r) => r._id.label === label && r._id.type === type) || { total: 0 }).total);
    return { label, income: pick('Income'), expenses: pick('Expense') };
  });

  res.json({
    range,
    bucket,
    from: from.toISOString().slice(0, 10),
    to: new Date(to.getTime() - DAY).toISOString().slice(0, 10),
    income,
    expenses,
    netSavings: round(income - expenses),
    categories,
    trend,
  });
});

module.exports = { get };
