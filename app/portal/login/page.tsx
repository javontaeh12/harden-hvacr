'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Snowflake, Crown, Shield, Star, Clock } from 'lucide-react';

function PortalLoginForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const searchParams = useSearchParams();
  const authError = searchParams.get('error');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const supabase = createClient();
    const { error: authErr } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/portal/auth/callback`,
      },
    });

    if (authErr) {
      setError(authErr.message);
      setIsLoading(false);
      return;
    }

    setSent(true);
    setIsLoading(false);
  };

  if (sent) {
    return (
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-[var(--gold)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Crown className="w-8 h-8 text-[var(--gold)]" />
        </div>
        <h2 className="text-xl font-bold text-[var(--navy)] mb-2">Check Your Email</h2>
        <p className="text-[var(--navy)]/60 text-sm mb-4">
          We sent a magic link to <strong>{email}</strong>. Click the link to sign in to your Priority Member portal.
        </p>
        <button
          onClick={() => { setSent(false); setEmail(''); }}
          className="text-sm text-[var(--ember)] font-semibold hover:underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
      {/* Premium header */}
      <div className="bg-gradient-to-br from-[var(--navy)] to-[#0d2e5e] px-8 pt-8 pb-6 text-center">
        <div className="w-14 h-14 bg-[var(--gold)]/20 rounded-full flex items-center justify-center mx-auto mb-3">
          <Crown className="w-7 h-7 text-[var(--gold)]" />
        </div>
        <h1 className="text-xl font-bold text-white">Priority Member Portal</h1>
        <p className="text-white/50 text-sm mt-1">Exclusive access for Priority Membership holders</p>
      </div>

      <div className="p-8">
        {authError === 'not_member' && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg mb-6 text-sm">
            This email is not linked to an active Priority Membership. Contact us to sign up.
          </div>
        )}
        {authError === 'auth_failed' && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
            Authentication failed. Please try again.
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[var(--navy)] mb-1.5">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your membership email"
              required
              className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/50 focus:border-[var(--gold)]"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !email}
            className="w-full rounded-full bg-gradient-to-r from-[var(--gold)] to-[#d4a017] px-6 py-3.5 text-sm font-bold text-[var(--navy)] hover:shadow-lg hover:shadow-[var(--gold)]/30 transition-all disabled:opacity-50"
          >
            {isLoading ? 'Sending...' : 'Send Magic Link'}
          </button>
        </form>

        {/* Benefits reminder */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-xs font-semibold text-[var(--navy)]/40 uppercase tracking-wider mb-3">Member Benefits</p>
          <div className="space-y-2">
            {[
              { icon: Shield, text: 'Priority scheduling & discounts' },
              { icon: Star, text: 'Rewards & referral cash' },
              { icon: Clock, text: 'Manage appointments online' },
            ].map((b) => (
              <div key={b.text} className="flex items-center gap-2 text-xs text-[var(--navy)]/50">
                <b.icon className="w-3.5 h-3.5 text-[var(--gold)]" />
                {b.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PortalLoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#061428] via-[var(--navy)] to-[#0d2e5e] flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[var(--gold)]/10 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[var(--accent)]/10 rounded-full blur-[100px]" />

      <Suspense
        fallback={
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 animate-pulse">
            <div className="h-16 w-16 bg-gray-200 rounded-full mx-auto mb-4" />
            <div className="h-8 bg-gray-200 rounded w-48 mx-auto mb-8" />
            <div className="h-12 bg-gray-200 rounded w-full" />
          </div>
        }
      >
        <PortalLoginForm />
      </Suspense>
    </div>
  );
}
