const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

/**
 * Mongoose Connection Strategy for Testing:
 * 1. Before EVERY test suite starts, spin up an isolated, temporary MongoDB instance in memory.
 * 2. Before EVERY individual test runs, wipe all collections completely clean, ensuring zero data bleed.
 * 3. After ALL tests finish, sever the Mongoose connection and kill the in-memory process.
 */

beforeAll(async () => {
    // Inject mock environment variables so the Express app doesn't crash on undefined secrets
    process.env.JWT_SECRET = 'supersecret_jest_testing_key_123';
    process.env.PORT = '5001';

    // If Mongoose is already connected (e.g., from app.js), disconnect it first
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }

    // Spin up the temporary MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Connect Mongoose to the newly spun up Memory Server
    await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
});

beforeEach(async () => {
    // Before each individual test function runs, delete ALL documents in ALL collections
    // This gives every single `it('should...')` test block a 100% pristine database state
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
    }
});

afterAll(async () => {
    // Teardown the connections safely so Jest can forcefully exit
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
    }
    if (mongoServer) {
        await mongoServer.stop();
    }
});
