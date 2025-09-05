const express = require('express');
const router = express.Router();
const { getAllRequests, createRequest, updateRequestStatus, deleteRequest } = require('../controllers/requestController');
const auth = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');

// @route    GET api/requests
// @desc     Get all requests
// @access   Private (Admin only)
router.get('/', auth, admin, getAllRequests);

// @route    POST api/requests
// @desc     Create a request
// @access   Private
router.post('/', auth, createRequest);

// @route    PUT api/requests/:id
// @desc     Update request status
// @access   Private (Admin only)
router.put('/:id', auth, admin, updateRequestStatus);

// @route    DELETE api/requests/:id
// @desc     Delete a request
// @access   Private (Admin only)
router.delete('/:id', auth, admin, deleteRequest);

module.exports = router;
