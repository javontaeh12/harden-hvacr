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

    const handleCallback = async () => {
      const supabase = createClient();

      // Handle implicit flow: tokens come in URL hash fragment
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const access_token = hashParams.get('access_token');
      const refresh_token = hashParams.get('refresh_token');

      // Handle PKCE flow: code comes in query params
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');

      let session;

      if (access_token && refresh_token) {
        // Implicit flow — set session from hash tokens
        const { data, error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (error) {
          console.error('setSession error:', error);
          router.replace('/login?error=auth_failed');
          return;
        }
        session = data.session;
      } else if (code) {
        // PKCE flow — exchange code for session
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error('exchangeCodeForSession error:', error);
          router.replace('/login?error=auth_failed');
          return;
        }
        session = data.session;
      } else {
        // No tokens and no code — something went wrong
        router.replace('/login?error=auth_failed');
        return;
      }

      if (!session?.user) {
        router.replace('/login?error=auth_failed');
        return;
      }

      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, status, group_id')
        .eq('id', session.user.id)
        .single();

      if (!existingProfile) {
        // Create new profile with pending status
        const { error: insertError } = await supabase.from('profiles').insert({
          id: session.user.id,
          email: session.user.email,
          full_name:
            session.user.user_metadata?.full_name ||
            session.user.email?.split('@')[0],
          role: 'tech',
          status: 'pending',
        } as Record<string, unknown>);

        if (insertError) {
          console.error('Profile creation error:', insertError);
          router.replace('/login?error=auth_failed');
          return;
        }

        // Redirect to onboarding for group code
        router.replace('/onboarding');
        return;
      }

      // Existing profile without a group — send to onboarding
      if (!existingProfile.group_id) {
        router.replace('/onboarding');
        return;
      }

      if (existingProfile.status === 'rejected') {
        router.replace('/login?error=access_denied');
        return;
      }

      if (existingProfile.status === 'pending') {
        router.replace('/pending');
        return;
      }

      router.replace('/admin');
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Signing in...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Signing in...</p>
          </div>
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
