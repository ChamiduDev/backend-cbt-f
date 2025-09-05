const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const vehicleSchema = new mongoose.Schema({
  model: { type: String, required: true },
  number: { type: String, required: true },
  year: { type: Number, required: true },
  totalPassengers: { type: Number, required: true },
  category: { type: String, required: true },
  location: {
    city_id: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },
    sub_area_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SubArea', required: true },
  },
});

const userSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['hotel', 'broker', 'ride', 'admin'],
    required: true,
  },
  fullName: { type: String, required: true },
  hotelName: {
    type: String,
    required: function () {
      return this.role === 'hotel' || this.role === 'broker';
    },
    default: function() {
      if (this.role === 'broker') {
        return 'I am broker';
      }
    }
  },
  address: { type: String, required: true },
  city_id: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },
  sub_area_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SubArea', required: true },
  phone: { type: String, required: true },
  secondaryPhone: { type: String },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  vehicles: [vehicleSchema],
  isAdmin: { type: Boolean, default: false },
  userStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  registrationDate: { type: Date, default: Date.now },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Generate and hash password token
userSchema.methods.getResetPasswordCode = function () {
  // Generate 6-digit code
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

  // Hash code and set to resetPasswordToken field (reusing field name for simplicity)
  this.resetPasswordToken = crypto.createHash('sha256').update(resetCode).digest('hex');

  // Set expire (e.g., 10 minutes)
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetCode;
};

module.exports = mongoose.model('User', userSchema);
