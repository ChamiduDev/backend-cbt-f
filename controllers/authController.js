const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

exports.register = async (req, res) => {
  try {
    const { role, fullName, hotelName, address, city_id, sub_area_id, phone, secondaryPhone, username, email, password, vehicles } = req.body;

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    user = new User({
      role,
      fullName,
      hotelName,
      address,
      city_id,
      sub_area_id,
      phone,
      secondaryPhone,
      username,
      email,
      password,
      vehicles,
      userStatus: 'pending', // New users are pending by default
    });

    await user.save();

    // Emit notification to admin dashboard
    if (req.io) {
      req.io.emit('newUserRegistration', {
        type: 'new_user',
        message: `New ${role} registration: ${fullName}`,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          userStatus: user.userStatus,
          registrationDate: user.registrationDate
        },
        timestamp: new Date().toISOString()
      });
      console.log('📢 Emitted new user registration notification');
    }

    res.json({ msg: 'Registration successful. Please wait for admin approval.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Backend Login: Received email:', email);

    let user = await User.findOne({ email });
    if (!user) {
      console.log('Backend Login: User not found for email:', email);
      return res.status(400).json({ msg: 'Invalid credentials' });
    }
    console.log('Backend Login: User found:', user.email);

    if (user.userStatus === 'rejected') {
      console.log('Backend Login: User rejected:', user.email);
      return res.status(401).json({ msg: 'Your account has been rejected. Please contact the admin for more information.' });
    }
    if (user.userStatus !== 'approved') {
      console.log('Backend Login: User not approved:', user.email);
      return res.status(401).json({ msg: 'Your account has not been approved yet. We will notify you as soon as it is approved.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Backend Login: Password mismatch for user:', user.email);
      return res.status(400).json({ msg: 'Invalid credentials' });
    }
    console.log('Backend Login: Password matched for user:', user.email);

    console.log('Backend Login: isAdmin status for user', user.email, ':', user.isAdmin);

    const payload = {
      user: {
        id: user.id,
        isAdmin: user.isAdmin,
        userStatus: user.userStatus,
        role: user.role
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token, isAdmin: user.isAdmin });
      }
    );

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const resetCode = user.getResetPasswordCode();
    await user.save({ validateBeforeSave: false });

    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Your password reset code is: ${resetCode}. This code is valid for 10 minutes.`

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Code',
        message,
      });

      res.status(200).json({ success: true, data: 'Email sent with reset code' });
    } catch (err) {
      console.error(err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ msg: 'Email could not be sent' });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.verifyResetCode = async (req, res) => {
  const { email, code } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');

    if (hashedCode !== user.resetPasswordToken || user.resetPasswordExpire < Date.now()) {
      return res.status(400).json({ msg: 'Invalid or expired code' });
    }

    // Clear the reset token fields after successful verification
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });

    // Generate a temporary JWT for password reset authorization
    const payload = {
      user: {
        id: user.id,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '5m' }, // Token valid for 5 minutes for password reset
      (err, token) => {
        if (err) throw err;
        res.json({ success: true, resetToken: token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.resetPassword = async (req, res) => {
  // This function will now expect a JWT in the header, not a token in the URL
  // The user ID will be extracted from the JWT by the auth middleware
  const { password } = req.body;

  try {
    // req.user.id comes from the auth middleware after verifying the JWT
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    user.password = password;
    await user.save();

    res.status(200).json({ success: true, data: 'Password Reset Success' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    console.log('Change Password: User ID:', req.user.id);
    console.log('Change Password: Current password provided:', !!currentPassword);
    console.log('Change Password: New password provided:', !!newPassword);

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ msg: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ msg: 'New password must be at least 6 characters long' });
    }

    // Get user from database
    const user = await User.findById(req.user.id);
    if (!user) {
      console.log('Change Password: User not found for ID:', req.user.id);
      return res.status(404).json({ msg: 'User not found' });
    }

    console.log('Change Password: User found:', user.email);

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    console.log('Change Password: Current password match:', isMatch);
    
    if (!isMatch) {
      return res.status(400).json({ msg: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    console.log('Change Password: New password hashed successfully');

    // Update password directly in database to bypass pre-save hook
    await User.updateOne(
      { _id: req.user.id },
      { password: hashedPassword }
    );
    console.log('Change Password: Password updated in database for user:', user.email);

    res.status(200).json({ msg: 'Password changed successfully' });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.verifyPassword = async (req, res) => {
  try {
    const { password } = req.body;

    // Validate input
    if (!password) {
      return res.status(400).json({ msg: 'Password is required' });
    }

    // Get user from database
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(400).json({ msg: 'Incorrect password' });
    }

    res.status(200).json({ msg: 'Password verified successfully' });
  } catch (err) {
    console.error('Error verifying password:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.verify = async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    res.json({ isAdmin: req.user.isAdmin, userStatus: req.user.userStatus });

  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { fullName, email, phone } = req.body;

    // Validate input
    if (!fullName || !email) {
      return res.status(400).json({ msg: 'Full name and email are required' });
    }

    // Check if email is already taken by another user
    const existingUser = await User.findOne({ 
      email: email, 
      _id: { $ne: req.user.id } 
    });
    
    if (existingUser) {
      return res.status(400).json({ msg: 'Email is already taken by another user' });
    }

    // Update user profile
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    user.fullName = fullName;
    user.email = email;
    if (phone) {
      user.phone = phone;
    }

    await user.save();

    // Return updated user data (without password)
    const userData = {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      userStatus: user.userStatus,
    };

    res.status(200).json({ 
      msg: 'Profile updated successfully',
      user: userData
    });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Get user's vehicles
exports.getVehicles = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    res.status(200).json({
      vehicles: user.vehicles || []
    });
  } catch (err) {
    console.error('Error getting vehicles:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Add a new vehicle
exports.addVehicle = async (req, res) => {
  try {
    const { model, number, year, totalPassengers, category, location } = req.body;

    // Validate required fields
    if (!model || !number || !year || !totalPassengers || !category || !location) {
      return res.status(400).json({ msg: 'All vehicle fields are required' });
    }

    // Validate location fields
    if (!location.city_id || !location.sub_area_id) {
      return res.status(400).json({ msg: 'City and sub-area are required' });
    }

    // Validate year
    const currentYear = new Date().getFullYear();
    if (year < 1900 || year > currentYear + 1) {
      return res.status(400).json({ msg: 'Invalid year' });
    }

    // Validate total passengers
    if (totalPassengers < 1 || totalPassengers > 50) {
      return res.status(400).json({ msg: 'Invalid number of passengers' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Check if vehicle number already exists for this user
    const existingVehicle = user.vehicles.find(v => v.number === number);
    if (existingVehicle) {
      return res.status(400).json({ msg: 'Vehicle with this number already exists' });
    }

    // Create new vehicle object
    const newVehicle = {
      model,
      number,
      year,
      totalPassengers,
      category,
      location: {
        city_id: location.city_id,
        sub_area_id: location.sub_area_id,
      }
    };

    // Add vehicle to user's vehicles array
    user.vehicles.push(newVehicle);
    await user.save();

    res.status(201).json({
      msg: 'Vehicle added successfully',
      vehicle: newVehicle
    });
  } catch (err) {
    console.error('Error adding vehicle:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Update a vehicle
exports.updateVehicle = async (req, res) => {
  try {
    const { vehicleIndex } = req.params;
    const { model, number, year, totalPassengers, category, location } = req.body;

    // Validate required fields
    if (!model || !number || !year || !totalPassengers || !category || !location) {
      return res.status(400).json({ msg: 'All vehicle fields are required' });
    }

    // Validate location fields
    if (!location.city_id || !location.sub_area_id) {
      return res.status(400).json({ msg: 'City and sub-area are required' });
    }

    // Validate year
    const currentYear = new Date().getFullYear();
    if (year < 1900 || year > currentYear + 1) {
      return res.status(400).json({ msg: 'Invalid year' });
    }

    // Validate total passengers
    if (totalPassengers < 1 || totalPassengers > 50) {
      return res.status(400).json({ msg: 'Invalid number of passengers' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Check if vehicle index is valid
    if (vehicleIndex < 0 || vehicleIndex >= user.vehicles.length) {
      return res.status(400).json({ msg: 'Invalid vehicle index' });
    }

    // Check if vehicle number already exists for another vehicle of this user
    const existingVehicle = user.vehicles.find((v, index) => 
      v.number === number && index !== parseInt(vehicleIndex)
    );
    if (existingVehicle) {
      return res.status(400).json({ msg: 'Vehicle with this number already exists' });
    }

    // Update vehicle
    user.vehicles[vehicleIndex] = {
      model,
      number,
      year,
      totalPassengers,
      category,
      location: {
        city_id: location.city_id,
        sub_area_id: location.sub_area_id,
      }
    };

    await user.save();

    res.status(200).json({
      msg: 'Vehicle updated successfully',
      vehicle: user.vehicles[vehicleIndex]
    });
  } catch (err) {
    console.error('Error updating vehicle:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Delete a vehicle
exports.deleteVehicle = async (req, res) => {
  try {
    const { vehicleIndex } = req.params;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Check if vehicle index is valid
    if (vehicleIndex < 0 || vehicleIndex >= user.vehicles.length) {
      return res.status(400).json({ msg: 'Invalid vehicle index' });
    }

    // Remove vehicle from array
    const deletedVehicle = user.vehicles.splice(vehicleIndex, 1)[0];
    await user.save();

    res.status(200).json({
      msg: 'Vehicle deleted successfully',
      deletedVehicle
    });
  } catch (err) {
    console.error('Error deleting vehicle:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

