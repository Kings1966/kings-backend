const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const winston = require('winston');
const http = require('http'); // Required for Socket.IO
const { Server } = require("socket.io"); // Socket.IO server
const dotenv = require('dotenv');
const PORT = process.env.PORT || 5000;

dotenv.config();

const app = express();
const server = http.createServer(app); // Create HTTP server for Socket.IO


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

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: [process.env.FRONTEND_URL, 'http://localhost:3000'], // Your frontend URL
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

// Validate Environment Variables
['MONGODB_URI', 'SESSION_SECRET', 'FRONTEND_URL'].forEach((key) => {
  if (!process.env[key]) {
    logger.error(`Missing environment variable: ${key}`);
    process.exit(1);
  }
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  retryWrites: true,
  w: 'majority',
  dbName: 'kings',
}).then(() => {
  logger.info('Connected to MongoDB');
}).catch((err) => {
  logger.error('MongoDB connection error:', err);
  process.exit(1);
});

// CORS Setup
app.use(cors({
  origin: [process.env.FRONTEND_URL, 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Trust proxy for cookies over HTTPS (required for Render/Heroku/etc.)
app.set('trust proxy', 1);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Store
const sessionStore = MongoStore.create({
  mongoUrl: process.env.MONGODB_URI,
  dbName: 'kings',
  collectionName: 'sessions',
  ttl: 24 * 60 * 60,
  autoRemove: 'native',
});

app.use(session({
  name: 'kings.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
    maxAge: 1000 * 60 * 60 * 24,
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
    protocol: req.protocol, // Log the protocol
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

app.use((req, _res, next) => {
  console.log('Raw headers:', req.headers);
  console.log('Cookies:', req.get('Cookie') || 'No Cookie header');
  next();
});

// Middleware to make io accessible in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);
  // You can add specific event listeners here if needed, e.g., for authentication
  socket.on('disconnect', (reason) => {
    logger.info(`Socket disconnected: ${socket.id}, reason: ${reason}`);
  });
});

// Routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes')); // Add category routes
app.use('/api/products', require('./routes/productRoutes')); // Add product routes

// Test Route
app.get('/api/test', (req, res) => {
  logger.info('Test route hit');
  req.session.test = 'test';
  res.json({ message: 'Test route is working', session: req.session });
});

// Debug Routes
app.get('/api/debug/session', (req, res) => { // req is used here for req.sessionID, req.session, req.headers.cookie
  res.json({
    sessionID: req.sessionID,
    session: req.session,
    cookies: req.headers.cookie || 'No cookies',
  });
});

app.get('/api/debug/mongodb', async (_req, res) => {
  try {
    if (!mongoose.connection.db) throw new Error('MongoDB connection unavailable');
    await mongoose.connection.db.admin().ping();
    res.json({ message: 'MongoDB is connected' });
  } catch (err) {
    logger.error('MongoDB ping error:', err);
    res.status(500).json({ message: 'MongoDB error', error: err.message });
  }
});

app.get('/api/debug/env', (_req, res) => {
  res.json({
    MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'Missing',
    SESSION_SECRET: process.env.SESSION_SECRET ? 'Set' : 'Missing',
    FRONTEND_URL: process.env.FRONTEND_URL,
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
  });
});

app.get('/', (_req, res) => {
  res.send('Kings POS backend is running');
});

// Global Error Handler
app.use((err, _req, res, _next) => {
  logger.error('Unhandled Error:', { message: err.message, stack: err.stack });
  res.status(500).json({ message: 'Server error', error: err.message });
});

// Start Server
if (process.env.NODE_ENV !== 'test') {
  // Use server.listen (from http.createServer) instead of app.listen
  server.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
  });
}
module.exports = app; // <-- THIS IS CRUCIAL