'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select, Modal } from '@/components/ui';
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

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-700',
  'no-show': 'bg-red-100 text-red-700',
};

const STATUS_ICONS: Record<string, typeof Clock> = {
  scheduled: Clock,
  completed: CheckCircle2,
  cancelled: XCircle,
  'no-show': AlertCircle,
};

export default function BookingsPage() {
  const { groupId, isLoading: authLoading } = useAuth();
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
  const [linkedBookingIds, setLinkedBookingIds] = useState<Set<string>>(new Set());
  const [creatingWO, setCreatingWO] = useState<string | null>(null);

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
    if (!authLoading) fetchBookings();
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
      setNewBooking({
        name: '',
        contact: '',
        service_type: '',
        start_time: '',
        end_time: '',
        notes: '',
        status: 'scheduled',
      });
    } catch (err) {
      console.error('Failed to add booking:', err);
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
    } catch (err) {
      console.error('Failed to update booking:', err);
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-600 mt-1">Manage service bookings and appointments</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'calendar' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'
              }`}
            >
              <Calendar className="w-4 h-4" />
            </button>
          </div>
          <Button onClick={() => setIsAddOpen(true)}>
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
            <Card key={status} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter(statusFilter === status ? '' : status)}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 capitalize">{status === 'no-show' ? 'No-Show' : status}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{count}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${STATUS_COLORS[status]}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name or contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-44"
        />
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <Card>
          <CardContent className="p-0">
            {filteredBookings.length === 0 ? (
              <div className="p-12 text-center">
                <CalendarCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
                <p className="text-gray-600">
                  {search || statusFilter ? 'Try adjusting your filters' : 'Create your first booking to get started'}
                </p>
              </div>
            ) : (
              <>
                {/* Mobile card layout */}
                <div className="sm:hidden divide-y divide-gray-200">
                  {filteredBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => { setSelectedBooking(booking); setIsDetailOpen(true); }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 truncate">{booking.name}</p>
                          <p className="text-sm text-gray-500 mt-0.5">{booking.service_type}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDate(booking.start_time)} at {formatTime(booking.start_time)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[booking.status]}`}>
                            {booking.status === 'no-show' ? 'No-Show' : booking.status}
                          </span>
                          {linkedBookingIds.has(booking.id) ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              <CheckCircle2 className="w-3 h-3" />
                              WO Created
                            </span>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); createWOFromBooking(booking); }}
                              disabled={creatingWO === booking.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-50"
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
                      <tr className="text-left text-sm text-gray-500 border-b bg-gray-50">
                        <th className="px-6 py-3 font-medium">Customer</th>
                        <th className="px-6 py-3 font-medium">Contact</th>
                        <th className="px-6 py-3 font-medium">Service</th>
                        <th className="px-6 py-3 font-medium">Date/Time</th>
                        <th className="px-6 py-3 font-medium">Status</th>
                        <th className="px-6 py-3 font-medium">Work Order</th>
                        <th className="px-6 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredBookings.map((booking) => (
                        <tr key={booking.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium text-gray-900">{booking.name}</td>
                          <td className="px-6 py-4 text-gray-600">{booking.contact}</td>
                          <td className="px-6 py-4 text-gray-600">{booking.service_type}</td>
                          <td className="px-6 py-4 text-gray-600">
                            <div>{formatDate(booking.start_time)}</div>
                            <div className="text-xs text-gray-400">{formatTime(booking.start_time)}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[booking.status]}`}>
                              {booking.status === 'no-show' ? 'No-Show' : booking.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {linkedBookingIds.has(booking.id) ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                <CheckCircle2 className="w-3 h-3" />
                                WO Created
                              </span>
                            ) : (
                              <button
                                onClick={() => createWOFromBooking(booking)}
                                disabled={creatingWO === booking.id}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-50"
                              >
                                <Wrench className="w-3 h-3" />
                                {creatingWO === booking.id ? 'Creating...' : 'Create WO'}
                              </button>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => { setSelectedBooking(booking); setIsDetailOpen(true); }}
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
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
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <button onClick={() => navigateMonth(-1)} className="p-1 hover:bg-gray-100 rounded">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <CardTitle>
                {calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </CardTitle>
              <button onClick={() => navigateMonth(1)} className="p-1 hover:bg-gray-100 rounded">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="bg-gray-50 p-2 text-center text-xs font-medium text-gray-500">
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

                return (
                  <div
                    key={idx}
                    className={`bg-white min-h-[80px] sm:min-h-[100px] p-1 sm:p-2 ${
                      !day ? 'bg-gray-50' : ''
                    }`}
                  >
                    {day && (
                      <>
                        <span
                          className={`text-sm font-medium ${
                            isToday
                              ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center'
                              : 'text-gray-700'
                          }`}
                        >
                          {day}
                        </span>
                        <div className="mt-1 space-y-0.5">
                          {dayBookings.slice(0, 3).map((b) => (
                            <div
                              key={b.id}
                              className={`text-[10px] sm:text-xs px-1 py-0.5 rounded truncate cursor-pointer ${STATUS_COLORS[b.status]}`}
                              onClick={() => { setSelectedBooking(b); setIsDetailOpen(true); }}
                            >
                              {b.name}
                            </div>
                          ))}
                          {dayBookings.length > 3 && (
                            <p className="text-[10px] text-gray-500">+{dayBookings.length - 3} more</p>
                          )}
                        </div>
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
                <p className="text-sm text-gray-500">Customer Name</p>
                <p className="font-medium text-gray-900">{selectedBooking.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Contact</p>
                <p className="font-medium text-gray-900">{selectedBooking.contact}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Service Type</p>
                <p className="font-medium text-gray-900">{selectedBooking.service_type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date/Time</p>
                <p className="font-medium text-gray-900">
                  {formatDate(selectedBooking.start_time)} at {formatTime(selectedBooking.start_time)}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-500">Status</p>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[selectedBooking.status]}`}>
                  {selectedBooking.status === 'no-show' ? 'No-Show' : selectedBooking.status}
                </span>
              </div>
              {selectedBooking.notes && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Notes</p>
                  <p className="text-gray-700 text-sm mt-1">{selectedBooking.notes}</p>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Update Status</p>
              <div className="flex flex-wrap gap-2">
                {['scheduled', 'completed', 'cancelled', 'no-show'].map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={selectedBooking.status === status ? 'primary' : 'outline'}
                    onClick={() => handleUpdateStatus(selectedBooking.id, status)}
                  >
                    {status === 'no-show' ? 'No-Show' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Work Order</p>
              {linkedBookingIds.has(selectedBooking.id) ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-700">
                  <CheckCircle2 className="w-4 h-4" />
                  Work Order Created
                </span>
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
        onClose={() => setIsAddOpen(false)}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-black placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              rows={3}
              placeholder="Any additional notes..."
              value={newBooking.notes}
              onChange={(e) => setNewBooking({ ...newBooking, notes: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Booking</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
