const request = require('supertest');
const app = require('../../src/app');
const mongoose = require('mongoose');

describe('Event Endpoints', () => {
    let token;

    beforeAll(async () => {
        // Create an organizer to get token
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Organizer',
                email: `organizer${Date.now()}@example.com`,
                password: 'password123',
                role: 'organizer'
            });
        token = res.body.token;
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    it('should create a new event', async () => {
        const res = await request(app)
            .post('/api/events')
            .set('Authorization', `Bearer ${token}`)
            .send({
                title: 'Test Event',
                description: 'Test Description',
                date: '2025-01-01',
                time: '12:00',
                location: 'Test Location',
                price: 100,
                category: 'Music',
                availableTickets: 50
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body.title).toEqual('Test Event');
    });

    it('should get all events', async () => {
        const res = await request(app).get('/api/events');
        expect(res.statusCode).toEqual(200);
        expect(Array.isArray(res.body)).toBeTruthy();
    });
});
