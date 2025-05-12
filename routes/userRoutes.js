const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getAllUsers,
  getUserProfile,
  deleteUser,
} = require('../controllers/userController');
const { requireAuth, requireRole } = require('../middleware/auth');
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

// Log all requests
router.use((req, res, next) => {
  logger.info('User route hit:', {
    method: req.method,
    url: req.url,
    sessionID: req.sessionID,
    cookies: req.headers.cookie || 'No cookies',
    origin: req.headers.origin || 'No origin',
  });
  next();
});

// Debug logging for /profile route
router.get('/profile', (req, res, next) => {
  logger.info('Profile request:', {
    sessionID: req.sessionID,
    cookies: req.headers.cookie || 'No cookies',
    user: req.session.user || 'No user in session',
  });
  next();
});

router.post('/login', loginUser);
router.post('/register', registerUser);
router.get('/users', requireAuth, requireRole(['admin']), getAllUsers);
router.get('/profile', requireAuth, getUserProfile);
router.delete('/users/:id', requireAuth, requireRole(['admin']), deleteUser);
router.post('/logout', (req, res) => {
  logger.info('Logout endpoint hit:', {
    sessionID: req.sessionID,
    cookies: req.headers.cookie || 'No cookies',
  });

  if (!req.session) {
    logger.warn('Logout: No session found');
    return res.status(400).json({ message: 'No active session to logout' });
  }

  req.session.destroy((err) => {
    if (err) {
      logger.error('Logout error:', { error: err.message, stack: err.stack });
      return res.status(500).json({ message: 'Failed to log out' });
    }
    res.clearCookie('connect.sid', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    });
    logger.info('Logout successful', {
      sessionID: req.sessionID,
      setCookie: res.get('Set-Cookie') || 'No Set-Cookie header',
    });
    res.json({ message: 'Logout successful' });
  });
});

module.exports = router;