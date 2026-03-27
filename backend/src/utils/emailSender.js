const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
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

  console.log(`✅ [Email] Ticket sent to ${user.email} | ID: ${info.messageId}`);
  return info;
};

/**
 * Sends a welcome email after successful account registration
 * @param {Object} user - { name, email }
 */
const sendWelcomeEmail = async (user) => {
  const transporter = createTransporter();
  const senderEmail = process.env.SMTP_FROM || process.env.SMTP_USER;

  const info = await transporter.sendMail({
    from: `"EventTix" <${senderEmail}>`,
    to: user.email,
    subject: `Welcome to EventTix, ${user.name}! 🎉`,
    text: `Hi ${user.name},\n\nWelcome to EventTix! Your account has been created successfully.\n\nYou can now browse and book tickets for amazing events near you.\n\nHappy Exploring!\nEventTix Team`,
    html: `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;">
      <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:40px;border-radius:12px 12px 0 0;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:28px;">🎟 EventTix</h1>
        <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:15px;">Your gateway to amazing events</p>
      </div>
      <div style="background:#fff;padding:40px;">
        <h2 style="color:#1f2937;margin:0 0 12px;">Welcome aboard, ${user.name}! 🎉</h2>
        <p style="color:#6b7280;margin:0 0 24px;line-height:1.6;">Your EventTix account has been <strong style="color:#16a34a;">successfully created</strong>. You're now part of a community that never misses an event!</p>
        
        <div style="background:#f3f4f6;border-radius:10px;padding:24px;margin-bottom:24px;">
          <h3 style="margin:0 0 14px;color:#374151;font-size:14px;">What you can do now:</h3>
          <p style="margin:6px 0;color:#6b7280;font-size:14px;">🎭 &nbsp;Browse hundreds of events near you</p>
          <p style="margin:6px 0;color:#6b7280;font-size:14px;">🎟 &nbsp;Book tickets instantly with instant confirmation</p>
          <p style="margin:6px 0;color:#6b7280;font-size:14px;">📧 &nbsp;Get PDF tickets delivered to your inbox</p>
          <p style="margin:6px 0;color:#6b7280;font-size:14px;">📱 &nbsp;Show your digital ticket at the venue</p>
        </div>

        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin-bottom:24px;">
          <p style="margin:0;color:#1e40af;font-size:13px;">📋 <strong>Account Details</strong><br/>
          Name: <strong>${user.name}</strong><br/>
          Email: <strong>${user.email}</strong></p>
        </div>

        <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">If you did not create this account, please ignore this email.</p>
      </div>
      <div style="background:#f3f4f6;padding:20px 40px;border-radius:0 0 12px 12px;text-align:center;">
        <p style="color:#9ca3af;font-size:11px;margin:0;">EventTix · eventtix141@gmail.com</p>
        <p style="color:#9ca3af;font-size:11px;margin:4px 0 0;">This is an automated message. Please do not reply.</p>
      </div>
    </div>`
  });

  console.log(`✅ [Email] Welcome email sent to ${user.email} | ID: ${info.messageId}`);
  return info;
};

/**
 * Sends a login alert email on successful sign-in
 * @param {Object} user - { name, email }
 */
const sendLoginAlertEmail = async (user) => {
  const transporter = createTransporter();
  const senderEmail = process.env.SMTP_FROM || process.env.SMTP_USER;

  const loginTime = new Date().toLocaleString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long',
    day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
  });

  const info = await transporter.sendMail({
    from: `"EventTix" <${senderEmail}>`,
    to: user.email,
    subject: `New login to your EventTix account`,
    text: `Hi ${user.name},\n\nWe detected a new login to your account at ${loginTime}.\n\nIf this was you, no action is needed. If you didn't log in, please change your password immediately.\n\nEventTix Team`,
    html: `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;">
      <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 40px;border-radius:12px 12px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:24px;">🔐 EventTix</h1>
        <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">Security Notification</p>
      </div>
      <div style="background:#fff;padding:32px 40px;">
        <h2 style="color:#1f2937;font-size:20px;margin:0 0 12px;">New Sign-in Detected</h2>
        <p style="color:#6b7280;margin:0 0 24px;">Hi <strong>${user.name}</strong>, we noticed a new login to your EventTix account.</p>

        <div style="background:#f3f4f6;border-left:4px solid #4f46e5;border-radius:8px;padding:20px;margin-bottom:24px;">
          <h3 style="margin:0 0 12px;color:#374151;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;">Login Details</h3>
          <p style="margin:4px 0;color:#6b7280;font-size:13px;">👤 Account: <strong style="color:#111827;">${user.email}</strong></p>
          <p style="margin:4px 0;color:#6b7280;font-size:13px;">🕐 Time: <strong style="color:#111827;">${loginTime}</strong></p>
          <p style="margin:4px 0;color:#6b7280;font-size:13px;">✅ Status: <strong style="color:#16a34a;">Successful</strong></p>
        </div>

        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:16px;">
          <p style="margin:0;color:#dc2626;font-size:13px;">⚠️ <strong>If this wasn't you</strong>, please change your password immediately to secure your account.</p>
        </div>

        <p style="color:#9ca3af;font-size:12px;text-align:center;">If this was you, no further action is needed.</p>
      </div>
      <div style="background:#f3f4f6;padding:20px 40px;border-radius:0 0 12px 12px;text-align:center;">
        <p style="color:#9ca3af;font-size:11px;margin:0;">EventTix · eventtix141@gmail.com</p>
        <p style="color:#9ca3af;font-size:11px;margin:4px 0 0;">This is an automated security alert. Please do not reply.</p>
      </div>
    </div>`
  });

  console.log(`✅ [Email] Login alert sent to ${user.email} | ID: ${info.messageId}`);
  return info;
};

module.exports = { sendTicketEmail, sendWelcomeEmail, sendLoginAlertEmail };

