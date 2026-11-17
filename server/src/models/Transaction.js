const mongoose = require('mongoose');
const { TX_TYPES, FREQUENCIES } = require('../utils/constants');

// A transaction with recurring=true is the "template". Each time it comes due,
// createDueRecurring copies it into a normal transaction (recurring=false, parent=template id).
const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0.01 },
    type: { type: String, enum: TX_TYPES, required: true },
    category: { type: String, required: true, trim: true, maxlength: 30 },
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    note: { type: String, trim: true, maxlength: 200, default: '' },
    date: { type: Date, required: true, default: Date.now },
    recurring: { type: Boolean, default: false },
    frequency: { type: String, enum: FREQUENCIES },
    nextDate: { type: Date },
    parent: { type: mongoose.Schema.Types.ObjectId },
    attachment: {
      data: { type: Buffer, select: false },
      contentType: String,
      name: String,
      size: Number,
    },
  },
  { timestamps: true }
);

transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, recurring: 1, nextDate: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
