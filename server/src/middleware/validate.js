const { AppError } = require('../utils/AppError');

// validate(schema, 'body' | 'query' | 'params')
// Replaces the request section with the parsed (coerced, stripped) value.
const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    const first = details[0];
    return next(new AppError(first ? `${first.field ? `${first.field}: ` : ''}${first.message}` : 'Invalid input', 400, details));
  }
  req[source] = result.data;
  next();
};

module.exports = validate;
