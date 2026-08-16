const PLACEHOLDER_SECRETS = new Set([
  'your_super_secret_jwt_key_change_in_production',
  'inteli_pde_jwt_secret_change_in_production',
]);

const validateEnvironment = () => {
  const required = ['MONGODB_URI', 'JWT_SECRET'];
  const missing = required.filter((name) => !process.env[name]?.trim());
  if (missing.length) throw new Error(`Faltan variables de entorno requeridas: ${missing.join(', ')}`);

  if (process.env.NODE_ENV === 'production') {
    if (PLACEHOLDER_SECRETS.has(process.env.JWT_SECRET) || process.env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET debe ser único y tener al menos 32 caracteres en producción');
    }
  }
};

const allowedOrigins = () => (process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

module.exports = { allowedOrigins, validateEnvironment };
