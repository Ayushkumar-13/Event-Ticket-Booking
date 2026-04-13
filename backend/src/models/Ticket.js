const mongoose = require('mongoose');

const ticketSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    event: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Event'
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    status: {
        type: String,
        enum: ['Confirmed', 'Cancelled'],
        default: 'Confirmed'
    },
    purchaseDate: {
        type: Date,
        default: Date.now
    },
    idempotencyKey: {
        type: String,
        unique: true,
        sparse: true
    },
    paymentId: {
        type: String
    },
    orderId: {
        type: String
    },
    signature: {
        type: String
    },
    amount: {
        type: Number
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Ticket', ticketSchema);
