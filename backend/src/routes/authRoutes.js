const express = require('express');
const {
  register,
  login,
  getMe,
  logout,
  registerValidation,
  loginValidation,
} = require('../controllers/authController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/security');

const router = express.Router();
const authLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20, message: 'Demasiados intentos. Intentá nuevamente más tarde.' });

router.post('/register', authLimiter, registerValidation, validate, register);
router.post('/login', authLimiter, loginValidation, validate, login);
router.get('/me', protect, getMe);
router.post('/logout', logout);

module.exports = router;
