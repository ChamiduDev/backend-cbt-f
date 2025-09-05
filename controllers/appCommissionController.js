const AppCommission = require('../models/AppCommission');

exports.getAppCommission = async (req, res) => {
  try {
    const appCommission = await AppCommission.findOne();
    if (!appCommission) {
      return res.status(404).json({ msg: 'App commission not found' });
    }
    res.json(appCommission);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.createOrUpdateAppCommission = async (req, res) => {
  const { type, value } = req.body;

  try {
    let appCommission = await AppCommission.findOne();

    if (appCommission) {
      // Update
      appCommission.type = type;
      appCommission.value = value;
      await appCommission.save();
    } else {
      // Create
      appCommission = new AppCommission({
        type,
        value,
      });
      await appCommission.save();
    }

    res.json(appCommission);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};
