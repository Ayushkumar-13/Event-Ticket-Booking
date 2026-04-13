const mongoose = require('mongoose');

const eventSchema = mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a title']
    },
    description: {
        type: String,
        required: false
    },
    date: {
        type: Date,
        required: [true, 'Please add a date']
    },
    time: {
        type: String,
        required: [true, 'Please add a time']
    },
    location: {
        type: String,
        required: [true, 'Please add a location']
    },
    price: {
        type: Number,
        required: [true, 'Please add a price'],
        default: 0
    },
    currency: {
        type: String,
        required: [true, 'Please add a currency'],
        default: 'INR',
        enum: ['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD']
    },
    category: {
        type: String,
        required: false
    },
    image: {
        type: String,
        required: false,
        default: 'https://placehold.co/600x400'
    },
    availableTickets: {
        type: Number,
        required: [true, 'Please add available tickets count'],
        min: 0
    },
    soldTickets: {
        type: Number,
        default: 0
    },
    organizer: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    }
}, {
    timestamps: true
});

// --- DATABASE INDEXING STRATEGY ---
// Feature 3: Compound Indexes for complex user queries
// When an event app scales to millions of events, users querying by multiple fields 
// (e.g. "Find Music events in New York this weekend") forces MongoDB to do a full collection scan.
// This compound index creates a B-Tree sorting these three fields together,
// completely optimizing read-heavy querying for the most common search patterns.
eventSchema.index({ date: 1, location: 1, category: 1 });

// We also add an index on organizer, as the planner dashboard frequently queries this.
eventSchema.index({ organizer: 1 });

module.exports = mongoose.model('Event', eventSchema);
