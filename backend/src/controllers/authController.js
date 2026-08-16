const { body } = require('express-validator');
const User = require('../models/User');
const Role = require('../models/Role');
const generateToken = require('../utils/generateToken');

const authCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false',
  sameSite: 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

const sendSession = (res, status, message, user) => {
  const token = generateToken(user._id);
  res.cookie('inteli_session', token, authCookieOptions());
  return res.status(status).json({
    message,
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
};

const registerValidation = [
  body('name').trim().notEmpty().withMessage('El nombre es requerido'),
  body('email').trim().isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
];

const loginValidation = [
  body('email').trim().isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password').notEmpty().withMessage('La contraseña es requerida'),
];

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'El email ya está registrado' });
    }

    const userRole = await Role.findOne({ name: 'user' });
    if (!userRole) {
      return res.status(500).json({ message: 'Rol de usuario no configurado. Ejecuta el seed.' });
    }

    const user = await User.create({ name, email, password, role: userRole._id });
    const populatedUser = await User.findById(user._id).populate('role');

    return sendSession(res, 201, 'Usuario registrado exitosamente', populatedUser);
  } catch (error) {
    console.error('Error al registrar usuario:', error.message);
    res.status(500).json({ message: 'Error al registrar usuario' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password').populate('role');
    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Usuario desactivado' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    return sendSession(res, 200, 'Login exitoso', user);
  } catch (error) {
    console.error('Error al iniciar sesión:', error.message);
    res.status(500).json({ message: 'Error al iniciar sesión' });
  }
};

const getMe = async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      isActive: req.user.isActive,
      createdAt: req.user.createdAt,
    },
  });
};

const logout = (_req, res) => {
  const { maxAge: _maxAge, ...clearOptions } = authCookieOptions();
  res.clearCookie('inteli_session', clearOptions);
  return res.json({ message: 'Sesión cerrada' });
};

module.exports = {
  register,
  login,
  getMe,
  logout,
  registerValidation,
  loginValidation,
};
