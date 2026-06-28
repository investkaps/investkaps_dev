import { google } from 'googleapis';
import logger from '../utils/logger.js';

// Parse Google OAuth credentials from .env (stored as JSON blob)
let credentials = null;
try {
  const raw = process.env.GOOGLE_OAUTH_CREDENTIALS;
  if (raw) {
    const parsed = JSON.parse(raw);
    credentials = parsed.web || parsed.installed || parsed;
  }
} catch (e) {
  logger.warn('[GoogleCalendar] Could not parse GOOGLE_OAUTH_CREDENTIALS:', e.message);
}

// OAuth2 client using the credentials from the JSON blob in .env
const getOAuth2Client = () => {
  if (!credentials) throw new Error('Google OAuth credentials not configured in GOOGLE_OAUTH_CREDENTIALS env var');

  const client = new google.auth.OAuth2(
    credentials.client_id,
    credentials.client_secret,
    credentials.redirect_uris?.[0] || 'https://developers.google.com/oauthplayground'
  );

  // Use refresh token stored in env (obtained once via OAuth consent flow)
  client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  return client;
};

/**
 * Create a Google Calendar event with a Meet link and invite both parties.
 *
 * @param {object} opts
 * @param {string} opts.summary        - Event title
 * @param {string} opts.description    - Event description / agenda
 * @param {string} opts.startISO       - ISO datetime string for start (IST)
 * @param {string} opts.endISO         - ISO datetime string for end (IST)
 * @param {string} opts.userEmail      - Client's email
 * @param {string} opts.userName       - Client's name
 * @returns {{ meetLink: string, eventId: string, htmlLink: string }}
 */
export async function createCalendarEvent({ summary, description, startISO, endISO, userEmail, userName }) {
  const auth = getOAuth2Client();
  const calendar = google.calendar({ version: 'v3', auth });

  const event = {
    summary,
    description,
    start: { dateTime: startISO, timeZone: 'Asia/Kolkata' },
    end: { dateTime: endISO, timeZone: 'Asia/Kolkata' },
    attendees: [
      { email: process.env.SMTP_USER_IA || 'investkaps_ia@gmail.com', displayName: 'InvestKaps' },
      { email: userEmail, displayName: userName },
    ],
    conferenceData: {
      createRequest: {
        requestId: `investkaps-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 60 },
        { method: 'popup', minutes: 10 },
      ],
    },
  };

  const res = await calendar.events.insert({
    calendarId: 'primary',
    resource: event,
    conferenceDataVersion: 1,
    sendUpdates: 'all',
  });

  const meetLink = res.data.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri || null;

  return {
    meetLink,
    eventId: res.data.id,
    htmlLink: res.data.htmlLink,
  };
}

/**
 * Delete a calendar event (on cancellation).
 */
export async function deleteCalendarEvent(eventId) {
  const auth = getOAuth2Client();
  const calendar = google.calendar({ version: 'v3', auth });
  await calendar.events.delete({ calendarId: 'primary', eventId, sendUpdates: 'all' });
}
