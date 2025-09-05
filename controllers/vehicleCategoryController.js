const VehicleCategory = require('../models/VehicleCategory');

exports.getVehicleCategories = async (req, res) => {
  try {
    const vehicleCategories = await VehicleCategory.find();
    res.json(vehicleCategories);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.createVehicleCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const newVehicleCategory = new VehicleCategory({ name });
    await newVehicleCategory.save();
    res.json(newVehicleCategory);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.updateVehicleCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const updated = await VehicleCategory.findByIdAndUpdate(
      req.params.id,
      { name },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ msg: 'Vehicle category not found' });
    }
    res.json(updated);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.deleteVehicleCategory = async (req, res) => {
  try {
    const deleted = await VehicleCategory.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ msg: 'Vehicle category not found' });
    }
    res.json({ msg: 'Vehicle category deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};