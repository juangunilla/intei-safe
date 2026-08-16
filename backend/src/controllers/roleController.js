const { body } = require('express-validator');
const Role = require('../models/Role');
const User = require('../models/User');

const roleValidation = [
  body('name').trim().notEmpty().withMessage('El nombre es requerido'),
  body('description').optional().trim(),
  body('permissions').optional().isArray(),
];

const getRoles = async (req, res) => {
  try {
    const roles = await Role.find().sort({ name: 1 });
    res.json({ roles, total: roles.length });
  } catch (error) {
    console.error('Error al obtener roles:', error.message);
    res.status(500).json({ message: 'Error al obtener roles' });
  }
};

const getRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: 'Rol no encontrado' });
    }
    res.json({ role });
  } catch (error) {
    console.error('Error al obtener rol:', error.message);
    res.status(500).json({ message: 'Error al obtener rol' });
  }
};

const createRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;

    const existingRole = await Role.findOne({ name });
    if (existingRole) {
      return res.status(400).json({ message: 'El rol ya existe' });
    }

    const role = await Role.create({ name, description, permissions: permissions || [] });
    res.status(201).json({ message: 'Rol creado', role });
  } catch (error) {
    console.error('Error al crear rol:', error.message);
    res.status(500).json({ message: 'Error al crear rol' });
  }
};

const updateRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({ message: 'Rol no encontrado' });
    }

    if (name && name !== role.name) {
      const existingRole = await Role.findOne({ name });
      if (existingRole) {
        return res.status(400).json({ message: 'El nombre del rol ya existe' });
      }
      role.name = name;
    }

    if (description !== undefined) role.description = description;
    if (permissions) role.permissions = permissions;

    await role.save();
    res.json({ message: 'Rol actualizado', role });
  } catch (error) {
    console.error('Error al actualizar rol:', error.message);
    res.status(500).json({ message: 'Error al actualizar rol' });
  }
};

const deleteRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: 'Rol no encontrado' });
    }

    const usersWithRole = await User.countDocuments({ role: role._id });
    if (usersWithRole > 0) {
      return res.status(400).json({
        message: `No se puede eliminar. ${usersWithRole} usuario(s) tienen este rol`,
      });
    }

    await Role.findByIdAndDelete(req.params.id);
    res.json({ message: 'Rol eliminado' });
  } catch (error) {
    console.error('Error al eliminar rol:', error.message);
    res.status(500).json({ message: 'Error al eliminar rol' });
  }
};

module.exports = {
  getRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  roleValidation,
};
