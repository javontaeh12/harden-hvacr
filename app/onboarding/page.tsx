'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Button, Input } from '@/components/ui';
import { Users, Snowflake, LogOut } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUserEmail(user?.email ?? null);

        // Pre-fill name from user metadata if available
        if (user?.user_metadata?.full_name) {
          setFullName(user.user_metadata.full_name);
        }
      } catch (err) {
        console.error('Failed to get user:', err);
      }
    };
    getUser();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const supabase = createClient();

    // Look up group by code
    const { data: group, error: groupError } = await supabase
      .from('organization_groups')
      .select('id, name')
      .eq('group_code', groupCode.toUpperCase().trim())
      .single();

    if (groupError || !group) {
      setError('Invalid group code. Please check with your administrator.');
      setIsLoading(false);
      return;
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Not authenticated. Please sign in again.');
      setIsLoading(false);
      return;
    }

    // Update profile with group_id and full_name
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        group_id: group.id,
        full_name: fullName.trim(),
      })
      .eq('id', user.id);

    if (updateError) {
      setError('Failed to update profile. Please try again.');
      setIsLoading(false);
      return;
    }

    // Notify admin via server API (handles nodemailer)
    try {
      const emailRes = await fetch('/api/auth/new-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName.trim(),
          email: userEmail || 'Unknown',
        }),
      });
      if (!emailRes.ok) {
        console.error('Admin notification email failed:', emailRes.status);
      }
    } catch (err) {
      console.error('Admin notification email error:', err);
    }

    // Redirect to pending approval
    router.replace('/pending');
  };

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
    } catch (err) {
      console.error('Sign out error:', err);
    }
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Snowflake className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Join Your Team</h1>
          <p className="text-gray-600 mt-2">
            Enter your name and the group code provided by your administrator.
          </p>
          {userEmail && (
            <p className="text-sm text-gray-500 mt-1">
              Signed in as <span className="font-medium">{userEmail}</span>
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            placeholder="Enter your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <div>
            <Input
              label="Group Code"
              placeholder="e.g., ABC123"
              value={groupCode}
              onChange={(e) => setGroupCode(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Ask your admin or manager for your team&apos;s group code.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
          )}

          <Button type="submit" isLoading={isLoading} className="w-full">
            <Users className="w-4 h-4 mr-2" />
            Join Group
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t">
          <button
            onClick={handleSignOut}
            className="flex items-center justify-center gap-2 w-full text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
