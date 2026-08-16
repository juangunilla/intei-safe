const express = require('express');
const {
  getRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  roleValidation,
} = require('../controllers/roleController');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const validateMongoId = require('../middleware/validateMongoId');

const router = express.Router();

router.use(protect);
router.param('id', validateMongoId);

router.get('/', getRoles);
router.get('/:id', getRole);
router.post('/', authorize('admin'), roleValidation, validate, createRole);
router.put('/:id', authorize('admin'), roleValidation, validate, updateRole);
router.delete('/:id', authorize('admin'), deleteRole);

module.exports = router;
