'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePortal } from '@/components/PortalAuthProvider';
import { createClient } from '@/lib/supabase';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Wrench,
  Plus,
  ChevronRight,
  Phone,
} from 'lucide-react';

interface Booking {
  id: string;
  service_type: string;
  start_time: string;
  end_time: string | null;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  notes: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Clock },
  completed: { label: 'Completed', color: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-gray-50 text-gray-500 border-gray-200', icon: XCircle },
  'no-show': { label: 'No Show', color: 'bg-red-50 text-red-600 border-red-200', icon: AlertCircle },
};

export default function AppointmentsPage() {
  const { customer } = usePortal();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    if (!customer) return;
    const fetchBookings = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('bookings')
        .select('id, service_type, start_time, end_time, status, notes')
        .eq('name', customer.full_name)
        .order('start_time', { ascending: false });
      setBookings(data || []);
      setLoading(false);
    };
    fetchBookings();
  }, [customer]);

  const now = new Date().toISOString();
  const upcoming = bookings.filter(b => b.status === 'scheduled' && b.start_time >= now);
  const past = bookings.filter(b => b.status !== 'scheduled' || b.start_time < now);
  const displayed = tab === 'upcoming' ? upcoming : past;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--navy)]">Appointments</h1>
          <p className="text-sm text-[var(--navy)]/50">View and manage your service appointments</p>
        </div>
        <Link
          href="/portal/schedule"
          className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--gold)] to-[#d4a017] px-4 py-2.5 text-sm font-bold text-[var(--navy)] hover:shadow-lg hover:shadow-[var(--gold)]/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Schedule Service</span>
          <span className="sm:hidden">Book</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setTab('upcoming')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-semibold transition-all ${
            tab === 'upcoming'
              ? 'bg-white text-[var(--navy)] shadow-sm'
              : 'text-[var(--navy)]/40 hover:text-[var(--navy)]/60'
          }`}
        >
          Upcoming ({upcoming.length})
        </button>
        <button
          onClick={() => setTab('past')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-semibold transition-all ${
            tab === 'past'
              ? 'bg-white text-[var(--navy)] shadow-sm'
              : 'text-[var(--navy)]/40 hover:text-[var(--navy)]/60'
          }`}
        >
          Past ({past.length})
        </button>
      </div>

      {/* Bookings list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl p-5 border border-gray-100 animate-pulse">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-2/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
          <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <h3 className="font-bold text-[var(--navy)] mb-1">
            {tab === 'upcoming' ? 'No Upcoming Appointments' : 'No Past Appointments'}
          </h3>
          <p className="text-sm text-[var(--navy)]/40 mb-4">
            {tab === 'upcoming'
              ? "You don't have any scheduled appointments."
              : 'Your appointment history will appear here.'}
          </p>
          {tab === 'upcoming' && (
            <Link
              href="/portal/schedule"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--gold)] to-[#d4a017] px-5 py-2.5 text-sm font-bold text-[var(--navy)] hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              Schedule a Service
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(booking => {
            const cfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.scheduled;
            const Icon = cfg.icon;
            const date = new Date(booking.start_time);
            const isUpcoming = booking.status === 'scheduled' && booking.start_time >= now;

            return (
              <div key={booking.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:border-[var(--gold)]/20 transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[var(--gold)]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Wrench className="w-5 h-5 text-[var(--gold)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-[var(--navy)]">{booking.service_type}</h3>
                        <p className="text-xs text-[var(--navy)]/50 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {date.toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                          {' at '}
                          {date.toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.color} flex items-center gap-1 flex-shrink-0`}>
                        <Icon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </div>
                    {booking.notes && (
                      <p className="text-xs text-[var(--navy)]/40 mt-2">
                        {booking.notes}
                      </p>
                    )}
                    {isUpcoming && (
                      <div className="flex items-center gap-3 mt-3">
                        <a
                          href="tel:+13365551234"
                          className="text-xs text-[var(--navy)]/50 hover:text-[var(--navy)] flex items-center gap-1 transition-colors"
                        >
                          <Phone className="w-3 h-3" />
                          Call to Reschedule
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
