const PDFDocument = require('pdfkit');
const fs = require('fs');

/**
 * Generates a PDF ticket as a Buffer in memory
 * @param {Object} ticket - The ticket object containing details
 * @param {Object} event - The associated event object
 * @param {Object} user - The user object
 * @returns {Promise<Buffer>} - Resolves with the PDF Buffer
 */
const generateTicketPDF = (ticket, event, user) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const buffers = [];

            // Collect data chunks as the PDF is generated
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            // Styling & Content
            doc.fontSize(25).font('Helvetica-Bold').text('Event Ticket', { align: 'center' });
            doc.moveDown(2);

            doc.fontSize(16).font('Helvetica-Bold').text('Event Details:');
            doc.fontSize(12).font('Helvetica').text(`Title: ${event.title}`);
            doc.text(`Location: ${event.location}`);
            doc.text(`Date & Time: ${new Date(event.date).toLocaleDateString()} at ${event.time}`);
            doc.moveDown(1);

            doc.fontSize(16).font('Helvetica-Bold').text('Ticket Information:');
            doc.fontSize(12).font('Helvetica').text(`Ticket ID: ${ticket._id}`);
            doc.text(`Attendee: ${user.name}`);
            doc.text(`Email: ${user.email}`);
            doc.text(`Quantity: ${ticket.quantity} General Admission`);
            doc.text(`Status: ${ticket.status}`);

            doc.moveDown(2);
            doc.fontSize(10).font('Helvetica-Oblique').text('Please present this ticket at the entrance. Valid for one entry per quantity listed.', { align: 'center', color: 'grey' });

            // Finalize PDF file
            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

module.exports = { generateTicketPDF };
