const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const winston = require('winston');
require('dotenv').config();

const app = express();

// Logger Setup
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

// Validate Environment Variables
['MONGODB_URI', 'SESSION_SECRET', 'FRONTEND_URL'].forEach((key) => {
  if (!process.env[key]) {
    logger.error(`Missing environment variable: ${key}`);
    process.exit(1);
  }
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  retryWrites: true,
  w: 'majority',
  dbName: 'kings',
})
  .then(() => logger.info('Connected to MongoDB'))
  .catch((err) => {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
  });

// CORS Setup
app.use(cors({
  origin: [process.env.FRONTEND_URL, 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
}));

// Trust proxy for production
app.set('trust proxy', 1);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Store
const sessionStore = MongoStore.create({
  mongoUrl: process.env.MONGODB_URI,
  collectionName: 'sessions',
  dbName: 'kings',
  ttl: 24 * 60 * 60, // 1 day
  autoRemove: 'native',
});

sessionStore.on('error', (err) => {
  logger.error('MongoStore error:', { error: err.message, stack: err.stack });
});

// Session Middleware
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    httpOnly: true,
    secure: false, // Force false for local testing
    sameSite: 'lax', // Use lax for local testing
    maxAge: 24 * 60 * 60 * 1000,
    path: '/',
  },
}));

// Log session and cookies
app.use((req, res, next) => {
  logger.info('Session middleware:', {
    sessionID: req.sessionID,
    session: req.session,
    cookies: req.headers.cookie || 'No cookies',
    url: req.url,
    origin: req.headers.origin,
  });
  res.on('finish', () => {
    logger.info('Response headers:', {
      url: req.url,
      headers: res.getHeaders(),
      setCookie: res.get('Set-Cookie') || 'No Set-Cookie header',
    });
  });
  next();
});

// Routes
app.use('/api/users', require('./routes/userRoutes'));

// Test Route
app.get('/api/test', (req, res) => {
  logger.info('Test route hit');
  req.session.test = 'test';
  res.json({ message: 'Test route is working', session: req.session });
});

// Debug Routes
app.get('/api/debug/session', (req, res) => {
  res.json({
    sessionID: req.sessionID,
    session: req.session,
    cookies: req.headers.cookie || 'No cookies',
  });
});

app.get('/api/debug/mongodb', async (req, res) => {
  try {
    if (!mongoose.connection.db) throw new Error('MongoDB connection unavailable');
    await mongoose.connection.db.admin().ping();
    res.json({ message: 'MongoDB is connected' });
  } catch (err) {
    logger.error('MongoDB ping error:', err);
    res.status(500).json({ message: 'MongoDB error', error: err.message });
  }
});

app.get('/api/debug/env', (req, res) => {
  res.json({
    MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'Missing',
    SESSION_SECRET: process.env.SESSION_SECRET ? 'Set' : 'Missing',
    FRONTEND_URL: process.env.FRONTEND_URL,
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
  });
});

app.get('/', (req, res) => {
  res.json({ message: 'POS Backend is Live ✅' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  logger.error('Unhandled Error:', { message: err.message, stack: err.stack });
  res.status(500).json({ message: 'Server error', error: err.message });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
});