const express = require('express');
const router = express.Router();
const { getCities, createCity, updateCity, deleteCity } = require('../controllers/cityController');

router.get('/', getCities);
router.post('/', createCity);
router.put('/:id', updateCity);
router.delete('/:id', deleteCity);

module.exports = router;