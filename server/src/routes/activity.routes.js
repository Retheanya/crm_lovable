const express = require('express');
const { getActivities, getAllActivities } = require('../controllers/activity.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router({ mergeParams: true });

router.use(authenticate);

router.get('/', getActivities);

// Global activity timeline route (not scoped to a lead)
const globalRouter = express.Router();
globalRouter.use(authenticate);
globalRouter.get('/', getAllActivities);

module.exports = { leadActivityRouter: router, globalActivityRouter: globalRouter };
