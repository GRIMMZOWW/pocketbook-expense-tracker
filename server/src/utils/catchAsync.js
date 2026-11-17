// Wraps an async route handler so thrown errors reach the error middleware.
module.exports = (fn) => (req, res, next) => fn(req, res, next).catch(next);
