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

// Use the logger from server.js (passed via app.locals or directly required)
const logger = winston; // Assuming server.js exports or shares the logger

// Global request logger
router.use((req, _res, next) => {
    logger.info('User route request', {
        method: req.method,
        url: req.url,
        sessionID: req.sessionID,
        cookie: req.headers.cookie || 'None',
        origin: req.headers.origin || 'None',
    });
    next();
});

// Public routes
router.post('/login', loginUser);
router.post('/register', registerUser);

// Protected routes
router.get('/users', requireAuth, requireRole(['admin']), getAllUsers);
router.get('/profile', requireAuth, getUserProfile);
router.delete('/users/:id', requireAuth, requireRole(['admin']), deleteUser);

// Logout
router.post('/logout', (req, res) => {
    logger.info('Logout request', {
        sessionID: req.sessionID,
        user: req.session?.user || 'No session user',
    });

    if (!req.session) {
        return res.status(400).json({ message: 'No session found' });
    }

    req.session.destroy((err) => {
        if (err) {
            logger.error('Logout error', { error: err.message });
            return res.status(500).json({ message: 'Logout failed' });
        }

        res.clearCookie('kings.sid', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
            path: '/',
        });

        logger.info('Logout successful', { sessionID: req.sessionID });
        res.json({ message: 'Logout successful' });
    });
});

module.exports = router;