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
        console.error("❌ [Gemini Configuration] GEMINI_API_KEY is missing from environment variables");
        throw new ApiError(500, 'Server AI Configuration Missing: GEMINI_API_KEY not found in dashboard settings.');
    }

    const key = rawKey.trim();
    const genAI = new GoogleGenerativeAI(key);

    // List of models to try in order of preference
    const modelsToTry = ["gemini-1.5-flash", "gemini-2.0-flash-exp", "gemini-pro", "models/gemini-1.5-flash"];
    
    let lastError = null;

    for (const modelName of modelsToTry) {
        try {
            console.log(`🤖 [Gemini] Attempting chat with model: ${modelName}...`);
            
            const model = genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: "You are a helpful, enthusiastic ticketing assistant for an event ticketing app. You can search for events and book tickets for users. If a user asks to book tickets but you don't know the exact Event ID, search for the event first, show them the options, and ask for confirmation before booking. If they provide enough detail that uniquely identifies an event, you can book it directly using the bookTickets tool. Always be polite and conversational. If you book successfully, tell the user their Ticket ID.",
                tools: [{
                    functionDeclarations: [
                        {
                            name: "searchEvents",
                            description: "Search for events based on a query, category, or maximum price.",
                            parameters: {
                                type: "OBJECT",
                                properties: {
                                    query: { type: "STRING", description: "Search term for naming or location" },
                                    category: { type: "STRING", description: "Event category (music, tech, etc.)" },
                                    maxPrice: { type: "NUMBER", description: "Maximum price" }
                                }
                            }
                        },
                        {
                            name: "bookTickets",
                            description: "Book tickets for a specific event. Requires an Event ID and quantity.",
                            parameters: {
                                type: "OBJECT",
                                properties: {
                                    eventId: { type: "STRING", description: "The 24-character hex ID of the event" },
                                    quantity: { type: "NUMBER", description: "Number of tickets to book" }
                                },
                                required: ["eventId", "quantity"]
                            }
                        }
                    ]
                }]
            });

            const formattedHistory = previousHistory.map(msg => ({
                role: msg.role === 'ai' ? 'model' : 'user',
                parts: [{ text: msg.text }]
            }));

            const chat = model.startChat({ history: formattedHistory });
            let result = await chat.sendMessage(message);

            // Handle potential tool calls
            let functionCalls = result.response.functionCalls();
            let turnCount = 0;

            while (functionCalls && functionCalls.length > 0 && turnCount < 3) {
                const call = functionCalls[0];
                console.log(`🤖 [Gemini Tool] Model ${modelName} executing: ${call.name}`);

                let functionResponseData = {};

                if (call.name === "searchEvents") {
                    const { query, category, maxPrice } = call.args;
                    let filter = {};
                    if (query) {
                        filter.$or = [
                            { title: { $regex: query, $options: 'i' } },
                            { location: { $regex: query, $options: 'i' } }
                        ];
                    }
                    if (category) filter.category = { $regex: new RegExp(`^${category}$`, 'i') };
                    if (maxPrice) filter.price = { $lte: maxPrice };

                    const events = await Event.find(filter).limit(5).select('_id title date time price location category availableTickets');
                    functionResponseData = { status: "success", results: events.length > 0 ? events : "No events found." };
                } 
                else if (call.name === "bookTickets") {
                    const { eventId, quantity } = call.args;
                    try {
                        const event = await Event.findById(eventId);
                        if (!event) throw new Error('Event not found');
                        if (event.availableTickets < quantity) throw new Error(`Only ${event.availableTickets} tickets left`);

                        const updatedEvent = await Event.findOneAndUpdate(
                            { _id: eventId, availableTickets: { $gte: quantity } },
                            { $inc: { availableTickets: -quantity, soldTickets: quantity } },
                            { new: true }
                        );

                        if (!updatedEvent) throw new Error('Race condition: Tickets sold out.');

                        const ticket = await Ticket.create({
                            user: req.user.id,
                            event: eventId,
                            quantity,
                            status: 'Confirmed'
                        });

                        await invalidateEventCache();
                        
                        // Async Email
                        setImmediate(async () => {
                            try {
                                const userForEmail = { id: req.user.id, email: req.user.email, name: req.user.name };
                                const eventForEmail = { title: updatedEvent.title, location: updatedEvent.location, date: updatedEvent.date, time: updatedEvent.time, price: updatedEvent.price };
                                const ticketForEmail = { _id: ticket._id, quantity: ticket.quantity, status: ticket.status };
                                const pdfBuffer = await generateTicketPDF(ticketForEmail, eventForEmail, userForEmail);
                                await sendTicketEmail(userForEmail, eventForEmail, pdfBuffer);
                            } catch (e) { console.error("📧 Email Error:", e.message); }
                        });

                        functionResponseData = { status: "success", message: `Booked ${quantity} tickets! Ticket ID: ${ticket._id}` };
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

            // Successful completion
            let finalOutput = "I'm sorry, I'm having trouble phrasing that.";
            try {
                finalOutput = result.response.text();
            } catch (e) {
                if (result.response.candidates?.[0]?.content?.parts?.[0]?.text) {
                    finalOutput = result.response.candidates[0].content.parts[0].text;
                }
            }

            return res.status(200).json({ responseText: finalOutput });

        } catch (err) {
            console.error(`⚠️ [Gemini] Model ${modelName} failed:`, err.message);
            lastError = err;
            if (err.message.includes('404') || err.message.includes('not found')) {
                continue; // Try next model in list
            }
            // If it's a non-404 error (like 401 or 429), break and throw
            break;
        }
    }

    // If we reach here, all models failed
    res.status(500).json({
        message: "AI Assistant is currently unavailable. Please check your dashboard API settings.",
        error: lastError ? lastError.message : "Unknown error"
    });
});

module.exports = { handleChat };