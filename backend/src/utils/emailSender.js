const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // TLS via STARTTLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

/**
 * Sends a ticket confirmation email with PDF attached via Brevo SMTP
 * @param {Object} user - { name, email }
 * @param {Object} event - { title, date, location, time, price }
 * @param {Buffer} pdfBuffer - Generated PDF ticket in memory
 */
const sendTicketEmail = async (user, event, pdfBuffer) => {
  const transporter = createTransporter();

  const eventDate = new Date(event.date).toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const info = await transporter.sendMail({
    from: `"EventTix" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    replyTo: process.env.SMTP_USER,
    to: user.email,
    subject: `Your Booking Confirmation — ${event.title} | EventTix`,
    text: `Hi ${user.name},\n\nYour booking for "${event.title}" is confirmed!\n\nDate: ${eventDate}\nTime: ${event.time}\nLocation: ${event.location}\n\nYour e-ticket is attached. Please present it at the venue.\n\nThanks,\nEventTix Team`,
    html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;">
          <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 40px;border-radius:12px 12px 0 0;">
            <h1 style="color:#fff;margin:0;font-size:26px;">🎟 EventTix</h1>
            <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">Your official booking confirmation</p>
          </div>
          <div style="background:#fff;padding:32px 40px;">
            <h2 style="color:#1f2937;font-size:20px;margin:0 0 8px;">Hi ${user.name}! 👋</h2>
            <p style="color:#6b7280;margin:0 0 24px;">Your booking for <strong style="color:#4f46e5;">${event.title}</strong> is <strong style="color:#16a34a;">confirmed</strong>. Your e-ticket is attached.</p>
            <div style="background:#f3f4f6;border-left:4px solid #4f46e5;border-radius:8px;padding:20px;margin-bottom:24px;">
              <h3 style="margin:0 0 12px;color:#374151;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;">Event Details</h3>
              <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:5px 0;color:#6b7280;font-size:13px;width:35%;">📅 Date</td><td style="padding:5px 0;color:#111827;font-weight:600;font-size:13px;">${eventDate}</td></tr>
                <tr><td style="padding:5px 0;color:#6b7280;font-size:13px;">⏰ Time</td><td style="padding:5px 0;color:#111827;font-weight:600;font-size:13px;">${event.time}</td></tr>
                <tr><td style="padding:5px 0;color:#6b7280;font-size:13px;">📍 Location</td><td style="padding:5px 0;color:#111827;font-weight:600;font-size:13px;">${event.location}</td></tr>
              </table>
            </div>
            <p style="color:#6b7280;font-size:13px;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:12px 16px;">
              📎 <strong>Your e-ticket PDF is attached</strong> to this email. Please show it at the venue entrance.
            </p>
          </div>
          <div style="background:#f3f4f6;padding:20px 40px;border-radius:0 0 12px 12px;text-align:center;">
            <p style="color:#9ca3af;font-size:11px;margin:0;">EventTix · eventtix141@gmail.com</p>
            <p style="color:#9ca3af;font-size:11px;margin:4px 0 0;">This is an automated email. Please do not reply directly.</p>
          </div>
        </div>`,
    attachments: [{
      filename: `${event.title.replace(/\s+/g, '_')}_Ticket.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }]
  });

  console.log(`✅ [Email] Ticket sent to ${user.email} via Gmail SMTP | ID: ${info.messageId}`);
  return info;
};

module.exports = { sendTicketEmail };
