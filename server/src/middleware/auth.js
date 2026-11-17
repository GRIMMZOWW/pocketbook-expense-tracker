const jwt = require('jsonwebtoken');
const config = require('../utils/config');
const HttpError = require('../utils/HttpError');

// Reads "Authorization: Bearer <token>" and sets req.user.id.
const auth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next(new HttpError(401, 'Please log in.'));
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: payload.id };
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Your session expired. Please log in again.' : 'Please log in.';
    next(new HttpError(401, msg));
  }
};

module.exports = auth;
