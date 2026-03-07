const nodemailer = require('nodemailer');

/**
 * Creates a reusable transporter object using Ethereal (for testing)
 * In production, replace the host/auth with real SMTP credentials (e.g. SendGrid, AWS SES)
 */
const createTransporter = async () => {
    // Generate test SMTP service account from ethereal.email if no production creds are provided
    let testAccount = await nodemailer.createTestAccount();

    return nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: testAccount.user, // generated ethereal user
            pass: testAccount.pass, // generated ethereal password
        },
    });
};

/**
 * Sends a ticket email with the PDF attached
 * @param {Object} user 
 * @param {Object} event 
 * @param {Buffer} pdfBuffer - The generated PDF in memory
 */
const sendTicketEmail = async (user, event, pdfBuffer) => {
    try {
        const transporter = await createTransporter();

        const info = await transporter.sendMail({
            from: '"Event Ticketing Platform" <noreply@event-tickets.com>',
            to: user.email,
            subject: `Your Tickets for ${event.title}`,
            text: `Hi ${user.name},\n\nThank you for purchasing tickets to ${event.title}! Your digital ticket is attached to this email.\n\nEnjoy the event!`,
            html: `<h3>Hi ${user.name},</h3><p>Thank you for purchasing tickets to <strong>${event.title}</strong>!</p><p>Your digital ticket is attached to this email.</p><br><p>Enjoy the event!</p>`,
            attachments: [
                {
                    filename: `${event.title.replace(/\s+/g, '_')}_Ticket.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }
            ]
        });

        console.log(`✉️ [Email Sender] Ticket sent to ${user.email}`);
        // Log the preview URL so the developer can actually see the test email
        console.log(`🔍 [Email Sender] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);

        return info;
    } catch (error) {
        console.error('Email sending failed:', error);
        throw error;
    }
};

module.exports = { sendTicketEmail };
