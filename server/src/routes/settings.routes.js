const express = require('express');
const { getAll, getByCategory, create, update, remove, reorder } = require('../controllers/crmSetting.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate);

// GET /api/v1/settings           — all settings grouped by category (any authenticated user, for dropdowns)
router.get('/', getAll);

// GET /api/v1/settings/:category — filtered by category
router.get('/:category', getByCategory);

// SUPER_ADMIN only mutations
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);
router.post('/reorder', reorder);

module.exports = router;
