const asyncHandler = require('express-async-handler');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const { generateTicketPDF } = require('../utils/pdfGenerator');
const { sendTicketEmail } = require('../utils/emailSender');
const { invalidateEventCache } = require('../utils/cacheHelper');

// Initialize Razorpay
// Note: These will be undefined until the user adds them to .env
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// @desc    Create Razorpay Order
// @route   POST /api/payments/order
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
    const { eventId, quantity } = req.body;

    if (!eventId || !quantity) {
        res.status(400);
        throw new Error('Please provide eventId and quantity');
    }

    const event = await Event.findById(eventId);
    if (!event) {
        res.status(404);
        throw new Error('Event not found');
    }

    if (event.availableTickets < quantity) {
        res.status(400);
        throw new Error('Not enough tickets available');
    }

    const amount = event.price * quantity * 100; // Amount in paise
    const currency = 'INR';

    const options = {
        amount,
        currency,
        receipt: `rcpt_${eventId.toString().slice(-6)}_${Date.now()}`, 
    };

    try {
        const order = await razorpay.orders.create(options);
        res.status(201).json({
            success: true,
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            event: {
                title: event.title,
                price: event.price
            }
        });
    } catch (error) {
        console.error("Razorpay Order Error:", error);
        // Ensure we send a proper JSON response instead of just throwing to avoid SDK normalization errors
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.description || 'Could not create Razorpay order',
            error: error.error || error.message
        });
    }
});

// @desc    Verify Razorpay Payment and Finalize Booking
// @route   POST /api/payments/verify
// @access  Private
const verifyPayment = asyncHandler(async (req, res) => {
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        eventId,
        quantity
    } = req.body;

    // 1. Verify Signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

    const isSignatureValid = expectedSignature === razorpay_signature;

    if (!isSignatureValid) {
        res.status(400);
        throw new Error('Invalid payment signature. Payment might be tampered with.');
    }

    // 2. Atomic Inventory Check & Update
    const updatedEvent = await Event.findOneAndUpdate(
        {
            _id: eventId,
            availableTickets: { $gte: quantity }
        },
        {
            $inc: {
                availableTickets: -quantity,
                soldTickets: quantity
            }
        },
        { new: true }
    );

    if (!updatedEvent) {
        // This is a rare edge case where tickets sold out between order creation and payment
        // In a real production app, we would initiate a Razorpay Refund here.
        res.status(409);
        throw new Error('Tickets sold out before payment could be finalized. Contact support for refund.');
    }

    // 3. Create Ticket
    const ticket = await Ticket.create({
        user: req.user.id,
        event: eventId,
        quantity,
        status: 'Confirmed',
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
        amount: (updatedEvent.price * quantity)
    });

    console.log(`✅ [Payment] Verified & Ticket ${ticket._id} created for user ${req.user.id}`);

    // 4. Background tasks
    await invalidateEventCache();

    // Broadcast realtime update
    try {
        const { getIO } = require('../socket');
        const io = getIO();
        io.emit('ticket_updated', {
            eventId,
            availableTickets: updatedEvent.availableTickets
        });
    } catch (err) {}

    // Send Email
    setImmediate(async () => {
        try {
            const pdfBuffer = await generateTicketPDF(ticket, updatedEvent, req.user);
            await sendTicketEmail(req.user, updatedEvent, pdfBuffer);
        } catch (emailErr) {
            console.error(`❌ [Email] Failed:`, emailErr.message);
        }
    });

    res.status(200).json({
        success: true,
        message: 'Payment verified and ticket booked',
        ticketId: ticket._id
    });
});

module.exports = {
    createOrder,
    verifyPayment
};
