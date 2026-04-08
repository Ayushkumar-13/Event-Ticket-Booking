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

    // DISCOVERY MODE: Let's see what models this API key actually supports
    let modelsToTry = ["gemini-1.5-flash", "gemini-pro", "gemini-1.5-flash-8b", "gemini-2.0-flash-exp"];
    let debugInfo = { attempts: [] };

    try {
        console.log("🔍 [Gemini] Auto-discovering models for this API key...");
        // listModels() is the best way to find out what the user project has enabled
        // but it can fail based on API key permissions, so we use it as a hint
        const modelList = await genAI.listModels();
        if (modelList && modelList.models) {
            const discovered = modelList.models
                .filter(m => m.supportedGenerationMethods.includes('generateContent'))
                .map(m => m.name.replace('models/', ''));
            
            if (discovered.length > 0) {
                console.log("✨ [Gemini] Discovered working models:", discovered);
                // Prepend discovered models to our list to prioritize them
                modelsToTry = [...new Set([...discovered, ...modelsToTry])];
            }
        }
    } catch (discoveryErr) {
        console.warn("⚠️ [Gemini] Discovery failed, falling back to static list:", discoveryErr.message);
        debugInfo.discoveryError = discoveryErr.message;
    }
    
    let lastError = null;

    for (const modelName of modelsToTry) {
        try {
            debugInfo.attempts.push(modelName);
            console.log(`🤖 [Gemini] Trying: ${modelName}...`);
            
            const model = genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: "You are a helpful, enthusiastic ticketing assistant for an event ticketing app. You can search for events and book tickets for users.",
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

            // If we're here, we found a winner!
            console.log(`✅ [Gemini] Successfully used: ${modelName}`);

            // Handle potential tool calls
            let functionCalls = result.response.functionCalls();
            let turnCount = 0;

            while (functionCalls && functionCalls.length > 0 && turnCount < 3) {
                const call = functionCalls[0];
                let functionResponseData = { status: "error", error: "Not found" };

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
                    } catch (err) { functionResponseData = { status: "error", error: err.message }; }
                }

                result = await chat.sendMessage([{ functionResponse: { name: call.name, response: functionResponseData } }]);
                functionCalls = result.response.functionCalls();
                turnCount++;
            }

            let finalOutput = result.response.text();
            return res.status(200).json({ responseText: finalOutput });

        } catch (err) {
            console.error(`⚠️ [Gemini] ${modelName} failed:`, err.message);
            lastError = err;
            continue; 
        }
    }

    res.status(500).json({
        message: "AI Assistant unavailable in this region. Our server is discovering alternative models.",
        error: lastError ? lastError.message : "All models failed.",
        debug: debugInfo
    });
});

module.exports = { handleChat };