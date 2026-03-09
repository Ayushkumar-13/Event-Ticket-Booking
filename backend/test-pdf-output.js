require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Event = require('./src/models/Event');
const Ticket = require('./src/models/Ticket');
const { generateTicketPDF } = require('./src/utils/pdfGenerator');
const fs = require('fs');

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const ticket = await Ticket.findOne({ status: 'Confirmed' })
            .sort({ createdAt: -1 })
            .populate('user')
            .populate('event');

        if (!ticket || !ticket.user || !ticket.event) {
            console.log("❌ No confirmed ticket found!");
            process.exit(1);
        }

        console.log(`✓ Found ticket: ${ticket._id}`);
        console.log(`  User: ${ticket.user.name} <${ticket.user.email}>`);
        console.log(`  Event: ${ticket.event.title}`);
        console.log(`  Qty: ${ticket.quantity} | Status: ${ticket.status}`);

        console.log('\nGenerating PDF...');
        const pdfBuffer = await generateTicketPDF(ticket, ticket.event, ticket.user);

        const outPath = './test-ticket-output.pdf';
        fs.writeFileSync(outPath, pdfBuffer);

        console.log(`✅ PDF generated successfully!`);
        console.log(`   Size: ${pdfBuffer.length} bytes (${(pdfBuffer.length / 1024).toFixed(1)} KB)`);
        console.log(`   Saved to: ${outPath}`);
        console.log(`\n   Open the file to visually verify the ticket layout.`);

    } catch (err) {
        console.error("❌ FAILED:", err.message);
    } finally {
        process.exit(0);
    }
})();
