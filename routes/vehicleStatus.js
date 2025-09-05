const express = require('express');
const router = express.Router();
const {
  getVehicleStatuses,
  setVehicleStatus,
  clearVehicleStatus,
  getVehicleStatusByIndex,
  getAllVehicleStatuses,
  getVehicleStatusCounts,
} = require('../controllers/vehicleStatusController');
const auth = require('../middleware/authMiddleware');

// All other routes require authentication
router.use(auth);

// Get all vehicle statuses for the authenticated user
router.get('/', getVehicleStatuses);

// Set vehicle status
router.post('/', setVehicleStatus);

// Admin routes - get all vehicle statuses (must come before /:vehicleIndex)
router.get('/admin/all', getAllVehicleStatuses);

// Admin routes - get vehicle status counts
router.get('/admin/counts', getVehicleStatusCounts);

// Get vehicle status by index
router.get('/:vehicleIndex', getVehicleStatusByIndex);

// Clear vehicle status
router.delete('/:vehicleIndex', clearVehicleStatus);

module.exports = router;