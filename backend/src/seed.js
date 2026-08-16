require('dotenv').config();
const mongoose = require('mongoose');
const Role = require('./models/Role');
const User = require('./models/User');
const connectDB = require('./config/db');

const seed = async () => {
  try {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DESTRUCTIVE_SEED !== 'true') {
      throw new Error('Seed destructivo bloqueado en producción. Definí ALLOW_DESTRUCTIVE_SEED=true de forma explícita.');
    }
    await connectDB();

    await Role.deleteMany({});
    await User.deleteMany({});

    const adminRole = await Role.create({
      name: 'admin',
      description: 'Administrador del sistema',
      permissions: ['users:read', 'users:write', 'roles:read', 'roles:write', 'dashboard:read'],
    });

    const userRole = await Role.create({
      name: 'user',
      description: 'Usuario estándar',
      permissions: ['dashboard:read'],
    });

    await User.create({
      name: 'Administrador',
      email: 'admin@intelipde.com',
      password: process.env.SEED_ADMIN_PASSWORD || 'admin123',
      role: adminRole._id,
      isActive: true,
    });

    await User.create({
      name: 'Usuario Demo',
      email: 'user@intelipde.com',
      password: process.env.SEED_USER_PASSWORD || 'user123',
      role: userRole._id,
      isActive: true,
    });

    console.log('Seed completado exitosamente');
    console.log('Usuarios demo creados. Las contraseñas no se muestran en logs.');
    process.exit(0);
  } catch (error) {
    console.error('Error en seed:', error);
    process.exit(1);
  }
};

seed();
