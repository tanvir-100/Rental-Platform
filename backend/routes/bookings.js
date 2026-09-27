const express = require('express');
const mongoose = require('mongoose');
const Amenity = require('../models/Amenity');
const AmenityBooking = require('../models/AmenityBooking');
const Property = require('../models/Property');
const { protect, requireRole } = require('../middleware/auth');
const { validateBooking, validateBookingQuery, validateMongoId } = require('../middleware/validation');

const router = express.Router();

const ACTIVE_STATUSES = ['Confirmed', 'CheckedIn'];

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// Two ranges overlap if one starts before the other ends, both ways.
function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

// GET /api/bookings/amenity/:amenityId?date=YYYY-MM-DD — see existing bookings for a day (used to render the slot grid)
router.get('/amenity/:amenityId', protect, validateBookingQuery, async (req, res) => {
  try {
    const { date } = req.query;
    const query = { amenity: req.params.amenityId, status: { $in: ACTIVE_STATUSES } };
    if (date) query.bookingDate = date;
    const bookings = await AmenityBooking.find(query).populate('tenant', 'name');
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch bookings.', error: err.message });
  }
});

// GET /api/bookings/mine — tenant's own bookings
router.get('/mine', protect, async (req, res) => {
  try {
    const bookings = await AmenityBooking.find({ tenant: req.user._id })
      .populate('amenity', 'name')
      .sort({ bookingDate: -1, checkInTime: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch your bookings.', error: err.message });
  }
});

// GET /api/bookings/owner — owner sees all bookings for their properties
router.get('/owner', protect, requireRole('owner'), async (req, res) => {
  try {
    const properties = await Property.find({ owner: req.user._id }).select('_id');
    const propertyIds = properties.map((p) => p._id);
    
    const amenities = await Amenity.find({ property: { $in: propertyIds } }).select('_id');
    const amenityIds = amenities.map((a) => a._id);
    
    const bookings = await AmenityBooking.find({ amenity: { $in: amenityIds } })
      .populate('tenant', 'name email')
      .populate({
        path: 'amenity',
        select: 'name property',
        populate: {
          path: 'property',
          select: 'name'
        }
      })
      .sort({ bookingDate: -1, checkInTime: -1 });
    
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch bookings.', error: err.message });
  }
});

// POST /api/bookings — create a booking with conflict prevention (uses MongoDB transaction)
// body: { amenityId, bookingDate: "YYYY-MM-DD", checkInTime: "HH:mm", checkOutTime: "HH:mm" }
router.post('/', protect, validateBooking, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { amenityId, bookingDate, checkInTime, checkOutTime } = req.body;

    const amenity = await Amenity.findById(amenityId).session(session);
    if (!amenity) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Amenity not found.' });
    }
    if (amenity.availabilityStatus !== 'Available') {
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({ message: 'This amenity is currently unavailable for booking.' });
    }

    // Tenants may only book amenities at their own property.
    if (req.user.role === 'tenant' && String(amenity.property) !== String(req.user.property)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ message: 'You can only book amenities at your own property.' });
    }

    const startMin = toMinutes(checkInTime);
    const endMin = toMinutes(checkOutTime);
    const openMin = toMinutes(amenity.openTime);
    const closeMin = toMinutes(amenity.closeTime);

    if (startMin >= endMin) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'checkOutTime must be after checkInTime.' });
    }
    if (startMin < openMin || endMin > closeMin) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: `Booking must fall within ${amenity.openTime}\u2013${amenity.closeTime}.`,
      });
    }
    const today = new Date().toISOString().slice(0, 10);
    if (bookingDate < today) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Cannot book a date in the past.' });
    }

    // --- Conflict check within transaction: any active booking for this amenity/date whose time range overlaps ---
    const sameDayBookings = await AmenityBooking.find({
      amenity: amenityId,
      bookingDate,
      status: { $in: ACTIVE_STATUSES },
    }).session(session);

    const conflict = sameDayBookings.find((b) =>
      rangesOverlap(startMin, endMin, toMinutes(b.checkInTime), toMinutes(b.checkOutTime))
    );

    if (conflict) {
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({
        message: `Time slot conflicts with an existing booking (${conflict.checkInTime}\u2013${conflict.checkOutTime}). Please choose a different slot.`,
      });
    }

    // Create booking within the same transaction - atomic check-and-create
    const [booking] = await AmenityBooking.create([{
      amenity: amenityId,
      tenant: req.user._id,
      bookingDate,
      checkInTime,
      checkOutTime,
    }], { session });

    await session.commitTransaction();
    session.endSession();

    // Populate and emit socket event after successful transaction
    const populated = await booking.populate('amenity', 'name');
    req.app.get('io').to(`property:${amenity.property}`).emit('booking:new', populated);

    res.status(201).json(populated);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    
    // Handle duplicate key error (race condition edge case)
    if (err.code === 11000) {
      return res.status(409).json({ 
        message: 'Time slot was just booked by another user. Please refresh and try again.' 
      });
    }
    
    res.status(500).json({ message: 'Failed to create booking.', error: err.message });
  }
});

// PATCH /api/bookings/:id/cancel — tenant cancels their own upcoming booking
router.patch('/:id/cancel', protect, validateMongoId, async (req, res) => {
  try {
    const booking = await AmenityBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (String(booking.tenant) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only cancel your own bookings.' });
    }
    booking.status = 'Cancelled';
    await booking.save();

    const amenity = await Amenity.findById(booking.amenity);
    req.app.get('io').to(`property:${amenity.property}`).emit('booking:cancelled', booking);

    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Failed to cancel booking.', error: err.message });
  }
});

// PATCH /api/bookings/:id/checkin — record actual check-in time
router.patch('/:id/checkin', protect, validateMongoId, async (req, res) => {
  try {
    const booking = await AmenityBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (String(booking.tenant) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only check in to your own booking.' });
    }
    booking.status = 'CheckedIn';
    booking.actualCheckIn = new Date();
    await booking.save();
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Failed to check in.', error: err.message });
  }
});

// PATCH /api/bookings/:id/checkout — record actual check-out time
router.patch('/:id/checkout', protect, validateMongoId, async (req, res) => {
  try {
    const booking = await AmenityBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (String(booking.tenant) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only check out of your own booking.' });
    }
    booking.status = 'CheckedOut';
    booking.actualCheckOut = new Date();
    await booking.save();
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Failed to check out.', error: err.message });
  }
});

module.exports = router;
