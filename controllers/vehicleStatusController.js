const mongoose = require('mongoose');
const VehicleStatus = require('../models/VehicleStatus');
const User = require('../models/User');
const City = require('../models/City');
const SubArea = require('../models/SubArea');

// Get all vehicle statuses for a user
exports.getVehicleStatuses = async (req, res) => {
  try {
    const vehicleStatuses = await VehicleStatus.find({ user: req.user.id })
      .populate('user', 'fullName')
      .populate('city_id', 'name')
      .populate('sub_area_id', 'name')
      .sort({ vehicleIndex: 1 });

    // Handle fromLocation and toLocation conversion
    for (let status of vehicleStatuses) {
      if (status.status === 'on_the_way') {
        // Handle fromLocation
        if (status.fromLocation && typeof status.fromLocation === 'string') {
          try {
            const fromCity = await City.findById(status.fromLocation);
            if (fromCity) {
              status = status.toObject(); // Convert to a plain object
              status.fromLocation = { _id: fromCity._id, name: fromCity.name };
            }
          } catch (err) {
            console.error('Error fetching fromLocation city:', err);
          }
        }

        // Handle toLocation
        if (status.toLocation && typeof status.toLocation === 'string') {
          try {
            const toCity = await City.findById(status.toLocation);
            if (toCity) {
              status = status.toObject(); // Convert to a plain object
              status.toLocation = { _id: toCity._id, name: toCity.name };
            }
          } catch (err) {
            console.error('Error fetching toLocation city:', err);
          }
        }
      }
    }

    console.log('Processed vehicleStatuses before sending:', vehicleStatuses);

    res.json(vehicleStatuses);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Set vehicle status
exports.setVehicleStatus = async (req, res) => {
  try {
    const { vehicleIndex, status, city_id, sub_area_id, fromLocation, toLocation } = req.body;

    // Validate that the user has a vehicle at this index
    const user = await User.findById(req.user.id);
    if (!user || !user.vehicles || vehicleIndex >= user.vehicles.length) {
      return res.status(400).json({ msg: 'Invalid vehicle index' });
    }

    // Validate status-specific requirements
    if (status === 'waiting' && (!city_id || !sub_area_id)) {
      return res.status(400).json({ msg: 'City and Sub Area are required for waiting status' });
    }

    if (status === 'on_the_way') {
      if (!fromLocation || !toLocation) {
        return res.status(400).json({ msg: 'From and To locations are required for on the way status' });
      }
      // Validate if fromLocation and toLocation are valid City IDs
      if (!mongoose.Types.ObjectId.isValid(fromLocation) || !mongoose.Types.ObjectId.isValid(toLocation)) {
        return res.status(400).json({ msg: 'From and To locations must be valid City IDs' });
      }
      const fromCity = await City.findById(fromLocation);
      const toCity = await City.findById(toLocation);
      if (!fromCity || !toCity) {
        return res.status(400).json({ msg: 'From or To location city not found' });
      }
    }

    // If setting a new status, clear any existing status for this vehicle
    await VehicleStatus.findOneAndDelete({ user: req.user.id, vehicleIndex });

    // Create new vehicle status
    const vehicleStatusData = {
      user: req.user.id,
      vehicleIndex,
      status,
    };

    if (status === 'waiting') {
      vehicleStatusData.city_id = city_id;
      vehicleStatusData.sub_area_id = sub_area_id;
    } else if (status === 'on_the_way') {
      vehicleStatusData.fromLocation = fromLocation;
      vehicleStatusData.toLocation = toLocation;
    }

    const vehicleStatus = new VehicleStatus(vehicleStatusData);
    await vehicleStatus.save();

    // Populate the response
    await vehicleStatus.populate('city_id', 'name');
    await vehicleStatus.populate('sub_area_id', 'name');
    await vehicleStatus.populate('fromLocation', 'name');
    await vehicleStatus.populate('toLocation', 'name');

    res.json(vehicleStatus);
  } catch (err) {
    console.error(err.message);
    if (err.code === 11000) {
      return res.status(400).json({ msg: 'Vehicle status already exists for this vehicle' });
    }
    res.status(500).send('Server error');
  }
};

// Clear vehicle status
exports.clearVehicleStatus = async (req, res) => {
  try {
    const { vehicleIndex } = req.params;

    const deletedStatus = await VehicleStatus.findOneAndDelete({
      user: req.user.id,
      vehicleIndex: parseInt(vehicleIndex),
    });

    if (!deletedStatus) {
      return res.status(404).json({ msg: 'Vehicle status not found' });
    }

    res.json({ msg: 'Vehicle status cleared successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Get vehicle status by index
exports.getVehicleStatusByIndex = async (req, res) => {
  try {
    const { vehicleIndex } = req.params;

    const vehicleStatus = await VehicleStatus.findOne({
      user: req.user.id,
      vehicleIndex: parseInt(vehicleIndex),
    })
      .populate('city_id', 'name')
      .populate('sub_area_id', 'name')
      .populate('fromLocation', 'name')
      .populate('toLocation', 'name');

    if (!vehicleStatus) {
      return res.status(404).json({ msg: 'Vehicle status not found' });
    }

    res.json(vehicleStatus);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Get all vehicle statuses for admin (all users)
exports.getAllVehicleStatuses = async (req, res) => {
  try {
    const vehicleStatuses = await VehicleStatus.find()
      .populate('user', 'fullName vehicles')
      .populate('city_id', 'name')
      .populate('sub_area_id', 'name')
      .sort({ createdAt: -1 });

    // Add vehicle information from user's vehicles array
    const statusesWithVehicleInfo = vehicleStatuses.map(status => {
      const user = status.user;
      const vehicleIndex = status.vehicleIndex;
      
      if (user && user.vehicles && user.vehicles[vehicleIndex]) {
        const vehicle = user.vehicles[vehicleIndex];
        return {
          ...status.toObject(),
          vehicle: {
            vehicleNumber: vehicle.vehicleNumber,
            vehicleName: vehicle.vehicleName
          }
        };
      }
      
      return status.toObject();
    });

    res.json(statusesWithVehicleInfo);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Get vehicle status counts for admin
exports.getVehicleStatusCounts = async (req, res) => {
  try {
    const counts = await VehicleStatus.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      waiting: 0,
      onTheWay: 0,
      notAvailable: 0
    };

    counts.forEach(item => {
      switch (item._id) {
        case 'waiting':
          result.waiting = item.count;
          break;
        case 'on_the_way':
          result.onTheWay = item.count;
          break;
        case 'not_available':
          result.notAvailable = item.count;
          break;
      }
    });

    res.json(result);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
}; 