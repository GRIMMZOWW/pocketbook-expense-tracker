const config = require('../utils/config');

const notFound = (req, res) => {
  res.status(404).json({ message: 'Route not found.' });
};

// Central error handler. Never sends a stack trace in production.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message;
  let errors = err.errors;

  if (err.name === 'MulterError') {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'Attachment must be 1 MB or smaller.' : 'Attachment upload failed.';
    errors = { attachment: message };
  } else if (err.code === 11000) {
    status = 409;
    message = 'That already exists.';
  } else if (err.name === 'ValidationError' || err.name === 'CastError') {
    status = 400;
    message = 'Some fields are not valid.';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Request body is not valid JSON.';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'Request body is too large.';
  }

  if (status >= 500) {
    if (process.env.NODE_ENV !== 'test') console.error(err);
    if (config.isProduction) message = 'Something went wrong on the server.';
  }

  const body = { message };
  if (errors) body.errors = errors;
  if (status >= 500 && !config.isProduction) body.stack = err.stack;
  res.status(status).json(body);
};

module.exports = { notFound, errorHandler };
