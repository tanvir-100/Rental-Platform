const express = require('express');
const Property = require('../models/Property');
const { protect, requireRole } = require('../middleware/auth');
const { validateProperty, validateMongoId } = require('../middleware/validation');

const router = express.Router();

// GET /api/properties/mine — the current user's property (tenant) or owned properties (owner)
router.get('/mine', protect, async (req, res) => {
  try {
    if (req.user.role === 'owner') {
      const properties = await Property.find({ owner: req.user._id });
      return res.json(properties);
    }
    const property = await Property.findById(req.user.property);
    res.json(property ? [property] : []);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch properties.', error: err.message });
  }
});

// POST /api/properties — owner adds another property
router.post('/', protect, requireRole('owner'), validateProperty, async (req, res) => {
  try {
    const { name, address } = req.body;
    const property = await Property.create({ name, address, owner: req.user._id });
    res.status(201).json(property);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create property.', error: err.message });
  }
});

module.exports = router;
