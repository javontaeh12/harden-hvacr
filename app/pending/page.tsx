'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui';
import { Clock, LogOut } from 'lucide-react';

export default function PendingPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let userId: string | null = null;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id ?? null;
      setUserEmail(user?.email ?? null);
    };

    init();

    // Subscribe to profile changes — compare against stored userId to avoid re-calling getUser
    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          if (payload.new.id === userId && payload.new.status === 'approved') {
            router.push('/admin');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
    } catch (err) {
      console.error('Sign out error:', err);
    }
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
          <Clock className="w-8 h-8 text-amber-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Pending Approval</h1>

        <p className="text-gray-600 mb-6">
          Your access request is being reviewed by an administrator. You&apos;ll be able to
          access the portal once your request is approved.
        </p>

        {userEmail && (
          <p className="text-sm text-gray-500 mb-6">
            Signed in as <span className="font-medium">{userEmail}</span>
          </p>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-amber-800">
            This page will automatically redirect once your access is approved.
          </p>
        </div>

        <Button variant="outline" onClick={handleSignOut} className="w-full">
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
