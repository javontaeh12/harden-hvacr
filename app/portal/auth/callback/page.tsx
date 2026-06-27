'use client';

import { useEffect, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

function CallbackHandler() {
  const router = useRouter();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const handle = async () => {
      const supabase = createClient();

      // Handle hash tokens (implicit) or code (PKCE)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const access_token = hashParams.get('access_token');
      const refresh_token = hashParams.get('refresh_token');
      const code = new URLSearchParams(window.location.search).get('code');

      let session;

      if (access_token && refresh_token) {
        const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) { router.replace('/portal/login?error=auth_failed'); return; }
        session = data.session;
      } else if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) { router.replace('/portal/login?error=auth_failed'); return; }
        session = data.session;
      } else {
        router.replace('/portal/login?error=auth_failed');
        return;
      }

      if (!session?.user?.email) {
        router.replace('/portal/login?error=auth_failed');
        return;
      }

      router.replace('/portal');
    };

    handle();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#061428] via-[var(--navy)] to-[#0d2e5e]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--gold)] mx-auto mb-4" />
        <p className="text-white/60">Signing in to your portal...</p>
      </div>
    </div>
  );
}

export default function PortalAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#061428] via-[var(--navy)] to-[#0d2e5e]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--gold)] mx-auto mb-4" />
            <p className="text-white/60">Signing in...</p>
          </div>
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
