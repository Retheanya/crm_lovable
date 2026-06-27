const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const preferencesController = require('../controllers/preferences.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', preferencesController.getPreferences);
router.put('/', preferencesController.updatePreferences);

module.exports = router;
