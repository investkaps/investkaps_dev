import nodemailer from 'nodemailer';
import logger from './logger.js';

// Create Zoho SMTP transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.zoho.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

/**
 * Send questionnaire results email to user
 */
export const sendQuestionnaireResultsEmail = async (userEmail, userName, questionnaireData, responseData) => {
  try {
    const transporter = createTransporter();

    // Build email content
    const emailContent = buildQuestionnaireEmailContent(userName, questionnaireData, responseData);

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: userEmail,
      subject: 'Your Risk Profile Assessment Results - InvestKaps',
      html: emailContent
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Questionnaire results email sent to ${userEmail}: ${info.messageId}`);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Error sending questionnaire results email:', error);
    throw new Error('Failed to send questionnaire results email');
  }
};

/**
 * Build HTML email content for questionnaire results
 */
const buildQuestionnaireEmailContent = (userName, questionnaireData, responseData) => {
  const { questionnaire, totalScore, riskProfile, sectionResponses } = responseData;
  const thresholdMatch = questionnaire?.riskProfileThresholds?.find((threshold) => threshold.profileName === riskProfile);
  const profileDescription = thresholdMatch?.description || `Your profile indicates a ${riskProfile.toLowerCase()} approach to investing.`;

  const getProfileColor = (name) => {
    const palette = ['#4CAF50', '#FF9800', '#f44336', '#2196F3', '#9C27B0', '#009688', '#795548'];
    const hash = String(name || '')
      .split('')
      .reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return palette[hash % palette.length];
  };

  let responsesHtml = '';
  
  sectionResponses.forEach(section => {
    responsesHtml += `
      <div style="margin-bottom: 2rem; padding: 1.5rem; background: #f9f9f9; border-radius: 8px; border-left: 4px solid #4CAF50;">
        <h3 style="margin: 0 0 1rem 0; color: #333; font-size: 1.25rem;">${section.sectionName}</h3>
        ${section.answers.map(answer => `
          <div style="margin-bottom: 1rem; padding: 1rem; background: white; border-radius: 4px; border: 1px solid #e0e0e0;">
            <p style="margin: 0 0 0.5rem 0; color: #333; font-weight: 500;">Q: ${answer.questionText}</p>
            <p style="margin: 0; color: #666;">
              A: <strong>${answer.selectedOptionText}</strong>
              <span style="display: inline-block; margin-left: 0.5rem; padding: 0.25rem 0.75rem; background: #e3f2fd; color: #1976D2; border-radius: 12px; font-size: 0.875rem; font-weight: 500;">
                ${answer.points} points
              </span>
            </p>
          </div>
        `).join('')}
      </div>
    `;
  });

  const riskProfileColor = getProfileColor(riskProfile);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Risk Profile Assessment Results</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1a2a3a 0%, #2c3e50 100%); padding: 2rem; text-align: center;">
          <h1 style="margin: 0; color: white; font-size: 1.75rem;">Risk Profile Assessment</h1>
          <p style="margin: 0.5rem 0 0 0; color: rgba(255,255,255,0.8); font-size: 1rem;">InvestKaps Investment Advisor Service</p>
        </div>

        <!-- Content -->
        <div style="padding: 2rem;">
          
          <!-- Greeting -->
          <p style="margin: 0 0 1.5rem 0; color: #333; font-size: 1.1rem;">Dear ${userName},</p>
          
          <p style="margin: 0 0 1.5rem 0; color: #666; line-height: 1.6;">
            Thank you for completing your risk profiling questionnaire. Below are your assessment results.
          </p>

          <!-- Risk Profile Card -->
          <div style="background: linear-gradient(135deg, ${riskProfileColor} 0%, ${riskProfileColor}dd 100%); padding: 2rem; border-radius: 8px; text-align: center; margin-bottom: 2rem;">
            <p style="margin: 0 0 0.5rem 0; color: rgba(255,255,255,0.9); font-size: 1rem; text-transform: uppercase; letter-spacing: 1px;">Your Risk Profile</p>
            <h2 style="margin: 0; color: white; font-size: 2.5rem; font-weight: 700;">${riskProfile}</h2>
            <p style="margin: 1rem 0 0 0; color: rgba(255,255,255,0.9); font-size: 1.25rem;">
              Total Score: <strong>${totalScore} points</strong>
            </p>
          </div>

          <!-- Risk Profile Description -->
          <div style="background: #f0f8ff; padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem; border-left: 4px solid ${riskProfileColor};">
            <h3 style="margin: 0 0 0.75rem 0; color: #333; font-size: 1.1rem;">What This Means For You</h3>
            <p style="margin: 0; color: #666; line-height: 1.6;">
              ${profileDescription}
            </p>
          </div>

          <!-- Your Responses -->
          <h2 style="margin: 0 0 1.5rem 0; color: #333; font-size: 1.5rem; border-bottom: 2px solid #e0e0e0; padding-bottom: 0.75rem;">Your Questionnaire Responses</h2>
          
          ${responsesHtml}

          <!-- Important Notice -->
          <div style="background: #fff3cd; padding: 1.5rem; border-radius: 8px; margin-top: 2rem; border-left: 4px solid #ffc107;">
            <h3 style="margin: 0 0 0.75rem 0; color: #856404; font-size: 1.1rem;">Important Notice</h3>
            <p style="margin: 0; color: #856404; line-height: 1.6; font-size: 0.9rem;">
              This risk profile assessment is based on your responses to the questionnaire and is intended as a guide. Please consult with a qualified investment advisor before making any investment decisions. Your risk profile may change over time based on your financial situation, goals, and market conditions.
            </p>
          </div>

          <!-- Footer -->
          <p style="margin: 2rem 0 0 0; color: #666; text-align: center; font-size: 0.9rem; border-top: 1px solid #e0e0e0; padding-top: 1.5rem;">
            If you have any questions about your risk profile or our investment advisory services, please don't hesitate to contact us.
          </p>
          
          <p style="margin: 0.5rem 0 0 0; color: #666; text-align: center; font-size: 0.9rem;">
            <strong>InvestKaps</strong><br>
            Investment Advisory Services
          </p>

        </div>
      </div>
    </body>
    </html>
  `;
};

export default { sendQuestionnaireResultsEmail };
