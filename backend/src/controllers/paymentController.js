const asyncHandler = require('express-async-handler');
const axios = require('axios');
const https = require('https');
const crypto = require('crypto');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const { generateTicketPDF } = require('../utils/pdfGenerator');
const { sendTicketEmail } = require('../utils/emailSender');
const { invalidateEventCache } = require('../utils/cacheHelper');
const { convertToINR } = require('../utils/currencyService');

// ─────────────────────────────────────────────────────────────
// PRODUCTION-GRADE RAZORPAY HTTP CLIENT
// Bypasses the Razorpay Node SDK entirely to avoid its broken
// normalizeError handling on network failures.
// Mirrors what Stripe, Razorpay, and other payment gateways use
// internally in their own production SDKs.
// ─────────────────────────────────────────────────────────────
const razorpayClient = axios.create({
    baseURL: 'https://api.razorpay.com/v1',
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
    // Force IPv4 on the underlying TLS socket — identical to how we fixed MongoDB.
    // Node 18+ defaults to IPv6 which causes ENOTFOUND for many Indian hosts.
    httpsAgent: new https.Agent({ family: 4 })
});

/**
 * Production-grade retry with exponential backoff.
 * Standard practice at companies like Stripe/Shopify for
 * idempotent API calls that may fail due to intermittent network issues.
 * @param {Function} fn - Async function to retry
 * @param {number} retries - Max retry attempts (default 3)
 */
const withRetry = async (fn, retries = 3) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            const isRetryable = !error.response || error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
            if (!isRetryable || attempt === retries) throw error;

            const delay = Math.min(500 * Math.pow(2, attempt - 1), 4000); // 500ms → 1s → 2s → 4s cap
            console.warn(`⚠️ [Razorpay] Attempt ${attempt} failed. Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
};

const getRazorpayAuth = () => {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        throw new Error('Razorpay API keys are missing from environment variables');
    }
    return {
        username: process.env.RAZORPAY_KEY_ID,
        password: process.env.RAZORPAY_KEY_SECRET
    };
};

// ─────────────────────────────────────────────────────────────
// @desc    Create Razorpay Order
// @route   POST /api/payments/order
// @access  Private
// ─────────────────────────────────────────────────────────────
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

    const { amountINR } = await convertToINR(event.price * quantity, event.currency || 'INR');
    const amount = Math.round(amountINR) * 100; // Razorpay requires integer paise
    const currency = 'INR';
    const receipt = `rcpt_${eventId.toString().slice(-6)}_${Date.now()}`.slice(0, 40);

    try {
        console.log(`📦 [Razorpay] Creating order: amount=₹${amountINR} (${amount} paise), event="${event.title}"`);

        const order = await withRetry(() =>
            razorpayClient.post('/orders', { amount, currency, receipt }, {
                auth: getRazorpayAuth()
            }).then(r => r.data)
        );

        console.log(`✅ [Razorpay] Order created successfully: ${order.id}`);

        return res.status(201).json({
            success: true,
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            event: {
                title: event.title,
                price: event.price,
                currency: event.currency || 'INR'
            }
        });

    } catch (error) {
        const status = error.response?.status || 503;
        const message = error.response?.data?.error?.description
            || error.message
            || 'Could not create payment order. Please try again.';

        console.error(`❌ [Razorpay] Order creation failed after retries (HTTP ${status}):`, message);

        return res.status(status).json({
            success: false,
            message,
            error: error.response?.data?.error || error.message
        });
    }
});

// ─────────────────────────────────────────────────────────────
// @desc    Verify Razorpay Payment & Finalize Booking
// @route   POST /api/payments/verify
// @access  Private
// ─────────────────────────────────────────────────────────────
const verifyPayment = asyncHandler(async (req, res) => {
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        eventId,
        quantity
    } = req.body;

    // 1. HMAC-SHA256 Signature Verification (prevents payment tampering)
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest('hex');

    if (expectedSignature !== razorpay_signature) {
        console.error(`🚨 [Security] Invalid payment signature for order ${razorpay_order_id}`);
        res.status(400);
        throw new Error('Invalid payment signature. This payment may have been tampered with.');
    }

    // 2. Fetch event for pricing audit
    const event = await Event.findById(eventId);
    if (!event) {
        res.status(404);
        throw new Error('Event not found');
    }

    // 3. Calculate final amounts for audit trail
    const { amountINR, rate } = await convertToINR(event.price * quantity, event.currency || 'INR');

    // 4. Atomic Inventory Update (prevents overbooking under concurrent load)
    const updatedEvent = await Event.findOneAndUpdate(
        { _id: eventId, availableTickets: { $gte: quantity } },
        { $inc: { availableTickets: -quantity, soldTickets: quantity } },
        { new: true }
    );

    if (!updatedEvent) {
        res.status(409);
        throw new Error('Tickets sold out before payment finalized. Please contact support for a refund.');
    }

    // 5. Create Ticket with complete financial audit trail
    const ticket = await Ticket.create({
        user: req.user.id,
        event: eventId,
        quantity,
        status: 'Confirmed',
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
        amount: amountINR,
        originalAmount: event.price * quantity,
        originalCurrency: event.currency || 'INR',
        exchangeRate: rate
    });

    console.log(`✅ [Payment] Verified. Ticket ${ticket._id} created for user ${req.user.id}`);

    // 6. Async background tasks (non-blocking — keeps response fast)
    await invalidateEventCache();

    try {
        const { getIO } = require('../socket');
        getIO().emit('ticket_updated', { 
            eventId: eventId.toString(), 
            availableTickets: updatedEvent.availableTickets 
        });
    } catch (_) {}

    setImmediate(async () => {
        try {
            const pdfBuffer = await generateTicketPDF(ticket, updatedEvent, req.user);
            await sendTicketEmail(req.user, updatedEvent, pdfBuffer);
        } catch (emailErr) {
            console.error(`❌ [Email] PDF/Email delivery failed:`, emailErr.message);
        }
    });

    return res.status(200).json({
        success: true,
        message: 'Payment verified and ticket confirmed',
        ticketId: ticket._id
    });
});

module.exports = { createOrder, verifyPayment };
