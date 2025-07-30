const nodemailer = require('nodemailer');

// Create transporter (FIXED: createTransport not createTransporter)
const transporter = nodemailer.createTransport({
  service: 'gmail', // या आपका email service
  auth: {
    user: process.env.EMAIL_USER, // आपका email
    pass: process.env.EMAIL_PASS  // आपका app password
  }
});

// Send expiry reminder email
const sendExpiryReminder = async (clientEmail, adminEmail, reminderData) => {
  try {
    const { type, name, expiryDate, clientName, daysLeft } = reminderData;
    
    const subject = `⚠️ ${type.toUpperCase()} Expiry Alert - ${name}`;
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Expiry Reminder</h1>
        </div>
        
        <div style="padding: 20px; background-color: #f8f9fa;">
          <h2 style="color: #333;">Hello ${clientName},</h2>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #ff6b6b;">
            <h3 style="color: #ff6b6b; margin-top: 0;">⚠️ Urgent: ${type} Expiring Soon</h3>
            <p><strong>${type}:</strong> ${name}</p>
            <p><strong>Expiry Date:</strong> ${new Date(expiryDate).toLocaleDateString()}</p>
            <p><strong>Days Remaining:</strong> ${daysLeft} days</p>
          </div>
          
          <p style="margin-top: 20px;">
            Please contact us immediately to renew your ${type} to avoid service interruption.
          </p>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="mailto:${process.env.EMAIL_USER}" 
               style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
              Contact Support
            </a>
          </div>
        </div>
        
        <div style="text-align: center; padding: 10px; color: #666; font-size: 12px;">
          © 2025 Your Company Name. All rights reserved.
        </div>
      </div>
    `;

    // Send to client
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: clientEmail,
      subject,
      html: htmlContent
    });

    // Send to admin
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: adminEmail,
      subject: `Admin Alert: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h3>Admin Notification</h3>
          <p>Client: ${clientName}</p>
          <p>${type}: ${name}</p>
          <p>Expires: ${new Date(expiryDate).toLocaleDateString()}</p>
          <p>Days Left: ${daysLeft}</p>
        </div>
      `
    });

    console.log(`Expiry reminder sent for ${type}: ${name}`);
  } catch (error) {
    console.error('Email sending error:', error);
  }
};

module.exports = {
  sendExpiryReminder
};
