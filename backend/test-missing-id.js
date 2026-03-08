require('dotenv').config();
const request = require('supertest');
const app = require('./src/app');
const mongoose = require('mongoose');
const User = require('./src/models/User');
const jwt = require('jsonwebtoken');

(async () => {
    await mongoose.connect(process.env.MONGO_URI);

    // We already know Ayush is an organizer
    const user = await User.findOne({ email: 'ayushkumar6064@gmail.com' });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    console.log("Testing POST /api/tickets/book with UNDEFINED eventId...");

    const res = await request(app)
        .post('/api/tickets/book')
        .set('Authorization', `Bearer ${token}`)
        .send({ quantity: 1 }); // Missing eventId intentionally

    console.log("Status:", res.status);
    console.log("Body:", res.body);

    process.exit(0);
})();
