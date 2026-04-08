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

    // List of models to try. We start with 'gemini-pro' as it is the most widely supported globally.
    const modelsToTry = ["gemini-pro", "gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-1.5-pro"];
    
    let lastError = null;
    let attempts = [];

    // AGGRESSIVE RETRY LOOP: We try every model until one successfully sends a message
    for (const modelName of modelsToTry) {
        try {
            attempts.push(modelName);
            const model = genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: "You are a helpful, enthusiastic ticketing assistant for an event ticketing app. You can search for events and book tickets for users.",
                tools: [{
                    functionDeclarations: [
                        {
                            name: "searchEvents",
                            description: "Search for events based on query or price.",
                            parameters: {
                                type: "OBJECT",
                                properties: {
                                    query: { type: "STRING", description: "Search term" },
                                    category: { type: "STRING", description: "Category" },
                                    maxPrice: { type: "NUMBER", description: "Max price" }
                                }
                            }
                        },
                        {
                            name: "bookTickets",
                            description: "Book tickets for an event ID.",
                            parameters: {
                                type: "OBJECT",
                                properties: {
                                    eventId: { type: "STRING", description: "The 24-char hex ID" },
                                    quantity: { type: "NUMBER", description: "Number of tickets" }
                                },
                                required: ["eventId", "quantity"]
                            }
                        }
                    ]
                }]
            });

            const chat = model.startChat({ history: formattedHistory });
            let result = await chat.sendMessage(message);

            // Handle potential tool calls
            let functionCalls = result.response.functionCalls();
            let turnCount = 0;

            while (functionCalls && functionCalls.length > 0 && turnCount < 3) {
                const call = functionCalls[0];
                let functionResponseData = {};

                if (call.name === "searchEvents") {
                    const { query, category, maxPrice } = call.args;
                    let filter = {};
                    if (query) filter.$or = [{ title: { $regex: query, $options: 'i' } }, { location: { $regex: query, $options: 'i' } }];
                    if (category) filter.category = { $regex: new RegExp(`^${category}$`, 'i') };
                    if (maxPrice) filter.price = { $lte: maxPrice };

                    const events = await Event.find(filter).limit(5);
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
                    } catch (err) {
                        functionResponseData = { status: "error", error: err.message };
                    }
                }

                result = await chat.sendMessage([{ functionResponse: { name: call.name, response: functionResponseData } }]);
                functionCalls = result.response.functionCalls();
                turnCount++;
            }

            let finalOutput = "I'm sorry, I'm having trouble phrasing that.";
            try { finalOutput = result.response.text(); } catch (e) {
                if (result.response.candidates?.[0]?.content?.parts?.[0]?.text) finalOutput = result.response.candidates[0].content.parts[0].text;
            }

            return res.status(200).json({ responseText: finalOutput });

        } catch (err) {
            console.error(`⚠️ [Gemini] Model ${modelName} failed:`, err.message);
            lastError = err;
            // Always continue to the next model for ANY error in the fallback phase
            continue; 
        }
    }

    // ALL MODELS FAILED
    res.status(500).json({
        message: `AI Assistant is currently unavailable in this deployment region.`,
        error: lastError ? lastError.message : "All available models failed.",
        debug: { attempted: attempts }
    });
});

module.exports = { handleChat };