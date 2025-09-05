const express = require('express');
const router = express.Router();
const { createBid, acceptBid } = require('../controllers/bidController');
const auth = require('../middleware/authMiddleware');

// @route    POST api/bids
// @desc     Create a bid
// @access   Private (Rider)
router.post('/', auth, createBid);

// @route    PUT api/bids/:bidId/accept
// @desc     Accept a bid
// @access   Private (Hotel/Broker)
router.put('/:bidId/accept', auth, acceptBid);

module.exports = router;
