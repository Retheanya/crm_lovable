const express = require('express');
const {
  getFields,
  createField,
  updateField,
  deleteField,
  reorderFields
} = require('../controllers/customField.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { ROLES } = require('../constants');

const router = express.Router();

router.use(authenticate);

// Everyone can read fields
router.get('/', getFields);

// Only SUPER_ADMIN can manage custom fields
router.use(authorize(ROLES.SUPER_ADMIN));

router.post('/', createField);
router.post('/reorder', reorderFields);
router.route('/:id')
  .put(updateField)
  .delete(deleteField);

module.exports = router;
