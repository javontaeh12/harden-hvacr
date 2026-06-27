'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui';
import { Snowflake } from 'lucide-react';

function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get('error');

  // Try restoring session from localStorage backup before showing login.
  // We call getUser() instead of refreshSession() to avoid a race condition
  // with autoRefreshToken — both would rotate the refresh token simultaneously,
  // triggering reuse detection and killing the session overnight.
  useEffect(() => {
    // Don't try to restore if there's an explicit error (e.g. access_denied)
    if (error) {
      setIsRestoring(false);
      return;
    }

    const tryRestore = async () => {
      try {
        const supabase = createClient();

        // getUser() waits for the client to initialize from storage
        // (cookies → localStorage fallback). autoRefreshToken handles
        // rotating expired tokens internally before getUser() resolves.
        const { data: { user: existingUser } } = await supabase.auth.getUser();

        if (existingUser) {
          // Session was restored from backup — navigate away
          router.replace('/admin');
          return;
        }

        setIsRestoring(false);
      } catch {
        setIsRestoring(false);
      }
    };

    tryRestore();
  }, [error, router]);
  const detail = searchParams.get('detail');

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error('Login error:', error);
      setIsLoading(false);
    }
  };

  if (isRestoring) {
    return (
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Checking session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <Snowflake className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">HVAC Service Portal</h1>
        <p className="text-gray-600 mt-2">Sign in to access inventory and tools</p>
      </div>

      {error === 'access_denied' && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          Your access request was denied. Please contact an administrator.
        </div>
      )}

      {error === 'auth_failed' && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          Authentication failed. Please try again.
          {detail && <p className="text-xs mt-1 text-red-500">Debug: {detail}</p>}
        </div>
      )}

      <Button
        onClick={handleGoogleLogin}
        isLoading={isLoading}
        className="w-full"
        size="lg"
      >
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Sign in with Google
      </Button>

      <p className="text-center text-sm text-gray-500 mt-6">
        New users will be asked for their group code after signing in.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 animate-pulse">
            <div className="h-16 w-16 bg-gray-200 rounded-full mx-auto mb-4" />
            <div className="h-8 bg-gray-200 rounded w-48 mx-auto mb-2" />
            <div className="h-4 bg-gray-200 rounded w-64 mx-auto mb-8" />
            <div className="h-12 bg-gray-200 rounded w-full" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
