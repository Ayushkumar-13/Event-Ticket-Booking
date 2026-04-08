const asyncHandler = require('express-async-handler');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const { generateTicketPDF } = require('../utils/pdfGenerator');
const { sendTicketEmail } = require('../utils/emailSender');
const { invalidateEventCache } = require('../utils/cacheHelper');
const ApiError = require('../utils/ApiError');

const GEMINI_ROOT_BETA = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_ROOT_V1 = 'https://generativelanguage.googleapis.com/v1';

async function getAvailableModels(apiKey) {
    try {
        const res = await fetch(`${GEMINI_ROOT_BETA}/models?key=${apiKey}`);
        const data = await res.json();
        if (!res.ok) return [];
        return data.models
            .filter(m => m.supportedGenerationMethods.includes('generateContent'))
            .map(m => m.name);
    } catch (e) {
        console.error("🔍 Discovery failed:", e.message);
        return [];
    }
}

async function callGeminiREST(apiKey, modelPath, contents, useBeta = true) {
    const root = useBeta ? GEMINI_ROOT_BETA : GEMINI_ROOT_V1;
    const url = `${root}/${modelPath}:generateContent?key=${apiKey}`;
    
    // Tools and System Instructions are ONLY for v1beta
    const body = {
        contents,
        ...(useBeta && {
            system_instruction: { parts: [{ text: 'You are a helpful ticketing assistant for EventTix. You can search for events and book tickets.' }] },
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
            }]
        })
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

    const contents = [
        ...previousHistory.map(msg => ({
            role: msg.role === 'ai' ? 'model' : 'user',
            parts: [{ text: msg.text }]
        })),
        { role: 'user', parts: [{ text: message }] }
    ];

    let lastError = null;
    let debugInfo = { v1beta_attempts: [], v1_stable_attempt: null };

    // 1. TRY ADVANCED v1beta WITH TOOLS
    const betaModels = ['models/gemini-1.5-flash', 'models/gemini-1.5-flash-latest', 'models/gemini-pro'];
    for (const modelPath of betaModels) {
        try {
            debugInfo.v1beta_attempts.push(modelPath);
            let data = await callGeminiREST(apiKey, modelPath, contents, true);
            
            let turnCount = 0;
            while (turnCount < 2) {
                const candidates = data?.candidates?.[0]?.content?.parts || [];
                const fnCall = candidates.find(p => p.functionCall)?.functionCall;
                if (!fnCall) break;

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
                data = await callGeminiREST(apiKey, modelPath, contents, true);
                turnCount++;
            }

            const final = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (final) return res.status(200).json({ responseText: final });
        } catch (err) {
            console.warn(`⚠️ [v1beta] ${modelPath} failed:`, err.message);
            lastError = err;
        }
    }

    // 2. EMERGENCY v1 STABLE FALLBACK (No tools, just chat)
    try {
        debugInfo.v1_stable_attempt = 'models/gemini-1.5-flash';
        console.log("🚑 [Emergency] Attempting Stable v1 fallback...");
        // Re-use contents but remove function call history if any
        const simpleContents = contents.filter(c => !c.parts.some(p => p.functionCall || p.functionResponse));
        const stableData = await callGeminiREST(apiKey, 'models/gemini-1.5-flash', simpleContents, false);
        const stableText = stableData?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (stableText) return res.status(200).json({ responseText: stableText });
    } catch (stableErr) {
        console.error("❌ [Emergency] v1 fallback also failed:", stableErr.message);
    }

    res.status(500).json({ 
        message: 'AI Assistant currently unavailable in this deployment region.', 
        error: lastError?.message, 
        debug: debugInfo 
    });
});

module.exports = { handleChat };