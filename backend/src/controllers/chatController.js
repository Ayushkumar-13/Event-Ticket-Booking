const asyncHandler = require('express-async-handler');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const { generateTicketPDF } = require('../utils/pdfGenerator');
const { sendTicketEmail } = require('../utils/emailSender');
const { invalidateEventCache } = require('../utils/cacheHelper');

// @desc    Handle chat assistant messages
// @route   POST /api/chat
// @access  Private
const handleChat = asyncHandler(async (req, res) => {
    const { message, previousHistory = [] } = req.body;
    
    if (!message) {
        res.status(400);
        throw new Error('Message is required');
    }

    if (!process.env.GEMINI_API_KEY) {
        console.error("❌ [Gemini Configuration] GEMINI_API_KEY is missing from .env");
        throw new ApiError(500, 'Server AI Configuration Missing: GEMINI_API_KEY not found in backend/.env');
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log("🤖 [Gemini] Initializing model: gemini-1.5-flash...");
    
    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: "You are a helpful, enthusiastic ticketing assistant for an event ticketing app. You can search for events and book tickets for users. If a user asks to book tickets but you don't know the exact Event ID, search for the event first, show them the options, and ask for confirmation before booking. If they provide enough detail that uniquely identifies an event, you can book it directly using the bookTickets tool. Always be polite and conversational. If you book successfully, tell the user their Ticket ID.",
        tools: [{
            functionDeclarations: [
                {
                    name: "searchEvents",
                    description: "Search for events based on a query, category, or maximum price. Use this to find events for the user.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            query: { type: "STRING", description: "Search term for the event title or location. Optional." },
                            category: { type: "STRING", description: "Category of the event (e.g., 'Music', 'Tech'). Optional." },
                            maxPrice: { type: "NUMBER", description: "Maximum price the user is willing to pay. Optional." }
                        }
                    }
                },
                {
                    name: "bookTickets",
                    description: "Book tickets for a specific event using the event ID. IMPORTANT: You need the 24-character hex ID string from MongoDB to call this. If you don't have it, search first.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            eventId: { type: "STRING", description: "The unique event ID to book." },
                            quantity: { type: "NUMBER", description: "The number of tickets to book." }
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

    try {
        console.log(`🤖 [Gemini] Starting chat session with ${formattedHistory.length} history items...`);
        const chat = model.startChat({ history: formattedHistory });
        
        console.log(`🤖 [Gemini] Sending message: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
        let result = await chat.sendMessage(message);
        
        // Safety check for empty or blocked responses
        if (!result.response || !result.response.candidates || result.response.candidates.length === 0) {
            return res.status(200).json({
                responseText: "I'm sorry, but I can't process that request due to my safety policy. How else can I help?"
            });
        }

        // Check for function calls
        let functionCalls = result.response.functionCalls();
        let turnCount = 0;

        while (functionCalls && functionCalls.length > 0 && turnCount < 3) {
            const call = functionCalls[0];
            console.log(`🤖 [Gemini Tool] Executing: ${call.name} with args:`, call.args);
            
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
                functionResponseData = { 
                    status: "success", 
                    results: events.length > 0 ? events : "No events found matching criteria." 
                };
            } 
            else if (call.name === "bookTickets") {
                const { eventId, quantity } = call.args;
                
                try {
                    console.log(`🤖 [Gemini Tool] AI-Initiated Booking for ${eventId} | Quantity: ${quantity}...`);
                    const event = await Event.findById(eventId);
                    if (!event) throw new Error('Event not found');
                    if (event.availableTickets < quantity) throw new Error(`Only ${event.availableTickets} tickets remaining`);

                    const updatedEvent = await Event.findOneAndUpdate(
                        { _id: eventId, availableTickets: { $gte: quantity } },
                        { $inc: { availableTickets: -quantity, soldTickets: quantity } },
                        { new: true }
                    );

                    if (!updatedEvent) throw new Error('Tickets were just sold out. Race condition hit.');

                    const ticket = await Ticket.create({
                        user: req.user.id,
                        event: eventId,
                        quantity,
                        status: 'Confirmed'
                    });

                    console.log(`✅ [Gemini Tool] AI Booking Successful: ${ticket._id}`);
                    await invalidateEventCache();

                    // Real-time Update
                    try {
                        const { getIO } = require('../socket');
                        const io = getIO();
                        io.emit('ticket_updated', { eventId, availableTickets: updatedEvent.availableTickets });
                    } catch (e) {}

                    // Email with Trace Logs (Matches ticketController logic)
                    const userForEmail = { id: req.user.id, email: req.user.email, name: req.user.name };
                    const eventForEmail = { title: updatedEvent.title, location: updatedEvent.location, date: updatedEvent.date, time: updatedEvent.time, price: updatedEvent.price, category: updatedEvent.category };
                    const ticketForEmail = { _id: ticket._id, quantity: ticket.quantity, status: ticket.status };

                    setImmediate(async () => {
                        try {
                            console.log(`📧 [Gemini/Email] Generating PDF for AI-booked ticket ${ticket._id}...`);
                            const pdfBuffer = await generateTicketPDF(ticketForEmail, eventForEmail, userForEmail);
                            await sendTicketEmail(userForEmail, eventForEmail, pdfBuffer);
                        } catch (emailErr) {
                            console.error(`❌ [Gemini/Email] AI Ticket email failed:`, emailErr.message);
                        }
                    });

                    functionResponseData = { 
                        status: "success", 
                        message: `Successfully booked ${quantity} tickets! Ticket ID: ${ticket._id}. An e-ticket has been sent to your email.` 
                    };
                } catch (err) {
                    console.error(`❌ [Gemini Tool] AI Booking Error:`, err.message);
                    functionResponseData = { status: "error", error: err.message };
                }
            }

            // Resume conversation with tool results
            result = await chat.sendMessage([{
                functionResponse: {
                    name: call.name,
                    response: functionResponseData
                }
            }]);

            functionCalls = result.response.functionCalls();
            turnCount++;
        }

        // Final response after potential tool calls
        let finalOutput = "I encountered an issue processing that. Can you please rephrase?";
        try {
            finalOutput = result.response.text();
        } catch (textErr) {
            // Handle cases where the response exists but text() method throws 
            // (e.g. model only returned a function call or was blocked mid-turn)
            if (result.response.candidates && result.response.candidates[0].content) {
                const part = result.response.candidates[0].content.parts.find(p => p.text);
                if (part) finalOutput = part.text;
            }
        }

        res.status(200).json({
            responseText: finalOutput
        });

    } catch (apiError) {
        console.error("❌ [Gemini API] Fatal Error:", apiError.message);
        res.status(500).json({
            message: "AI Assistant is currently unavailable. Please try again in a moment.",
            error: apiError.message
        });
    }
});

module.exports = { handleChat };
