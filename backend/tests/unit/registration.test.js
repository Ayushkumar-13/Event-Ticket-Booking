const request = require('supertest');
const app = require('../../src/app');
const mongoose = require('mongoose');
const Event = require('../../src/models/Event');

describe('Registration Endpoints', () => {
    let userToken;
    let eventId;

    beforeAll(async () => {
        // 1. Create Organizer & Event
        const orgRes = await request(app).post('/api/auth/register').send({
            name: 'Org', email: `org${Date.now()}@test.com`, password: '123', role: 'organizer'
        });
        const eventRes = await request(app).post('/api/events')
            .set('Authorization', `Bearer ${orgRes.body.token}`)
            .send({
                title: 'Booking Event', description: 'Desc', date: '2025-05-05', time: '10:00',
                location: 'Loc', price: 10, category: 'Test', availableTickets: 10
            });
        eventId = eventRes.body._id;

        // 2. Create User
        const userRes = await request(app).post('/api/auth/register').send({
            name: 'User', email: `user${Date.now()}@test.com`, password: '123'
        });
        userToken = userRes.body.token;
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    it('should book a ticket for an event', async () => {
        const res = await request(app)
            .post('/api/tickets/book')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                eventId: eventId,
                quantity: 2
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body.quantity).toEqual(2);
        expect(res.body.status).toEqual('Confirmed');
    });

    it('should fail if not enough tickets', async () => {
        const res = await request(app)
            .post('/api/tickets/book')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                eventId: eventId,
                quantity: 100 // Exceeds available
            });

        expect(res.statusCode).toEqual(400);
    });
});
