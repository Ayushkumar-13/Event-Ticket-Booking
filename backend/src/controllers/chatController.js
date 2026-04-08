const asyncHandler = require('express-async-handler');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const { generateTicketPDF } = require('../utils/pdfGenerator');
const { sendTicketEmail } = require('../utils/emailSender');
const { invalidateEventCache } = require('../utils/cacheHelper');
const ApiError = require('../utils/ApiError');

// REST API Configuration (v1beta is REQUIRED for system_instruction and tools)
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const MODELS_TO_TRY = [
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-pro',
    'gemini-2.0-flash-exp'
];

const TOOLS = [{
    functionDeclarations: [
        {
            name: 'searchEvents',
            description: 'Search for events by title, location, category or price',
            parameters: {
                type: 'OBJECT',
                properties: {
                    query: { type: 'STRING', description: 'Search keyword' },
                    category: { type: 'STRING', description: 'Event category' },
                    maxPrice: { type: 'NUMBER', description: 'Maximum ticket price' }
                }
            }
        },
        {
            name: 'bookTickets',
            description: 'Book tickets for an event',
            parameters: {
                type: 'OBJECT',
                properties: {
                    eventId: { type: 'STRING', description: 'The event ID' },
                    quantity: { type: 'NUMBER', description: 'Number of tickets' }
                },
                required: ['eventId', 'quantity']
            }
        }
    ]
}];

const SYSTEM_INSTRUCTION = {
    parts: [{ text: 'You are a helpful ticketing assistant. You can search for events and book tickets for users. Be energetic and helpful!' }]
};

// Direct REST call to Gemini v1beta
async function callGemini(apiKey, modelName, contents) {
    const url = `${GEMINI_BASE}/${modelName}:generateContent?key=${apiKey}`;
    const body = {
        system_instruction: SYSTEM_INSTRUCTION,
        tools: TOOLS,
        contents
    };

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    const data = await res.json();
    if (!res.ok) {
        throw new Error(data?.error?.message || `HTTP ${res.status}`);
    }
    return data;
}

function extractText(data) {
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

function extractFunctionCall(data) {
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const fnPart = parts.find(p => p.functionCall);
    return fnPart ? fnPart.functionCall : null;
}

// @desc    Handle chat assistant messages
// @route   POST /api/chat
// @access  Private
const handleChat = asyncHandler(async (req, res) => {
    const { message, previousHistory = [] } = req.body;

    if (!message) {
        res.status(400);
        throw new Error('Message is required');
    }

    const rawKey = process.env.GEMINI_API_KEY;
    if (!rawKey) {
        throw new ApiError(500, 'GEMINI_API_KEY not found in environment.');
    }

    const key = rawKey.trim();

    // Map history to Gemini format
    const contents = [
        ...previousHistory.map(msg => ({
            role: msg.role === 'ai' ? 'model' : 'user',
            parts: [{ text: msg.text }]
        })),
        { role: 'user', parts: [{ text: message }] }
    ];

    let lastError = null;
    const debugInfo = { attempts: [] };

    for (const modelName of MODELS_TO_TRY) {
        try {
            debugInfo.attempts.push(modelName);
            console.log(`🤖 [REST Attempt] Trying: ${modelName}...`);

            let data = await callGemini(key, modelName, contents);
            
            // Loop for potential tool calls (max 2 turns)
            let turnCount = 0;
            while (turnCount < 2) {
                const fnCall = extractFunctionCall(data);
                if (!fnCall) break;

                console.log(`🔧 [Gemini Tool] Executing: ${fnCall.name}`, fnCall.args);
                let functionResponseData = { status: 'error', message: 'Unknown function' };

                if (fnCall.name === 'searchEvents') {
                    const { query, category, maxPrice } = fnCall.args;
                    let filter = {};
                    if (query) filter.$or = [{ title: { $regex: query, $options: 'i' } }, { location: { $regex: query, $options: 'i' } }];
                    if (category) filter.category = { $regex: new RegExp(`^${category}$`, 'i') };
                    if (maxPrice) filter.price = { $lte: maxPrice };
                    const events = await Event.find(filter).limit(3);
                    functionResponseData = { status: 'success', results: events };
                }
                else if (fnCall.name === 'bookTickets') {
                    const { eventId, quantity } = fnCall.args;
                    try {
                        const event = await Event.findById(eventId);
                        if (!event) throw new Error('Event not found');
                        const updatedEvent = await Event.findOneAndUpdate(
                            { _id: eventId, availableTickets: { $gte: quantity } },
                            { $inc: { availableTickets: -quantity, soldTickets: quantity } },
                            { new: true }
                        );
                        if (!updatedEvent) throw new Error('Tickets sold out');

                        const ticket = await Ticket.create({ user: req.user.id, event: eventId, quantity, status: 'Confirmed' });
                        await invalidateEventCache();
                        
                        // Side Effect: Async Email and PDF
                        setImmediate(async () => {
                            try {
                                const userForEmail = { id: req.user.id, email: req.user.email, name: req.user.name };
                                const eventForEmail = { title: updatedEvent.title, location: updatedEvent.location, date: updatedEvent.date, time: updatedEvent.time, price: updatedEvent.price };
                                const pdfBuffer = await generateTicketPDF(ticket, eventForEmail, userForEmail);
                                await sendTicketEmail(userForEmail, eventForEmail, pdfBuffer);
                            } catch (e) { console.error("📧 Email Error:", e.message); }
                        });

                        functionResponseData = { status: 'success', message: `Booked ${quantity} tickets! Ticket ID: ${ticket._id}` };
                    } catch (err) { functionResponseData = { status: 'error', error: err.message }; }
                }

                // Add call and response to history and re-call
                contents.push(
                    { role: 'model', parts: [{ functionCall: fnCall }] },
                    { role: 'user', parts: [{ functionResponse: { name: fnCall.name, response: functionResponseData } }] }
                );
                data = await callGemini(key, modelName, contents);
                turnCount++;
            }

            const finalOutput = extractText(data) || "I'm sorry, I'm having trouble phrasing that.";
            return res.status(200).json({ responseText: finalOutput });

        } catch (err) {
            console.warn(`⚠️ [REST Attempt] ${modelName} failed:`, err.message);
            lastError = err;
            continue;
        }
    }

    res.status(500).json({
        message: 'AI Assistant is currently unavailable.',
        error: lastError?.message || 'All model fallbacks failed.',
        debug: debugInfo
    });
});

module.exports = { handleChat };