const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Account = require('../models/Account');
const { createDueRecurring } = require('../utils/recurring');
const config = require('../utils/config');
const HttpError = require('../utils/HttpError');
const catchAsync = require('../utils/catchAsync');

const makeToken = (user) =>
  jwt.sign({ id: user._id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

const publicUser = (user) => ({ id: user._id, name: user.name, email: user.email });

const register = catchAsync(async (req, res) => {
  const { name, email, password } = req.body;
  if (await User.findOne({ email })) {
    throw new HttpError(409, 'An account with this email already exists.');
  }
  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hash });
  await Account.create({ user: user._id, name: 'Cash', type: 'Cash' });
  res.status(201).json({ token: makeToken(user), user: publicUser(user) });
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  const ok = user && (await bcrypt.compare(password, user.password));
  if (!ok) throw new HttpError(401, 'Email or password is wrong.');
  // Catch up on missed recurring transactions. A failure here must not block login.
  await createDueRecurring(user._id).catch((err) => console.error('Recurring check failed:', err.message));
  res.json({ token: makeToken(user), user: publicUser(user) });
});

// JWTs are stateless, so the client deletes its token. This route exists so the client has one call to make.
const logout = (req, res) => {
  res.json({ message: 'Logged out.' });
};

const me = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new HttpError(401, 'Please log in.');
  res.json({ user: publicUser(user) });
});

module.exports = { register, login, logout, me };

