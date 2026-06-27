'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePortal } from '@/components/PortalAuthProvider';
import { createClient } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import {
  Crown,
  Calendar,
  Gift,
  Zap,
  Wrench,
  Clock,
  Copy,
  Check,
  ChevronRight,
  Star,
  Shield,
} from 'lucide-react';

interface Booking {
  id: string;
  service_type: string;
  start_time: string;
  status: string;
  notes: string | null;
}

export default function PortalDashboard() {
  const { customer, rewards, memberSince } = usePortal();
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!customer) return;
    const fetchBookings = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('bookings')
        .select('id, service_type, start_time, status, notes')
        .eq('name', customer.full_name)
        .eq('status', 'scheduled')
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(3);
      setUpcomingBookings(data || []);
      setLoading(false);
    };
    fetchBookings();
  }, [customer]);

  const copyReferralCode = () => {
    if (customer?.referral_code) {
      navigator.clipboard.writeText(customer.referral_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const memberSinceFormatted = memberSince
    ? new Date(memberSince).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';

  const rewardsTier = !rewards ? 'Bronze' :
    rewards.lifetime_earned >= 50000 ? 'Gold' :
    rewards.lifetime_earned >= 20000 ? 'Silver' : 'Bronze';

  const tierColor = rewardsTier === 'Gold' ? 'text-yellow-600' :
    rewardsTier === 'Silver' ? 'text-gray-400' : 'text-amber-700';

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-br from-[var(--navy)] to-[#0d2e5e] rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--gold)]/10 rounded-full blur-[80px]" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-5 h-5 text-[var(--gold)]" />
            <span className="text-xs font-semibold text-[var(--gold)] uppercase tracking-wider">
              Priority Member
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">
            Welcome back, {customer?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-white/50 text-sm">
            Member since {memberSinceFormatted}
          </p>
        </div>
      </div>

      {/* Quick stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Link href="/portal/rewards" className="bg-white rounded-xl p-4 border border-gray-100 hover:border-[var(--gold)]/30 hover:shadow-md transition-all group">
          <Gift className="w-5 h-5 text-[var(--gold)] mb-2" />
          <p className="text-2xl font-bold text-[var(--navy)]">
            {formatCurrency((rewards?.balance || 0) / 100)}
          </p>
          <p className="text-xs text-[var(--navy)]/50">Rewards Balance</p>
        </Link>

        <Link href="/portal/appointments" className="bg-white rounded-xl p-4 border border-gray-100 hover:border-[var(--gold)]/30 hover:shadow-md transition-all group">
          <Calendar className="w-5 h-5 text-blue-500 mb-2" />
          <p className="text-2xl font-bold text-[var(--navy)]">
            {loading ? '—' : upcomingBookings.length}
          </p>
          <p className="text-xs text-[var(--navy)]/50">Upcoming Appts</p>
        </Link>

        <Link href="/portal/rewards" className="bg-white rounded-xl p-4 border border-gray-100 hover:border-[var(--gold)]/30 hover:shadow-md transition-all group">
          <Star className="w-5 h-5 mb-2" />
          <p className={`text-2xl font-bold ${tierColor}`}>
            {rewardsTier}
          </p>
          <p className="text-xs text-[var(--navy)]/50">Rewards Tier</p>
        </Link>

        <Link href="/portal/upgrades" className="bg-white rounded-xl p-4 border border-gray-100 hover:border-[var(--gold)]/30 hover:shadow-md transition-all group">
          <Zap className="w-5 h-5 text-[var(--ember)] mb-2" />
          <p className="text-2xl font-bold text-[var(--navy)]">10</p>
          <p className="text-xs text-[var(--navy)]/50">Upgrades Available</p>
        </Link>
      </div>

      {/* Two-column layout on desktop */}
      <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
        {/* Upcoming appointments */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-[var(--navy)]">Upcoming Appointments</h2>
            <Link href="/portal/appointments" className="text-xs text-[var(--gold)] font-semibold hover:underline">
              View All
            </Link>
          </div>
          <div className="p-5">
            {loading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="animate-pulse flex gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-100 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : upcomingBookings.length === 0 ? (
              <div className="text-center py-6">
                <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-[var(--navy)]/40">No upcoming appointments</p>
                <Link href="/portal/schedule" className="text-xs text-[var(--gold)] font-semibold mt-2 inline-block hover:underline">
                  Schedule a service
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingBookings.map(booking => (
                  <div key={booking.id} className="flex items-center gap-3 p-3 bg-[#f8f7f4] rounded-lg">
                    <div className="w-10 h-10 bg-[var(--gold)]/10 rounded-lg flex items-center justify-center">
                      <Wrench className="w-4 h-4 text-[var(--gold)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--navy)] truncate">
                        {booking.service_type}
                      </p>
                      <p className="text-xs text-[var(--navy)]/50 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(booking.start_time).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Referral & rewards card */}
        <div className="space-y-4">
          {/* Referral code card */}
          {customer?.referral_code && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Gift className="w-4 h-4 text-[var(--gold)]" />
                <h2 className="font-bold text-[var(--navy)] text-sm">Your Referral Code</h2>
              </div>
              <p className="text-xs text-[var(--navy)]/50 mb-3">
                Share your code and earn $25 in rewards when someone uses it for the first time.
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-[#f8f7f4] rounded-lg px-4 py-2.5 font-mono font-bold text-[var(--navy)] tracking-wider text-center">
                  {customer.referral_code}
                </div>
                <button
                  onClick={copyReferralCode}
                  className="p-2.5 rounded-lg bg-[var(--gold)]/10 hover:bg-[var(--gold)]/20 transition-colors"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-[var(--gold)]" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-bold text-[var(--navy)] text-sm mb-3">Quick Actions</h2>
            <div className="space-y-2">
              <Link href="/portal/schedule" className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#f8f7f4] transition-colors group">
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-blue-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[var(--navy)]">Schedule Service</p>
                  <p className="text-xs text-[var(--navy)]/40">Book your next appointment</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[var(--navy)]" />
              </Link>
              <Link href="/portal/upgrades" className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#f8f7f4] transition-colors group">
                <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-amber-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[var(--navy)]">Browse Upgrades</p>
                  <p className="text-xs text-[var(--navy)]/40">Improve your system</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[var(--navy)]" />
              </Link>
              <Link href="/portal/rewards" className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#f8f7f4] transition-colors group">
                <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center">
                  <Gift className="w-4 h-4 text-green-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[var(--navy)]">View Rewards</p>
                  <p className="text-xs text-[var(--navy)]/40">Track your earnings</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[var(--navy)]" />
              </Link>
            </div>
          </div>

          {/* Member perks */}
          <div className="bg-gradient-to-br from-[var(--gold)]/5 to-[var(--gold)]/10 rounded-xl border border-[var(--gold)]/20 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-[var(--gold)]" />
              <h2 className="font-bold text-[var(--navy)] text-sm">Your Member Perks</h2>
            </div>
            <ul className="space-y-2 text-xs text-[var(--navy)]/70">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[var(--gold)]" />
                Priority scheduling & same-day service
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[var(--gold)]" />
                15% discount on all parts
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[var(--gold)]" />
                2 free tune-ups per year
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[var(--gold)]" />
                $25 per referral in rewards cash
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
