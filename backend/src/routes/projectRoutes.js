const express = require('express');
const controller = require('../controllers/projectController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const validateMongoId = require('../middleware/validateMongoId');

const router = express.Router();

router.use(protect);
router.param('id', validateMongoId);
router.get('/', controller.listProjectsValidation, validate, controller.listProjects);
router.post('/', controller.projectFieldsValidation, validate, controller.createProject);
router.get('/:id', controller.getProject);
router.put('/:id', controller.updateProjectValidation, validate, controller.updateProject);
router.delete('/:id', controller.deleteProject);
router.post('/:id/duplicate', controller.duplicateProject);

module.exports = router;
