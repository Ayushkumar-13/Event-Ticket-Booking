const PDFDocument = require('pdfkit');

/**
 * Generates a premium IRCTC-style ticket PDF as a Buffer in memory
 * Improved with robust stream handling and production-level aesthetics.
 */
const generateTicketPDF = (ticket, event, user) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ 
                size: 'A4', 
                margin: 0,
                info: {
                    Title: `Ticket - ${event.title}`,
                    Author: 'EventTix',
                }
            });
            const buffers = [];

            doc.on('data', (chunk) => buffers.push(chunk));
            doc.on('end', () => {
                const finalBuffer = Buffer.concat(buffers);
                resolve(finalBuffer);
            });
            doc.on('error', (err) => reject(err));

            const W = 595.28; // A4 width in points
            const purple = '#4f46e5';
            const darkPurple = '#3730a3';
            const lightGray = '#f8fafc';
            const borderGray = '#e2e8f0';
            const textGray = '#64748b';
            const dark = '#0f172a';
            const green = '#16a34a';
            const white = '#ffffff';

            // ─── HEADER BANNER (Indigo Gradient Style) ──────────────────────
            doc.rect(0, 0, W, 120).fill(purple);
            
            // Subtle decorative pattern or line
            doc.rect(0, 115, W, 5).fill(darkPurple);

            // Brand name
            doc.fontSize(32).font('Helvetica-Bold').fillColor(white)
                .text('EventTix', 40, 35, { align: 'left' });

            // Tagline
            doc.fontSize(10).font('Helvetica').fillColor('rgba(255,255,255,0.7)')
                .text('Your Premium Event Booking Platform', 40, 72);

            // Booking confirmed badge (right side)
            doc.roundedRect(W - 190, 30, 150, 65, 10).fill(darkPurple);
            doc.fontSize(9).font('Helvetica-Bold').fillColor(white)
                .text('BOOKING CONFIRMED', W - 185, 45, { width: 140, align: 'center' });
            doc.fontSize(24).fillColor('#a5f3a0')
                .text('✓', W - 185, 62, { width: 140, align: 'center' });

            // ─── TICKET TITLE STRIP ──────────────────────────────────────────
            doc.rect(0, 120, W, 40).fill(lightGray);
            doc.fontSize(14).font('Helvetica-Bold').fillColor(dark)
                .text('E-TICKET / OFFICIAL CONFIRMATION', 40, 133);

            // ─── BOOKING REFERENCE BOX ───────────────────────────────────────
            const ticketId = ticket._id ? ticket._id.toString().toUpperCase().slice(-10) : 'N/A';
            const bookingRef = `EVTX-${ticketId}`;
            
            doc.roundedRect(30, 175, W - 60, 80, 12).fill(white)
                .lineWidth(1).stroke(borderGray);

            doc.fontSize(9).font('Helvetica').fillColor(textGray)
                .text('BOOKING REFERENCE', 50, 192);
            doc.fontSize(22).font('Helvetica-Bold').fillColor(purple)
                .text(bookingRef, 50, 208);

            doc.fontSize(9).font('Helvetica').fillColor(textGray)
                .text('STATUS', 280, 192);
            doc.roundedRect(278, 206, 85, 26, 13).fill(green);
            doc.fontSize(11).font('Helvetica-Bold').fillColor(white)
                .text(ticket.status || 'Confirmed', 280, 213, { width: 81, align: 'center' });

            doc.fontSize(9).font('Helvetica').fillColor(textGray)
                .text('QUANTITY', 420, 192);
            doc.fontSize(22).font('Helvetica-Bold').fillColor(dark)
                .text(`${ticket.quantity} Pkt${ticket.quantity > 1 ? 's' : ''}`, 420, 208);

            // ─── SECTION: EVENT DETAILS ──────────────────────────────────────
            let currentY = 275;
            doc.roundedRect(30, currentY, W - 60, 30, 6).fill(purple);
            doc.fontSize(10).font('Helvetica-Bold').fillColor(white)
                .text('EVENT INFORMATION', 45, currentY + 10);

            const eventDate = new Date(event.date).toLocaleDateString('en-IN', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });

            const rows = [
                ['Event Name', event.title || 'N/A'],
                ['Event Date', eventDate],
                ['Event Time', event.time || 'N/A'],
                ['Venue / Location', event.location || 'N/A'],
            ];

            currentY += 30;
            rows.forEach(([label, value], i) => {
                const bg = i % 2 === 0 ? white : lightGray;
                doc.rect(30, currentY, W - 60, 32).fill(bg);
                doc.fontSize(9).font('Helvetica').fillColor(textGray)
                    .text(label.toUpperCase(), 46, currentY + 11);
                doc.fontSize(11).font('Helvetica-Bold').fillColor(dark)
                    .text(value, 180, currentY + 11, { width: W - 220 });
                currentY += 32;
            });

            // ─── SECTION: ATTENDEE DETAILS ───────────────────────────────────
            currentY += 15;
            doc.roundedRect(30, currentY, W - 60, 30, 6).fill(purple);
            doc.fontSize(10).font('Helvetica-Bold').fillColor(white)
                .text('ATTENDEE INFORMATION', 45, currentY + 10);
            
            const attendeeRows = [
                ['Full Name', user.name || 'N/A'],
                ['Email Address', user.email || 'N/A'],
                ['Ticket Type', event.category || 'General Admission'],
            ];

            currentY += 30;
            attendeeRows.forEach(([label, value], i) => {
                const bg = i % 2 === 0 ? white : lightGray;
                doc.rect(30, currentY, W - 60, 32).fill(bg);
                doc.fontSize(9).font('Helvetica').fillColor(textGray)
                    .text(label.toUpperCase(), 46, currentY + 11);
                doc.fontSize(11).font('Helvetica-Bold').fillColor(dark)
                    .text(value, 180, currentY + 11);
                currentY += 32;
            });

            // ─── SECTION: PAYMENT SUMMARY ─────────────────────────────────────
            currentY += 15;
            doc.roundedRect(30, currentY, W - 60, 30, 6).fill(dark);
            doc.fontSize(10).font('Helvetica-Bold').fillColor(white)
                .text('PAYMENT SUMMARY', 45, currentY + 10);

            const pricePerTicket = event.price || 0;
            const totalAmount = pricePerTicket * (ticket.quantity || 1);

            const paymentRows = [
                ['Ticket Price', `$${pricePerTicket.toFixed(2)} x ${ticket.quantity}`],
                ['Total Amount', `$${totalAmount.toFixed(2)}`],
            ];

            currentY += 30;
            paymentRows.forEach(([label, value], i) => {
                const bg = i === 1 ? '#eff6ff' : white;
                doc.rect(30, currentY, W - 60, 32).fill(bg);
                doc.fontSize(9).font('Helvetica').fillColor(textGray)
                    .text(label.toUpperCase(), 46, currentY + 11);
                doc.fontSize(12).font('Helvetica-Bold').fillColor(i === 1 ? purple : dark)
                    .text(value, 180, currentY + 11);
                currentY += 32;
            });

            // ─── IMPORTANT INSTRUCTIONS ──────────────────────────────────────
            currentY += 25;
            doc.fontSize(10).font('Helvetica-Bold').fillColor(dark)
                .text('IMPORTANT INSTRUCTIONS:', 30, currentY);
            currentY += 15;
            doc.fontSize(9).font('Helvetica').fillColor(textGray)
                .text('• Please carry a valid Photo ID proof matching the name on this ticket.', 40, currentY);
            currentY += 12;
            doc.text('• This ticket is non-transferable and must be presented at the entry gate.', 40, currentY);
            currentY += 12;
            doc.text('• Kindly reach the venue at least 30 minutes before the event start time.', 40, currentY);

            // ─── DIVIDER CUT LINE ─────────────────────────────────────────────
            currentY += 35;
            doc.dash(5, { space: 5 });
            doc.moveTo(30, currentY).lineTo(W - 30, currentY).lineWidth(1).stroke(textGray);
            doc.undash();

            doc.fontSize(8).font('Helvetica-Oblique').fillColor(textGray)
                .text('✂  DIGITAL TICKET COUPE  -  VALID FOR ENTRY ONCE  ✂', 30, currentY + 10, { align: 'center', width: W - 60 });

            // ─── FOOTER ───────────────────────────────────────────────────────
            const footerY = 780;
            doc.rect(0, footerY, W, 62).fill(purple);
            doc.fontSize(10).font('Helvetica-Bold').fillColor(white)
                .text('EventTix • Connect. Experience. Remember.', 0, footerY + 20, { align: 'center', width: W });
            doc.fontSize(8).font('Helvetica').fillColor('rgba(255,255,255,0.7)')
                .text('This is a computer generated ticket. No physical signature required.', 0, footerY + 35, { align: 'center', width: W });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

module.exports = { generateTicketPDF };

