// Bouncie GPS Tracker API Client
// Auto-refreshes tokens using refresh_token stored in Supabase

import { createClient } from '@supabase/supabase-js';

const BOUNCIE_API_BASE = 'https://api.bouncie.dev/v1';
const BOUNCIE_TOKEN_URL = 'https://auth.bouncie.com/oauth/token';

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export interface BouncieVehicle {
  imei: string;
  nickName?: string;
  vin?: string;
  model?: { year?: number; make?: string; name?: string };
  stats?: {
    odometer?: number;
    fuelLevel?: number;
    battery?: { voltage?: number };
    location?: { lat?: number; lon?: number; heading?: number; speed?: number; timestamp?: string };
    lastTripEnd?: string;
    lastUpdated?: string;
    isRunning?: boolean;
    mil?: { milOn?: boolean; dtcCount?: number };
  };
  [key: string]: unknown;
}

export interface BouncieTrip {
  transactionId?: string;
  imei?: string;
  startTime?: string;
  endTime?: string;
  distance?: number;
  averageSpeed?: number;
  maxSpeed?: number;
  idleTime?: number;
  fuelConsumed?: number;
  mpg?: number;
  hardBrakes?: number;
  hardAccelerations?: number;
  startLocation?: { lat?: number; lon?: number; address?: string };
  endLocation?: { lat?: number; lon?: number; address?: string };
  [key: string]: unknown;
}

export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; refresh_token?: string; [key: string]: unknown }> {
  const clientId = process.env.BOUNCIE_CLIENT_ID;
  const clientSecret = process.env.BOUNCIE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('BOUNCIE_CLIENT_ID and BOUNCIE_CLIENT_SECRET required');

  const res = await fetch(BOUNCIE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }

  const data = await res.json();

  // Store tokens in DB for auto-refresh
  const supabase = getSupabase();
  await supabase.from('app_settings').upsert({
    key: 'bouncie_tokens',
    value: {
      access_token: data.access_token,
      refresh_token: data.refresh_token || null,
      expires_at: Date.now() + (data.expires_in || 3600) * 1000,
    },
    updated_at: new Date().toISOString(),
  } as Record<string, unknown>, { onConflict: 'key' });

  return data;
}

/** Get a valid access token — auto-refreshes from DB if env var token is expired */
async function getAccessToken(): Promise<string> {
  // Try env var first
  const envToken = process.env.BOUNCIE_ACCESS_TOKEN;

  // Check DB for a fresher token
  const supabase = getSupabase();
  const { data: setting } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'bouncie_tokens')
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stored = setting?.value as any;

  if (stored?.access_token) {
    // If stored token is still fresh (has > 5 min left), use it
    if (stored.expires_at && stored.expires_at > Date.now() + 300000) {
      return stored.access_token;
    }

    // Try to refresh using refresh_token
    if (stored.refresh_token) {
      try {
        const refreshed = await refreshAccessToken(stored.refresh_token);
        return refreshed;
      } catch (err) {
        console.error('[bouncie] Token refresh failed:', err);
      }
    }
  }

  // Fall back to env var
  if (envToken) return envToken;

  throw new Error('Bouncie API not configured. Re-authenticate at /api/truck/bouncie/auth');
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.BOUNCIE_CLIENT_ID;
  const clientSecret = process.env.BOUNCIE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Missing Bouncie client credentials');

  const res = await fetch(BOUNCIE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Refresh failed (${res.status}): ${text}`);
  }

  const data = await res.json();

  // Store new tokens
  const supabase = getSupabase();
  await supabase.from('app_settings').upsert({
    key: 'bouncie_tokens',
    value: {
      access_token: data.access_token,
      refresh_token: data.refresh_token || refreshToken,
      expires_at: Date.now() + (data.expires_in || 3600) * 1000,
    },
    updated_at: new Date().toISOString(),
  } as Record<string, unknown>, { onConflict: 'key' });

  console.log('[bouncie] Token auto-refreshed successfully');
  return data.access_token;
}

async function bouncieGet<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const token = await getAccessToken();

  const url = new URL(`${BOUNCIE_API_BASE}${endpoint}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: token, Accept: 'application/json' },
  });

  if (res.status === 401) {
    // Token just expired — try refresh once
    const supabase = getSupabase();
    const { data: setting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'bouncie_tokens')
      .maybeSingle();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stored = setting?.value as any;
    if (stored?.refresh_token) {
      const newToken = await refreshAccessToken(stored.refresh_token);
      const retry = await fetch(url.toString(), {
        headers: { Authorization: newToken, Accept: 'application/json' },
      });
      if (retry.ok) return retry.json();
    }

    throw new Error('BOUNCIE_TOKEN_EXPIRED — re-authenticate at /api/truck/bouncie/auth');
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bouncie API error ${res.status}: ${text}`);
  }

  return res.json();
}

export async function getVehicles(): Promise<BouncieVehicle[]> {
  return bouncieGet<BouncieVehicle[]>('/vehicles');
}

export async function getVehicle(imei: string): Promise<BouncieVehicle> {
  return bouncieGet<BouncieVehicle>('/vehicles', { imei });
}

export async function getTrips(imei: string, startDate: string, endDate: string): Promise<BouncieTrip[]> {
  return bouncieGet<BouncieTrip[]>('/trips', { imei, 'starts-after': startDate, 'ends-before': endDate });
}

export async function getDiagnostics(imei: string): Promise<Record<string, unknown>> {
  return bouncieGet<Record<string, unknown>>('/diagnostics', { imei });
}

export function isBouncieConfigured(): boolean {
  return !!(process.env.BOUNCIE_ACCESS_TOKEN || process.env.BOUNCIE_CLIENT_ID);
}

export function getAuthUrl(redirectUri: string): string {
  const clientId = process.env.BOUNCIE_CLIENT_ID;
  if (!clientId) throw new Error('BOUNCIE_CLIENT_ID not set');
  return `https://auth.bouncie.com/dialog/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
}
