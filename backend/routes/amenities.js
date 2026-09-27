const express = require('express');
const Amenity = require('../models/Amenity');
const Property = require('../models/Property');
const { protect, requireRole } = require('../middleware/auth');
const { validateAmenity, validateAmenityAvailability, validateAmenityId } = require('../middleware/validation');

const router = express.Router();

// GET /api/amenities — tenant sees amenities for their property, owner sees amenities across their properties
router.get('/', protect, async (req, res) => {
  try {
    let amenities;
    if (req.user.role === 'tenant') {
      amenities = await Amenity.find({ property: req.user.property }).populate('property', 'name');
    } else {
      const properties = await Property.find({ owner: req.user._id }).select('_id');
      amenities = await Amenity.find({ property: { $in: properties.map((p) => p._id) } }).populate('property', 'name');
    }
    res.json(amenities);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch amenities.', error: err.message });
  }
});

// POST /api/amenities — owner adds an amenity to one of their properties
router.post('/', protect, requireRole('owner'), validateAmenity, async (req, res) => {
  try {
    const { name, propertyId, description, openTime, closeTime } = req.body;
    const property = await Property.findOne({ _id: propertyId, owner: req.user._id });
    if (!property) return res.status(403).json({ message: 'You do not manage this property.' });

    const amenity = await Amenity.create({ name, property: propertyId, description, openTime, closeTime });
    req.app.get('io').to(`property:${propertyId}`).emit('amenity:new', amenity);
    res.status(201).json(amenity);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create amenity.', error: err.message });
  }
});

// PATCH /api/amenities/:id/availability — owner takes an amenity in/out of service
router.patch('/:id/availability', protect, requireRole('owner'), validateAmenityAvailability, async (req, res) => {
  try {
    const { availabilityStatus } = req.body;
    const amenity = await Amenity.findById(req.params.id);
    if (!amenity) return res.status(404).json({ message: 'Amenity not found.' });

    const property = await Property.findOne({ _id: amenity.property, owner: req.user._id });
    if (!property) return res.status(403).json({ message: 'You do not manage this property.' });

    amenity.availabilityStatus = availabilityStatus;
    await amenity.save();

    req.app.get('io').to(`property:${amenity.property}`).emit('amenity:updated', amenity);
    res.json(amenity);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update availability.', error: err.message });
  }
});

// PATCH /api/amenities/:id — owner edits an amenity (name, description, openTime, closeTime)
router.patch('/:id', protect, requireRole('owner'), validateAmenityId, async (req, res) => {
  try {
    const { name, description, openTime, closeTime } = req.body;
    const amenity = await Amenity.findById(req.params.id);
    if (!amenity) return res.status(404).json({ message: 'Amenity not found.' });

    const property = await Property.findOne({ _id: amenity.property, owner: req.user._id });
    if (!property) return res.status(403).json({ message: 'You do not manage this property.' });

    if (name) amenity.name = name;
    if (description !== undefined) amenity.description = description;
    if (openTime) amenity.openTime = openTime;
    if (closeTime) amenity.closeTime = closeTime;

    await amenity.save();

    req.app.get('io').to(`property:${amenity.property}`).emit('amenity:updated', amenity);
    res.json(amenity);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update amenity.', error: err.message });
  }
});

// DELETE /api/amenities/:id — owner deletes an amenity
router.delete('/:id', protect, requireRole('owner'), validateAmenityId, async (req, res) => {
  try {
    const amenity = await Amenity.findById(req.params.id);
    if (!amenity) return res.status(404).json({ message: 'Amenity not found.' });

    const property = await Property.findOne({ _id: amenity.property, owner: req.user._id });
    if (!property) return res.status(403).json({ message: 'You do not manage this property.' });

    const propertyId = amenity.property;
    await amenity.deleteOne();

    req.app.get('io').to(`property:${propertyId}`).emit('amenity:deleted', { amenityId: req.params.id });
    res.json({ message: 'Amenity deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete amenity.', error: err.message });
  }
});

module.exports = router;
