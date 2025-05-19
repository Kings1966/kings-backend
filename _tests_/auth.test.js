// Make sure these are at the very top!
const request = require('supertest');
const app = require('../server'); // Or the correct path to your Express app
const User = require('../models/userModel');
const mongoose = require('mongoose');

// c:\Users\Launa.Engelbrecht\Desktop\kings\server\__tests__\auth.test.js
console.log('[TEST DEBUG] Supertest imported:', !!request);
console.log('[TEST DEBUG] App imported:', typeof app, 'Is app a function (Express app)?', typeof app === 'function');
console.log('[TEST DEBUG] User model imported:', typeof User, 'Does User.create exist?', !!(User && User.create));
console.log('[TEST DEBUG] Mongoose imported:', !!mongoose);

describe('Authentication API', () => {
  // Agent to persist cookies across requests in a test suite
  let agent;

  beforeEach(async () => {
    agent = request.agent(app); // Create a new agent for each test to ensure cookie isolation

    // You might want to create a default user for login tests here
    // or rely on the register endpoint to create users.
    // For login tests, ensure a user exists:
    await User.create({
      name: 'Test User',
      email: 'testlogin@example.com',
      password: 'password123', // The pre-save hook in your model will hash this
      role: 'user',
    });
  });

  describe('POST /api/users/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app) // Use request(app) for non-cookie-dependent tests
        .post('/api/users/register')
        .send({
          name: 'New Register User',
          email: 'register@example.com',
          password: 'password123',
        });
      expect(res.statusCode).toEqual(201);
      expect(res.body.user).toHaveProperty('email', 'register@example.com');
      expect(res.headers['set-cookie']).toBeDefined(); // Check for session cookie
    });

    it('should return 400 if email already exists', async () => {
      // First, register a user
      await request(app)
        .post('/api/users/register')
        .send({
          name: 'Existing User',
          email: 'existing@example.com',
          password: 'password123',
        });

      // Then, try to register with the same email
      const res = await request(app)
        .post('/api/users/register')
        .send({
          name: 'Another User',
          email: 'existing@example.com',
          password: 'password456',
        });
      expect(res.statusCode).toEqual(400); // Or whatever status your controller sends
      expect(res.body).toHaveProperty('message', 'User already exists');
    });

    it('should return 400 for missing password', async () => {
      const res = await request(app)
        .post('/api/users/register')
        .send({
          name: 'No Pass User',
          email: 'nopass@example.com',
        });
      expect(res.statusCode).toEqual(400); // Assuming your controller handles validation errors
      expect(res.body.errors).toEqual(expect.arrayContaining(['Password is required']));
    });
  });

  describe('POST /api/users/login', () => {
    it('should login an existing user with correct credentials', async () => {
      const res = await agent // Use agent to store cookies
        .post('/api/users/login')
        .send({
          email: 'testlogin@example.com',
          password: 'password123',
        });
      expect(res.statusCode).toEqual(200);
      expect(res.body.user).toHaveProperty('email', 'testlogin@example.com');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should return 401 for incorrect password', async () => {
      const res = await agent
        .post('/api/users/login')
        .send({
          email: 'testlogin@example.com',
          password: 'wrongpassword',
        });
      expect(res.statusCode).toEqual(401);
    });
  });

  describe('GET /api/users/profile', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get('/api/users/profile'); // No agent, so no cookie
      expect(res.statusCode).toEqual(401);
    });

    it('should return user profile if authenticated', async () => {
      // Log in first using the agent
      await agent
        .post('/api/users/login')
        .send({ email: 'testlogin@example.com', password: 'password123' });

      // Now make the authenticated request using the same agent
      const res = await agent.get('/api/users/profile');
      expect(res.statusCode).toEqual(200);
      expect(res.body.user).toHaveProperty('email', 'testlogin@example.com');
    });
  });

  describe('POST /api/users/logout', () => {
    it('should logout an authenticated user', async () => {
      // Log in
      await agent
        .post('/api/users/login')
        .send({ email: 'testlogin@example.com', password: 'password123' });

      // Logout
      const logoutRes = await agent.post('/api/users/logout');
      expect(logoutRes.statusCode).toEqual(200);
      expect(logoutRes.body).toHaveProperty('message', 'Logout successful');

      // Verify cookie is cleared or session is invalidated by trying to access a protected route
      const profileRes = await agent.get('/api/users/profile');
      expect(profileRes.statusCode).toEqual(401);
    });
  });
});
