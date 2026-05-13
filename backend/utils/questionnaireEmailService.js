import nodemailer from 'nodemailer';
import logger from './logger.js';

const SITE_URL  = process.env.FRONTEND_URL || 'https://investkaps.com';
const CONTACT_URL = `${SITE_URL}/contact`;

// ── Transporter ────────────────────────────────────────────────────────────────
const createTransporter = () => {
  const port = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT) || 587;
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com';
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASSWORD;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // Use SSL for port 465, TLS/STARTTLS for 587
    auth: {
      user,
      pass,
    },
  });
};

// ── Colour helper (positional, matches frontend palette) ───────────────────────
const PALETTE = ['#22c55e', '#84cc16', '#f59e0b', '#f97316', '#ef4444', '#dc2626'];

function profileColor(profileName, allThresholds) {
  const sorted = [...allThresholds].sort((a, b) => a.minPoints - b.minPoints);
  const idx    = sorted.findIndex(
    t => t.profileName?.toLowerCase().trim() === profileName?.toLowerCase().trim()
  );
  if (idx < 0) return '#6366f1';
  const paletteIdx = Math.round((idx / Math.max(sorted.length - 1, 1)) * (PALETTE.length - 1));
  return PALETTE[Math.min(paletteIdx, PALETTE.length - 1)];
}

