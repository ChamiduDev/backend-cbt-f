const City = require('../models/City');

exports.getCities = async (req, res) => {
  try {
    console.log('Cities API called');
    const cities = await City.find();
    console.log('Found cities:', cities.length);
    res.json(cities);
  } catch (err) {
    console.error('Error in getCities:', err.message);
    res.status(500).send('Server error');
  }
};

exports.createCity = async (req, res) => {
  try {
    const { name } = req.body;
    const newCity = new City({ name });
    await newCity.save();
    res.json(newCity);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.updateCity = async (req, res) => {
  try {
    const { name } = req.body;
    const city = await City.findByIdAndUpdate(req.params.id, { name }, { new: true });
    if (!city) {
      return res.status(404).json({ msg: 'City not found' });
    }
    res.json(city);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.deleteCity = async (req, res) => {
  try {
    const city = await City.findByIdAndDelete(req.params.id);
    if (!city) {
      return res.status(404).json({ msg: 'City not found' });
    }
    res.json({ msg: 'City removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};