const SubArea = require('../models/SubArea');

exports.getSubAreas = async (req, res) => {
  try {
    console.log('SubAreas API called with city_id:', req.query.city_id);
    const subAreas = await SubArea.find({ city_id: req.query.city_id });
    console.log('Found sub areas:', subAreas.length);
    res.json(subAreas);
  } catch (err) {
    console.error('Error in getSubAreas:', err.message);
    res.status(500).send('Server error');
  }
};

exports.createSubArea = async (req, res) => {
  try {
    const { name, city_id } = req.body;
    const newSubArea = new SubArea({ name, city_id });
    await newSubArea.save();
    res.json(newSubArea);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.updateSubArea = async (req, res) => {
  try {
    const { name, city_id } = req.body;
    const subArea = await SubArea.findByIdAndUpdate(req.params.id, { name, city_id }, { new: true });
    if (!subArea) {
      return res.status(404).json({ msg: 'Sub-area not found' });
    }
    res.json(subArea);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.deleteSubArea = async (req, res) => {
  try {
    const subArea = await SubArea.findByIdAndDelete(req.params.id);
    if (!subArea) {
      return res.status(404).json({ msg: 'Sub-area not found' });
    }
    res.json({ msg: 'Sub-area removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};