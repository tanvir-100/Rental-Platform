const mongoose = require('mongoose');

const STATUS_VALUES = ['Pending', 'In Progress', 'Completed'];

const maintenanceRequestSchema = new mongoose.Schema(
  {
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    issueDescription: { type: String, required: true, trim: true, maxlength: 1000 },
    category: {
      type: String,
      enum: ['Plumbing', 'Electrical', 'HVAC', 'Appliance', 'Structural', 'Other'],
      default: 'Other',
    },
    priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
    status: { type: String, enum: STATUS_VALUES, default: 'Pending' },
    resolutionDate: { type: Date, default: null },
    // Simple threaded notes so tenant/owner communication stays attached to the request.
    notes: [
      {
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        authorRole: { type: String, enum: ['tenant', 'owner'] },
        message: { type: String, trim: true, maxlength: 1000 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Indexes for query performance
maintenanceRequestSchema.index({ property: 1, status: 1 }); // For owner dashboard filtering
maintenanceRequestSchema.index({ tenant: 1, createdAt: -1 }); // For tenant's own requests
maintenanceRequestSchema.index({ property: 1, createdAt: -1 }); // For owner's property requests

maintenanceRequestSchema.statics.STATUS_VALUES = STATUS_VALUES;

module.exports = mongoose.model('MaintenanceRequest', maintenanceRequestSchema);
