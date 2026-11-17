const HttpError = require('../utils/HttpError');

// Validates req[source] with a Joi schema. Unknown keys are dropped.
// The cleaned value replaces req[source], so handlers only see validated fields.
const validate = (schema, source = 'body') => (req, res, next) => {
  const { value, error } = schema.validate(req[source], {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });
  if (error) {
    const errors = {};
    error.details.forEach((d) => {
      const key = d.path.join('.') || 'body';
      if (!errors[key]) errors[key] = d.message.replace(/"/g, '');
    });
    const err = new HttpError(400, 'Some fields are not valid.');
    err.errors = errors;
    return next(err);
  }
  req[source] = value;
  next();
};

module.exports = validate;
