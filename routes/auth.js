const express = require('express');
const router = express.Router();
const { register, login, getMe, forgotPassword, verifyResetCode, resetPassword, verify, changePassword, updateProfile, verifyPassword, getVehicles, addVehicle, updateVehicle, deleteVehicle } = require('../controllers/authController');
const auth = require('../middleware/authMiddleware');

// Test endpoint to check if the API is working
router.get('/test', (req, res) => {
  res.json({ message: 'Auth API is working!', timestamp: new Date().toISOString() });
});

router.post('/register', register);
router.post('/login', login);
router.get('/me', auth, getMe);
router.post('/forgotpassword', forgotPassword);
router.post('/verify-reset-code', verifyResetCode);
router.put('/resetpassword', auth, resetPassword);
router.put('/change-password', auth, changePassword);
router.post('/verify-password', auth, verifyPassword);
router.put('/profile', auth, updateProfile);
router.get('/verify', verify);

// Vehicle management routes
router.get('/vehicles', auth, getVehicles);
router.post('/vehicles', auth, addVehicle);
router.put('/vehicles/:vehicleIndex', auth, updateVehicle);
router.delete('/vehicles/:vehicleIndex', auth, deleteVehicle);

module.exports = router;