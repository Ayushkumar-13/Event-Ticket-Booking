const request = require('supertest');
const app = require('../../src/app');
const mongoose = require('mongoose');
const User = require('../../src/models/User');

describe('Auth Endpoints', () => {

    beforeAll(async () => {
        // Connect to a test database if available, or rely on the main one (Caution: cleans up data)
        // For this assignment, we'll try to use the running instance but handle cleanup
        // Note: Real integration tests usually use a separate test DB.
    });

    afterAll(async () => {
        // Cleanup and close connection
        await mongoose.connection.close();
    });

    it('should register a new user', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Test User',
                email: `test${Date.now()}@example.com`,
                password: 'password123'
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('token');
    });

    it('should login an existing user', async () => {
        // First create user
        const email = `login${Date.now()}@example.com`;
        await request(app).post('/api/auth/register').send({
            name: 'Login User',
            email,
            password: 'password123'
        });

        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email,
                password: 'password123'
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('token');
    });
});
