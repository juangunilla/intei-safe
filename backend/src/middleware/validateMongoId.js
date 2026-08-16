const mongoose = require('mongoose');

const validateMongoId = (req, res, next, value) => {
  if (!mongoose.isValidObjectId(value)) return res.status(400).json({ message: 'Identificador inválido' });
  return next();
};

module.exports = validateMongoId;
