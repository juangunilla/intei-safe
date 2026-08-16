const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const controller = require('../controllers/regulatoryController');

const router = express.Router();
router.use(protect);
router.post('/analyze', [body('profile').isObject(), body('document').isObject()], validate, controller.analyze);

module.exports = router;