// ── Public send function ───────────────────────────────────────────────────────
export const sendQuestionnaireResultsEmail = async (
  userEmail,
  userName,
  questionnaireData,
  responseData
) => {
  try {
    const transporter = createTransporter();
    const html = buildEmail(userName, questionnaireData, responseData);

    const info = await transporter.sendMail({
      from:    `"InvestKaps IA" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to:      userEmail,
      subject: 'Your Risk Profile — InvestKaps Investment Advisor',
      html,
    });

    logger.info(`Questionnaire results email sent to ${userEmail}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Error sending questionnaire results email:', error);
    throw new Error('Failed to send questionnaire results email');
  }
};

// ── HTML builder ──────────────────────────────────────────────────────────────
const buildEmail = (userName, questionnaireData, responseData) => {
  const { questionnaire, riskProfile, sectionResponses } = responseData;
  const thresholds    = questionnaire?.riskProfileThresholds || [];
  const thresholdMatch = thresholds.find(t => t.profileName === riskProfile);
  const profileDesc   = thresholdMatch?.description || '';
  const color         = profileColor(riskProfile, thresholds);

  // Build responses rows — no points shown
  let responsesRows = '';
  (sectionResponses || []).forEach(section => {
    if (!section.answers?.length) return;

    responsesRows += `
      <tr>
        <td colspan="2" style="padding: 20px 0 8px; font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af;">
          ${section.sectionName}
        </td>
      </tr>`;

    section.answers.forEach((answer, i) => {
      const bg = i % 2 === 0 ? '#f9fafb' : '#ffffff';
      responsesRows += `
        <tr>
          <td style="padding: 12px 14px; background: ${bg}; border-radius: 6px;
            font-size: 14px; color: #374151; font-weight: 500; vertical-align: top;
            border-bottom: 1px solid #f3f4f6; width: 55%;">
            ${answer.questionText}
          </td>
          <td style="padding: 12px 14px; background: ${bg};
            font-size: 14px; color: #111827; font-weight: 600; vertical-align: top;
            border-bottom: 1px solid #f3f4f6; width: 45%;">
            ${answer.selectedOptionText}
          </td>
        </tr>`;
    });
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Risk Profile — InvestKaps</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings>
    <o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" role="presentation"
  style="background:#f1f5f9;padding:32px 16px;">
  <tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" role="presentation"
    style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;
    overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- ── TOP BRAND BAR ── -->
    <tr>
      <td style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 60%,#4f46e5 100%);
        padding:36px 40px;text-align:center;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.12em;
          text-transform:uppercase;color:rgba(255,255,255,0.6);">InvestKaps</p>
        <h1 style="margin:0;font-size:26px;font-weight:700;color:#ffffff;line-height:1.3;">
          Investment Advisor Service
        </h1>
        <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.72);">
          Risk Profile Assessment Results
        </p>
      </td>
    </tr>

    <!-- ── GREETING ── -->
    <tr>
      <td style="padding:36px 40px 0;">
        <p style="margin:0;font-size:16px;color:#111827;font-weight:600;">
          Dear ${userName},
        </p>
        <p style="margin:12px 0 0;font-size:14px;color:#6b7280;line-height:1.7;">
          Thank you for completing your Risk Profiling Questionnaire with InvestKaps.
          We have assessed your responses and determined your investor risk profile.
          A summary of your answers is included below for your records.
        </p>
      </td>
    </tr>

    <!-- ── RISK PROFILE CARD ── -->
    <tr>
      <td style="padding:28px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
          style="background:${color};border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:32px;text-align:center;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.1em;
                text-transform:uppercase;color:rgba(255,255,255,0.8);">
                Your Risk Profile
              </p>
              <h2 style="margin:0;font-size:36px;font-weight:800;color:#ffffff;
                letter-spacing:-0.02em;line-height:1.1;">
                ${riskProfile}
              </h2>
              ${profileDesc ? `
              <p style="margin:16px 0 0;font-size:14px;color:rgba(255,255,255,0.88);
                line-height:1.65;max-width:440px;margin-left:auto;margin-right:auto;">
                ${profileDesc}
              </p>` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ── WHAT THIS MEANS ── -->
    <tr>
      <td style="padding:0 40px 28px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
          style="background:#fafafa;border:1px solid #e5e7eb;border-radius:10px;">
          <tr>
            <td style="padding:20px 24px;">
              <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.06em;
                text-transform:uppercase;color:#9ca3af;">
                What This Means For You
              </p>
              <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;">
                Based on your responses, you have been identified as a
                <strong style="color:${color};">${riskProfile}</strong> investor.
                Our advisors will use this profile to recommend investment strategies
                suited to your financial goals and comfort with risk.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ── DIVIDER ── -->
    <tr>
      <td style="padding:0 40px;">
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:0;">
      </td>
    </tr>

    <!-- ── RESPONSES HEADING ── -->
    <tr>
      <td style="padding:28px 40px 12px;">
        <p style="margin:0;font-size:18px;font-weight:700;color:#111827;">
          Your Questionnaire Responses
        </p>
        <p style="margin:6px 0 0;font-size:13px;color:#9ca3af;">
          Kept for your records — not shared externally.
        </p>
      </td>
    </tr>

    <!-- ── RESPONSES TABLE ── -->
    <tr>
      <td style="padding:0 40px 28px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
          style="border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:10px 14px;font-size:11px;font-weight:700;
                text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;
                text-align:left;border-bottom:2px solid #e5e7eb;">Question</th>
              <th style="padding:10px 14px;font-size:11px;font-weight:700;
                text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;
                text-align:left;border-bottom:2px solid #e5e7eb;">Your Answer</th>
            </tr>
          </thead>
          <tbody>
            ${responsesRows}
          </tbody>
        </table>
      </td>
    </tr>

    <!-- ── IMPORTANT NOTICE ── -->
    <tr>
      <td style="padding:0 40px 28px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
          style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;">
          <tr>
            <td style="padding:4px 20px 4px 8px;">
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="padding:16px 4px 16px 16px;vertical-align:top;
                    font-size:20px;line-height:1;">⚠️</td>
                  <td style="padding:16px 0;">
                    <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#92400e;">
                      Important Notice
                    </p>
                    <p style="margin:0;font-size:13px;color:#92400e;line-height:1.65;">
                      This risk assessment is based solely on your questionnaire responses
                      and serves as a preliminary guide. It does not constitute financial
                      advice. Please consult with a qualified advisor before making any
                      investment decisions. Your profile may be reviewed periodically.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ── CTA ── -->
    <tr>
      <td style="padding:0 40px 36px;text-align:center;">
        <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.65;">
          Have questions about your risk profile or our Investment Advisor services?<br>
          Our team is here to help you.
        </p>
        <a href="${CONTACT_URL}"
          style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#6366f1,#818cf8);
          color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;
          border-radius:10px;letter-spacing:0.02em;
          box-shadow:0 4px 14px rgba(99,102,241,0.35);">
          Contact Us
        </a>
      </td>
    </tr>

    <!-- ── FOOTER ── -->
    <tr>
      <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td style="text-align:center;">
              <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#374151;">
                InvestKaps
              </p>
              <p style="margin:0 0 10px;font-size:12px;color:#9ca3af;">
                SEBI Registered Investment Advisor
              </p>
              <p style="margin:0;font-size:12px;color:#d1d5db;line-height:1.6;">
                This email was sent to you because you completed a risk profiling
                questionnaire on the InvestKaps platform. Please do not reply to this
                email — use the
                <a href="${CONTACT_URL}" style="color:#6366f1;text-decoration:none;font-weight:600;">
                  Contact Us
                </a>
                page for any queries.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

  </table>
  </td></tr>
</table>

</body>
</html>`;
};

export default { sendQuestionnaireResultsEmail };
