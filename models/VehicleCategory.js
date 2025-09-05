const mongoose = require('mongoose');

const vehicleCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
});

module.exports = mongoose.model('VehicleCategory', vehicleCategorySchema);
