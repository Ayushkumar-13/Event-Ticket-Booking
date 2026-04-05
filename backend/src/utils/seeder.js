const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Organizer = require('../models/Organizer');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const { APPROVAL_MODES, REGISTRATION_STATUS } = require('../config/constants');

dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected for seeding...');
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        process.exit(1);
    }
};

// Import sample data
const importData = async () => {
    try {
        await connectDB();

        // Clear existing data
        await Organizer.deleteMany();
        await Event.deleteMany();
        await Registration.deleteMany();

        console.log('Existing data cleared...');

        // Create sample organizer
        const organizer = await Organizer.create({
            name: 'John Organizer',
            email: 'organizer@example.com',
            password: 'password123'
        });

        console.log('✅ Organizer created');

        // Create sample events
        const events = await Event.insertMany([
            {
                organizer: organizer._id,
                title: 'Tech Conference 2025',
                description: 'Join us for the biggest tech conference of the year featuring industry leaders and innovators.',
                date: new Date('2025-06-15'),
                venue: 'Convention Center, New York',
                ticketLimit: 500,
                approvalMode: APPROVAL_MODES.AUTO,
                registeredCount: 0
            },
            {
                organizer: organizer._id,
                title: 'Summer Music Festival',
                description: 'A weekend of live music, food, and fun with top artists from around the world.',
                date: new Date('2025-07-20'),
                venue: 'Central Park, New York',
                ticketLimit: 2000,
                approvalMode: APPROVAL_MODES.MANUAL,
                registeredCount: 0
            },
            {
                organizer: organizer._id,
                title: 'Startup Networking Event',
                description: 'Connect with founders, investors, and entrepreneurs in this exclusive networking event.',
                date: new Date('2025-05-10'),
                venue: 'Tech Hub, San Francisco',
                ticketLimit: 100,
                approvalMode: APPROVAL_MODES.AUTO,
                registeredCount: 0
            }
        ]);

        console.log('✅ Events created');

        // Create sample registrations
        const registrations = await Registration.insertMany([
            {
                event: events[0]._id,
                userName: 'Alice Johnson',
                userEmail: 'alice@example.com',
                userPhone: '+1234567890',
                status: REGISTRATION_STATUS.APPROVED
            },
            {
                event: events[1]._id,
                userName: 'Bob Smith',
                userEmail: 'bob@example.com',
                userPhone: '+1234567891',
                status: REGISTRATION_STATUS.PENDING
            },
            {
                event: events[2]._id,
                userName: 'Charlie Brown',
                userEmail: 'charlie@example.com',
                userPhone: '+1234567892',
                status: REGISTRATION_STATUS.APPROVED
            }
        ]);

        console.log('✅ Registrations created');
        
        process.exit();
    } catch (error) {
        console.error('Error importing data:', error);
        process.exit(1);
    }
};

// Destroy all data
const destroyData = async () => {
    try {
        await connectDB();

        await Organizer.deleteMany();
        await Event.deleteMany();
        await Registration.deleteMany();

        console.log('✅ All data destroyed!');
        process.exit();
    } catch (error) {
        console.error('Error destroying data:', error);
        process.exit(1);
    }
};

// Check command line arguments
if (process.argv[2] === '-d') {
    destroyData();
} else {
    importData();
}