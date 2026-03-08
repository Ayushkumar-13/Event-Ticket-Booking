require('dotenv').config();
const request = require('supertest');
const app = require('./src/app');
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Event = require('./src/models/Event');
const jwt = require('jsonwebtoken');

(async () => {
    await mongoose.connect(process.env.MONGO_URI);

    // We already know Ayush is an organizer
    const user = await User.findOne({ email: 'ayushkumar6064@gmail.com' });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    const event = await Event.findOne();
    console.log("Attempting to book event ID:", event._id.toString());

    const res = await request(app)
        .post('/api/tickets/book')
        .set('Authorization', `Bearer ${token}`)
        .send({ eventId: event._id.toString(), quantity: 1 });

    console.log("Status:", res.status);
    console.log("Body:", res.body);

    process.exit(0);
})();
