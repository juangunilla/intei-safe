const User = require('../models/User');
const Role = require('../models/Role');

const getDashboardStats = async (req, res) => {
  try {
    const [totalUsers, activeUsers, totalRoles, recentUsers] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      Role.countDocuments(),
      User.find().populate('role').sort({ createdAt: -1 }).limit(5),
    ]);

    res.json({
      stats: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        totalRoles,
      },
      recentUsers,
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error.message);
    res.status(500).json({ message: 'Error al obtener estadísticas' });
  }
};

module.exports = { getDashboardStats };
