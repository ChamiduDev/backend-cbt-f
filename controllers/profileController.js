const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Get admin profile
exports.getProfile = async (req, res) => {
  try {
    const adminId = req.user._id || req.user.id;
    
    const admin = await User.findById(adminId).select('-password');
    
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.json({
      username: admin.username,
      email: admin.email,
      role: admin.role,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt
    });
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update admin profile
exports.updateProfile = async (req, res) => {
  try {
    const adminId = req.user._id || req.user.id;
    const { username, email } = req.body;

    // Validate input
    if (!username || !email) {
      return res.status(400).json({ message: 'Username and email are required' });
    }

    // Check if email is already taken by another user
    const existingUser = await User.findOne({ 
      email: email, 
      _id: { $ne: adminId } 
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Email is already taken by another user' });
    }

    // Check if username is already taken by another user
    const existingUsername = await User.findOne({ 
      username: username, 
      _id: { $ne: adminId } 
    });

    if (existingUsername) {
      return res.status(400).json({ message: 'Username is already taken by another user' });
    }

    // Update admin profile
    const updatedAdmin = await User.findByIdAndUpdate(
      adminId,
      { 
        username: username.trim(),
        email: email.trim().toLowerCase(),
        updatedAt: new Date()
      },
      { new: true, select: '-password' }
    );

    if (!updatedAdmin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      profile: {
        username: updatedAdmin.username,
        email: updatedAdmin.email,
        role: updatedAdmin.role,
        updatedAt: updatedAdmin.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating admin profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Change admin password
exports.changePassword = async (req, res) => {
  try {
    const adminId = req.user._id || req.user.id;
    const { currentPassword, newPassword } = req.body;

    console.log('Profile Controller - Change Password: Full user object:', req.user);
    console.log('Profile Controller - Change Password: Admin ID:', adminId);
    console.log('Profile Controller - Change Password: Current password provided:', !!currentPassword);
    console.log('Profile Controller - Change Password: New password provided:', !!newPassword);

    // Validate input
    if (!currentPassword || !newPassword) {
      console.log('Profile Controller - Change Password: Missing required fields');
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      console.log('Profile Controller - Change Password: New password too short');
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    // Get admin with password
    const admin = await User.findById(adminId);
    
    if (!admin) {
      console.log('Profile Controller - Change Password: Admin not found');
      return res.status(404).json({ message: 'Admin not found' });
    }

    console.log('Profile Controller - Change Password: Admin found:', admin.email);

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, admin.password);
    console.log('Profile Controller - Change Password: Current password match:', isCurrentPasswordValid);
    
    if (!isCurrentPasswordValid) {
      console.log('Profile Controller - Change Password: Current password incorrect');
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Check if new password is different from current password
    const isSamePassword = await bcrypt.compare(newPassword, admin.password);
    console.log('Profile Controller - Change Password: New password same as current:', isSamePassword);
    
    if (isSamePassword) {
      console.log('Profile Controller - Change Password: New password same as current');
      return res.status(400).json({ message: 'New password must be different from current password' });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
    console.log('Profile Controller - Change Password: New password hashed successfully');

    // Update password
    await User.findByIdAndUpdate(adminId, {
      password: hashedNewPassword,
      updatedAt: new Date()
    });

    console.log('Profile Controller - Change Password: Password updated successfully for admin:', admin.email);

    res.json({
      message: 'Password changed successfully. Please log in again with your new password.'
    });
  } catch (error) {
    console.error('Profile Controller - Error changing admin password:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
