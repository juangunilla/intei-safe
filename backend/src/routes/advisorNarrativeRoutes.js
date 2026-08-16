const express = require('express');
const { protect } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/security');

const createAdvisorNarrativeRoutes = ({ controller }) => {
  const router = express.Router();
  router.use(protect);
  router.use(createRateLimiter({ windowMs: 60 * 1000, max: 6, message: 'Límite temporal de redacción asistida alcanzado.' }));
  router.get('/narrative/capabilities', controller.capabilities);
  router.post('/narrative', controller.generate);
  return router;
};

module.exports = createAdvisorNarrativeRoutes;
