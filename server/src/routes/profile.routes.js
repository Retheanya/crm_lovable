const express = require('express');
const { getProfile, updateProfile, changePassword } = require('../controllers/profile.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate);

router.route('/')
  .get(getProfile)
  .put(updateProfile);

router.put('/change-password', changePassword);

module.exports = router;
