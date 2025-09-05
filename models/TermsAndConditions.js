const mongoose = require('mongoose');

const TermsAndConditionsSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model('TermsAndConditions', TermsAndConditionsSchema);
