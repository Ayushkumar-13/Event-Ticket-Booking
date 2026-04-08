const asyncHandler = require('express-async-handler');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const { generateTicketPDF } = require('../utils/pdfGenerator');
const { sendTicketEmail } = require('../utils/emailSender');
const { invalidateEventCache } = require('../utils/cacheHelper');
const ApiError = require('../utils/ApiError');

/**
 * 2.5 FUTURE-PROOF & SURVIVAL CONTROLLER
 * Prioritizes experimental 2.5 paths with full survival fallback to 2.0 and 1.5.
 */

async function discoverModelsREST(apiKey, version) {
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/${version}/models?key=${apiKey}`);
        const data = await res.json();
        return (data.models || [])
            .filter(m => m.supportedGenerationMethods.includes('generateContent'))
            .map(m => m.name);
    } catch (e) {
        return [];
    }
}

const handleChat = asyncHandler(async (req, res) => {
    const { message, previousHistory = [] } = req.body;
    if (!message) throw new Error('Message is required');

    const rawKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!rawKey) throw new ApiError(500, 'GEMINI_API_KEY missing.');

    const genAI = new GoogleGenerativeAI(rawKey);
    let debugInfo = { v1_discovered: [], v1beta_discovered: [], attempts: [] };

    // 1. TIERED DISCOVERY
    debugInfo.v1_discovered = await discoverModelsREST(rawKey, 'v1');
    debugInfo.v1beta_discovered = await discoverModelsREST(rawKey, 'v1beta');

    // 2. BUILD SURVIVAL QUEUE (PRIORITIZING 2.5)
    const modelsToTry = [
        ...new Set([
            'models/gemini-2.5-flash',      // Future-Proofing
            'models/gemini-2.5-pro',        // Future-Proofing
            'models/gemini-2.0-flash',      // Current Best
            'models/gemini-2.0-flash-lite',
            'models/gemini-2.0-flash-exp',
            ...debugInfo.v1beta_discovered,
            ...debugInfo.v1_discovered,
            'models/gemini-1.5-flash',
            'models/gemini-1.5-flash-latest',
            'models/gemini-pro'
        ])
    ];

    const history = previousHistory.map(msg => ({
        role: msg.role === 'ai' ? 'model' : 'user',
        parts: [{ text: msg.text }]
    }));

    let lastError = null;

    for (const modelPath of modelsToTry) {
        const versions = ['v1beta', 'v1'];
        for (const apiVersion of versions) {
            try {
                const attemptId = `${modelPath} (${apiVersion})`;
                debugInfo.attempts.push(attemptId);
                console.log(`🤖 [Future-Proof] Attempting: ${attemptId}...`);

                const model = genAI.getGenerativeModel({ model: modelPath }, { apiVersion });

                if (apiVersion === 'v1beta') {
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
                                parameters: { type: 'OBJECT', properties: { eventId: { type: 'STRING' }, quantity: { type: 'NUMBER' } }, required: ["eventId", "quantity"] }
                            }
                        ]
                    }];
                }

                const chat = model.startChat({ history });
                let result = await chat.sendMessage(message);

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
                if (responseText) return res.status(200).json({ responseText });
            } catch (err) {
                console.warn(`⚠️ [Survival] ${modelPath} skipped:`, err.message);
                lastError = err;
                continue; 
            }
        }
    }

    res.status(500).json({
        message: 'AI Assistant currently unavailable.',
        error: lastError?.message,
        debug: debugInfo
    });
});

module.exports = { handleChat };