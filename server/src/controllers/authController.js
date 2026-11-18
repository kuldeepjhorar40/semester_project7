const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const { AppError, asyncHandler } = require('../utils/AppError');

const signToken = (id) => jwt.sign({ id }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

// Public registration ALWAYS creates a student. Admin accounts are created via the seed script / DB.
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, studentId, department, phone } = req.body;
  if (await User.exists({ email })) throw new AppError('An account with this email already exists', 409);
  if (studentId && (await User.exists({ studentId }))) throw new AppError('This student ID is already registered', 409);

  const user = await User.create({ name, email, password, role: 'student', studentId, department, phone });
  res.status(201).json({ success: true, token: signToken(user._id), user });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  // Same message for unknown email / wrong password to avoid account enumeration
  if (!user || !(await user.comparePassword(password))) throw new AppError('Invalid email or password', 401);
  res.json({ success: true, token: signToken(user._id), user });
});

exports.me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});
