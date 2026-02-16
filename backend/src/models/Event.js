const mongoose = require('mongoose');

const eventSchema = mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a title']
    },
    description: {
        type: String,
        required: [true, 'Please add a description']
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
    category: {
        type: String,
        required: [true, 'Please add a category']
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
    organizer: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Event', eventSchema);
