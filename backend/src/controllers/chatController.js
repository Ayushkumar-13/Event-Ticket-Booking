const asyncHandler = require('express-async-handler');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const { generateTicketPDF } = require('../utils/pdfGenerator');
const { sendTicketEmail } = require('../utils/emailSender');
const { invalidateEventCache } = require('../utils/cacheHelper');
const ApiError = require('../utils/ApiError');

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
        throw new ApiError(500, 'Server AI Configuration Missing: GEMINI_API_KEY not found in dashboard settings.');
    }

    const key = rawKey.trim();
    const genAI = new GoogleGenerativeAI(key);

    const formattedHistory = previousHistory.map(msg => ({
        role: msg.role === 'ai' ? 'model' : 'user',
        parts: [{ text: msg.text }]
    }));

    // ULTRA-COMPATIBLE FALLBACK LIST
    // We use the full 'models/' prefix which is more reliable in production environments like Vercel.
    let modelsToTry = [
        "models/gemini-1.5-flash-latest",
        "models/gemini-1.5-flash",
        "models/gemini-pro", 
        "models/gemini-1.0-pro",
        "gemini-1.5-flash",
        "gemini-pro"
    ];

    let lastError = null;
    let debugInfo = { attempts: [] };

    for (const modelName of modelsToTry) {
        try {
            debugInfo.attempts.push(modelName);
            console.log(`🤖 [Gemini] Survival Attempt: ${modelName}...`);
            
            const model = genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: "You are a helpful ticketing assistant. You can search for events and book tickets.",
                tools: [{
                    functionDeclarations: [
                        {
                            name: "searchEvents",
                            description: "Search for events",
                            parameters: {
                                type: "OBJECT",
                                properties: {
                                    query: { type: "STRING" },
                                    category: { type: "STRING" },
                                    maxPrice: { type: "NUMBER" }
                                }
                            }
                        },
                        {
                            name: "bookTickets",
                            description: "Book tickets",
                            parameters: {
                                type: "OBJECT",
                                properties: {
                                    eventId: { type: "STRING" },
                                    quantity: { type: "NUMBER" }
                                },
                                required: ["eventId", "quantity"]
                            }
                        }
                    ]
                }]
            });

            const chat = model.startChat({ history: formattedHistory });
            let result = await chat.sendMessage(message);

            // SUCCESS! We found a working model in the Vercel region
            console.log(`✅ [Gemini] Survival Success with: ${modelName}`);

            let functionCalls = result.response.functionCalls();
            let turnCount = 0;

            while (functionCalls && functionCalls.length > 0 && turnCount < 2) {
                const call = functionCalls[0];
                let functionResponseData = { status: "error", message: "Not found" };

                if (call.name === "searchEvents") {
                    const { query, category, maxPrice } = call.args;
                    let filter = {};
                    if (query) filter.$or = [{ title: { $regex: query, $options: 'i' } }, { location: { $regex: query, $options: 'i' } }];
                    if (category) filter.category = { $regex: new RegExp(`^${category}$`, 'i') };
                    if (maxPrice) filter.price = { $lte: maxPrice };
                    const events = await Event.find(filter).limit(3);
                    functionResponseData = { status: "success", results: events };
                } 
                else if (call.name === "bookTickets") {
                    const { eventId, quantity } = call.args;
                    try {
                        const event = await Event.findById(eventId);
                        if (!event) throw new Error('Event not found');
                        const updatedEvent = await Event.findOneAndUpdate(
                            { _id: eventId, availableTickets: { $gte: quantity } },
                            { $inc: { availableTickets: -quantity, soldTickets: quantity } },
                            { new: true }
                        );
                        if (!updatedEvent) throw new Error('Sold out');
                        const ticket = await Ticket.create({ user: req.user.id, event: eventId, quantity, status: 'Confirmed' });
                        await invalidateEventCache();
                        functionResponseData = { status: "success", message: `Booked ${quantity} tickets! Ticket ID: ${ticket._id}` };
                    } catch (err) { functionResponseData = { status: "error", error: err.message }; }
                }

                result = await chat.sendMessage([{ functionResponse: { name: call.name, response: functionResponseData } }]);
                functionCalls = result.response.functionCalls();
                turnCount++;
            }

            let finalOutput = "I'm sorry, I'm having trouble with that request right now.";
            try { 
                finalOutput = result.response.text(); 
            } catch (e) {
                if (result.response.candidates?.[0]?.content?.parts?.[0]?.text) {
                    finalOutput = result.response.candidates[0].content.parts[0].text;
                }
            }

            return res.status(200).json({ responseText: finalOutput });

        } catch (err) {
            console.warn(`⚠️ [Gemini] Model ${modelName} failed on Vercel:`, err.message);
            lastError = err;
            // Catch 404, 500, or regional blocks and try the next ID
            continue;
        }
    }

    // ALL ATTEMPTS FAILED
    res.status(500).json({
        message: "AI Assistant is currently facing regional connectivity issues.",
        error: lastError ? lastError.message : "Final fallback failed.",
        debug: debugInfo
    });
});

module.exports = { handleChat };