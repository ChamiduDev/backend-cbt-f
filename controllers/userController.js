const User = require('../models/User');

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('city_id', 'name')
      .populate('sub_area_id', 'name')
      .populate({
        path: 'vehicles',
        populate: [
          { path: 'location.city_id', select: 'name' },
          { path: 'location.sub_area_id', select: 'name' },
        ],
      });
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ msg: 'User not found' });
    }
    res.status(500).send('Server error');
  }
};

exports.getUsers = async (req, res) => {
  try {
    const { role, fullName, email, status } = req.query;
    const query = {};

    if (role) {
      query.role = role;
    }

    if (fullName) {
      query.fullName = { $regex: fullName, $options: 'i' }; // Case-insensitive search
    }

    if (email) {
      query.email = { $regex: email, $options: 'i' }; // Case-insensitive search
    }

    if (status) {
      query.userStatus = status; // Directly use the status for userStatus
    }

    const users = await User.find(query);
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.approveUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    user.userStatus = 'approved';
    await user.save();

    res.json({ msg: 'User approved successfully', user });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.rejectUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    user.userStatus = 'rejected';
    await user.save();

    res.json({ msg: 'User rejected successfully', user });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};
