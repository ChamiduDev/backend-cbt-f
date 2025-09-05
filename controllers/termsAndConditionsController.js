const TermsAndConditions = require('../models/TermsAndConditions');

// @route    GET api/terms-and-conditions
// @desc     Get Terms and Conditions
// @access   Public
exports.getTermsAndConditions = async (req, res) => {
  try {
    const terms = await TermsAndConditions.findOne();
    if (!terms) {
      // If no terms exist, create a default empty one
      const newTerms = new TermsAndConditions({ content: '' });
      await newTerms.save();
      return res.json(newTerms);
    }
    res.json(terms);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route    PUT api/terms-and-conditions
// @desc     Update Terms and Conditions
// @access   Private (Admin only)
exports.updateTermsAndConditions = async (req, res) => {
  const { content } = req.body;

  try {
    let terms = await TermsAndConditions.findOne();

    if (!terms) {
      // If no terms exist, create one
      terms = new TermsAndConditions({ content });
    } else {
      // Otherwise, update existing terms
      terms.content = content;
    }

    await terms.save();
    res.json(terms);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};