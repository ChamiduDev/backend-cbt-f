const express = require('express');
const router = express.Router();
const { getTermsAndConditions, updateTermsAndConditions } = require('../controllers/termsAndConditionsController');
const auth = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');

// @route    GET api/terms-and-conditions
// @desc     Get Terms and Conditions
// @access   Public
router.get('/', getTermsAndConditions);

// @route    PUT api/terms-and-conditions
// @desc     Update Terms and Conditions
// @access   Private (Admin only)
router.put('/', auth, admin, updateTermsAndConditions);

module.exports = router;