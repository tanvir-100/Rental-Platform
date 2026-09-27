const express = require('express');
const MaintenanceRequest = require('../models/MaintenanceRequest');
const Property = require('../models/Property');
const { protect, requireRole } = require('../middleware/auth');
const { validateMaintenanceRequest, validateMaintenanceStatus, validateMaintenanceNote, validateMongoId } = require('../middleware/validation');

const router = express.Router();

// Helper: is this owner allowed to touch requests for this property?
async function ownerOwnsProperty(ownerId, propertyId) {
  const property = await Property.findOne({ _id: propertyId, owner: ownerId });
  return !!property;
}

// GET /api/maintenance — tenant sees their own requests, owner sees requests for their properties
router.get('/', protect, async (req, res) => {
  try {
    let requests;
    if (req.user.role === 'tenant') {
      requests = await MaintenanceRequest.find({ tenant: req.user._id })
        .populate('property', 'name address')
        .sort({ createdAt: -1 });
    } else {
      const properties = await Property.find({ owner: req.user._id }).select('_id');
      const propertyIds = properties.map((p) => p._id);
      requests = await MaintenanceRequest.find({ property: { $in: propertyIds } })
        .populate('property', 'name address')
        .populate('tenant', 'name email')
        .sort({ createdAt: -1 });
    }
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch maintenance requests.', error: err.message });
  }
});

// POST /api/maintenance — tenant creates a request
router.post('/', protect, requireRole('tenant'), validateMaintenanceRequest, async (req, res) => {
  try {
    const { issueDescription, category, priority } = req.body;
    if (!req.user.property) {
      return res.status(400).json({ message: 'Your account is not linked to a property.' });
    }

    const request = await MaintenanceRequest.create({
      property: req.user.property,
      tenant: req.user._id,
      issueDescription,
      category,
      priority,
    });

    const populated = await request.populate('property', 'name address');

    // Real-time push so the owner's dashboard updates without a refresh.
    req.app.get('io').to(`property:${req.user.property}`).emit('maintenance:new', populated);

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create maintenance request.', error: err.message });
  }
});

// PATCH /api/maintenance/:id/status — owner updates status (Pending / In Progress / Completed)
router.patch('/:id/status', protect, requireRole('owner'), validateMaintenanceStatus, async (req, res) => {
  try {
    const { status } = req.body;

    const request = await MaintenanceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found.' });

    const allowed = await ownerOwnsProperty(req.user._id, request.property);
    if (!allowed) return res.status(403).json({ message: 'You do not manage this property.' });

    request.status = status;
    if (status === 'Completed') request.resolutionDate = new Date();
    await request.save();

    const populated = await request.populate('property', 'name address');

    // Notify both the owner's dashboard room and the tenant directly.
    req.app.get('io').to(`property:${request.property}`).emit('maintenance:updated', populated);
    req.app.get('io').to(`user:${request.tenant}`).emit('maintenance:updated', populated);

    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update status.', error: err.message });
  }
});

// POST /api/maintenance/:id/notes — either party adds a message to the thread
router.post('/:id/notes', protect, validateMaintenanceNote, async (req, res) => {
  try {
    const { message } = req.body;

    const request = await MaintenanceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found.' });

    const isTenantOwner = req.user.role === 'tenant' && String(request.tenant) === String(req.user._id);
    const isPropertyOwner = req.user.role === 'owner' && (await ownerOwnsProperty(req.user._id, request.property));
    if (!isTenantOwner && !isPropertyOwner) {
      return res.status(403).json({ message: 'You cannot comment on this request.' });
    }

    request.notes.push({ author: req.user._id, authorRole: req.user.role, message });
    await request.save();

    const populated = await request.populate('property', 'name address');
    req.app.get('io').to(`property:${request.property}`).emit('maintenance:updated', populated);
    req.app.get('io').to(`user:${request.tenant}`).emit('maintenance:updated', populated);

    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to add note.', error: err.message });
  }
});

module.exports = router;
