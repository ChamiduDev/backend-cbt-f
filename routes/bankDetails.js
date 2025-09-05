const express = require('express');
const router = express.Router();
const BankDetails = require('../models/BankDetails');
const auth = require('../middleware/authMiddleware');

// Get current bank details (for riders to view)
router.get('/current', auth, async (req, res) => {
  try {
    const bankDetails = await BankDetails.findOne({ isActive: true })
      .populate('createdBy', 'fullName email')
      .populate('lastUpdatedBy', 'fullName email')
      .sort({ updatedAt: -1 });

    if (!bankDetails) {
      return res.status(404).json({ message: 'Bank details not found' });
    }

    res.json(bankDetails);
  } catch (error) {
    console.error('Error fetching bank details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all bank details (for admin)
router.get('/', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const bankDetails = await BankDetails.find()
      .populate('createdBy', 'fullName email')
      .populate('lastUpdatedBy', 'fullName email')
      .sort({ updatedAt: -1 });

    res.json(bankDetails);
  } catch (error) {
    console.error('Error fetching bank details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new bank details (admin only)
router.post('/', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const { accountNumber, bankName, branch, accountHolderName } = req.body;

    // Validate required fields
    if (!accountNumber || !bankName || !branch || !accountHolderName) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Deactivate any existing active bank details
    await BankDetails.updateMany({ isActive: true }, { isActive: false });

    // Create new bank details
    const bankDetails = new BankDetails({
      accountNumber,
      bankName,
      branch,
      accountHolderName,
      createdBy: req.user.id,
      lastUpdatedBy: req.user.id
    });

    await bankDetails.save();

    // Populate the response
    await bankDetails.populate([
      { path: 'createdBy', select: 'fullName email' },
      { path: 'lastUpdatedBy', select: 'fullName email' }
    ]);

    res.status(201).json(bankDetails);
  } catch (error) {
    console.error('Error creating bank details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update bank details (admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const { id } = req.params;
    const { accountNumber, bankName, branch, accountHolderName, isActive } = req.body;

    // Validate required fields
    if (!accountNumber || !bankName || !branch || !accountHolderName) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // If setting as active, deactivate other bank details
    if (isActive) {
      await BankDetails.updateMany({ isActive: true }, { isActive: false });
    }

    const bankDetails = await BankDetails.findByIdAndUpdate(
      id,
      {
        accountNumber,
        bankName,
        branch,
        accountHolderName,
        isActive: isActive !== undefined ? isActive : true,
        lastUpdatedBy: req.user.id
      },
      { new: true, runValidators: true }
    );

    if (!bankDetails) {
      return res.status(404).json({ message: 'Bank details not found' });
    }

    // Populate the response
    await bankDetails.populate([
      { path: 'createdBy', select: 'fullName email' },
      { path: 'lastUpdatedBy', select: 'fullName email' }
    ]);

    res.json(bankDetails);
  } catch (error) {
    console.error('Error updating bank details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete bank details (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const { id } = req.params;

    const bankDetails = await BankDetails.findByIdAndDelete(id);

    if (!bankDetails) {
      return res.status(404).json({ message: 'Bank details not found' });
    }

    res.json({ message: 'Bank details deleted successfully' });
  } catch (error) {
    console.error('Error deleting bank details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

