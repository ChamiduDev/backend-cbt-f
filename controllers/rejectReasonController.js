const RejectReason = require('../models/RejectReason');

// @route    GET api/reject-reasons
// @desc     Get all reject reasons
// @access   Private (Admin)
exports.getRejectReasons = async (req, res) => {
  try {
    const reasons = await RejectReason.find().sort({ createdAt: -1 });
    res.json(reasons);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route    POST api/reject-reasons
// @desc     Create a new reject reason
// @access   Private (Admin)
exports.createRejectReason = async (req, res) => {
  try {
    const { reason, category } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ msg: 'Reason is required' });
    }

    if (!category) {
      return res.status(400).json({ msg: 'Category is required' });
    }

    // Check if reason already exists
    const existingReason = await RejectReason.findOne({ 
      reason: { $regex: new RegExp(`^${reason.trim()}$`, 'i') } 
    });

    if (existingReason) {
      return res.status(400).json({ msg: 'This reason already exists' });
    }

    const newReason = new RejectReason({
      reason: reason.trim(),
      category
    });

    const savedReason = await newReason.save();
    res.status(201).json(savedReason);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route    PUT api/reject-reasons/:id
// @desc     Update a reject reason
// @access   Private (Admin)
exports.updateRejectReason = async (req, res) => {
  try {
    const { reason, category } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ msg: 'Reason is required' });
    }

    if (!category) {
      return res.status(400).json({ msg: 'Category is required' });
    }

    // Check if reason already exists (excluding current one)
    const existingReason = await RejectReason.findOne({ 
      reason: { $regex: new RegExp(`^${reason.trim()}$`, 'i') },
      _id: { $ne: req.params.id }
    });

    if (existingReason) {
      return res.status(400).json({ msg: 'This reason already exists' });
    }

    const updatedReason = await RejectReason.findByIdAndUpdate(
      req.params.id,
      {
        reason: reason.trim(),
        category,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!updatedReason) {
      return res.status(404).json({ msg: 'Reject reason not found' });
    }

    res.json(updatedReason);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route    PUT api/reject-reasons/:id/toggle
// @desc     Toggle active status of a reject reason
// @access   Private (Admin)
exports.toggleRejectReasonStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ msg: 'isActive must be a boolean value' });
    }

    const updatedReason = await RejectReason.findByIdAndUpdate(
      req.params.id,
      {
        isActive,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!updatedReason) {
      return res.status(404).json({ msg: 'Reject reason not found' });
    }

    res.json(updatedReason);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route    DELETE api/reject-reasons/:id
// @desc     Delete a reject reason
// @access   Private (Admin)
exports.deleteRejectReason = async (req, res) => {
  try {
    const reason = await RejectReason.findById(req.params.id);

    if (!reason) {
      return res.status(404).json({ msg: 'Reject reason not found' });
    }

    // Check if reason is being used (optional safety check)
    if (reason.usageCount > 0) {
      return res.status(400).json({ 
        msg: 'Cannot delete reason that has been used. Consider deactivating instead.' 
      });
    }

    await RejectReason.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Reject reason deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route    GET api/reject-reasons/active
// @desc     Get all active reject reasons (for riders to select from)
// @access   Private (Rider)
exports.getActiveRejectReasons = async (req, res) => {
  try {
    const reasons = await RejectReason.find({ isActive: true })
      .select('reason category')
      .sort({ category: 1, reason: 1 });
    
    res.json(reasons);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route    PUT api/reject-reasons/:id/increment-usage
// @desc     Increment usage count when reason is used
// @access   Private (System)
exports.incrementUsageCount = async (req, res) => {
  try {
    const updatedReason = await RejectReason.findByIdAndUpdate(
      req.params.id,
      {
        $inc: { usageCount: 1 },
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!updatedReason) {
      return res.status(404).json({ msg: 'Reject reason not found' });
    }

    res.json(updatedReason);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

