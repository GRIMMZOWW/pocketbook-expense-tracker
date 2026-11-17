const mongoose = require('mongoose');
const { ACCOUNT_TYPES } = require('../utils/constants');

const accountSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    type: { type: String, enum: ACCOUNT_TYPES, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Account', accountSchema);
