import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Singleton instance to avoid multiple GoTrue clients
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let supabaseInstance: ReturnType<typeof createSupabaseClient<any>> | null = null;

// Max size per cookie chunk (keep well under 4KB to account for name + metadata)
const CHUNK_SIZE = 3500;

// Whether to set the Secure flag on cookies (only on HTTPS)
function isSecure(): boolean {
  return typeof window !== 'undefined' && window.location.protocol === 'https:';
}

function cookieFlags(): string {
  return `path=/; max-age=31536000; SameSite=Lax${isSecure() ? '; Secure' : ''}`;
}

// Helper: parse all cookies into a { name: value } map
function parseCookies(): Record<string, string> {
  if (typeof document === 'undefined') return {};
  const map: Record<string, string> = {};
  for (const c of document.cookie.split(';')) {
    const trimmed = c.trim();
    if (!trimmed) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const name = trimmed.substring(0, eqIdx);
    const value = trimmed.substring(eqIdx + 1);
    map[name] = decodeURIComponent(value);
  }
  return map;
}

// Helper: delete a cookie and any chunks of it
function deleteCookieAndChunks(key: string) {
  if (typeof document === 'undefined') return;
  const expireFlags = `path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT${isSecure() ? '; Secure' : ''}`;
  // Delete the base key
  document.cookie = `${key}=; ${expireFlags}`;
  // Delete any numbered chunks (.0, .1, .2, ...)
  const cookies = parseCookies();
  for (let i = 0; i < 20; i++) {
    const chunkName = `${key}.${i}`;
    if (!(chunkName in cookies)) break;
    document.cookie = `${chunkName}=; ${expireFlags}`;
  }
}

// Write a value into chunked cookies
function writeCookies(key: string, value: string) {
  deleteCookieAndChunks(key);
  const encoded = encodeURIComponent(value);
  const flags = cookieFlags();
  if (encoded.length <= CHUNK_SIZE) {
    document.cookie = `${key}=${encoded}; ${flags}`;
  } else {
    for (let i = 0; i * CHUNK_SIZE < encoded.length; i++) {
      const chunk = encoded.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      document.cookie = `${key}.${i}=${chunk}; ${flags}`;
    }
  }
}

// Read a value from chunked cookies (returns null if not found)
function readCookies(key: string): string | null {
  const cookies = parseCookies();

  // Try single (non-chunked) cookie first
  if (key in cookies) return cookies[key];

  // Try chunked cookies: key.0, key.1, ...
  const chunks: string[] = [];
  for (let i = 0; i < 20; i++) {
    const chunkName = `${key}.${i}`;
    if (!(chunkName in cookies)) break;
    chunks.push(cookies[chunkName]);
  }
  return chunks.length > 0 ? chunks.join('') : null;
}

// Restore session cookies from localStorage backup (called before middleware redirects)
// Returns true if a session was restored.
export function restoreSessionFromBackup(): boolean {
  if (typeof window === 'undefined') return false;
  const AUTH_KEY = `sb-${supabaseUrl.split('//')[1]?.split('.')[0]}-auth-token`;
  const backup = localStorage.getItem(AUTH_KEY);
  if (!backup) return false;

  // Check if cookies already have the session
  const existing = readCookies(AUTH_KEY);
  if (existing) return false;

  // Restore cookies from localStorage backup
  writeCookies(AUTH_KEY, backup);
  return true;
}

// Using @supabase/supabase-js with chunked cookie storage instead of @supabase/ssr's createBrowserClient
// because createBrowserClient in @supabase/ssr v0.8.0 causes queries to hang indefinitely.
// Chunked cookies match the format @supabase/ssr uses (key.0, key.1, ...) so the middleware can read them.
// Session is also backed up to localStorage so it survives cookie clearing.
export function createClient() {
  if (supabaseInstance) return supabaseInstance;

  supabaseInstance = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: {
        getItem: (key: string) => {
          if (typeof document === 'undefined') return null;

          // Try cookies first (primary storage for middleware compatibility)
          const fromCookies = readCookies(key);
          if (fromCookies) return fromCookies;

          // Fall back to localStorage backup
          const fromStorage = localStorage.getItem(key);
          if (fromStorage) {
            // Restore cookies so middleware can read them on next request
            writeCookies(key, fromStorage);
            return fromStorage;
          }

          return null;
        },

        setItem: (key: string, value: string) => {
          if (typeof document === 'undefined') return;
          // Write to cookies (for middleware)
          writeCookies(key, value);
          // Also back up to localStorage (persists across cookie clears)
          try { localStorage.setItem(key, value); } catch {}
        },

        removeItem: (key: string) => {
          deleteCookieAndChunks(key);
          try { localStorage.removeItem(key); } catch {}
        },
      },
      flowType: 'pkce',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  return supabaseInstance;
}
