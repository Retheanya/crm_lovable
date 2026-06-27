const express = require('express');
const authRoutes = require('./auth.routes');
const leadRoutes = require('./lead.routes');
const communicationRoutes = require('./communication.routes');
const followUpRoutes = require('./followup.routes');
const generalFollowUpRoutes = require('./followup.general.routes');
const dashboardRoutes = require('./dashboard.routes');
const { leadActivityRouter, globalActivityRouter } = require('./activity.routes');
const settingsRoutes = require('./settings.routes');
const customFieldRoutes = require('./customField.routes');
const userRoutes = require('./user.routes');

// Seed CRM defaults (idempotent) on first load
require('../services/crmSetting.service').seed().catch(err => console.error('Settings seed error:', err));

const router = express.Router();

const profileRoutes = require('./profile.routes');
const preferencesRoutes = require('./preferences.routes');

router.use('/auth', authRoutes);
router.use('/leads', leadRoutes);
router.use('/users', userRoutes);
router.use('/profile', profileRoutes);
router.use('/preferences', preferencesRoutes);

// Nested routes
leadRoutes.use('/:id/communications', communicationRoutes);
leadRoutes.use('/:id/followups', followUpRoutes);
leadRoutes.use('/:id/activities', leadActivityRouter);

router.use('/followups', generalFollowUpRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/activities', globalActivityRouter);
router.use('/settings', settingsRoutes);
router.use('/custom-fields', customFieldRoutes);

module.exports = router;

