const express = require('express');
const router = express.Router();
const { getSubAreas, createSubArea, updateSubArea, deleteSubArea } = require('../controllers/subAreaController');

router.get('/', getSubAreas);
router.post('/', createSubArea);
router.put('/:id', updateSubArea);
router.delete('/:id', deleteSubArea);

module.exports = router;