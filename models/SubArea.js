const mongoose = require('mongoose');

const subAreaSchema = new mongoose.Schema({
  name: { type: String, required: true },
  city_id: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },
});

module.exports = mongoose.model('SubArea', subAreaSchema);
