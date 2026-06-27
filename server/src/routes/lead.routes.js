const express = require('express');
const multer = require('multer');
const {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  updateStatus,
  assignLead,
  deleteLead,
  logUpdate,
  downloadSampleCsv,
  uploadCsv,
  validateCsv,
  importCsv
} = require('../controllers/lead.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  createLeadSchema,
  updateLeadSchema,
  updateStatusSchema,
  assignLeadSchema
} = require('../validators/lead.validator');
const { ROLES } = require('../constants');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.use(authenticate);

// CSV Routes (must be before /:id routes)
router.get('/csv/sample', downloadSampleCsv);
router.post('/csv/upload', upload.single('file'), uploadCsv);
router.post('/csv/validate', validateCsv);
router.post('/csv/import', importCsv);

router.route('/')
  .post(authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), validate(createLeadSchema), createLead)
  .get(getLeads);

router.route('/:id')
  .get(getLeadById)
  .put(validate(updateLeadSchema), updateLead)
  .delete(authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), deleteLead);

router.patch('/:id/status', validate(updateStatusSchema), updateStatus);
router.patch('/:id/assign', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), validate(assignLeadSchema), assignLead);
router.post('/:id/log-update', logUpdate);

module.exports = router;
