const asyncHandler = require('express-async-handler');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const { generateTicketPDF } = require('../utils/pdfGenerator');
const { sendTicketEmail } = require('../utils/emailSender');
const { invalidateEventCache } = require('../utils/cacheHelper');
const ApiError = require('../utils/ApiError');

const GEMINI_ROOT = 'https://generativelanguage.googleapis.com/v1beta';

// Helper: Discover what models are actually available for this API Key
async function getAvailableModels(apiKey) {
    try {
        const res = await fetch(`${GEMINI_ROOT}/models?key=${apiKey}`);
        const data = await res.json();
        if (!res.ok) return [];
        
        // Filter for models that support generating content
        return data.models
            .filter(m => m.supportedGenerationMethods.includes('generateContent'))
            .map(m => m.name); // Usually 'models/gemini-1.5-flash' etc.
    } catch (e) {
        console.error("🔍 Discovery failed:", e.message);
        return [];
    }
}

async function callGeminiREST(apiKey, modelPath, contents) {
    // modelPath is already the full path like 'models/gemini-1.5-flash'
    const url = `${GEMINI_ROOT}/${modelPath}:generateContent?key=${apiKey}`;
    
    const body = {
        system_instruction: { parts: [{ text: 'You are a helpful ticketing assistant. You can search for events and book tickets for users.' }] },
        tools: [{
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
        }],
        contents
    };

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
    return data;
}

const handleChat = asyncHandler(async (req, res) => {
    const { message, previousHistory = [] } = req.body;
    if (!message) throw new Error('Message is required');

    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) throw new ApiError(500, 'GEMINI_API_KEY missing');

    // 1. DISCOVER MODELS
    let models = await getAvailableModels(apiKey);
    
    // Priority Fallback if discovery fails or is empty
    const fallbacks = [
        'models/gemini-1.5-flash',
        'models/gemini-1.5-flash-latest',
        'models/gemini-pro',
        'models/gemini-1.0-pro'
    ];
    
    // Combine discovered models with our fallbacks (removing duplicates)
    const modelsToTry = [...new Set([...models, ...fallbacks])];
    
    const contents = [
        ...previousHistory.map(msg => ({
            role: msg.role === 'ai' ? 'model' : 'user',
            parts: [{ text: msg.text }]
        })),
        { role: 'user', parts: [{ text: message }] }
    ];

    let lastError = null;
    const debugInfo = { attempted: [] };

    for (const modelPath of modelsToTry) {
        try {
            debugInfo.attempted.push(modelPath);
            console.log(`🤖 [REST Discovery] Trying: ${modelPath}...`);

            let data = await callGeminiREST(apiKey, modelPath, contents);
            
            // Tool loop
            let turnCount = 0;
            while (turnCount < 2) {
                const candidates = data?.candidates?.[0]?.content?.parts || [];
                const fnCall = candidates.find(p => p.functionCall)?.functionCall;
                if (!fnCall) break;

                console.log(`🔧 [Tool] Executing: ${fnCall.name}`);
                let responseData = { status: 'error', message: 'Not found' };

                if (fnCall.name === 'searchEvents') {
                    const { query, category, maxPrice } = fnCall.args;
                    let filter = {};
                    if (query) filter.$or = [{ title: { $regex: query, $options: 'i' } }, { location: { $regex: query, $options: 'i' } }];
                    if (category) filter.category = { $regex: new RegExp(`^${category}$`, 'i') };
                    if (maxPrice) filter.price = { $lte: maxPrice };
                    responseData = { status: 'success', results: await Event.find(filter).limit(3) };
                } 
                else if (fnCall.name === 'bookTickets') {
                    const { eventId, quantity } = fnCall.args;
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

                contents.push({ role: 'model', parts: [{ functionCall: fnCall }] }, { role: 'user', parts: [{ functionResponse: { name: fnCall.name, response: responseData } }] });
                data = await callGeminiREST(apiKey, modelPath, contents);
                turnCount++;
            }

            const final = data?.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I'm having trouble with that.";
            return res.status(200).json({ responseText: final });

        } catch (err) {
            console.warn(`⚠️ [REST] ${modelPath} failed:`, err.message);
            lastError = err;
            continue;
        }
    }

    res.status(500).json({ message: 'AI unavailable.', error: lastError?.message, debug: debugInfo });
});

module.exports = { handleChat };