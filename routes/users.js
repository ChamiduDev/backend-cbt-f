const express = require('express');
const router = express.Router();
const { getUsers, approveUser, rejectUser, getUserById } = require('../controllers/userController');
const auth = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');

router.get('/', auth, admin, getUsers);
router.put('/:id/approve', auth, admin, approveUser);
router.put('/:id/reject', auth, admin, rejectUser);
router.get('/:id', auth, admin, getUserById);

module.exports = router;
