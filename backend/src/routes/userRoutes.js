const express = require('express');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  createUserValidation,
  updateUserValidation,
} = require('../controllers/userController');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const validateMongoId = require('../middleware/validateMongoId');

const router = express.Router();

router.use(protect);
router.param('id', validateMongoId);

router.get('/', authorize('admin'), getUsers);
router.get('/:id', authorize('admin'), getUser);
router.post('/', authorize('admin'), createUserValidation, validate, createUser);
router.put('/:id', authorize('admin'), updateUserValidation, validate, updateUser);
router.delete('/:id', authorize('admin'), deleteUser);

module.exports = router;
