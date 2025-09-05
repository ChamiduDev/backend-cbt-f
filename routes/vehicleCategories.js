const express = require('express');
const router = express.Router();
const { getVehicleCategories, createVehicleCategory, updateVehicleCategory, deleteVehicleCategory } = require('../controllers/vehicleCategoryController');
const auth = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');

router.get('/', getVehicleCategories); // Allow public access for getting categories
router.post('/', auth, admin, createVehicleCategory);
router.put('/:id', auth, admin, updateVehicleCategory);
router.delete('/:id', auth, admin, deleteVehicleCategory);

module.exports = router;