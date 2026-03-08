const request = require('supertest');
const app = require('../app'); // This imports the Express app without starting the listen() port

describe('Authentication API (Unit/Integration Tests)', () => {

    // Test data
    const userData = {
        name: 'Test Setup User',
        email: 'testsetupuser@example.com',
        password: 'Password123!',
        role: 'user'
    };

    /**
     * @route POST /api/auth/register
     */
    describe('POST /api/auth/register', () => {

        it('should successfully register a new user and generate a JWT token', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send(userData);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('_id');
            expect(response.body.name).toBe(userData.name);
            expect(response.body.email).toBe(userData.email);
            expect(response.body).toHaveProperty('token'); // FAANG checks for JWT presence
        });

        it('should fail with 400 Bad Request if the required fields are missing', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({ email: 'missingname@example.com' }); // Missing 'name' and 'password'

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Please add all fields');
        });

        it('should fail with 400 Bad Request if the user email already exists', async () => {
            // First time works
            await request(app).post('/api/auth/register').send(userData);

            // Second time fails
            const response = await request(app).post('/api/auth/register').send(userData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('User already exists');
        });
    });

    /**
     * @route POST /api/auth/login
     */
    describe('POST /api/auth/login', () => {

        beforeEach(async () => {
            // Seed the test database with our user before each login test
            await request(app).post('/api/auth/register').send(userData);
        });

        it('should successfully authenticate and return user info matching the registration', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: userData.email,
                    password: userData.password
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('token');
            expect(response.body.email).toBe(userData.email);
        });

        it('should reject login for a user that does not exist', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'wrongpassword'
                });

            expect(response.status).toBe(401); // 401 Unauthorized
            expect(response.body.message).toBe('Invalid credentials');
        });

        it('should reject login if the password does not match the hashed password in MongoDB', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: userData.email,
                    password: '123WrongPassword!'
                });

            expect(response.status).toBe(401);
            expect(response.body.message).toBe('Invalid credentials');
        });
    });
});
