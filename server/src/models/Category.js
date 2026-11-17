const mongoose = require('mongoose');
const { TX_TYPES } = require('../utils/constants');

const categorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 30 },
    type: { type: String, enum: TX_TYPES, required: true },
  },
  { timestamps: true }
);

categorySchema.index({ user: 1, type: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
