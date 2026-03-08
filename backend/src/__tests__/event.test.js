const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');

// Mock BullMQ so tests don't try to connect to the physical Upstash Redis queue
jest.mock('../config/queue', () => ({
    ticketQueue: {
        add: jest.fn().mockResolvedValue({ id: 'mock-job-id' })
    },
    notificationQueue: {
        add: jest.fn().mockResolvedValue({ id: 'mock-notif-id' })
    },
    connection: {
        on: jest.fn(),
        quit: jest.fn()
    }
}));

// Mock the core Redis Client so we don't hit rate limits or require Upstash during CI testing
jest.mock('../config/redis', () => {
    return {
        get: jest.fn().mockResolvedValue(null), // Simulate Cache Miss
        setEx: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
        isOpen: true
    };
});

describe('Event API (Integration Tests)', () => {
    let organizerToken;
    let eventId;

    const organizerData = {
        name: 'Test Organizer',
        email: 'organizer@events.com',
        password: 'Password123!',
        role: 'organizer'
    };

    const newEventData = {
        title: 'Supertest Music Festival',
        description: 'A massive music festival for automated testing.',
        date: '2026-12-31',
        time: '18:00',
        location: 'Jest Arena, NY',
        category: 'Music',
        price: 150,
        availableTickets: 5000,
        image: 'https://example.com/test-image.jpg'
    };

    const User = require('../models/User');
    const jwt = require('jsonwebtoken');

    beforeEach(async () => {
        // Because setup.js wipes the DB completely clean before every single test, 
        // we must explicitly recreate the organizer user in the DB before testing the APIs
        const user = await User.create(organizerData);

        // Generate a cryptographically valid token manually bypassing the HTTP layer
        organizerToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    });

    /**
     * @route POST /api/events
     */
    describe('POST /api/events', () => {
        it('should create a new event when authorized as an organizer', async () => {
            const response = await request(app)
                .post('/api/events')
                .set('Authorization', `Bearer ${organizerToken}`)
                .send(newEventData);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('_id');
            expect(response.body.title).toBe(newEventData.title);
            expect(response.body.availableTickets).toBe(5000);

            // Save event ID for the next tests
            eventId = response.body._id;
        });

        it('should fail to create an event if the Authorization token is missing', async () => {
            const response = await request(app)
                .post('/api/events')
                .send(newEventData);

            expect(response.status).toBe(401);
            expect(response.body.message).toMatch(/Not authorized/);
        });
    });

    /**
     * @route GET /api/events
     */
    describe('GET /api/events', () => {
        const Event = require('../models/Event');
        let seededEventId;

        beforeEach(async () => {
            // Seed a test event natively into MongoDB. Since the organizer was already created in the 
            // parent beforeEach, we can associate it here.
            const user = await User.findOne({ email: organizerData.email });
            const createdEvent = await Event.create({ ...newEventData, organizer: user._id });
            seededEventId = createdEvent._id.toString();
        });

        it('should fetch all events successfully (Cache Miss Simulation)', async () => {
            const response = await request(app).get('/api/events');

            expect(response.status).toBe(200);
            // It should be an array and contain our newly created event
            expect(Array.isArray(response.body)).toBeTruthy();
            expect(response.body.length).toBeGreaterThan(0);
            expect(response.body[0].title).toBe(newEventData.title);
        });

        it('should fetch a single event by ID', async () => {
            const response = await request(app).get(`/api/events/${seededEventId}`);

            expect(response.status).toBe(200);
            expect(response.body._id).toBe(seededEventId);
            expect(response.body.title).toBe(newEventData.title);
        });

        it('should return 404 for an invalid event ID format', async () => {
            const invalidId = new mongoose.Types.ObjectId().toString(); // Random ID
            const response = await request(app).get(`/api/events/${invalidId}`);

            expect(response.status).toBe(404);
        });
    });
});
