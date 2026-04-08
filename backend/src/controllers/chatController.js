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

    // ✅ UPDATED MODEL LIST — All stable, available models (2025)
    // Ordered from newest/best to oldest fallback
    let modelsToTry = [
        "gemini-2.0-flash",            // ✅ Newest stable flash model
        "gemini-2.0-flash-lite",       // ✅ Lighter version of 2.0 flash
        "gemini-1.5-flash",            // ✅ Proven stable
        "gemini-1.5-flash-8b",         // ✅ Smaller/faster 1.5 flash
        "gemini-1.5-pro",              // ✅ Most capable 1.5
    ];

    let lastError = null;
    let debugInfo = { attempts: [] };

    for (const modelName of modelsToTry) {
        try {
            debugInfo.attempts.push(modelName);
            console.log(`🤖 [Gemini] Trying model: ${modelName}...`);

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

            console.log(`✅ [Gemini] Success with model: ${modelName}`);

            let functionCalls = result.response.functionCalls();
            let turnCount = 0;

            while (functionCalls && functionCalls.length > 0 && turnCount < 2) {
                const call = functionCalls[0];
                let functionResponseData = { status: "error", message: "Not found" };

                if (call.name === "searchEvents") {
                    const { query, category, maxPrice } = call.args;
                    let filter = {};
                    if (query) filter.$or = [
                        { title: { $regex: query, $options: 'i' } },
                        { location: { $regex: query, $options: 'i' } }
                    ];
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
                        const ticket = await Ticket.create({
                            user: req.user.id,
                            event: eventId,
                            quantity,
                            status: 'Confirmed'
                        });
                        await invalidateEventCache();
                        functionResponseData = {
                            status: "success",
                            message: `Booked ${quantity} tickets! Ticket ID: ${ticket._id}`
                        };
                    } catch (err) {
                        functionResponseData = { status: "error", error: err.message };
                    }
                }

                result = await chat.sendMessage([{
                    functionResponse: { name: call.name, response: functionResponseData }
                }]);
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
            console.warn(`⚠️ [Gemini] Model ${modelName} failed:`, err.message);
            lastError = err;
            continue;
        }
    }

    // ALL ATTEMPTS FAILED
    res.status(500).json({
        message: "AI Assistant is currently unavailable. Please try again later.",
        error: lastError ? lastError.message : "All model fallbacks failed.",
        debug: debugInfo
    });
});

module.exports = { handleChat };