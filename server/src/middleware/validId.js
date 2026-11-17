const HttpError = require('../utils/HttpError');

const OBJECT_ID = /^[a-f\d]{24}$/i;

// Usage: router.get('/:id', validId(), handler). Bad ids get 404, same as "not found".
const validId = (param = 'id') => (req, res, next) => {
  if (!OBJECT_ID.test(req.params[param])) return next(new HttpError(404, 'Not found.'));
  next();
};

module.exports = validId;
