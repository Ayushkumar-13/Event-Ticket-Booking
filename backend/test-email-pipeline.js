require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Event = require('./src/models/Event');
const Ticket = require('./src/models/Ticket');
const { generateTicketPDF } = require('./src/utils/pdfGenerator');
const { sendTicketEmail } = require('./src/utils/emailSender');

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const ticket = await Ticket.findOne({}).populate('user').populate('event');

        if (!ticket || !ticket.user || !ticket.event) {
            console.log("No valid ticket found with populated user/event to mock!");
            process.exit(1);
        }

        console.log(`Mocking Job Payload execution for Ticket ${ticket._id}...`);

        // Emulate notificationWorker Step 1
        console.log("Generating PDF Buffer...");
        const pdfBuffer = await generateTicketPDF(ticket, ticket.event, ticket.user);
        console.log("✓ PDF Buffer generated:", pdfBuffer.length, "bytes");

        // Emulate notificationWorker Step 2
        console.log("Dispatching Email through Nodemailer...");
        const result = await sendTicketEmail(ticket.user, ticket.event, pdfBuffer);
        console.log("✓ Email success! View ID:", result.messageId);

    } catch (err) {
        console.error("FATAL CRASH:", err);
    } finally {
        process.exit(0);
    }
})();
