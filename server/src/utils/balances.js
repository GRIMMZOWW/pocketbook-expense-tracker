const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');

// Balance per account = income - expenses. Returns { [accountId]: balance }.
async function getBalances(userId) {
  const rows = await Transaction.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$account',
        balance: { $sum: { $cond: [{ $eq: ['$type', 'Income'] }, '$amount', { $multiply: ['$amount', -1] }] } },
      },
    },
  ]);
  const balances = {};
  rows.forEach((r) => {
    balances[r._id.toString()] = Math.round(r.balance * 100) / 100;
  });
  return balances;
}

module.exports = { getBalances };
