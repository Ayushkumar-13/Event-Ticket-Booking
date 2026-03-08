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

        // Use the most recent ticket with populated user and event
        const ticket = await Ticket.findOne({ status: 'Confirmed' })
            .sort({ createdAt: -1 })
            .populate('user')
            .populate('event');

        if (!ticket || !ticket.user || !ticket.event) {
            console.log("❌ No confirmed ticket with user+event found!");
            process.exit(1);
        }

        console.log(`📬 Sending test email to: ${ticket.user.email}`);
        console.log(`🎟️  For event: ${ticket.event.title}`);

        const pdfBuffer = await generateTicketPDF(ticket, ticket.event, ticket.user);
        console.log(`✓ PDF generated: ${pdfBuffer.length} bytes`);

        const result = await sendTicketEmail(ticket.user, ticket.event, pdfBuffer);
        console.log(`✅ Email sent! Message ID: ${result.messageId}`);
        console.log(`📧 From: ${process.env.SMTP_USER} → To: ${ticket.user.email}`);

    } catch (err) {
        console.error("❌ FAILED:", err.message);
    } finally {
        process.exit(0);
    }
})();
