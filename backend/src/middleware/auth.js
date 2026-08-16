const jwt = require('jsonwebtoken');
const User = require('../models/User');

const cookieValue = (header, name) => header?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  token ||= cookieValue(req.headers.cookie, 'inteli_session');

  if (!token) {
    return res.status(401).json({ message: 'No autorizado, token no proporcionado' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).populate('role');
    if (!req.user) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }
    if (!req.user.isActive) {
      return res.status(401).json({ message: 'Usuario desactivado' });
    }
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

const authorize = (...roleNames) => {
  return (req, res, next) => {
    if (!req.user?.role) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }
    if (!roleNames.includes(req.user.role.name)) {
      return res.status(403).json({ message: 'No tienes permisos para esta acción' });
    }
    next();
  };
};

module.exports = { protect, authorize };
