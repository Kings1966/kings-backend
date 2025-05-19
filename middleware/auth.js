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
    logger.warn('Unauthorized access attempt', {
      sessionID: req.sessionID,
      cookies: req.headers.cookie || 'No cookies',
    });
    return res.status(401).json({ message: 'Unauthorized' });
  }
  logger.info('Authenticated request', { user: req.session.user });
  next();
};

const requireRole = (roles) => (req, res, next) => {
  const role = req.session.user?.role;
  if (!role || !roles.includes(role)) {
    logger.warn('Forbidden role access', {
      userRole: role,
      requiredRoles: roles,
    });
    return res.status(403).json({ message: 'Forbidden' });
  }
  logger.info('Authorized role access', { userRole: role });
  next();
};

module.exports = { requireAuth, requireRole };
