const express = require('express');
const {
  updateFollowUp,
  getFollowUps
} = require('../controllers/followup.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { updateFollowUpSchema } = require('../validators/followup.validator');

const router = express.Router();

router.use(authenticate);

// For /followups 
router.get('/', getFollowUps);
router.patch('/:id', validate(updateFollowUpSchema), updateFollowUp);

module.exports = router;
