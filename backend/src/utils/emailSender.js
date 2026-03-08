const nodemailer = require('nodemailer');

/**
 * Creates a reusable transporter using Gmail SMTP (or Ethereal as fallback for dev)
 * Set SMTP_USER and SMTP_PASS in your .env to use Gmail.
 * For Gmail, enable "App Passwords" in your Google Account security settings.
 */
const createTransporter = async () => {
    // Use real SMTP credentials if provided in environment
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS // Use an App Password, not your real password
            }
        });
    }

    // Fallback to Ethereal test account (for local development without SMTP creds)
    console.warn('⚠️ [Email] SMTP_USER/SMTP_PASS not set. Using Ethereal test account. Emails will NOT be delivered to real inboxes.');
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
            user: testAccount.user,
            pass: testAccount.pass
        }
    });
};

/**
 * Sends a ticket confirmation email with PDF attached
 * @param {Object} user - { name, email }
 * @param {Object} event - { title, date, location, time }
 * @param {Buffer} pdfBuffer - Generated PDF in memory
 */
const sendTicketEmail = async (user, event, pdfBuffer) => {
    const transporter = await createTransporter();

    const mailOptions = {
        from: `"EventTix" <${process.env.SMTP_USER || 'noreply@eventtix.com'}>`,
        to: user.email,
        subject: `🎟️ Your Ticket for ${event.title} — EventTix`,
        text: `Hi ${user.name},\n\nYour ticket booking for "${event.title}" is confirmed!\n\nEvent Details:\n• Date: ${new Date(event.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n• Time: ${event.time}\n• Location: ${event.location}\n\nYour digital ticket is attached. Please present it at the entrance.\n\nThank you for booking with EventTix!`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px;">
                <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">🎟️ EventTix</h1>
                    <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">Your Ticket is Confirmed!</p>
                </div>
                <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px;">
                    <h2 style="color: #1f2937;">Hi ${user.name}! 👋</h2>
                    <p style="color: #6b7280;">Great news! Your booking for <strong style="color: #4f46e5;">${event.title}</strong> has been confirmed.</p>
                    
                    <div style="background: #f3f4f6; border-left: 4px solid #4f46e5; padding: 16px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin: 0 0 8px; color: #374151;">Event Details</h3>
                        <p style="margin: 4px 0; color: #6b7280;">📅 <strong>${new Date(event.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong></p>
                        <p style="margin: 4px 0; color: #6b7280;">⏰ <strong>${event.time}</strong></p>
                        <p style="margin: 4px 0; color: #6b7280;">📍 <strong>${event.location}</strong></p>
                    </div>

                    <p style="color: #6b7280;">📎 Your digital ticket PDF is attached to this email. Please present it at the venue entrance.</p>
                    
                    <div style="text-align: center; margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                        <p style="color: #9ca3af; font-size: 12px;">EventTix — Book Amazing Events</p>
                    </div>
                </div>
            </div>
        `,
        attachments: [
            {
                filename: `${event.title.replace(/\s+/g, '_')}_Ticket.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
            }
        ]
    };

    const info = await transporter.sendMail(mailOptions);

    console.log(`✉️ [Email Sender] Ticket email sent to ${user.email}`);

    // Log preview URL only if using Ethereal (test mode)
    if (!process.env.SMTP_USER) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log(`🔍 [Email Sender] Preview URL (Ethereal test): ${previewUrl}`);
    }

    return info;
};

module.exports = { sendTicketEmail };
