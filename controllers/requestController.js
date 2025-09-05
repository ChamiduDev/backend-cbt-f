const Request = require('../models/Request');

// @route    GET api/requests
// @desc     Get all requests
// @access   Private (Admin only)
exports.getAllRequests = async (req, res) => {
  try {
    const requests = await Request.find().populate('user', 'fullName email');
    res.json(requests);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route    POST api/requests
// @desc     Create a request
// @access   Private
exports.createRequest = async (req, res) => {
  const { pickupLocation, dropoffLocation, vehicleType } = req.body;

  try {
    const newRequest = new Request({
      user: req.user.id,
      pickupLocation,
      dropoffLocation,
      vehicleType,
    });

    const request = await newRequest.save();
    res.json(request);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route    PUT api/requests/:id
// @desc     Update request status
// @access   Private (Admin only)
exports.updateRequestStatus = async (req, res) => {
  const { status } = req.body;

  try {
    let request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ msg: 'Request not found' });
    }

    request.status = status;
    await request.save();

    res.json(request);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route    DELETE api/requests/:id
// @desc     Delete a request
// @access   Private (Admin only)
exports.deleteRequest = async (req, res) => {
  try {
    await Request.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Request removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
