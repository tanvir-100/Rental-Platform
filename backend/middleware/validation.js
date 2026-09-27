const { body, param, query, validationResult } = require('express-validator');

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value,
      })),
    });
  }
  next();
};

// Auth validation rules
const validateRegister = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be at least 6 characters'),
  body('role')
    .isIn(['tenant', 'owner'])
    .withMessage('Role must be either "tenant" or "owner"'),
  // Owner-specific fields
  body('propertyName')
    .if(body('role').equals('owner'))
    .trim()
    .notEmpty()
    .withMessage('Property name is required for owners')
    .isLength({ max: 200 })
    .withMessage('Property name too long'),
  body('propertyAddress')
    .if(body('role').equals('owner'))
    .trim()
    .notEmpty()
    .withMessage('Property address is required for owners')
    .isLength({ max: 500 })
    .withMessage('Property address too long'),
  // Tenant-specific fields
  body('propertyId')
    .if(body('role').equals('tenant'))
    .isMongoId()
    .withMessage('Valid property ID is required for tenants'),
  handleValidationErrors,
];

const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors,
];

// Property validation rules
const validateProperty = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Property name is required')
    .isLength({ max: 200 })
    .withMessage('Property name too long'),
  body('address')
    .trim()
    .notEmpty()
    .withMessage('Property address is required')
    .isLength({ max: 500 })
    .withMessage('Property address too long'),
  handleValidationErrors,
];

// Maintenance validation rules
const validateMaintenanceRequest = [
  body('issueDescription')
    .trim()
    .notEmpty()
    .withMessage('Issue description is required')
    .isLength({ max: 1000 })
    .withMessage('Issue description too long (max 1000 characters)'),
  body('category')
    .optional()
    .isIn(['Plumbing', 'Electrical', 'HVAC', 'Appliance', 'Structural', 'Other'])
    .withMessage('Invalid category'),
  body('priority')
    .optional()
    .isIn(['Low', 'Medium', 'High', 'Urgent'])
    .withMessage('Invalid priority'),
  handleValidationErrors,
];

const validateMaintenanceStatus = [
  param('id')
    .isMongoId()
    .withMessage('Invalid maintenance request ID'),
  body('status')
    .isIn(['Pending', 'In Progress', 'Completed'])
    .withMessage('Status must be Pending, In Progress, or Completed'),
  handleValidationErrors,
];

const validateMaintenanceNote = [
  param('id')
    .isMongoId()
    .withMessage('Invalid maintenance request ID'),
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ max: 1000 })
    .withMessage('Message too long (max 1000 characters)'),
  handleValidationErrors,
];

// Amenity validation rules
const validateAmenity = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Amenity name is required')
    .isLength({ max: 100 })
    .withMessage('Amenity name too long'),
  body('propertyId')
    .isMongoId()
    .withMessage('Valid property ID is required'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description too long'),
  body('openTime')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Open time must be in HH:mm format'),
  body('closeTime')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Close time must be in HH:mm format'),
  handleValidationErrors,
];

const validateAmenityAvailability = [
  param('id')
    .isMongoId()
    .withMessage('Invalid amenity ID'),
  body('availabilityStatus')
    .isIn(['Available', 'Unavailable'])
    .withMessage('Availability status must be Available or Unavailable'),
  handleValidationErrors,
];

const validateAmenityId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid amenity ID'),
  handleValidationErrors,
];

// Booking validation rules
const validateBooking = [
  body('amenityId')
    .isMongoId()
    .withMessage('Valid amenity ID is required'),
  body('bookingDate')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Booking date must be in YYYY-MM-DD format')
    .custom((value) => {
      const today = new Date().toISOString().split('T')[0];
      if (value < today) {
        throw new Error('Cannot book a date in the past');
      }
      return true;
    }),
  body('checkInTime')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Check-in time must be in HH:mm format'),
  body('checkOutTime')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Check-out time must be in HH:mm format')
    .custom((value, { req }) => {
      if (value <= req.body.checkInTime) {
        throw new Error('Check-out time must be after check-in time');
      }
      return true;
    }),
  handleValidationErrors,
];

const validateBookingQuery = [
  query('date')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Date must be in YYYY-MM-DD format'),
  handleValidationErrors,
];

// User validation rules
const validateTenantParams = [
  param('propertyId')
    .isMongoId()
    .withMessage('Invalid property ID'),
  param('tenantId')
    .optional()
    .isMongoId()
    .withMessage('Invalid tenant ID'),
  handleValidationErrors,
];

// Generic MongoDB ID validation
const validateMongoId = (paramName = 'id') => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName}`),
  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  validateRegister,
  validateLogin,
  validateProperty,
  validateMaintenanceRequest,
  validateMaintenanceStatus,
  validateMaintenanceNote,
  validateAmenity,
  validateAmenityAvailability,
  validateAmenityId,
  validateBooking,
  validateBookingQuery,
  validateTenantParams,
  validateMongoId,
};