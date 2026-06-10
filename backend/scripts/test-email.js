#!/usr/bin/env node
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { sendEmail } from '../utils/emailService.js';

// Ensure we load the backend/.env even if script is run from repo root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

(async () => {
  try {
    const to = process.env.TEST_EMAIL || process.env.EMAIL_USER;
    if (!to) {
      console.error('No TEST_EMAIL or EMAIL_USER configured in environment. Aborting.');
      process.exit(1);
    }

    console.log(`Sending test email to ${to} using ${process.env.EMAIL_HOST}:${process.env.EMAIL_PORT}...`);

    await sendEmail({
      to,
      subject: 'InvestKaps — Test email',
      html: `<p>Hello,</p>
             <p>This is a test email sent from the InvestKaps backend to verify SMTP settings.</p>
             <p>If you received this message, your SMTP configuration is correct.</p>
             <p>Regards,<br/>InvestKaps</p>`
    });

    console.log('Test email sent successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to send test email:', err?.message || err);
    if (err && err.response) console.error(err.response);
    process.exit(1);
  }
})();
