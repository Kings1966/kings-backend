const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

// Set environment variables for the test environment
// This needs to be done BEFORE other modules are imported if they rely on these.
process.env.SESSION_SECRET = 'test-session-secret-for-jest-kings'; // Make it unique
process.env.FRONTEND_URL = 'http://localhost:1234'; // A dummy URL for tests
process.env.NODE_ENV = 'test'; // Crucial for server.js logic
// MONGODB_URI will be set by MongoMemoryServer when it starts

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  try {
    await mongoose.connect(mongoUri, {
      dbName: 'kings-test-db', // Optional: give your test DB a name
    });
    console.log('Mock MongoDB connected for testing:', mongoUri);
  } catch (err) {
    console.error('Error connecting to mock MongoDB for testing:', err);
    process.exit(1); // Exit if DB connection fails
  }
});

afterAll(async () => {
  try {
    await mongoose.disconnect();
    console.log('Mock MongoDB disconnected.');
  } catch (err) {
    console.error('Error disconnecting mock MongoDB:', err);
  }
  if (mongoServer) {
    try {
      await mongoServer.stop();
      console.log('Mock MongoDB server stopped.');
    } catch (err) {
      console.error('Error stopping mock MongoDB server:', err);
    }
  }
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    try {
      await collection.deleteMany({});
    } catch (_err) {
      // This can happen if a collection is created mid-test or if it's a system collection
      // console.warn(`Could not clear collection ${key}: ${err.message}`);
    }
  }
});