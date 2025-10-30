// Placeholder request validator middleware
// Usage: validate(schema) -> returns middleware that validates req.body per schema
module.exports = function validate(schema) {
  return (req, res, next) => {
    if (!schema || typeof schema.validate !== "function") return next();
    const { error, value } = schema.validate(req.body, { abortEarly: false, allowUnknown: true, stripUnknown: true });
    if (error) return res.status(400).json({ msg: "Validation error", details: error.details });
    req.body = value;
    next();
  };
};
