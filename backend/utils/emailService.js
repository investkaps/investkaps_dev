const nodemailer = require('nodemailer');
const logger = require('./logger');

// Create a transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Send email function
const sendEmail = async (options) => {
  try {
    // Default from address
    const from = process.env.EMAIL_FROM || 'InvestKaps <noreply@investkaps.com>';
    
    const mailOptions = {
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    };
    
    // Add CC if provided
    if (options.cc) {
      mailOptions.cc = options.cc;
    }
    
    // Add BCC if provided
    if (options.bcc) {
      mailOptions.bcc = options.bcc;
    }
    
    // Add attachments if provided
    if (options.attachments) {
      mailOptions.attachments = options.attachments;
    }
    
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error('Error sending email:', error);
    throw error;
  }
};

module.exports = { sendEmail };
