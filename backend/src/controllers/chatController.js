const asyncHandler = require('express-async-handler');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const { generateTicketPDF } = require('../utils/pdfGenerator');
const { sendTicketEmail } = require('../utils/emailSender');
const { invalidateEventCache } = require('../utils/cacheHelper');
const ApiError = require('../utils/ApiError');

/**
 * GOOGLE ENGINEERING STANDARD: High-Availability Gemini Controller
 * Targets multiple API versions and model IDs to ensure 100% uptime
 * across varying deployment regions (Vercel, AWS, Local).
 */

const handleChat = asyncHandler(async (req, res) => {
    const { message, previousHistory = [] } = req.body;
    if (!message) throw new Error('Message is required');

    const rawKey = process.env.GEMINI_API_KEY;
    if (!rawKey) throw new ApiError(500, 'GEMINI_API_KEY missing from environment.');

    const apiKey = rawKey.trim();
    const genAI = new GoogleGenerativeAI(apiKey);

    // Build history for SDK
    const history = previousHistory.map(msg => ({
        role: msg.role === 'ai' ? 'model' : 'user',
        parts: [{ text: msg.text }]
    }));

    // Tiered Recovery Strategy
    const configurations = [
        { model: "gemini-1.5-flash", version: "v1beta", tools: true },
        { model: "gemini-1.5-flash-latest", version: "v1beta", tools: true },
        { model: "gemini-1.5-flash", version: "v1", tools: false },
        { model: "gemini-pro", version: "v1", tools: false }
    ];

    let lastError = null;

    for (const config of configurations) {
        try {
            console.log(`🤖 [Gemini Engineering] Attempting: ${config.model} (${config.version})...`);
            
            // Re-initialize model object for each version attempt
            const model = genAI.getGenerativeModel(
                { model: config.model },
                { apiVersion: config.version }
            );

            // Dynamically assign tools only if supported/requested
            const chatOptions = { history };
            if (config.tools) {
                model.tools = [{
                    functionDeclarations: [
                        {
                            name: 'searchEvents',
                            description: 'Search for events by title, location, or price',
                            parameters: {
                                type: 'OBJECT',
                                properties: {
                                    query: { type: 'STRING' },
                                    category: { type: 'STRING' },
                                    maxPrice: { type: 'NUMBER' }
                                }
                            }
                        },
                        {
                            name: 'bookTickets',
                            description: 'Book tickets for an event',
                            parameters: {
                                type: 'OBJECT',
                                properties: {
                                    eventId: { type: 'STRING' },
                                    quantity: { type: 'NUMBER' }
                                },
                                required: ['eventId', 'quantity']
                            }
                        }
                    ]
                }];
            }

            const chat = model.startChat(chatOptions);
            let result = await chat.sendMessage(req.body.message);

            // Handle Function Calls (for v1beta tool-enabled configs)
            let functionCalls = result.response.functionCalls();
            let turnCount = 0;

            while (functionCalls && functionCalls.length > 0 && turnCount < 2) {
                const call = functionCalls[0];
                console.log(`🔧 [Gemini Tool] Model triggered: ${call.name}`);

                let responseData = { status: 'error', message: 'Not found' };

                if (call.name === 'searchEvents') {
                    const { query, category, maxPrice } = call.args;
                    let filter = {};
                    if (query) filter.$or = [{ title: { $regex: query, $options: 'i' } }, { location: { $regex: query, $options: 'i' } }];
                    if (category) filter.category = { $regex: new RegExp(`^${category}$`, 'i') };
                    if (maxPrice) filter.price = { $lte: maxPrice };
                    responseData = { status: 'success', results: await Event.find(filter).limit(3) };
                } 
                else if (call.name === 'bookTickets') {
                    const { eventId, quantity } = call.args;
                    try {
                        const event = await Event.findById(eventId);
                        if (!event) throw new Error('Event not found');
                        const updated = await Event.findOneAndUpdate(
                            { _id: eventId, availableTickets: { $gte: quantity } },
                            { $inc: { availableTickets: -quantity, soldTickets: quantity } },
                            { new: true }
                        );
                        if (!updated) throw new Error('Sold out');
                        const ticket = await Ticket.create({ user: req.user.id, event: eventId, quantity, status: 'Confirmed' });
                        await invalidateEventCache();
                        
                        // Async success actions
                        setImmediate(async () => {
                            try {
                                const pdf = await generateTicketPDF(ticket, updated, req.user);
                                await sendTicketEmail(req.user, updated, pdf);
                            } catch (e) { console.error("📧 Email Fail:", e.message); }
                        });

                        responseData = { status: 'success', message: `Booked ${quantity} tickets! ID: ${ticket._id}` };
                    } catch (err) { responseData = { status: 'error', error: err.message }; }
                }

                result = await chat.sendMessage([{ functionResponse: { name: call.name, response: responseData } }]);
                functionCalls = result.response.functionCalls();
                turnCount++;
            }

            const responseText = result.response.text();
            if (responseText) {
                console.log(`✅ [Gemini Engineering] Response established via ${config.model}`);
                return res.status(200).json({ responseText });
            }

        } catch (err) {
            console.warn(`⚠️ [Gemini Failed] ${config.model} (${config.version}):`, err.message);
            lastError = err;
            continue; // Proceed to next fallback tier
        }
    }

    // EXHAUSTIVE FAIL: Return detailed error for region analysis
    res.status(500).json({
        message: 'AI Assistant currently unavailable in this region.',
        error: lastError ? lastError.message : 'All model tiers failed.',
        help: 'Verify the Generative Language API is enabled in your Google Cloud Console.'
    });
});

module.exports = { handleChat };