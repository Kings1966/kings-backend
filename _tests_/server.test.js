const request = require('supertest');
const app = require('../server');

describe('API Endpoints', () => {
    it('GET / should return welcome message', async () => {
        const res = await request(app).get('/');
        expect(res.status).toBe(200);
        expect(res.text).toBe('Kings POS backend is running');
    });

    it('GET /api/test should return test message and set session', async () => {
        const res = await request(app).get('/api/test');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message', 'Test route is working');
        expect(res.body.session).toHaveProperty('test', 'test');
    });

    it('GET /api/debug/session should return session details', async () => {
        const res = await request(app).get('/api/debug/session');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('sessionID');
        expect(res.body).toHaveProperty('session');
        expect(res.body).toHaveProperty('cookies');
    });

    it('GET /api/debug/mongodb should confirm MongoDB connection', async () => {
        const res = await request(app).get('/api/debug/mongodb');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message', 'MongoDB is connected');
    });

    it('GET /api/debug/env should return environment variables', async () => {
        const res = await request(app).get('/api/debug/env');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('MONGODB_URI', 'Set');
        expect(res.body).toHaveProperty('SESSION_SECRET', 'Set');
        expect(res.body).toHaveProperty('FRONTEND_URL', 'http://localhost:3000');
    });
});