'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select, Modal } from '@/components/ui';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/hooks/useToast';
import { BOOKING_STATUS } from '@/lib/status';
import { formatDate } from '@/lib/utils';
import {
  CalendarCheck,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Calendar,
  List,
  Wrench,
  Ban,
} from 'lucide-react';

interface Booking {
  id: string;
  name: string;
  contact: string;
  service_type: string;
  start_time: string;
  end_time: string | null;
  notes: string | null;
  google_event_id: string | null;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  group_id: string;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no-show', label: 'No-Show' },
];

const STATUS_ICONS: Record<string, typeof Clock> = {
  scheduled: Clock,
  completed: CheckCircle2,
  cancelled: XCircle,
  'no-show': AlertCircle,
};

const STATUS_ICON_BG: Record<string, string> = {
  scheduled: 'bg-[#c8d8ea]/60',
  completed: 'bg-emerald-100',
  cancelled: 'bg-gray-200',
  'no-show': 'bg-red-100',
};

/** Map a booking DB status key to a Badge variant */
function bookingBadgeVariant(status: string) {
  const cfg = BOOKING_STATUS[status];
  return cfg?.variant ?? 'default';
}

/** Get display label for a booking status */
function bookingLabel(status: string) {
  const cfg = BOOKING_STATUS[status];
  return cfg?.label ?? status;
}

