const express = require('express');
const {
  addFollowUp,
  updateFollowUp,
  getFollowUps
} = require('../controllers/followup.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { createFollowUpSchema, updateFollowUpSchema } = require('../validators/followup.validator');

const router = express.Router({ mergeParams: true });

router.use(authenticate);

// These routes could be mounted on /leads/:id/followups or /followups
// For /leads/:id/followups (creation logic)
router.post('/', validate(createFollowUpSchema), addFollowUp);

module.exports = router;
