const app = require('../backend/src/index');
const connectDB = require('../backend/src/config/db');

let connectionPromise;

module.exports = async (req, res) => {
  try {
    if (!connectionPromise) connectionPromise = connectDB();
    await connectionPromise;
    return app(req, res);
  } catch (error) {
    console.error('Error inicializando API:', error);
    return res.status(500).json({ message: 'No se pudo inicializar la API' });
  }
};
