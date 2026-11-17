const mongoose = require('mongoose');

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Builds a Mongo filter from Joi-validated query fields only.
// Operators ($gte etc.) are wrapped in mongoose.trusted because sanitizeFilter is on.
function buildFilter(userId, q) {
  const filter = { user: new mongoose.Types.ObjectId(userId) };

  if (q.type) filter.type = q.type;
  if (q.category) filter.category = q.category;
  if (q.account) filter.account = new mongoose.Types.ObjectId(q.account);

  if (q.from || q.to) {
    const range = {};
    if (q.from) range.$gte = q.from;
    if (q.to) {
      const end = new Date(q.to);
      end.setUTCHours(23, 59, 59, 999);
      range.$lte = end;
    }
    filter.date = mongoose.trusted(range);
  }

  if (q.minAmount !== undefined || q.maxAmount !== undefined) {
    const range = {};
    if (q.minAmount !== undefined) range.$gte = q.minAmount;
    if (q.maxAmount !== undefined) range.$lte = q.maxAmount;
    filter.amount = mongoose.trusted(range);
  }

  if (q.search) {
    const pattern = new RegExp(escapeRegex(q.search), 'i');
    const or = [{ note: pattern }, { category: pattern }];
    const asNumber = Number(q.search);
    if (Number.isFinite(asNumber)) or.push({ amount: asNumber });
    filter.$or = or;
  }

  return filter;
}

module.exports = { buildFilter, escapeRegex };
