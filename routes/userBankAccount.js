const express = require('express');
const router = express.Router();
const UserBankAccount = require('../models/UserBankAccount');
const auth = require('../middleware/authMiddleware');

// Get user's bank account details
router.get('/', auth, async (req, res) => {
  try {
    const bankAccount = await UserBankAccount.findOne({ 
      user: req.user.id,
      isActive: true 
    });

    if (!bankAccount) {
      return res.status(404).json({ message: 'Bank account details not found' });
    }

    res.json(bankAccount);
  } catch (error) {
    console.error('Error fetching user bank account:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create or update user's bank account details
router.post('/', auth, async (req, res) => {
  try {
    const { bankName, branch, accountNumber, accountHolderName } = req.body;

    // Validate required fields
    if (!bankName || !branch || !accountNumber || !accountHolderName) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user already has bank account details
    const existingBankAccount = await UserBankAccount.findOne({ user: req.user.id });

    if (existingBankAccount) {
      // Update existing bank account
      existingBankAccount.bankName = bankName;
      existingBankAccount.branch = branch;
      existingBankAccount.accountNumber = accountNumber;
      existingBankAccount.accountHolderName = accountHolderName;
      existingBankAccount.isActive = true;

      await existingBankAccount.save();
      res.json(existingBankAccount);
    } else {
      // Create new bank account
      const bankAccount = new UserBankAccount({
        user: req.user.id,
        bankName,
        branch,
        accountNumber,
        accountHolderName,
        isActive: true
      });

      await bankAccount.save();
      res.status(201).json(bankAccount);
    }
  } catch (error) {
    console.error('Error creating/updating user bank account:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user's bank account details
router.put('/', auth, async (req, res) => {
  try {
    const { bankName, branch, accountNumber, accountHolderName } = req.body;

    // Validate required fields
    if (!bankName || !branch || !accountNumber || !accountHolderName) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const bankAccount = await UserBankAccount.findOneAndUpdate(
      { user: req.user.id },
      {
        bankName,
        branch,
        accountNumber,
        accountHolderName,
        isActive: true
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.json(bankAccount);
  } catch (error) {
    console.error('Error updating user bank account:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user's bank account details
router.delete('/', auth, async (req, res) => {
  try {
    const bankAccount = await UserBankAccount.findOneAndDelete({ user: req.user.id });

    if (!bankAccount) {
      return res.status(404).json({ message: 'Bank account details not found' });
    }

    res.json({ message: 'Bank account details deleted successfully' });
  } catch (error) {
    console.error('Error deleting user bank account:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all bank accounts (admin only)
router.get('/all', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const bankAccounts = await UserBankAccount.find()
      .populate('user', 'fullName email phone role')
      .sort({ updatedAt: -1 });

    res.json(bankAccounts);
  } catch (error) {
    console.error('Error fetching all bank accounts:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's bank account details by user ID (admin only)
router.get('/:userId', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const { userId } = req.params;
    const bankAccount = await UserBankAccount.findOne({ 
      user: userId,
      isActive: true 
    }).populate('user', 'fullName email phone role');

    if (!bankAccount) {
      return res.status(404).json({ message: 'Bank account details not found' });
    }

    res.json(bankAccount);
  } catch (error) {
    console.error('Error fetching user bank account by ID:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
