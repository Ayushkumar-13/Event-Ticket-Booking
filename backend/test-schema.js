require('dotenv').config();
const mongoose = require('mongoose');
const Event = require('./src/models/Event');
const User = require('./src/models/User');

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const event = await Event.findOne();
        console.log("Single Event Dump:", JSON.stringify(event, null, 2));

        const user = await User.findOne({ email: 'ayushkumar6064@gmail.com' });
        console.log("Organizer Dump:", JSON.stringify(user, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
})();
