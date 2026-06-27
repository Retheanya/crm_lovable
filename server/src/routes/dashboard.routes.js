const express = require('express');
const { getSummary, getReports } = require('../controllers/dashboard.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate);

router.get('/summary', getSummary);
router.get('/reports', getReports);

module.exports = router;
