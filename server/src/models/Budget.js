const mongoose = require('mongoose');

// category = '' means the overall monthly budget. Otherwise it is a per-category budget.
const budgetSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    month: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
    category: { type: String, default: '', trim: true },
    amount: { type: Number, required: true, min: 1 },
  },
  { timestamps: true }
);

budgetSchema.index({ user: 1, month: 1, category: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);
