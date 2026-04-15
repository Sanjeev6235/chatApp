const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { asyncHandler, AppError } = require('../middleware/error');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

const sendAuth = (user, statusCode, res, message = 'Success') => {
  const token = generateToken(user._id);
  res.status(statusCode).json({
    success: true,
    message,
    token,
    user: user.toPublic(),
  });
};

// POST /api/auth/register
exports.register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    throw new AppError('All fields are required', 400);
  }

  const exists = await User.findOne({ $or: [{ email }, { username }] });
  if (exists) {
    const field = exists.email === email ? 'Email' : 'Username';
    throw new AppError(`${field} already taken`, 400);
  }

  const user = await User.create({ username, email, password });
  sendAuth(user, 201, res, 'Account created successfully');
});

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) throw new AppError('Email and password required', 400);

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }

  user.isOnline = true;
  user.lastSeen = new Date();
  await user.save({ validateBeforeSave: false });

  sendAuth(user, 200, res, 'Welcome back!');
});

// POST /api/auth/logout
exports.logout = asyncHandler(async (req, res) => {
  req.user.isOnline = false;
  req.user.lastSeen = new Date();
  await req.user.save({ validateBeforeSave: false });

  res.json({ success: true, message: 'Logged out' });
});

// GET /api/auth/me
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('friends', 'username profilePic isOnline lastSeen')
    .populate('friendRequests', 'username profilePic bio');

  res.json({ success: true, user: user.toPublic() });
});
