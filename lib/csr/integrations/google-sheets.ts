import { google } from 'googleapis';

function getSheetsClient() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) return null;

  let rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (rawKey.includes('\\n') && !rawKey.includes('\n')) {
    rawKey = rawKey.replace(/\\n/g, '\n');
  }
  const credentials = JSON.parse(rawKey);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

export interface CallLogRow {
  date: string;
  caller: string;
  phone: string;
  intent: string;
  confidence: number;
  service: string;
  urgency: string;
  outcome: string;
  proposed_date: string;
  ai_cost: number;
  duration: number;
  session_id: string;
}

export async function appendCallToSheet(row: CallLogRow): Promise<boolean> {
  const sheetId = process.env.GOOGLE_SHEETS_CALL_LOG_ID;
  if (!sheetId) return false;

  const sheets = getSheetsClient();
  if (!sheets) return false;

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Call Log!A:L',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          row.date, row.caller, row.phone, row.intent,
          row.confidence, row.service, row.urgency, row.outcome,
          row.proposed_date, `$${row.ai_cost.toFixed(6)}`,
          row.duration, row.session_id,
        ]],
      },
    });

    return true;
  } catch (err) {
    console.error('[google-sheets] Failed to append:', err);
    return false;
  }
}
