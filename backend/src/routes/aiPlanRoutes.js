const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createRateLimiter } = require('../middleware/security');

const createAIPlanRoutes = ({ controller }) => {
  const router = express.Router();
  router.use(protect);
  router.use(createRateLimiter({ windowMs: 60 * 1000, max: 10, message: 'Límite temporal de solicitudes de IA alcanzado.' }));
  router.get('/capabilities', controller.getCapabilities);
  router.post('/analyze-building', controller.analyzeBuilding);
  router.post('/generate-evacuation', controller.generateEvacuationPlan);
  router.post('/correct-evacuation', controller.correctEvacuationPlan);
  router.post(
    '/generate',
    [body('instruction').isString().trim().notEmpty().withMessage('instruction es obligatorio')],
    validate,
    controller.generatePlan
  );
  return router;
};

module.exports = createAIPlanRoutes;
