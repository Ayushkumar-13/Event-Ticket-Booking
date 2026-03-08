const PDFDocument = require('pdfkit');

/**
 * Generates a premium IRCTC-style ticket PDF as a Buffer in memory
 */
const generateTicketPDF = (ticket, event, user) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margin: 0 });
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            const W = 595.28; // A4 width in points
            const purple = '#4f46e5';
            const darkPurple = '#3730a3';
            const lightGray = '#f3f4f6';
            const textGray = '#6b7280';
            const dark = '#1f2937';
            const green = '#16a34a';
            const white = '#ffffff';

            // ─── HEADER BANNER ───────────────────────────────────────────────
            doc.rect(0, 0, W, 110).fill(purple);

            // Brand name
            doc.fontSize(30).font('Helvetica-Bold').fillColor(white)
                .text('EventTix', 40, 28, { align: 'left' });

            // Tagline
            doc.fontSize(11).font('Helvetica').fillColor('rgba(255,255,255,0.8)')
                .text('Your Premium Event Booking Platform', 40, 64);

            // Booking confirmed badge (right side)
            doc.rect(W - 190, 25, 150, 60).roundedRect(W - 190, 25, 150, 60, 8).fill(darkPurple);
            doc.fontSize(10).font('Helvetica-Bold').fillColor(white)
                .text('BOOKING CONFIRMED', W - 185, 37, { width: 140, align: 'center' });
            doc.fontSize(22).fillColor('#a5f3a0')
                .text('✓', W - 185, 52, { width: 140, align: 'center' });

            // ─── TICKET TITLE STRIP ──────────────────────────────────────────
            doc.rect(0, 110, W, 44).fill(lightGray);
            doc.fontSize(17).font('Helvetica-Bold').fillColor(dark)
                .text('🎟  E-TICKET / BOOKING CONFIRMATION', 40, 122);

            // ─── BOOKING REFERENCE BOX ───────────────────────────────────────
            const ticketId = ticket._id ? ticket._id.toString().toUpperCase().slice(-10) : 'N/A';
            const bookingRef = `EVTX-${ticketId}`;
            doc.rect(0, 154, W, 1).fill('#e5e7eb');

            doc.rect(30, 165, W - 60, 70).roundedRect(30, 165, W - 60, 70, 8).fill(white)
                .rect(30, 165, W - 60, 70).roundedRect(30, 165, W - 60, 70, 8)
                .lineWidth(1.5).stroke('#e5e7eb');

            doc.fontSize(10).font('Helvetica').fillColor(textGray)
                .text('BOOKING REFERENCE', 50, 177);
            doc.fontSize(20).font('Helvetica-Bold').fillColor(purple)
                .text(bookingRef, 50, 193);

            doc.fontSize(10).font('Helvetica').fillColor(textGray)
                .text('STATUS', 280, 177);
            doc.rect(278, 191, 80, 24).roundedRect(278, 191, 80, 24, 12).fill(green);
            doc.fontSize(11).font('Helvetica-Bold').fillColor(white)
                .text(ticket.status || 'Confirmed', 280, 197, { width: 76, align: 'center' });

            doc.fontSize(10).font('Helvetica').fillColor(textGray)
                .text('QUANTITY', 420, 177);
            doc.fontSize(20).font('Helvetica-Bold').fillColor(dark)
                .text(`${ticket.quantity} Ticket${ticket.quantity > 1 ? 's' : ''}`, 420, 193);

            // ─── SECTION: EVENT DETAILS ──────────────────────────────────────
            const sectionY = 252;
            doc.rect(30, sectionY, W - 60, 26).fill(purple);
            doc.fontSize(11).font('Helvetica-Bold').fillColor(white)
                .text('  EVENT INFORMATION', 30, sectionY + 8);

            const eventDate = new Date(event.date).toLocaleDateString('en-IN', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });

            const rows = [
                ['Event Name', event.title || 'N/A'],
                ['Event Date', eventDate],
                ['Event Time', event.time || 'N/A'],
                ['Venue / Location', event.location || 'N/A'],
                ['Category', event.category || 'General'],
            ];

            let rowY = sectionY + 26;
            rows.forEach(([label, value], i) => {
                const bg = i % 2 === 0 ? white : lightGray;
                doc.rect(30, rowY, W - 60, 28).fill(bg);
                doc.fontSize(9).font('Helvetica').fillColor(textGray)
                    .text(label, 46, rowY + 9);
                doc.fontSize(10).font('Helvetica-Bold').fillColor(dark)
                    .text(value, 180, rowY + 8, { width: W - 220 });
                rowY += 28;
            });

            // ─── SECTION: PASSENGER (ATTENDEE) DETAILS ──────────────────────
            rowY += 10;
            doc.rect(30, rowY, W - 60, 26).fill(purple);
            doc.fontSize(11).font('Helvetica-Bold').fillColor(white)
                .text('  ATTENDEE INFORMATION', 30, rowY + 8);
            rowY += 26;

            const attendeeRows = [
                ['Full Name', user.name || 'N/A'],
                ['Email Address', user.email || 'N/A'],
                ['Ticket Type', 'General Admission'],
                ['Ticket ID', ticket._id ? ticket._id.toString() : 'N/A'],
            ];

            attendeeRows.forEach(([label, value], i) => {
                const bg = i % 2 === 0 ? white : lightGray;
                doc.rect(30, rowY, W - 60, 28).fill(bg);
                doc.fontSize(9).font('Helvetica').fillColor(textGray)
                    .text(label, 46, rowY + 9);
                doc.fontSize(10).font('Helvetica-Bold').fillColor(dark)
                    .text(value, 180, rowY + 8, { width: W - 220 });
                rowY += 28;
            });

            // ─── SECTION: FARE SUMMARY ───────────────────────────────────────
            rowY += 10;
            doc.rect(30, rowY, W - 60, 26).fill(purple);
            doc.fontSize(11).font('Helvetica-Bold').fillColor(white)
                .text('  FARE SUMMARY', 30, rowY + 8);
            rowY += 26;

            const pricePerTicket = event.price || 0;
            const totalAmount = pricePerTicket * (ticket.quantity || 1);

            const fareRows = [
                ['Price per Ticket', `$${pricePerTicket.toFixed(2)}`],
                ['Number of Tickets', `${ticket.quantity}`],
                ['Total Amount Paid', `$${totalAmount.toFixed(2)}`],
            ];

            fareRows.forEach(([label, value], i) => {
                const bg = i % 2 === 0 ? white : lightGray;
                doc.rect(30, rowY, W - 60, 28).fill(bg);
                doc.fontSize(9).font('Helvetica').fillColor(textGray)
                    .text(label, 46, rowY + 9);
                doc.fontSize(10).font('Helvetica-Bold').fillColor(i === 2 ? purple : dark)
                    .text(value, 180, rowY + 8);
                rowY += 28;
            });

            // ─── DIVIDER CUT LINE ─────────────────────────────────────────────
            rowY += 16;
            doc.dash(6, { space: 4 });
            doc.moveTo(30, rowY).lineTo(W - 30, rowY).lineWidth(1).stroke('#9ca3af');
            doc.undash();

            doc.fontSize(9).font('Helvetica').fillColor(textGray)
                .text('✂  Please present this ticket (digital or printed) at the venue entrance', 30, rowY + 6, { align: 'center', width: W - 60 });

            // ─── FOOTER ───────────────────────────────────────────────────────
            const footerY = 790;
            doc.rect(0, footerY - 10, W, 52).fill(lightGray);
            doc.fontSize(9).font('Helvetica').fillColor(textGray)
                .text(
                    `Booking Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}   |   EventTix • Book Amazing Events   |   noreply@eventtix.com`,
                    30, footerY,
                    { align: 'center', width: W - 60 }
                );
            doc.fontSize(8).fillColor('#9ca3af')
                .text('This is a computer generated ticket. No signature required.', 30, footerY + 16, { align: 'center', width: W - 60 });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

module.exports = { generateTicketPDF };
