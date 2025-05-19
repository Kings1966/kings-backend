const request = require('supertest');
const app = require('../server');
const mongoose = require('mongoose');
const User = require('../models/userModel');

describe('User Routes', () => {
    let agent; // For session persistence
    let adminUser;
    let regularUser;

    beforeEach(async () => {
        agent = request.agent(app); // Create a new agent for session persistence

        // Create test users
        adminUser = await User.create({
            name: 'Admin User',
            email: 'admin@test.com',
            password: 'password123',
            role: 'admin',
        });

        regularUser = await User.create({
            name: 'Regular User',
            email: 'user@test.com',
            password: 'password123',
            role: 'user',
        });
    });

    describe('POST /api/users/register', () => {
        it('should register a new user and set session', async () => {
            const res = await agent.post('/api/users/register').send({
                name: 'New User',
                email: 'newuser@test.com',
                password: 'password123',
            });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('name', 'New User');
            expect(res.body).toHaveProperty('email', 'newuser@test.com');
            expect(res.body).toHaveProperty('role', 'user');

            // Verify session
            const sessionRes = await agent.get('/api/debug/session');
            expect(sessionRes.body.session.user).toHaveProperty('email', 'newuser@test.com');
        });

        it('should return 400 if user already exists', async () => {
            const res = await agent.post('/api/users/register').send({
                name: 'Admin User',
                email: 'admin@test.com',
                password: 'password123',
            });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('message', 'User already exists');
        });
    });

    describe('POST /api/users/login', () => {
        it('should login a user and set session', async () => {
            const res = await agent.post('/api/users/login').send({
                email: 'admin@test.com',
                password: 'password123',
            });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('email', 'admin@test.com');
            expect(res.body).toHaveProperty('role', 'admin');

            // Verify session persistence
            const sessionRes = await agent.get('/api/debug/session');
            expect(sessionRes.body.session.user).toHaveProperty('email', 'admin@test.com');
        });

        it('should return 401 for invalid credentials', async () => {
            const res = await agent.post('/api/users/login').send({
                email: 'admin@test.com',
                password: 'wrongpassword',
            });

            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('message', 'Invalid credentials');
        });
    });

    describe('POST /api/users/logout', () => {
        it('should logout a user and clear session', async () => {
            // Login first
            await agent.post('/api/users/login').send({
                email: 'admin@test.com',
                password: 'password123',
            });

            // Logout
            const res = await agent.post('/api/users/logout');

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'Logout successful');

            // Verify session is cleared
            const sessionRes = await agent.get('/api/debug/session');
            expect(sessionRes.body.session).toEqual({}); // Session should be empty
        });

        it('should return 400 if no session exists', async () => {
            const res = await agent.post('/api/users/logout');
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('message', 'No session found');
        });
    });

    describe('GET /api/users/profile', () => {
        it('should return user profile for authenticated user', async () => {
            // Login
            await agent.post('/api/users/login').send({
                email: 'user@test.com',
                password: 'password123',
            });

            // Get profile
            const res = await agent.get('/api/users/profile');

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('email', 'user@test.com');
            expect(res.body).toHaveProperty('role', 'user');
        });

        it('should return 401 if not authenticated', async () => {
            const res = await request(app).get('/api/users/profile'); // No agent, no session
            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('message', 'Unauthorized');
        });
    });

    describe('GET /api/users', () => {
        it('should return all users for admin', async () => {
            // Login as admin
            await agent.post('/api/users/login').send({
                email: 'admin@test.com',
                password: 'password123',
            });

            // Get all users
            const res = await agent.get('/api/users');

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(2); // Admin and regular user
            expect(res.body[0]).toHaveProperty('email');
        });

        it('should return 403 for non-admin', async () => {
            // Login as regular user
            await agent.post('/api/users/login').send({
                email: 'user@test.com',
                password: 'password123',
            });

            const res = await agent.get('/api/users');
            expect(res.status).toBe(403);
            expect(res.body).toHaveProperty('message', 'Forbidden');
        });
    });

    describe('DELETE /api/users/:id', () => {
        it('should delete a user for admin', async () => {
            // Login as admin
            await agent.post('/api/users/login').send({
                email: 'admin@test.com',
                password: 'password123',
            });

            // Delete regular user
            const res = await agent.delete(`/api/users/${regularUser._id}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'User deleted');
        });

        it('should return 403 for non-admin', async () => {
            // Login as regular user
            await agent.post('/api/users/login').send({
                email: 'user@test.com',
                password: 'password123',
            });

            const res = await agent.delete(`/api/users/${adminUser._id}`);
            expect(res.status).toBe(403);
            expect(res.body).toHaveProperty('message', 'Forbidden');
        });

        it('should return 404 if user not found', async () => {
            // Login as admin
            await agent.post('/api/users/login').send({
                email: 'admin@test.com',
                password: 'password123',
            });

            const res = await agent.delete(`/api/users/${new mongoose.Types.ObjectId()}`);
            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('message', 'User not found');
        });
    });
});