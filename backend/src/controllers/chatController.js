const asyncHandler = require('express-async-handler');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const { generateTicketPDF } = require('../utils/pdfGenerator');
const { sendTicketEmail } = require('../utils/emailSender');
const { invalidateEventCache } = require('../utils/cacheHelper');
const ApiError = require('../utils/ApiError');

// ─────────────────────────────────────────────────────────────────────────────
// Uses Gemini 2.5 Flash — free tier, fast, supports tools & systemInstruction
// Free tier limits: 10 RPM, 500 RPD via Google AI Studio key
// ─────────────────────────────────────────────────────────────────────────────

const FREE_MODEL = 'gemini-2.5-flash-preview-04-17';

const SYSTEM_INSTRUCTION = {
    parts: [{ text: 'You are a helpful ticketing assistant. You help users search for events and book tickets.' }]
};

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
                    quantity: { type: 'NUMBER', description: 'Number of tickets to book' }
                },
                required: ['eventId', 'quantity']
            }
        }
    ]
}];

async function callGemini(apiKey, contents) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${FREE_MODEL}:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            systemInstruction: SYSTEM_INSTRUCTION,
            tools: TOOLS,
            contents
        })
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data?.error?.message || `HTTP ${res.status}`);
    }

    return data;
}

function extractText(data) {
    const parts = data?.candidates?.[0]?.content?.parts || [];
    return parts.find(p => p.text)?.text || null;
}

function extractFunctionCall(data) {
    const parts = data?.candidates?.[0]?.content?.parts || [];
    return parts.find(p => p.functionCall)?.functionCall || null;
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

    const rawKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!rawKey) {
        throw new ApiError(500, 'GEMINI_API_KEY not found in environment variables.');
    }

    const contents = [
        ...previousHistory.map(msg => ({
            role: msg.role === 'ai' ? 'model' : 'user',
            parts: [{ text: msg.text }]
        })),
        { role: 'user', parts: [{ text: message }] }
    ];

    try {
        console.log(`🤖 [Gemini] Using free model: ${FREE_MODEL}`);
        let data = await callGemini(rawKey, contents);

        // Handle tool/function calls — max 2 turns
        let turnCount = 0;
        while (turnCount < 2) {
            const fnCall = extractFunctionCall(data);
            if (!fnCall) break;

            console.log(`🔧 [Tool] Calling: ${fnCall.name}`, fnCall.args);
            let functionResponseData = { status: 'error', message: 'Unknown function' };

            if (fnCall.name === 'searchEvents') {
                const { query, category, maxPrice } = fnCall.args;
                let filter = {};
                if (query) filter.$or = [
                    { title: { $regex: query, $options: 'i' } },
                    { location: { $regex: query, $options: 'i' } }
                ];
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

                    const ticket = await Ticket.create({
                        user: req.user.id,
                        event: eventId,
                        quantity,
                        status: 'Confirmed'
                    });
                    await invalidateEventCache();

                    // Send PDF email in background — non-blocking
                    setImmediate(async () => {
                        try {
                            const pdf = await generateTicketPDF(ticket, updatedEvent, req.user);
                            await sendTicketEmail(req.user, updatedEvent, pdf);
                        } catch (e) {
                            console.error('📧 [Email] Failed:', e.message);
                        }
                    });

                    functionResponseData = {
                        status: 'success',
                        message: `Booked ${quantity} ticket(s)! Ticket ID: ${ticket._id}`
                    };
                } catch (err) {
                    functionResponseData = { status: 'error', error: err.message };
                }
            }

            contents.push(
                { role: 'model', parts: [{ functionCall: fnCall }] },
                { role: 'user', parts: [{ functionResponse: { name: fnCall.name, response: functionResponseData } }] }
            );

            data = await callGemini(rawKey, contents);
            turnCount++;
        }

        const finalOutput = extractText(data) || "I'm sorry, I couldn't process that request right now.";
        return res.status(200).json({ responseText: finalOutput });

    } catch (err) {
        console.error(`❌ [Gemini] ${FREE_MODEL} failed:`, err.message);
        res.status(500).json({
            message: 'AI Assistant is currently unavailable. Please try again later.',
            error: err.message
        });
    }
});

module.exports = { handleChat };