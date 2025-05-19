const bcrypt = require('bcryptjs');
const User = require('../models/userModel');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'server.log' }),
    new winston.transports.Console(),
  ],
});

const registerUser = async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      logger.warn('User already exists:', { email });
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user instance. Password hashing should be handled by a pre-save hook in the User model.
    user = new User({ name, email, password, role: role || 'user' });

    await user.save();
    logger.info('User registered:', { email, role });

    req.session.user = { id: user._id, name: user.name, email: user.email, role: user.role };
    logger.info('Session set:', { sessionID: req.sessionID, user: req.session.user });

    res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    logger.error('Register error:', { error: err.message, stack: err.stack });
    res.status(500).json({ message: 'Server error' });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Explicitly select the password field if it's set to select: false in the model
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      logger.warn('Invalid credentials:', { email });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logger.warn('Invalid credentials:', { email });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    req.session.user = { id: user._id, name: user.name, email: user.email, role: user.role };
    logger.info('Session set:', { sessionID: req.sessionID, user: req.session.user });

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    logger.error('Login error:', { error: err.message, stack: err.stack });
    res.status(500).json({ message: 'Server error' });
  }
};

const getUserProfile = async (req, res) => {
  try {
    if (!req.session.user || !req.session.user.id) {
        logger.warn('User not authenticated for profile view attempt.');
        return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await User.findById(req.session.user.id).select('-password');
    if (!user) {
      logger.warn('User not found:', { userId: req.session.user.id });
      return res.status(404).json({ message: 'User not found' });
    }

    logger.info('User profile fetched:', { email: user.email });
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    logger.error('Profile error:', { error: err.message, stack: err.stack });
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllUsers = async (_req, res) => {
  try {
    const users = await User.find().select('-password');
    logger.info('All users fetched:', { count: users.length });
    res.json(users);
  } catch (err) {
    logger.error('Get all users error:', { error: err.message, stack: err.stack });
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      logger.warn('User not found for deletion:', { userId: req.params.id });
      return res.status(404).json({ message: 'User not found' });
    }

    logger.info('User deleted:', { email: user.email });
    res.json({ message: 'User deleted' });
  } catch (err) {
    logger.error('Delete user error:', { error: err.message, stack: err.stack });
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  getAllUsers,
  deleteUser,
};