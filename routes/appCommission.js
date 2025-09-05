const express = require('express');
const router = express.Router();
const { getAppCommission, createOrUpdateAppCommission } = require('../controllers/appCommissionController');
const auth = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');

router.get('/', auth, admin, getAppCommission);
router.post('/', auth, admin, createOrUpdateAppCommission);

module.exports = router;
