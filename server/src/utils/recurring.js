const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');

const MAX_PER_RUN = 24;

// Adds one period to a date (UTC). Month-end days are clamped: Jan 31 + 1 month = Feb 28.
function addPeriod(date, frequency) {
  const d = new Date(date);
  if (frequency === 'Daily') d.setUTCDate(d.getUTCDate() + 1);
  else if (frequency === 'Weekly') d.setUTCDate(d.getUTCDate() + 7);
  else {
    const day = d.getUTCDate();
    const months = frequency === 'Yearly' ? 12 : 1;
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + months);
    const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(day, lastDay));
  }
  return d;
}

// Creates every missed occurrence for the user's recurring transactions (max 24 per run).
// Each occurrence is claimed by moving nextDate forward with a conditional update.
// If two requests race, only one update matches, so only one copy is created.
async function createDueRecurring(userId) {
  const now = new Date();
  const templates = await Transaction.find({
    user: userId,
    recurring: true,
    nextDate: mongoose.trusted({ $lte: now }),
  }).lean();

  let created = 0;
  for (const t of templates) {
    let due = t.nextDate;
    while (due <= now && created < MAX_PER_RUN) {
      const next = addPeriod(due, t.frequency);
      const claimed = await Transaction.findOneAndUpdate(
        { _id: t._id, user: userId, recurring: true, nextDate: due },
        { nextDate: next }
      );
      if (!claimed) break; // another request already took this occurrence
      await Transaction.create({
        user: userId,
        amount: t.amount,
        type: t.type,
        category: t.category,
        account: t.account,
        note: t.note,
        date: due,
        parent: t._id,
      });
      created += 1;
      due = next;
    }
    if (created >= MAX_PER_RUN) break;
  }
  return created;
}

module.exports = { createDueRecurring, addPeriod, MAX_PER_RUN };
