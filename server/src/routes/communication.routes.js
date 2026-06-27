const express = require('express');
const {
  addCommunication,
  getCommunications
} = require('../controllers/communication.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { createCommunicationSchema } = require('../validators/communication.validator');

const router = express.Router({ mergeParams: true });

router.use(authenticate);

router.route('/')
  .post(validate(createCommunicationSchema), addCommunication)
  .get(getCommunications);

module.exports = router;
