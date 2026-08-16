const { body } = require('express-validator');
const User = require('../models/User');
const Role = require('../models/Role');

const createUserValidation = [
  body('name').trim().notEmpty().withMessage('El nombre es requerido'),
  body('email').trim().isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('role').optional().isMongoId().withMessage('Rol inválido'),
];

const updateUserValidation = [
  body('name').optional().trim().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('email').optional().trim().isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password').optional().isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('role').optional().isMongoId().withMessage('Rol inválido'),
  body('isActive').optional().isBoolean().withMessage('Estado inválido'),
];

const getUsers = async (req, res) => {
  try {
    const users = await User.find().populate('role').sort({ createdAt: -1 });
    res.json({ users, total: users.length });
  } catch (error) {
    console.error('Error al obtener usuarios:', error.message);
    res.status(500).json({ message: 'Error al obtener usuarios' });
  }
};

const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('role');
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Error al obtener usuario:', error.message);
    res.status(500).json({ message: 'Error al obtener usuario' });
  }
};

const createUser = async (req, res) => {
  try {
    const { name, email, password, role: roleId, isActive } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'El email ya está registrado' });
    }

    const role = roleId ? await Role.findById(roleId) : await Role.findOne({ name: 'user' });
    if (!role) {
      return res.status(400).json({ message: 'Rol no encontrado' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role._id,
      isActive: isActive !== undefined ? isActive : true,
    });

    const populatedUser = await User.findById(user._id).populate('role');
    res.status(201).json({ message: 'Usuario creado', user: populatedUser });
  } catch (error) {
    console.error('Error al crear usuario:', error.message);
    res.status(500).json({ message: 'Error al crear usuario' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { name, email, password, role: roleId, isActive } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'El email ya está en uso' });
      }
      user.email = email;
    }

    if (name) user.name = name;
    if (roleId) {
      const role = await Role.findById(roleId);
      if (!role) return res.status(400).json({ message: 'Rol no encontrado' });
      user.role = role._id;
    }
    if (isActive !== undefined) user.isActive = isActive;
    if (password) user.password = password;

    await user.save();
    const populatedUser = await User.findById(user._id).populate('role');
    res.json({ message: 'Usuario actualizado', user: populatedUser });
  } catch (error) {
    console.error('Error al actualizar usuario:', error.message);
    res.status(500).json({ message: 'Error al actualizar usuario' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'No puedes eliminar tu propio usuario' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Usuario eliminado' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error.message);
    res.status(500).json({ message: 'Error al eliminar usuario' });
  }
};

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  createUserValidation,
  updateUserValidation,
};
