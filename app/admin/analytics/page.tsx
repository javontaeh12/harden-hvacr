'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  Users,
  Briefcase,
  Calendar,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface Payment {
  id: string;
  amount: number;
  method: string;
  status: string;
  created_at: string;
  customer_id: string | null;
}

interface Booking {
  id: string;
  service_type: string;
  status: string;
  start_time: string;
  name: string;
}

interface WorkOrder {
  id: string;
  assigned_tech_id: string | null;
  status: string;
  completed_at: string | null;
  created_at: string;
  parts_used: Array<{ cost: number; quantity: number }>;
  profiles?: { full_name: string | null } | null;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

export default function AnalyticsPage() {
  const { groupId, isLoading: authLoading } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  useEffect(() => {
    if (!authLoading && groupId) fetchData();
  }, [authLoading, groupId]);

  const fetchData = async () => {
    const supabase = createClient();
    const [paymentsRes, bookingsRes, workOrdersRes] = await Promise.all([
      supabase.from('payments').select('id, amount, method, status, created_at, customer_id').eq('group_id', groupId!).order('created_at', { ascending: false }),
      supabase.from('bookings').select('id, service_type, status, start_time, name').eq('group_id', groupId!).order('start_time', { ascending: false }),
      supabase.from('work_orders').select('id, assigned_tech_id, status, completed_at, created_at, parts_used').eq('group_id', groupId!),
    ]);
    setPayments(paymentsRes.data || []);
    setBookings(bookingsRes.data || []);
    setWorkOrders((workOrdersRes.data || []) as unknown as WorkOrder[]);
    setIsLoading(false);
  };

  const dateFilter = useMemo(() => {
    const now = new Date();
    const ranges: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
    const cutoff = new Date(now.getTime() - ranges[timeRange] * 24 * 60 * 60 * 1000);
    return cutoff;
  }, [timeRange]);

  const filteredPayments = payments.filter((p) => new Date(p.created_at) >= dateFilter);
  const paidPayments = filteredPayments.filter((p) => p.status === 'paid');

  // KPIs
  const totalRevenue = paidPayments.reduce((sum, p) => sum + p.amount, 0);
  const avgTicket = paidPayments.length > 0 ? totalRevenue / paidPayments.length : 0;
  const jobsCompleted = workOrders.filter((wo) => wo.status === 'completed' && wo.completed_at && new Date(wo.completed_at) >= dateFilter).length;
  const outstanding = filteredPayments.filter((p) => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);

  // Revenue over time
  const revenueByDay = useMemo(() => {
    const map = new Map<string, number>();
    paidPayments.forEach((p) => {
      const day = new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      map.set(day, (map.get(day) || 0) + p.amount);
    });
    return Array.from(map.entries()).map(([date, amount]) => ({ date, amount })).reverse();
  }, [paidPayments]);

  // Revenue by month (bar chart)
  const revenueByMonth = useMemo(() => {
    const map = new Map<string, number>();
    paidPayments.forEach((p) => {
      const month = new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      map.set(month, (map.get(month) || 0) + p.amount);
    });
    return Array.from(map.entries()).map(([month, amount]) => ({ month, amount })).reverse();
  }, [paidPayments]);

  // Service breakdown
  const serviceBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    const filteredBookings = bookings.filter((b) => new Date(b.start_time) >= dateFilter);
    filteredBookings.forEach((b) => {
      const type = b.service_type || 'Other';
      map.set(type, (map.get(type) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [bookings, dateFilter]);

  // Payment methods
  const methodBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    paidPayments.forEach((p) => {
      const method = p.method || 'other';
      map.set(method, (map.get(method) || 0) + p.amount);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [paidPayments]);

  // Tech performance
  const techPerformance = useMemo(() => {
    const map = new Map<string, { name: string; completed: number; revenue: number }>();
    const completedWOs = workOrders.filter((wo) => wo.status === 'completed' && wo.completed_at && new Date(wo.completed_at) >= dateFilter);
    completedWOs.forEach((wo) => {
      const techName = wo.profiles?.full_name || 'Unassigned';
      const techId = wo.assigned_tech_id || 'unassigned';
      const existing = map.get(techId) || { name: techName, completed: 0, revenue: 0 };
      existing.completed += 1;
      existing.revenue += (wo.parts_used || []).reduce((s, p) => s + (p.cost || 0) * (p.quantity || 0), 0);
      map.set(techId, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.completed - a.completed);
  }, [workOrders, dateFilter]);

  // Booking trends by day of week
  const bookingsByDay = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = new Array(7).fill(0);
    bookings.filter((b) => new Date(b.start_time) >= dateFilter).forEach((b) => {
      counts[new Date(b.start_time).getDay()]++;
    });
    return days.map((day, i) => ({ day, bookings: counts[i] }));
  }, [bookings, dateFilter]);

  if (isLoading || authLoading) {
    return <div className="animate-pulse space-y-4"><div className="h-8 bg-gray-200 rounded w-48" /><div className="h-64 bg-gray-200 rounded-xl" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">Business performance at a glance</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['7d', '30d', '90d', '1y'] as const).map((range) => (
            <button key={range} onClick={() => setTimeRange(range)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${timeRange === range ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : '1 Year'}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
              </div>
              <div className="bg-green-500 p-2 rounded-lg"><DollarSign className="w-5 h-5 text-white" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Avg Ticket</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(avgTicket)}</p>
              </div>
              <div className="bg-blue-500 p-2 rounded-lg"><TrendingUp className="w-5 h-5 text-white" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Jobs Completed</p>
                <p className="text-2xl font-bold text-gray-900">{jobsCompleted}</p>
              </div>
              <div className="bg-purple-500 p-2 rounded-lg"><Briefcase className="w-5 h-5 text-white" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Outstanding</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(outstanding)}</p>
              </div>
              <div className="bg-orange-500 p-2 rounded-lg"><Calendar className="w-5 h-5 text-white" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Over Time</h3>
          {revenueByDay.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Line type="monotone" dataKey="amount" stroke="#3B82F6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-12">No revenue data for this period</p>
          )}
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Service Breakdown */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Breakdown</h3>
            {serviceBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={serviceBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                    {serviceBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-12">No booking data</p>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Payment Method</h3>
            {methodBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={methodBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-12">No payment data</p>
            )}
          </CardContent>
        </Card>

        {/* Booking Trends */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Busiest Days</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={bookingsByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="bookings" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tech Performance */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tech Performance</h3>
            {techPerformance.length > 0 ? (
              <div className="space-y-3">
                {techPerformance.map((tech, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-400' : 'bg-blue-400'}`}>{i + 1}</span>
                      <div>
                        <p className="font-medium text-gray-900">{tech.name}</p>
                        <p className="text-xs text-gray-500">{tech.completed} jobs completed</p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-700">{formatCurrency(tech.revenue)} parts</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-12">No work order data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Revenue Bar Chart */}
      {revenueByMonth.length > 1 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="amount" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
