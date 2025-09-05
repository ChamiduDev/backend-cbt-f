const express = require('express');
const router = express.Router();
const SystemSettings = require('../models/SystemSettings');
const auth = require('../middleware/authMiddleware');

// Get all system settings (admin only)
router.get('/', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const settings = await SystemSettings.find()
      .populate('updatedBy', 'fullName email')
      .sort({ updatedAt: -1 });

    res.json(settings);
  } catch (error) {
    console.error('Error fetching system settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a specific system setting by key
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await SystemSettings.findOne({ key, isActive: true });

    if (!setting) {
      return res.status(404).json({ message: 'Setting not found' });
    }

    res.json(setting);
  } catch (error) {
    console.error('Error fetching system setting:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create or update system setting (admin only)
router.post('/', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const { key, value, description } = req.body;

    // Validate required fields
    if (!key || !value) {
      return res.status(400).json({ message: 'Key and value are required' });
    }

    // Check if setting already exists
    const existingSetting = await SystemSettings.findOne({ key });

    if (existingSetting) {
      // Update existing setting
      existingSetting.value = value;
      existingSetting.description = description || existingSetting.description;
      existingSetting.updatedBy = req.user.id;
      existingSetting.isActive = true;

      await existingSetting.save();
      
      // Populate the response
      await existingSetting.populate('updatedBy', 'fullName email');
      res.json(existingSetting);
    } else {
      // Create new setting
      const setting = new SystemSettings({
        key,
        value,
        description,
        updatedBy: req.user.id,
        isActive: true
      });

      await setting.save();
      
      // Populate the response
      await setting.populate('updatedBy', 'fullName email');
      res.status(201).json(setting);
    }
  } catch (error) {
    console.error('Error creating/updating system setting:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update system setting (admin only)
router.put('/:key', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const { key } = req.params;
    const { value, description, isActive } = req.body;

    // Validate required fields
    if (!value) {
      return res.status(400).json({ message: 'Value is required' });
    }

    const setting = await SystemSettings.findOneAndUpdate(
      { key },
      {
        value,
        description: description !== undefined ? description : undefined,
        isActive: isActive !== undefined ? isActive : true,
        updatedBy: req.user.id
      },
      { new: true, runValidators: true }
    );

    if (!setting) {
      return res.status(404).json({ message: 'Setting not found' });
    }

    // Populate the response
    await setting.populate('updatedBy', 'fullName email');
    res.json(setting);
  } catch (error) {
    console.error('Error updating system setting:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete system setting (admin only)
router.delete('/:key', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const { key } = req.params;
    const setting = await SystemSettings.findOneAndDelete({ key });

    if (!setting) {
      return res.status(404).json({ message: 'Setting not found' });
    }

    res.json({ message: 'Setting deleted successfully' });
  } catch (error) {
    console.error('Error deleting system setting:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
