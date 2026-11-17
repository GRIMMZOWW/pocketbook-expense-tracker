const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const HttpError = require('../utils/HttpError');
const catchAsync = require('../utils/catchAsync');
const { getBalances } = require('../utils/balances');

const list = catchAsync(async (req, res) => {
  const accounts = await Account.find({ user: req.user.id }).sort({ createdAt: 1 }).lean();
  const balances = await getBalances(req.user.id);
  const data = accounts.map((a) => ({ ...a, balance: balances[a._id.toString()] || 0 }));
  const total = Math.round(data.reduce((sum, a) => sum + a.balance, 0) * 100) / 100;
  res.json({ data, total });
});

const create = catchAsync(async (req, res) => {
  const account = await Account.create({ ...req.body, user: req.user.id });
  res.status(201).json({ ...account.toObject(), balance: 0 });
});

const update = catchAsync(async (req, res) => {
  const account = await Account.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!account) throw new HttpError(404, 'Account not found.');
  const balances = await getBalances(req.user.id);
  res.json({ ...account.toObject(), balance: balances[account._id.toString()] || 0 });
});

const remove = catchAsync(async (req, res) => {
  const account = await Account.findOne({ _id: req.params.id, user: req.user.id });
  if (!account) throw new HttpError(404, 'Account not found.');
  const used = await Transaction.exists({ user: req.user.id, account: account._id });
  if (used) throw new HttpError(409, 'This account has transactions. Delete or move them first.');
  await account.deleteOne();
  res.json({ message: 'Account deleted.' });
});

module.exports = { list, create, update, remove };
