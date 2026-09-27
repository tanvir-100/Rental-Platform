const express = require('express');
const User = require('../models/User');
const Property = require('../models/Property');
const { protect, requireRole } = require('../middleware/auth');
const { validateTenantParams, validateMongoId } = require('../middleware/validation');

const router = express.Router();

// GET /api/users/tenants/:propertyId — owner gets all tenants for a specific property
router.get('/tenants/:propertyId', protect, requireRole('owner'), validateTenantParams, async (req, res) => {
  try {
    const { propertyId } = req.params;
    
    // Verify the owner owns this property
    const property = await Property.findOne({ _id: propertyId, owner: req.user._id });
    if (!property) {
      return res.status(403).json({ message: 'You do not manage this property.' });
    }

    const tenants = await User.find({ property: propertyId, role: 'tenant' })
      .select('name email createdAt')
      .sort({ createdAt: -1 });

    res.json(tenants);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch tenants.', error: err.message });
  }
});

// DELETE /api/users/tenants/:propertyId/:tenantId — owner removes a tenant from property
router.delete('/tenants/:propertyId/:tenantId', protect, requireRole('owner'), validateTenantParams, async (req, res) => {
  try {
    const { propertyId, tenantId } = req.params;
    
    // Verify the owner owns this property
    const property = await Property.findOne({ _id: propertyId, owner: req.user._id });
    if (!property) {
      return res.status(403).json({ message: 'You do not manage this property.' });
    }

    // Find the tenant and verify they belong to this property
    const tenant = await User.findOne({ _id: tenantId, property: propertyId, role: 'tenant' });
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found in this property.' });
    }

    // Remove tenant from property (set property to null)
    tenant.property = null;
    await tenant.save();

    // Notify via socket if needed
    req.app.get('io').to(`property:${propertyId}`).emit('tenant:removed', { tenantId, propertyId });
    req.app.get('io').to(`user:${tenantId}`).emit('property:removed', { propertyId });

    res.json({ message: 'Tenant removed successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to remove tenant.', error: err.message });
  }
});

module.exports = router;