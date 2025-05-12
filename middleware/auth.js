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

const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.user) {
    logger.warn('No session or user found:', {
      sessionID: req.sessionID,
      cookies: req.headers.cookie || 'No cookies',
    });
    return res.status(401).json({ message: 'Unauthorized' });
  }
  logger.info('Authenticated user:', { user: req.session.user });
  next();
};

const requireRole = (roles) => (req, res, next) => {
  if (!req.session.user || !roles.includes(req.session.user.role)) {
    logger.warn('Role unauthorized:', {
      userRole: req.session.user?.role,
      requiredRoles: roles,
    });
    return res.status(403).json({ message: 'Forbidden' });
  }
  logger.info('Role authorized:', { userRole: req.session.user.role });
  next();
};

module.exports = { requireAuth, requireRole };