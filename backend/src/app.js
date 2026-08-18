const express = require('express');
const cors = require('cors');
const { allowedOrigins, validateEnvironment } = require('./config/env');
const { securityHeaders } = require('./middleware/security');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const roleRoutes = require('./routes/roleRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const createAIPlanRoutes = require('./routes/aiPlanRoutes');
const createAdvisorNarrativeRoutes = require('./routes/advisorNarrativeRoutes');
const projectRoutes = require('./routes/projectRoutes');
const regulatoryRoutes = require('./routes/regulatoryRoutes');
const createAIPlanController = require('./controllers/aiPlanController');
const { createAIPlanService, isAIPlanProviderConfigured } = require('./config/ai');
const { createAdvisorNarrativeService } = require('./config/advisorNarrative');
const createAdvisorNarrativeController = require('./controllers/advisorNarrativeController');

validateEnvironment();

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);
app.use(securityHeaders);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins().includes(origin)) return callback(null, true);
    return callback(new Error('Origen no permitido por CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '25mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Inteli -Safe API funcionando' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/regulatory', regulatoryRoutes);

const aiPlanService = createAIPlanService();
const aiPlanController = createAIPlanController({ aiPlanService, isProviderConfigured: isAIPlanProviderConfigured });
app.use('/api/ai/plans', createAIPlanRoutes({ controller: aiPlanController }));

const advisorNarrativeService = createAdvisorNarrativeService();
app.use('/api/ai/advisor', createAdvisorNarrativeRoutes({
  controller: createAdvisorNarrativeController({ service: advisorNarrativeService }),
}));

app.use((_req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

app.use((err, _req, res, _next) => {
  console.error(err.stack || err);
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'La solicitud supera el tamaño permitido' });
  if (err.message === 'Origen no permitido por CORS') return res.status(403).json({ message: err.message });
  return res.status(500).json({ message: 'Error interno del servidor' });
});

module.exports = app;
