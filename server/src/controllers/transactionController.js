const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const Category = require('../models/Category');
const HttpError = require('../utils/HttpError');
const catchAsync = require('../utils/catchAsync');
const { buildFilter } = require('../utils/filters');
const { addPeriod, createDueRecurring } = require('../utils/recurring');
const { looksLikeType } = require('../utils/upload');
const { toCsv } = require('../utils/csv');
const { EXPENSE_CATEGORIES, INCOME_CATEGORIES } = require('../utils/constants');

const fieldError = (field, message, status = 400) => {
  const err = new HttpError(status, message);
  err.errors = { [field]: message };
  return err;
};

// The account must belong to this user, and the category must be a default or one of their own.
async function checkReferences(userId, { account, type, category }) {
  const account404 = await Account.exists({ _id: account, user: userId });
  if (!account404) throw new HttpError(404, 'Account not found.');
  const defaults = type === 'Income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  if (defaults.includes(category)) return;
  const custom = await Category.exists({ user: userId, type, name: category });
  if (!custom) throw fieldError('category', `${category} is not a ${type.toLowerCase()} category.`);
}

function withoutData(tx) {
  const obj = tx.toObject();
  if (obj.attachment) delete obj.attachment.data;
  return obj;
}

function readAttachment(file) {
  if (!file) return undefined;
  if (!looksLikeType(file.buffer, file.mimetype)) {
    throw fieldError('attachment', 'That file does not match its type.');
  }
  return { data: file.buffer, contentType: file.mimetype, name: file.originalname.slice(0, 100), size: file.size };
}

const list = catchAsync(async (req, res) => {
  await createDueRecurring(req.user.id);
  const { page, limit } = req.query;
  const filter = buildFilter(req.user.id, req.query);
  const [data, total] = await Promise.all([
    Transaction.find(filter)
      .sort({ date: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('account', 'name type')
      .lean(),
    Transaction.countDocuments(filter),
  ]);
  res.json({ data, page, limit, total, totalPages: Math.ceil(total / limit) });
});

const exportCsv = catchAsync(async (req, res) => {
  const filter = buildFilter(req.user.id, req.query);
  const data = await Transaction.find(filter).sort({ date: -1, _id: -1 }).populate('account', 'name').lean();
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="pocketbook-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(toCsv(data));
});

const getOne = catchAsync(async (req, res) => {
  const tx = await Transaction.findOne({ _id: req.params.id, user: req.user.id })
    .populate('account', 'name type')
    .lean();
  if (!tx) throw new HttpError(404, 'Transaction not found.');
  res.json(tx);
});

const create = catchAsync(async (req, res) => {
  const { removeAttachment, ...fields } = req.body;
  await checkReferences(req.user.id, fields);
  const tx = new Transaction({ ...fields, user: req.user.id });
  if (fields.recurring) tx.nextDate = addPeriod(fields.date, fields.frequency);
  const attachment = readAttachment(req.file);
  if (attachment) tx.attachment = attachment;
  await tx.save();
  await tx.populate('account', 'name type');
  res.status(201).json(withoutData(tx));
});

const update = catchAsync(async (req, res) => {
  const { removeAttachment, ...fields } = req.body;
  const tx = await Transaction.findOne({ _id: req.params.id, user: req.user.id });
  if (!tx) throw new HttpError(404, 'Transaction not found.');
  await checkReferences(req.user.id, fields);

  const { recurring, frequency, ...plain } = fields;
  tx.set(plain);

  // Copies made by a recurring transaction stay plain. Only the original can recur.
  if (!tx.parent) {
    const changed = !tx.recurring || tx.frequency !== frequency || tx.date.getTime() !== fields.date.getTime();
    tx.recurring = recurring;
    tx.frequency = recurring ? frequency : undefined;
    if (!recurring) tx.nextDate = undefined;
    else if (changed) tx.nextDate = addPeriod(fields.date, frequency);
  }

  const attachment = readAttachment(req.file);
  if (attachment) tx.attachment = attachment;
  else if (removeAttachment) tx.attachment = undefined;

  await tx.save();
  await tx.populate('account', 'name type');
  res.json(withoutData(tx));
});

const remove = catchAsync(async (req, res) => {
  const tx = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  if (!tx) throw new HttpError(404, 'Transaction not found.');
  res.json({ message: 'Transaction deleted.' });
});

// Attachments are only served here, and only to the owner.
const attachment = catchAsync(async (req, res) => {
  const tx = await Transaction.findOne({ _id: req.params.id, user: req.user.id }).select('+attachment.data');
  if (!tx || !tx.attachment || !tx.attachment.data) throw new HttpError(404, 'Attachment not found.');
  const safeName = (tx.attachment.name || 'attachment').replace(/[^\w.\- ]/g, '_');
  res.set('Content-Type', tx.attachment.contentType);
  res.set('Content-Disposition', `inline; filename="${safeName}"`);
  res.set('Cache-Control', 'private, no-store');
  res.send(tx.attachment.data);
});

module.exports = { list, exportCsv, getOne, create, update, remove, attachment };

