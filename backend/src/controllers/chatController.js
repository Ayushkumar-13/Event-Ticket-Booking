const asyncHandler = require('express-async-handler');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const { generateTicketPDF } = require('../utils/pdfGenerator');
const { sendTicketEmail } = require('../utils/emailSender');
const { invalidateEventCache } = require('../utils/cacheHelper');
const ApiError = require('../utils/ApiError');

/**
 * ULTRA-STABLE DISCOVERY CONTROLLER
 * Automatically finds working model IDs for any deployment region.
 */

const handleChat = asyncHandler(async (req, res) => {
    const { message, previousHistory = [] } = req.body;
    if (!message) throw new Error('Message is required');

    const rawKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!rawKey) throw new ApiError(500, 'GEMINI_API_KEY missing.');

    const genAI = new GoogleGenerativeAI(rawKey);
    let discoveredModels = [];

    // 1. DISCOVERY PHASE (Bypass SDK bugs with direct REST)
    try {
        const discoverUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${rawKey}`;
        const discRes = await fetch(discoverUrl);
        const discData = await discRes.json();
        
        if (discData.models) {
            discoveredModels = discData.models
                .filter(m => m.supportedGenerationMethods.includes('generateContent'))
                .map(m => m.name); // Already includes "models/" prefix
            console.log("🔍 [Discovery] Valid models found:", discoveredModels.join(', '));
        }
    } catch (e) {
        console.warn("⚠️ [Discovery] Phase failed, falling back to static list.");
    }

    // 2. FALLBACK QUEUE (Discovered first, then standard defaults)
    const fallbackList = [
        'models/gemini-1.5-flash',
        'models/gemini-1.5-flash-latest',
        'models/gemini-pro',
        'models/gemini-1.0-pro'
    ];
    
    // De-duplicate and combine
    const modelsToTry = [...new Set([...discoveredModels, ...fallbackList])];

    const history = previousHistory.map(msg => ({
        role: msg.role === 'ai' ? 'model' : 'user',
        parts: [{ text: msg.text }]
    }));

    let lastError = null;
    let debugInfo = { attempts: [] };

    for (const modelPath of modelsToTry) {
        try {
            debugInfo.attempts.push(modelPath);
            console.log(`🤖 [Attempt] ${modelPath}...`);

            // SDK Initialization with explicit v1beta for tool support
            const model = genAI.getGenerativeModel(
                { model: modelPath },
                { apiVersion: 'v1beta' }
            );

            // Register Tools
            model.tools = [{
                functionDeclarations: [
                    {
                        name: 'searchEvents',
                        description: 'Search for events',
                        parameters: { type: 'OBJECT', properties: { query: { type: 'STRING' }, category: { type: 'STRING' }, maxPrice: { type: 'NUMBER' } } }
                    },
                    {
                        name: 'bookTickets',
                        description: 'Book tickets',
                        parameters: { type: 'OBJECT', properties: { eventId: { type: 'STRING' }, quantity: { type: 'NUMBER' } }, required: ['eventId', 'quantity'] }
                    }
                ]
            }];

            const chat = model.startChat({ history });
            let result = await chat.sendMessage(message);

            // Handle tool calls
            let functionCalls = result.response.functionCalls();
            let turnCount = 0;

            while (functionCalls && functionCalls.length > 0 && turnCount < 2) {
                const call = functionCalls[0];
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
                        const updated = await Event.findOneAndUpdate({ _id: eventId, availableTickets: { $gte: quantity } }, { $inc: { availableTickets: -quantity, soldTickets: quantity } }, { new: true });
                        if (!updated) throw new Error('Sold out');
                        const ticket = await Ticket.create({ user: req.user.id, event: eventId, quantity, status: 'Confirmed' });
                        await invalidateEventCache();
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
                return res.status(200).json({ responseText });
            }

        } catch (err) {
            console.warn(`⚠️ [Failed] ${modelPath}:`, err.message);
            lastError = err;
            continue;
        }
    }

    res.status(500).json({
        message: 'AI Assistant unavailable in this region.',
        error: lastError?.message,
        debug: { discovered: discoveredModels, tried: debugInfo.attempts }
    });
});

module.exports = { handleChat };