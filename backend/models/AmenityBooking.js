const mongoose = require('mongoose');

const amenityBookingSchema = new mongoose.Schema(
  {
    amenity: { type: mongoose.Schema.Types.ObjectId, ref: 'Amenity', required: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bookingDate: { type: String, required: true }, // "YYYY-MM-DD"
    checkInTime: { type: String, required: true }, // "HH:mm"
    checkOutTime: { type: String, required: true }, // "HH:mm"
    status: { type: String, enum: ['Confirmed', 'Cancelled', 'CheckedIn', 'CheckedOut'], default: 'Confirmed' },
    actualCheckIn: { type: Date, default: null },
    actualCheckOut: { type: Date, default: null },
  },
  { timestamps: true }
);

// Indexes for query performance
amenityBookingSchema.index({ amenity: 1, bookingDate: 1, status: 1 }); // For conflict checking
amenityBookingSchema.index({ tenant: 1, bookingDate: -1 }); // For tenant's bookings
amenityBookingSchema.index({ amenity: 1, status: 1 }); // For owner's bookings by amenity

module.exports = mongoose.model('AmenityBooking', amenityBookingSchema);
