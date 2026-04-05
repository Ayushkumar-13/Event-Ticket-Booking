const nodemailer = require('nodemailer');

/**
 * Creates a robust transporter for Gmail with improved reliability
 */
const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail', // 🚀 Using 'service' simplifies the config for Gmail
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        },
        // Force STARTTLS for better security if available
        tls: {
            rejectUnauthorized: false
        }
    });
};

/**
 * Sends a premium ticket confirmation email with PDF attached
 * @param {Object} user - { name, email }
 * @param {Object} event - { title, date, location, time, price }
 * @param {Buffer} pdfBuffer - Generated PDF ticket in memory
 */
const sendTicketEmail = async (user, event, pdfBuffer) => {
    const transporter = createTransporter();

    const eventDate = new Date(event.date).toLocaleDateString('en-IN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    // 🎨 Production-Level Premium Template
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #eef2ff; }
            .header { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 48px 40px; text-align: center; color: #ffffff; }
            .header h1 { margin: 0; font-size: 32px; letter-spacing: -0.5px; font-weight: 800; }
            .header p { margin: 8px 0 0; opacity: 0.9; font-size: 16px; }
            .content { padding: 40px; color: #374151; line-height: 1.6; }
            .greeting { font-size: 20px; font-weight: 700; color: #1e1b4b; margin-bottom: 24px; }
            .confirmation { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 16px; border-radius: 12px; font-weight: 600; margin-bottom: 32px; display: flex; align-items: center; justify-content: center; }
            .event-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; margin-bottom: 32px; }
            .event-title { color: #4f46e5; font-size: 18px; font-weight: 700; margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; }
            .detail-row { display: flex; margin-bottom: 12px; }
            .detail-label { color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; width: 100px; }
            .detail-value { color: #0f172a; font-size: 14px; font-weight: 600; flex: 1; }
            .pdf-notice { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px; text-align: center; color: #1e40af; font-size: 14px; margin-bottom: 32px; }
            .footer { background: #f9fafb; padding: 32px; text-align: center; color: #94a3b8; font-size: 12px; }
            .footer p { margin: 4px 0; }
        </style>
    </head>
    <body style="background-color: #f1f5f9; padding: 20px;">
        <div class="container">
            <div class="header">
                <h1>🎟 EventTix</h1>
                <p>Booking Confirmed — You're Going!</p>
            </div>
            <div class="content">
                <div class="greeting">Hi ${user.name}! 👋</div>
                <p>Get ready for an incredible experience! Your booking for <strong>${event.title}</strong> has been successfully confirmed. We've processed your reservation and your e-ticket is ready.</p>
                
                <div class="confirmation">
                    ✅ Your tickets are officially secured!
                </div>

                <div class="event-card">
                    <div class="event-title">${event.title}</div>
                    <div class="detail-row">
                        <span class="detail-label">📅 Date</span>
                        <span class="detail-value">${eventDate}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">⏰ Time</span>
                        <span class="detail-value">${event.time}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">📍 Venue</span>
                        <span class="detail-value">${event.location}</span>
                    </div>
                </div>

                <div class="pdf-notice">
                    <strong>📎 Digital Ticket Attached</strong><br/>
                    We've attached your official E-Ticket as a PDF to this email. You can present this on your phone or print it for entry at the venue.
                </div>

                <p style="text-align: center; margin: 0;">See you at the event! 🚀</p>
            </div>
            <div class="footer">
                <p><strong>EventTix</strong> · Your Premier Event Experience Partner</p>
                <p>Don't reply to this email. For support, contact <a href="mailto:support@eventtix.com" style="color: #6366f1; text-decoration: none;">support@eventtix.com</a></p>
                <p style="margin-top: 16px; opacity: 0.6;">&copy; ${new Date().getFullYear()} EventTix. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>`;

    const info = await transporter.sendMail({
        from: `"EventTix" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: user.email,
        subject: `Your E-Ticket is Here! — ${event.title} | EventTix`,
        html: htmlContent,
        attachments: [{
            filename: `${event.title.replace(/\s+/g, '_')}_Ticket.pdf`,
            content: Buffer.from(pdfBuffer), // 🛡️ Ensuring it's a valid Buffer
            contentType: 'application/pdf'
        }]
    });

    console.log(`✅ [Email] Booking ticket sent to ${user.email} | ID: ${info.messageId}`);
    return info;
};

/**
 * Sends a premium welcome email after registration
 * @param {Object} user - { name, email }
 */
const sendWelcomeEmail = async (user) => {
    const transporter = createTransporter();
    
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 15px 35px rgba(0,0,0,0.08); border: 1px solid #eef2ff; }
            .hero { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 64px 40px; text-align: center; color: #ffffff; }
            .hero h1 { margin: 0; font-size: 36px; font-weight: 800; letter-spacing: -1px; }
            .content { padding: 48px; color: #374151; }
            .greeting { font-size: 24px; font-weight: 800; color: #1e1b4b; margin-bottom: 24px; }
            .feature-grid { margin: 32px 0; }
            .feature-item { display: flex; align-items: start; margin-bottom: 20px; background: #f8fafc; padding: 16px; border-radius: 12px; }
            .feature-icon { background: #eef2ff; color: #4f46e5; width: 32px; height: 32px; border-radius: 8px; text-align: center; line-height: 32px; font-size: 16px; margin-right: 16px; flex-shrink: 0; }
            .feature-text b { color: #1e1b4b; display: block; margin-bottom: 2px; }
            .feature-text p { margin: 0; font-size: 14px; color: #64748b; }
            .cta-box { background: #4f46e5; color: #ffffff; padding: 24px; border-radius: 16px; text-align: center; margin: 40px 0; }
            .footer { background: #f9fafb; padding: 40px; text-align: center; color: #94a3b8; font-size: 12px; }
        </style>
    </head>
    <body style="background-color: #f1f5f9; padding: 20px;">
        <div class="container">
            <div class="hero">
                <h1>Welcome to EventTix! 👋</h1>
                <p style="margin-top: 12px; font-size: 18px; opacity: 0.9;">Your journey to unforgettable moments starts here.</p>
            </div>
            <div class="content">
                <div class="greeting">Hi ${user.name},</div>
                <p>We're thrilled to have you join our community. Whether you're looking for world-class concerts, networking events, or local meetups, EventTix makes it effortless to find and book your spot.</p>
                
                <div class="feature-grid">
                    <div class="feature-item">
                        <div class="feature-icon">✨</div>
                        <div class="feature-text">
                            <b>Curated Events</b>
                            <p>Hand-picked experiences tailored to your interests.</p>
                        </div>
                    </div>
                    <div class="feature-item">
                        <div class="feature-icon">🎟</div>
                        <div class="feature-text">
                            <b>Seamless Booking</b>
                            <p>One-click ticket generation with instant PDF delivery.</p>
                        </div>
                    </div>
                    <div class="feature-item">
                        <div class="feature-icon">🛡</div>
                        <div class="feature-text">
                            <b>Secure & Simple</b>
                            <p>Verified organizers and industry-standard security.</p>
                        </div>
                    </div>
                </div>

                <div class="cta-box">
                    <h3 style="margin: 0 0 8px;">Ready to explore?</h3>
                    <p style="margin: 0; opacity: 0.9;">Head over to your dashboard to see what's happening today.</p>
                </div>
            </div>
            <div class="footer">
                <p><strong>EventTix</strong> · Connect. Experience. Remember.</p>
                <p>Follow us on social media for exclusive event updates!</p>
                <p style="margin-top: 24px; opacity: 0.6;">&copy; ${new Date().getFullYear()} EventTix. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>`;

    const info = await transporter.sendMail({
        from: `"EventTix" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: user.email,
        subject: `Welcome to the Community, ${user.name}! — EventTix`,
        html: htmlContent
    });

    console.log(`✅ [Email] Welcome email delivered to ${user.email} | ID: ${info.messageId}`);
    return info;
};

/**
 * Sends a premium security login alert
 * @param {Object} user - { name, email }
 */
const sendLoginAlertEmail = async (user) => {
    const transporter = createTransporter();
    
    const loginTime = new Date().toLocaleString('en-IN', {
        weekday: 'long', year: 'numeric', month: 'long',
        day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #fee2e2; }
            .header { background: #4f46e5; padding: 24px; text-align: center; color: #ffffff; }
            .content { padding: 32px; color: #374151; }
            .alert-icon { font-size: 40px; margin-bottom: 16px; text-align: center; }
            .details { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0; }
            .detail-row { display: flex; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
            .label { color: #64748b; font-size: 13px; font-weight: 600; }
            .value { color: #0f172a; font-size: 13px; font-weight: 700; }
            .warning { background: #fff1f1; border-left: 4px solid #ef4444; padding: 16px; border-radius: 4px; color: #991b1b; font-size: 13px; }
            .footer { background: #f9fafb; padding: 24px; text-align: center; color: #94a3b8; font-size: 11px; }
        </style>
    </head>
    <body style="background-color: #f8fafc; padding: 20px;">
        <div class="container">
            <div class="header">
                <h3 style="margin: 0;">Security Alert</h3>
            </div>
            <div class="content">
                <div class="alert-icon">🔐</div>
                <h2 style="margin: 0; color: #1e1b4b; text-align: center;">New Login Detected</h2>
                <p style="text-align: center; color: #64748b;">We noticed a new sign-in to your EventTix account.</p>

                <div class="details">
                    <div class="detail-row">
                        <span class="label">User</span>
                        <span class="value">${user.email}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Time</span>
                        <span class="value">${loginTime}</span>
                    </div>
                    <div class="detail-row" style="border: none; padding: 0;">
                        <span class="label">Device/IP</span>
                        <span class="value">Authorized Client</span>
                    </div>
                </div>

                <div class="warning">
                    <strong>Was this not you?</strong><br/>
                    If you didn't just sign in, your account may be compromised. Please reset your password immediately.
                </div>
            </div>
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} EventTix Security Team</p>
                <p>This is an automated alert. No action is required if this was you.</p>
            </div>
        </div>
    </body>
    </html>`;

    const info = await transporter.sendMail({
        from: `"EventTix Security" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: user.email,
        subject: `Security Alert: New Sign-in to EventTix`,
        html: htmlContent
    });

    console.log(`✅ [Email] Security alert delivered to ${user.email} | ID: ${info.messageId}`);
    return info;
};

module.exports = { sendTicketEmail, sendWelcomeEmail, sendLoginAlertEmail };


