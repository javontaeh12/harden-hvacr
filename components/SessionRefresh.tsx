'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

const REFRESH_KEY = 'session-last-refresh';
const REFRESH_COOLDOWN = 60_000; // Don't refresh more than once per minute

// Keeps the auth session alive by syncing cookies ↔ localStorage when the
// user returns to the tab (e.g., after locking the phone or overnight).
// Does NOT call router.refresh() on mount to avoid infinite re-render loops.
// Only refreshes on visibility change (tab focus) and a long interval timer.
export function SessionRefresh() {
  const router = useRouter();
  const refreshing = useRef(false);
  const hasMounted = useRef(false);

  useEffect(() => {
    const syncSession = async (triggerServerRefresh: boolean) => {
      if (refreshing.current) return;

      // Cooldown: skip if we refreshed very recently
      const lastRefresh = parseInt(localStorage.getItem(REFRESH_KEY) || '0', 10);
      if (Date.now() - lastRefresh < REFRESH_COOLDOWN) return;

      refreshing.current = true;

      try {
        const supabase = createClient();

        // getUser() validates the access token. If expired, the SDK's
        // autoRefreshToken rotates tokens internally (writing fresh
        // cookies + localStorage via our storage adapter).
        const { data: { user }, error } = await supabase.auth.getUser();

        if (user && !error) {
          localStorage.setItem(REFRESH_KEY, String(Date.now()));

          // Only trigger a server refresh on visibility change / timer,
          // NOT on initial mount (which would cause an infinite loop).
          if (triggerServerRefresh) {
            router.refresh();
          }
        }
      } catch {
        // Don't redirect on transient errors (network hiccup, phone waking up).
        // The middleware will handle real auth failures on next navigation.
      } finally {
        refreshing.current = false;
      }
    };

    // On mount: sync localStorage from cookies but do NOT router.refresh()
    // (router.refresh re-renders the page, which re-mounts this component → loop)
    if (!hasMounted.current) {
      hasMounted.current = true;
      syncSession(false);
    }

    // Refresh when user returns to the tab (e.g., after phone sleep)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncSession(true);
      }
    };

    // Safety net: refresh every 30 minutes while the tab is open
    const interval = setInterval(() => {
      syncSession(true);
    }, 30 * 60 * 1000);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [router]);

  return null;
}
