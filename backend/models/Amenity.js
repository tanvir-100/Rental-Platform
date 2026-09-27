const mongoose = require('mongoose');

const amenitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    description: { type: String, trim: true, default: '' },
    // Overall on/off switch an owner can use to take an amenity out of service (e.g. maintenance closure)
    availabilityStatus: { type: String, enum: ['Available', 'Unavailable'], default: 'Available' },
    // Bookable window each day, used to validate booking times.
    openTime: { type: String, default: '08:00' }, // "HH:mm"
    closeTime: { type: String, default: '22:00' }, // "HH:mm"
  },
  { timestamps: true }
);

// Indexes for query performance
amenitySchema.index({ property: 1, availabilityStatus: 1 }); // For finding available amenities by property

module.exports = mongoose.model('Amenity', amenitySchema);