export default function BookingsPage() {
  const { groupId, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [linkedBookingIds, setLinkedBookingIds] = useState<Set<string>>(new Set());
  const [creatingWO, setCreatingWO] = useState<string | null>(null);
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set());

  // Add booking form state
  const [newBooking, setNewBooking] = useState({
    name: '',
    contact: '',
    service_type: '',
    start_time: '',
    end_time: '',
    notes: '',
    status: 'scheduled' as const,
  });

  useEffect(() => {
    if (!authLoading) {
      fetchBookings();
      fetchBlockedDates();
    }
  }, [authLoading]);

  const fetchBookings = async () => {
    if (!groupId) return;
    try {
      const supabase = createClient();
      const [bookingsResult, woResult] = await Promise.all([
        supabase
          .from('bookings')
          .select('*')
          .eq('group_id', groupId)
          .order('start_time', { ascending: false }),
        supabase
          .from('work_orders')
          .select('booking_id')
          .eq('group_id', groupId)
          .not('booking_id', 'is', null),
      ]);

      if (bookingsResult.error) throw bookingsResult.error;
      setBookings(bookingsResult.data || []);

      if (woResult.data) {
        setLinkedBookingIds(new Set(woResult.data.map((wo: { booking_id: string | null }) => wo.booking_id!)));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const matchesSearch =
        !search ||
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.contact.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = !statusFilter || b.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [bookings, search, statusFilter]);

  const handleAddBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId) return;

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('bookings')
        .insert({ ...newBooking, group_id: groupId })
        .select()
        .single();

      if (error) throw error;
      setBookings([data, ...bookings]);
      setIsAddOpen(false);
      setSelectedDay(null);
      setNewBooking({
        name: '',
        contact: '',
        service_type: '',
        start_time: '',
        end_time: '',
        notes: '',
        status: 'scheduled',
      });
      toast.success('Booking created', `${data.name} has been scheduled.`);
    } catch (err) {
      console.error('Failed to add booking:', err);
      toast.error('Failed to create booking', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const fetchBlockedDates = async () => {
    try {
      const res = await fetch('/api/blocked-dates');
      if (res.ok) {
        const data = await res.json();
        setBlockedDates(new Set(data.map((d: { date: string }) => d.date)));
      }
    } catch (err) {
      console.error('Failed to fetch blocked dates:', err);
    }
  };

  const toggleBlockedDate = async (dateStr: string) => {
    if (blockedDates.has(dateStr)) {
      // Unblock
      const res = await fetch(`/api/blocked-dates?date=${dateStr}`, { method: 'DELETE' });
      if (res.ok) {
        setBlockedDates(prev => { const next = new Set(prev); next.delete(dateStr); return next; });
      }
    } else {
      // Block
      const res = await fetch('/api/blocked-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr, reason: 'Blocked by admin' }),
      });
      if (res.ok) {
        setBlockedDates(prev => new Set(prev).add(dateStr));
      }
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setBookings(bookings.map((b) => (b.id === id ? data : b)));
      if (selectedBooking?.id === id) setSelectedBooking(data);
      toast.success('Status updated', `Booking marked as ${bookingLabel(status)}.`);
    } catch (err) {
      console.error('Failed to update booking:', err);
      toast.error('Update failed', 'Could not update the booking status.');
    }
  };

  const handleCancelBooking = async (id: string) => {
    await handleUpdateStatus(id, 'cancelled');
    toast.info('Booking cancelled');
  };

  const createWOFromBooking = async (booking: Booking) => {
    if (!groupId) return;
    setCreatingWO(booking.id);
    try {
      const supabase = createClient();
      const scheduledDate = booking.start_time.split('T')[0];
      const { error } = await supabase.from('work_orders').insert({
        booking_id: booking.id,
        customer_id: (booking as unknown as Record<string, unknown>).customer_id || null,
        description: `${booking.service_type} - ${booking.name}`,
        scheduled_date: scheduledDate,
        group_id: groupId,
        status: 'assigned',
        priority: 'normal',
      } as Record<string, unknown>);

      if (error) throw error;
      setLinkedBookingIds((prev) => {
        const next = new Set(prev);
        next.add(booking.id);
        return next;
      });
    } catch (err) {
      console.error('Failed to create work order:', err);
    } finally {
      setCreatingWO(null);
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Calendar helpers
  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [calendarDate]);

  const getBookingsForDay = (day: number) => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const dayStart = new Date(year, month, day).toISOString().split('T')[0];
    return filteredBookings.filter((b) => b.start_time.startsWith(dayStart));
  };

  const navigateMonth = (dir: number) => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + dir, 1));
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { scheduled: 0, completed: 0, cancelled: 0, 'no-show': 0 };
    bookings.forEach((b) => {
      if (counts[b.status] !== undefined) counts[b.status]++;
    });
    return counts;
  }, [bookings]);

  // Tabs for status filter (pills)
  const statusTabs = useMemo(() => [
    { value: '', label: 'All', count: bookings.length },
    ...STATUS_OPTIONS.filter((s) => s.value).map((s) => ({
      value: s.value,
      label: s.label,
      count: statusCounts[s.value] ?? 0,
    })),
  ], [bookings.length, statusCounts]);

  // Tabs for view mode (boxed)
  const viewTabs = [
    { value: 'list', label: 'List', icon: <List className="w-4 h-4" /> },
    { value: 'calendar', label: 'Calendar', icon: <Calendar className="w-4 h-4" /> },
  ];

  if (isLoading || authLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800 font-medium">Failed to load bookings</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0a1f3f]">Bookings</h1>
          <p className="text-[#4a6580] mt-1">Manage service bookings and appointments</p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs
            tabs={viewTabs}
            value={viewMode}
            onChange={(v) => setViewMode(v as 'list' | 'calendar')}
            variant="boxed"
          />
          <Button onClick={() => setIsAddOpen(true)} className="bg-[#e55b2b] hover:bg-[#e55b2b]/90 text-white">
            <Plus className="w-4 h-4 mr-2" />
            New Booking
          </Button>
        </div>
      </div>

      {/* Status summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(statusCounts).map(([status, count]) => {
          const Icon = STATUS_ICONS[status];
          return (
            <Card key={status} className="cursor-pointer hover:shadow-md transition-shadow bg-white rounded-xl border border-[#c8d8ea]" onClick={() => setStatusFilter(statusFilter === status ? '' : status)}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-[#4a6580] capitalize">{bookingLabel(status)}</p>
                    <p className="text-2xl font-bold text-[#0a1f3f] mt-1">{count}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${STATUS_ICON_BG[status]}`}>
                    <Icon className="w-5 h-5 text-[#0a1f3f]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Status filter pills */}
      <Tabs
        tabs={statusTabs}
        value={statusFilter}
        onChange={setStatusFilter}
        variant="pills"
      />

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a6580]" />
          <Input
            placeholder="Search by name or contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <Card className="bg-white rounded-xl border border-[#c8d8ea]">
          <CardContent className="p-0">
            {filteredBookings.length === 0 ? (
              <EmptyState
                icon={<CalendarCheck className="w-8 h-8" />}
                title="No bookings found"
                description={search || statusFilter ? 'Try adjusting your filters' : 'Create your first booking to get started'}
                action={
                  !search && !statusFilter ? (
                    <Button onClick={() => setIsAddOpen(true)} className="bg-[#e55b2b] hover:bg-[#e55b2b]/90 text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      New Booking
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <>
                {/* Mobile card layout */}
                <div className="sm:hidden divide-y divide-[#c8d8ea]">
                  {filteredBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => { setSelectedBooking(booking); setIsDetailOpen(true); }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-[#0a1f3f] truncate">{booking.name}</p>
                          <p className="text-sm text-[#4a6580] mt-0.5">{booking.service_type}</p>
                          <p className="text-xs text-[#4a6580]/70 mt-1">
                            {formatDate(booking.start_time)} at {formatTime(booking.start_time)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <Badge variant={bookingBadgeVariant(booking.status)}>
                            {bookingLabel(booking.status)}
                          </Badge>
                          {linkedBookingIds.has(booking.id) ? (
                            <Badge variant="success" icon={<CheckCircle2 className="w-3 h-3" />}>
                              WO Created
                            </Badge>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); createWOFromBooking(booking); }}
                              disabled={creatingWO === booking.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#e55b2b]/10 text-[#e55b2b] hover:bg-[#e55b2b]/20 transition-colors disabled:opacity-50"
                            >
                              <Wrench className="w-3 h-3" />
                              {creatingWO === booking.id ? 'Creating...' : 'Create WO'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table layout */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-[#4a6580] border-b border-[#c8d8ea] bg-gray-50">
                        <th className="px-6 py-3 font-medium">Customer</th>
                        <th className="px-6 py-3 font-medium">Contact</th>
                        <th className="px-6 py-3 font-medium">Service</th>
                        <th className="px-6 py-3 font-medium">Date/Time</th>
                        <th className="px-6 py-3 font-medium">Status</th>
                        <th className="px-6 py-3 font-medium">Work Order</th>
                        <th className="px-6 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#c8d8ea]">
                      {filteredBookings.map((booking) => (
                        <tr key={booking.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium text-[#0a1f3f]">{booking.name}</td>
                          <td className="px-6 py-4 text-[#4a6580]">{booking.contact}</td>
                          <td className="px-6 py-4 text-[#4a6580]">{booking.service_type}</td>
                          <td className="px-6 py-4 text-[#4a6580]">
                            <div>{formatDate(booking.start_time)}</div>
                            <div className="text-xs text-[#4a6580]/70">{formatTime(booking.start_time)}</div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={bookingBadgeVariant(booking.status)}>
                              {bookingLabel(booking.status)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            {linkedBookingIds.has(booking.id) ? (
                              <Badge variant="success" icon={<CheckCircle2 className="w-3 h-3" />}>
                                WO Created
                              </Badge>
                            ) : (
                              <button
                                onClick={() => createWOFromBooking(booking)}
                                disabled={creatingWO === booking.id}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-[#e55b2b]/10 text-[#e55b2b] hover:bg-[#e55b2b]/20 transition-colors disabled:opacity-50"
                              >
                                <Wrench className="w-3 h-3" />
                                {creatingWO === booking.id ? 'Creating...' : 'Create WO'}
                              </button>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => { setSelectedBooking(booking); setIsDetailOpen(true); }}
                              className="text-[#e55b2b] hover:text-[#e55b2b]/80 text-sm font-medium"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <Card className="bg-white rounded-xl border border-[#c8d8ea]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <button onClick={() => navigateMonth(-1)} className="p-1 hover:bg-gray-100 rounded">
                <ChevronLeft className="w-5 h-5 text-[#4a6580]" />
              </button>
              <CardTitle className="text-[#0a1f3f]">
                {calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </CardTitle>
              <button onClick={() => navigateMonth(1)} className="p-1 hover:bg-gray-100 rounded">
                <ChevronRight className="w-5 h-5 text-[#4a6580]" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-px bg-[#c8d8ea] rounded-lg overflow-hidden">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="bg-gray-50 p-2 text-center text-xs font-medium text-[#4a6580]">
                  {day}
                </div>
              ))}
              {calendarDays.map((day, idx) => {
                const dayBookings = day ? getBookingsForDay(day) : [];
                const isToday =
                  day &&
                  new Date().getDate() === day &&
                  new Date().getMonth() === calendarDate.getMonth() &&
                  new Date().getFullYear() === calendarDate.getFullYear();
                const dateStr = day
                  ? `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  : '';
                const isBlocked = day ? blockedDates.has(dateStr) : false;

                const isSelected = day && selectedDay === dateStr;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (!day || isBlocked) return;
                      setSelectedDay((prev) => (prev === dateStr ? null : dateStr));
                    }}
                    className={`relative min-h-[80px] sm:min-h-[100px] p-1 sm:p-2 ${
                      !day ? 'bg-gray-50' : isBlocked ? 'bg-red-50' : 'bg-white'
                    } ${day && !isBlocked ? 'cursor-pointer' : ''} ${
                      isSelected ? 'ring-2 ring-[#e55b2b]/50 ring-inset' : ''
                    }`}
                  >
                    {day && (
                      <>
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-sm font-medium ${
                              isToday
                                ? 'bg-[#e55b2b] text-white w-6 h-6 rounded-full flex items-center justify-center'
                                : isBlocked ? 'text-red-400' : 'text-[#0a1f3f]'
                            }`}
                          >
                            {day}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleBlockedDate(dateStr); }}
                            className={`p-0.5 rounded transition-colors ${
                              isBlocked
                                ? 'text-red-500 hover:text-red-700 hover:bg-red-100'
                                : 'text-gray-300 hover:text-red-500 hover:bg-red-50'
                            }`}
                            title={isBlocked ? 'Unblock this day' : 'Block this day'}
                          >
                            <Ban className="w-3 h-3" />
                          </button>
                        </div>
                        {isBlocked ? (
                          <p className="text-[10px] text-red-400 font-medium mt-1">Blocked</p>
                        ) : (
                          <div className="mt-1 space-y-0.5">
                            {dayBookings.slice(0, 3).map((b) => (
                              <div
                                key={b.id}
                                className="text-[10px] sm:text-xs px-1 py-0.5 rounded truncate cursor-pointer bg-[#e55b2b]/10 text-[#e55b2b] hover:bg-[#e55b2b]/20"
                                onClick={(e) => { e.stopPropagation(); setSelectedBooking(b); setIsDetailOpen(true); }}
                              >
                                {b.name}
                              </div>
                            ))}
                            {dayBookings.length > 3 && (
                              <p className="text-[10px] text-[#4a6580]">+{dayBookings.length - 3} more</p>
                            )}
                          </div>
                        )}
                        {isSelected && !isBlocked && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setNewBooking({
                                name: '',
                                contact: '',
                                service_type: '',
                                start_time: `${dateStr}T09:00`,
                                end_time: '',
                                notes: '',
                                status: 'scheduled',
                              });
                              setIsAddOpen(true);
                            }}
                            title="New booking on this day"
                            className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-[#e55b2b] text-white flex items-center justify-center shadow-md hover:bg-[#e55b2b]/90 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Booking Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Booking Details"
      >
        {selectedBooking && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-[#4a6580]">Customer Name</p>
                <p className="font-medium text-[#0a1f3f]">{selectedBooking.name}</p>
              </div>
              <div>
                <p className="text-sm text-[#4a6580]">Contact</p>
                <p className="font-medium text-[#0a1f3f]">{selectedBooking.contact}</p>
              </div>
              <div>
                <p className="text-sm text-[#4a6580]">Service Type</p>
                <p className="font-medium text-[#0a1f3f]">{selectedBooking.service_type}</p>
              </div>
              <div>
                <p className="text-sm text-[#4a6580]">Date/Time</p>
                <p className="font-medium text-[#0a1f3f]">
                  {formatDate(selectedBooking.start_time)} at {formatTime(selectedBooking.start_time)}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-[#4a6580]">Status</p>
                <Badge variant={bookingBadgeVariant(selectedBooking.status)} size="md">
                  {bookingLabel(selectedBooking.status)}
                </Badge>
              </div>
              {selectedBooking.notes && (
                <div className="col-span-2">
                  <p className="text-sm text-[#4a6580]">Notes</p>
                  <p className="text-[#4a6580] text-sm mt-1">{selectedBooking.notes}</p>
                </div>
              )}
            </div>

            <div className="border-t border-[#c8d8ea] pt-4">
              <p className="text-sm font-medium text-[#0a1f3f] mb-2">Update Status</p>
              <div className="flex flex-wrap gap-2">
                {['scheduled', 'completed', 'cancelled', 'no-show'].map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={selectedBooking.status === status ? 'primary' : 'outline'}
                    onClick={() => handleUpdateStatus(selectedBooking.id, status)}
                    className={selectedBooking.status === status ? 'bg-[#e55b2b] hover:bg-[#e55b2b]/90 text-white border-[#e55b2b]' : ''}
                  >
                    {bookingLabel(status)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="border-t border-[#c8d8ea] pt-4">
              <p className="text-sm font-medium text-[#0a1f3f] mb-2">Work Order</p>
              {linkedBookingIds.has(selectedBooking.id) ? (
                <Badge variant="success" size="md" icon={<CheckCircle2 className="w-4 h-4" />}>
                  Work Order Created
                </Badge>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => createWOFromBooking(selectedBooking)}
                  disabled={creatingWO === selectedBooking.id}
                >
                  <Wrench className="w-4 h-4 mr-2" />
                  {creatingWO === selectedBooking.id ? 'Creating...' : 'Create Work Order'}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Add Booking Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => { setIsAddOpen(false); setSelectedDay(null); }}
        title="New Booking"
      >
        <form onSubmit={handleAddBooking} className="space-y-4">
          <Input
            label="Customer Name"
            placeholder="John Smith"
            value={newBooking.name}
            onChange={(e) => setNewBooking({ ...newBooking, name: e.target.value })}
            required
          />
          <Input
            label="Contact"
            placeholder="Phone or email"
            value={newBooking.contact}
            onChange={(e) => setNewBooking({ ...newBooking, contact: e.target.value })}
            required
          />
          <Input
            label="Service Type"
            placeholder="e.g., AC Repair, Maintenance"
            value={newBooking.service_type}
            onChange={(e) => setNewBooking({ ...newBooking, service_type: e.target.value })}
            required
          />
          <Input
            label="Start Time"
            type="datetime-local"
            value={newBooking.start_time}
            onChange={(e) => setNewBooking({ ...newBooking, start_time: e.target.value })}
            required
          />
          <Input
            label="End Time"
            type="datetime-local"
            value={newBooking.end_time}
            onChange={(e) => setNewBooking({ ...newBooking, end_time: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-[#0a1f3f] mb-1">Notes</label>
            <textarea
              className="block w-full rounded-lg border border-[#c8d8ea] px-3 py-2 text-black placeholder-[#4a6580]/50 focus:border-[#e55b2b] focus:outline-none focus:ring-1 focus:ring-[#e55b2b]"
              rows={3}
              placeholder="Any additional notes..."
              value={newBooking.notes}
              onChange={(e) => setNewBooking({ ...newBooking, notes: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-[#c8d8ea]">
            <Button type="button" variant="outline" onClick={() => { setIsAddOpen(false); setSelectedDay(null); }}>
              Cancel
            </Button>
            <Button type="submit" className="bg-[#e55b2b] hover:bg-[#e55b2b]/90 text-white">Create Booking</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
