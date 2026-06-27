import { google } from 'googleapis';

function getCalendarClient() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) return null;

  // Handle escaped newlines in the key (common in env vars from Vercel/Railway)
  let rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (rawKey.includes('\\n') && !rawKey.includes('\n')) {
    rawKey = rawKey.replace(/\\n/g, '\n');
  }
  const credentials = JSON.parse(rawKey);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });

  return google.calendar({ version: 'v3', auth });
}

export async function createCalendarEvent(data: {
  summary: string;
  description: string;
  startDate: string;       // YYYY-MM-DD
  timeFrame: string;       // "8 AM - 12 PM" | "12 PM - 5 PM"
  customerName: string;
  customerPhone: string;
  calendarId?: string;
}): Promise<string | null> {
  const calendar = getCalendarClient();
  if (!calendar) return null;

  const calendarId = data.calendarId || process.env.GOOGLE_CALENDAR_ID || 'primary';
  const startHour = data.timeFrame.includes('8') ? 8 : 12;
  const endHour = data.timeFrame.includes('12 PM - 5') ? 17 : 12;

  try {
    const event = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: data.summary,
        description: `${data.description}\n\nCustomer: ${data.customerName}\nPhone: ${data.customerPhone}`,
        start: {
          dateTime: `${data.startDate}T${String(startHour).padStart(2, '0')}:00:00`,
          timeZone: 'America/New_York',
        },
        end: {
          dateTime: `${data.startDate}T${String(endHour).padStart(2, '0')}:00:00`,
          timeZone: 'America/New_York',
        },
      },
    });

    console.log('[google-calendar] Event created:', event.data.id);
    return event.data.id || null;
  } catch (err) {
    console.error('[google-calendar] Failed to create event:', err);
    return null;
  }
}

export async function deleteCalendarEvent(
  eventId: string,
  calendarId?: string,
): Promise<boolean> {
  const calendar = getCalendarClient();
  if (!calendar) return false;

  try {
    await calendar.events.delete({
      calendarId: calendarId || process.env.GOOGLE_CALENDAR_ID || 'primary',
      eventId,
    });
    console.log('[google-calendar] Event deleted:', eventId);
    return true;
  } catch (err) {
    console.error('[google-calendar] Failed to delete event:', err);
    return false;
  }
}

export async function getUpcomingEvents(
  daysAhead: number = 14,
  calendarId?: string,
): Promise<{ id: string; summary: string; start: string; end: string }[]> {
  const calendar = getCalendarClient();
  if (!calendar) return [];

  const now = new Date();
  const end = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  try {
    const res = await calendar.events.list({
      calendarId: calendarId || process.env.GOOGLE_CALENDAR_ID || 'primary',
      timeMin: now.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 100,
    });

    return (res.data.items || []).map(e => ({
      id: e.id || '',
      summary: e.summary || '',
      start: e.start?.dateTime || e.start?.date || '',
      end: e.end?.dateTime || e.end?.date || '',
    }));
  } catch (err) {
    console.error('[google-calendar] Failed to fetch events:', err);
    return [];
  }
}
