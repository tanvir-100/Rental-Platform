const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Property = require('../models/Property');
const { validateRegister, validateLogin } = require('../middleware/validation');

const router = express.Router();

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// POST /api/auth/register
// body: { name, email, password, role, propertyName?, propertyAddress?, propertyId? }
router.post('/register', validateRegister, async (req, res) => {
  try {
    const { name, email, password, role, propertyName, propertyAddress, propertyId } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    let property = null;

    if (role === 'owner') {
      // An owner creates their first property at signup so they have somewhere to attach requests/amenities.
      property = await Property.create({ name: propertyName, address: propertyAddress, owner: null });
    } else {
      // A tenant joins an existing property by its ID (given to them by their owner).
      property = await Property.findById(propertyId);
      if (!property) {
        return res.status(404).json({ message: 'No property found with that propertyId.' });
      }
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role,
      property: property._id,
    });

    if (role === 'owner') {
      property.owner = user._id;
      await property.save();
    }

    const token = signToken(user);
    res.status(201).json({ token, user: user.toSafeObject(), property });
  } catch (err) {
    res.status(500).json({ message: 'Registration failed.', error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = signToken(user);
    res.json({ token, user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: 'Login failed.', error: err.message });
  }
});

module.exports = router;
