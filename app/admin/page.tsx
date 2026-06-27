'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { getStatusConfig, BOOKING_STATUS, WORK_ORDER_STATUS, PAYMENT_STATUS, PRIORITY_LEVELS, CALL_INTENT, URGENCY_LEVELS, CALL_OUTCOME } from '@/lib/status';
import {
  Package,
  AlertTriangle,
  Truck,
  CalendarDays,
  ClipboardList,
  DollarSign,
  Users,
  FileText,
  FileCheck,
  Clock,
  Wrench,
  ArrowRight,
  TrendingUp,
  Star,
  Phone,
  Crown,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
  BarChart3,
  Receipt,
  Activity,
  ChevronRight,
  Zap,
  Shield,
  CreditCard,
} from 'lucide-react';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardStats {
  // Inventory
  totalItems: number;
  lowStockItems: number;
  totalVans: number;
  // Business
  todayBookings: number;
  activeWorkOrders: number;
  monthRevenue: number;
  totalCustomers: number;
  openQuotes: number;
  openQuotesValue: number;
  activeContracts: number;
  pendingFollowUps: number;
  activeMemberships: number;
  expiringContracts: number;
  pendingPayments: number;
  overdueAmount: number;
  overdueCount: number;
  scheduledCount: number;
  inProgressCount: number;
}

interface BookingItem {
  id: string;
  name: string;
  contact: string;
  service_type: string;
  start_time: string;
  status: string;
  tech_name?: string;
}

interface PaymentItem {
  id: string;
  amount: number;
  method: string;
  status: string;
  created_at: string;
  customer_name?: string;
}

interface LowStockItem {
  id: string;
  name: string;
  quantity: number;
  min_quantity: number;
  van_name: string;
}

interface WorkOrderItem {
  id: string;
  description: string;
  status: string;
  priority: string;
  scheduled_date: string;
  customer_name?: string;
}

interface LatestCallItem {
  id: string;
  caller_phone: string | null;
  intent: string | null;
  service_type: string | null;
  urgency: string | null;
  outcome: string | null;
  duration_seconds: number | null;
  created_at: string;
}

interface ExpiringContractItem {
  id: string;
  title: string;
  end_date: string;
  type: string;
  customer_name: string;
}

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Welcome banner skeleton */}
      <Skeleton className="h-32 sm:h-36 rounded-2xl" />

      {/* KPI hero cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-[#c8d8ea] p-5">
            <div className="flex items-start gap-4">
              <Skeleton.Circle className="h-12 w-12" />
              <div className="flex-1 space-y-2">
                <Skeleton.Text className="w-20 h-3" />
                <Skeleton.Text className="w-24 h-7" />
                <Skeleton.Text className="w-16 h-3" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Secondary stats */}
      <div className="flex flex-wrap gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-10 w-40 rounded-lg" />
        ))}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <Skeleton.Card className="h-80" />
          <Skeleton.Card className="h-64" />
        </div>
        <div className="lg:col-span-2 space-y-6">
          <Skeleton.Card className="h-48" />
          <Skeleton.Card className="h-64" />
          <Skeleton.Card className="h-56" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function AdminDashboard() {
  const { profile, groupId, group } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalItems: 0,
    lowStockItems: 0,
    totalVans: 0,
    todayBookings: 0,
    activeWorkOrders: 0,
    monthRevenue: 0,
    totalCustomers: 0,
    openQuotes: 0,
    openQuotesValue: 0,
    activeContracts: 0,
    pendingFollowUps: 0,
    activeMemberships: 0,
    expiringContracts: 0,
    pendingPayments: 0,
    overdueAmount: 0,
    overdueCount: 0,
    scheduledCount: 0,
    inProgressCount: 0,
  });
  const [todaySchedule, setTodaySchedule] = useState<BookingItem[]>([]);
  const [recentPayments, setRecentPayments] = useState<PaymentItem[]>([]);
  const [lowStockList, setLowStockList] = useState<LowStockItem[]>([]);
  const [activeOrders, setActiveOrders] = useState<WorkOrderItem[]>([]);
  const [latestCall, setLatestCall] = useState<LatestCallItem | null>(null);
  const [expiringContractsList, setExpiringContractsList] = useState<ExpiringContractItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      if (!groupId) return;
      try {
        const supabase = createClient();
        const userVanId = profile?.van_id;

        // Date helpers
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        // Inventory query (scoped to user's van)
        let itemsQuery = supabase
          .from('inventory_items')
          .select('id, name, quantity, min_quantity, van_id')
          .eq('group_id', groupId);
        if (userVanId) {
          itemsQuery = itemsQuery.eq('van_id', userVanId);
        } else {
          itemsQuery = itemsQuery.eq('van_id', 'no-van-assigned');
        }

        // Fire all queries in parallel
        const [
          itemsResult,
          vansResult,
          todayBookingsResult,
          activeWOResult,
          monthPaymentsResult,
          customersResult,
          openQuotesResult,
          activeContractsResult,
          followUpsResult,
          recentPaymentsResult,
          latestCallResult,
          activeMembershipsResult,
          expiringContractsResult,
          overduePaymentsResult,
          openQuotesValueResult,
        ] = await Promise.all([
          // Inventory
          itemsQuery,
          supabase.from('vans').select('id, name').eq('group_id', groupId),
          // Today's bookings
          supabase
            .from('bookings')
            .select('id, name, contact, service_type, start_time, status')
            .eq('group_id', groupId)
            .gte('start_time', todayStart)
            .lt('start_time', todayEnd)
            .order('start_time', { ascending: true }),
          // Active work orders
          supabase
            .from('work_orders')
            .select('id, description, status, priority, scheduled_date')
            .eq('group_id', groupId)
            .in('status', ['assigned', 'en_route', 'in_progress']),
          // This month's payments
          supabase
            .from('payments')
            .select('id, amount, status')
            .eq('group_id', groupId)
            .eq('status', 'paid')
            .gte('created_at', monthStart),
          // Total customers
          supabase
            .from('customers')
            .select('id', { count: 'exact', head: true })
            .eq('group_id', groupId),
          // Open quotes
          supabase
            .from('quotes')
            .select('id, total_amount', { count: 'exact' })
            .eq('group_id', groupId)
            .in('status', ['draft', 'sent']),
          // Active contracts
          supabase
            .from('contracts')
            .select('id', { count: 'exact', head: true })
            .eq('group_id', groupId)
            .in('status', ['active', 'signed']),
          // Pending follow-ups
          supabase
            .from('follow_ups')
            .select('id', { count: 'exact', head: true })
            .eq('group_id', groupId)
            .eq('status', 'pending'),
          // Recent payments (last 5)
          supabase
            .from('payments')
            .select('id, amount, method, status, created_at, customer_id')
            .eq('group_id', groupId)
            .order('created_at', { ascending: false })
            .limit(5),
          // Latest AI call (global, no group_id)
          supabase
            .from('call_sessions')
            .select('id, caller_phone, intent, service_type, urgency, outcome, duration_seconds, created_at')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          // Active memberships
          supabase
            .from('contracts')
            .select('id', { count: 'exact', head: true })
            .eq('group_id', groupId)
            .eq('type', 'membership')
            .in('status', ['active', 'signed']),
          // Expiring contracts (within 30 days)
          supabase
            .from('contracts')
            .select('id, title, end_date, type, customers(full_name)')
            .eq('group_id', groupId)
            .in('status', ['active', 'signed'])
            .gte('end_date', new Date().toISOString())
            .lte('end_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
            .order('end_date', { ascending: true }),
          // Overdue payments
          supabase
            .from('payments')
            .select('id, amount, status')
            .eq('group_id', groupId)
            .eq('status', 'overdue'),
          // Open quotes with value
          supabase
            .from('quotes')
            .select('id, total_amount')
            .eq('group_id', groupId)
            .in('status', ['draft', 'sent']),
        ]);

        // Process inventory
        const items = itemsResult.data || [];
        const vans = vansResult.data || [];
        const lowStock = items.filter((item) => item.quantity < item.min_quantity);
        const vanMap = new Map(vans.map((v) => [v.id, v.name]));

        // Calculate revenue
        const monthPayments = monthPaymentsResult.data || [];
        const monthRevenue = monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

        // Active work orders list
        const workOrders = activeWOResult.data || [];

        // Overdue payments
        const overduePayments = overduePaymentsResult.data || [];
        const overdueAmount = overduePayments.reduce((sum, p) => sum + (p.amount || 0), 0);

        // Open quotes value
        const quotesWithValue = openQuotesValueResult.data || [];
        const openQuotesValue = quotesWithValue.reduce((sum, q) => sum + ((q as Record<string, unknown>).total_amount as number || 0), 0);

        // Today booking status breakdown
        const todayBookings = todayBookingsResult.data || [];
        const scheduledCount = todayBookings.filter(b => b.status === 'scheduled' || b.status === 'confirmed').length;
        const inProgressCount = todayBookings.filter(b => b.status === 'in_progress' || b.status === 'en_route').length;

        setStats({
          totalItems: items.length,
          lowStockItems: lowStock.length,
          totalVans: vans.length,
          todayBookings: todayBookings.length,
          activeWorkOrders: workOrders.length,
          monthRevenue,
          totalCustomers: customersResult.count || 0,
          openQuotes: openQuotesResult.count || quotesWithValue.length,
          openQuotesValue,
          activeContracts: activeContractsResult.count || 0,
          pendingFollowUps: followUpsResult.count || 0,
          activeMemberships: activeMembershipsResult.count || 0,
          expiringContracts: (expiringContractsResult.data || []).length,
          pendingPayments: 0,
          overdueAmount,
          overdueCount: overduePayments.length,
          scheduledCount,
          inProgressCount,
        });

        setTodaySchedule(todayBookings.slice(0, 6));

        setRecentPayments(
          (recentPaymentsResult.data || []).map((p) => ({
            id: p.id,
            amount: p.amount,
            method: p.method,
            status: p.status,
            created_at: p.created_at,
          }))
        );

        setLowStockList(
          lowStock.slice(0, 5).map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            min_quantity: item.min_quantity,
            van_name: vanMap.get(item.van_id) || 'Unknown',
          }))
        );

        setActiveOrders(
          workOrders.slice(0, 5).map((wo) => ({
            id: wo.id,
            description: wo.description,
            status: wo.status,
            priority: wo.priority,
            scheduled_date: wo.scheduled_date,
          }))
        );

        // Latest AI call
        if (latestCallResult.data) {
          setLatestCall(latestCallResult.data as LatestCallItem);
        }

        // Expiring contracts
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const expContracts = (expiringContractsResult.data || []).map((c: any) => ({
          id: c.id,
          title: c.title || 'Untitled Contract',
          end_date: c.end_date,
          type: c.type || 'contract',
          customer_name: c.customers?.full_name || 'Unknown',
        }));
        setExpiringContractsList(expContracts.slice(0, 5));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, [groupId, profile?.van_id]);

  const isAdminOrManager = profile?.role === 'admin' || profile?.role === 'manager';

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------
  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl">
        <p className="text-red-800 font-semibold text-lg">Failed to load dashboard</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Quick actions
  const quickActions = [
    { label: 'New Booking', href: '/admin/bookings', icon: CalendarDays, color: 'bg-[#e55b2b]/10 text-[#e55b2b]' },
    { label: 'New Quote', href: '/admin/quotes', icon: FileText, color: 'bg-[#f5a623]/10 text-[#f5a623]' },
    { label: 'View Schedule', href: '/admin/bookings', icon: Clock, color: 'bg-[#42a5f5]/10 text-[#42a5f5]' },
    { label: 'Add Customer', href: '/admin/customers', icon: Users, color: 'bg-emerald-500/10 text-emerald-600' },
    { label: 'Parts Store', href: '/admin/parts-store', icon: Package, color: 'bg-[#e55b2b]/10 text-[#e55b2b]' },
    { label: 'Run Report', href: '/admin/analytics', icon: BarChart3, color: 'bg-[#0a1f3f]/10 text-[#0a1f3f]' },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* ================================================================== */}
      {/* Welcome Banner                                                     */}
      {/* ================================================================== */}
      <div className="bg-gradient-to-r from-[#0a1f3f] to-[#122e5c] rounded-2xl p-5 sm:p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#e55b2b]/10 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#f5a623]/10 rounded-full translate-y-1/2 -translate-x-1/4" />
        <div className="absolute top-1/2 right-1/4 w-48 h-48 bg-[#f5a623]/5 rounded-full -translate-y-1/2" />
        <div className="relative">
          <p className="text-[#f5a623] text-xs sm:text-sm font-semibold tracking-wide uppercase mb-1">
            {group?.name || 'Harden HVACR'}
          </p>
          <h1 className="text-xl sm:text-3xl font-bold">
            {getGreeting()}, {profile?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-white/60 text-sm mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* ================================================================== */}
      {/* KPI Hero Cards (4 large)                                           */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue This Month */}
        <Link href="/admin/payments" className="group">
          <div className="bg-white rounded-xl border border-[#c8d8ea] p-5 hover:shadow-md transition-shadow h-full">
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5 text-xs font-medium">
                <ArrowUpRight className="h-3 w-3" />
                this month
              </div>
            </div>
            <p className="text-2xl font-bold text-[#0a1f3f]">{formatCurrency(stats.monthRevenue)}</p>
            <p className="text-sm text-[#4a6580] mt-0.5">Revenue this month</p>
          </div>
        </Link>

        {/* Jobs Today */}
        <Link href="/admin/bookings" className="group">
          <div className="bg-white rounded-xl border border-[#c8d8ea] p-5 hover:shadow-md transition-shadow h-full">
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#42a5f5]/10">
                <Briefcase className="h-6 w-6 text-[#42a5f5]" />
              </div>
              {stats.todayBookings > 0 && (
                <Badge variant="info" size="sm">
                  {stats.inProgressCount > 0 ? `${stats.inProgressCount} active` : 'today'}
                </Badge>
              )}
            </div>
            <p className="text-2xl font-bold text-[#0a1f3f]">{stats.todayBookings}</p>
            <p className="text-sm text-[#4a6580] mt-0.5">
              Jobs today
              {stats.todayBookings > 0 && (
                <span className="text-xs ml-1">
                  ({stats.scheduledCount} scheduled{stats.inProgressCount > 0 ? `, ${stats.inProgressCount} in progress` : ''})
                </span>
              )}
            </p>
          </div>
        </Link>

        {/* Open Estimates */}
        <Link href="/admin/quotes" className="group">
          <div className="bg-white rounded-xl border border-[#c8d8ea] p-5 hover:shadow-md transition-shadow h-full">
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f5a623]/10">
                <FileText className="h-6 w-6 text-[#f5a623]" />
              </div>
              {stats.openQuotes > 0 && (
                <Badge variant="warning" size="sm">
                  {stats.openQuotes} open
                </Badge>
              )}
            </div>
            <p className="text-2xl font-bold text-[#0a1f3f]">{stats.openQuotes}</p>
            <p className="text-sm text-[#4a6580] mt-0.5">
              Open estimates
              {stats.openQuotesValue > 0 && (
                <span className="text-xs ml-1">({formatCurrency(stats.openQuotesValue)} value)</span>
              )}
            </p>
          </div>
        </Link>

        {/* Outstanding Balance */}
        <Link href="/admin/payments" className="group">
          <div className="bg-white rounded-xl border border-[#c8d8ea] p-5 hover:shadow-md transition-shadow h-full">
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10">
                <Receipt className="h-6 w-6 text-red-500" />
              </div>
              {stats.overdueCount > 0 && (
                <Badge variant="danger" size="sm">
                  {stats.overdueCount} overdue
                </Badge>
              )}
            </div>
            <p className="text-2xl font-bold text-[#0a1f3f]">{formatCurrency(stats.overdueAmount)}</p>
            <p className="text-sm text-[#4a6580] mt-0.5">Outstanding balance</p>
          </div>
        </Link>
      </div>

      {/* ================================================================== */}
      {/* Secondary Stat Pills                                               */}
      {/* ================================================================== */}
      <div className="flex flex-wrap gap-3">
        <Link href="/admin/memberships" className="inline-flex items-center gap-2 bg-white rounded-lg border border-[#c8d8ea] px-4 py-2 hover:shadow-md transition-shadow">
          <Crown className="h-4 w-4 text-[#f5a623]" />
          <span className="text-sm font-medium text-[#0a1f3f]">{stats.activeMemberships}</span>
          <span className="text-sm text-[#4a6580]">Active Members</span>
        </Link>

        <Link href="/admin/inventory" className="inline-flex items-center gap-2 bg-white rounded-lg border border-[#c8d8ea] px-4 py-2 hover:shadow-md transition-shadow">
          <AlertTriangle className={`h-4 w-4 ${stats.lowStockItems > 0 ? 'text-red-500' : 'text-emerald-500'}`} />
          <span className="text-sm font-medium text-[#0a1f3f]">{stats.lowStockItems}</span>
          <span className="text-sm text-[#4a6580]">Low Stock Items</span>
        </Link>

        <Link href="/admin/contracts" className="inline-flex items-center gap-2 bg-white rounded-lg border border-[#c8d8ea] px-4 py-2 hover:shadow-md transition-shadow">
          <Shield className={`h-4 w-4 ${stats.expiringContracts > 0 ? 'text-[#f5a623]' : 'text-[#42a5f5]'}`} />
          <span className="text-sm font-medium text-[#0a1f3f]">{stats.expiringContracts}</span>
          <span className="text-sm text-[#4a6580]">Expiring Contracts</span>
        </Link>

        {stats.pendingFollowUps > 0 && (
          <Link href="/admin/customers" className="inline-flex items-center gap-2 bg-white rounded-lg border border-[#c8d8ea] px-4 py-2 hover:shadow-md transition-shadow">
            <Clock className="h-4 w-4 text-[#e55b2b]" />
            <span className="text-sm font-medium text-[#0a1f3f]">{stats.pendingFollowUps}</span>
            <span className="text-sm text-[#4a6580]">Pending Follow-ups</span>
          </Link>
        )}
      </div>

      {/* ================================================================== */}
      {/* Main Content — Two Column                                          */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 sm:gap-6">
        {/* ============================================================== */}
        {/* LEFT COLUMN (~60%)                                              */}
        {/* ============================================================== */}
        <div className="lg:col-span-3 space-y-5 sm:space-y-6">
          {/* Today's Schedule */}
          <div className="bg-white rounded-xl border border-[#c8d8ea] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#c8d8ea]">
              <div>
                <h2 className="text-lg font-semibold text-[#0a1f3f] flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-[#42a5f5]" />
                  Today&apos;s Schedule
                </h2>
                <p className="text-xs text-[#4a6580] mt-0.5">{stats.todayBookings} jobs scheduled for today</p>
              </div>
              <Link
                href="/admin/bookings"
                className="text-sm font-medium text-[#e55b2b] hover:text-[#e55b2b]/80 flex items-center gap-1 transition-colors"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="p-4">
              {todaySchedule.length === 0 ? (
                <EmptyState
                  icon={<CalendarDays className="h-7 w-7" />}
                  title="No bookings today"
                  description="Your schedule is clear. Create a new booking to get started."
                  action={
                    <Link
                      href="/admin/bookings"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#e55b2b] text-white text-sm font-medium hover:bg-[#c4411a] transition-colors"
                    >
                      <CalendarDays className="h-4 w-4" /> New Booking
                    </Link>
                  }
                  className="py-8"
                />
              ) : (
                <div className="space-y-2">
                  {todaySchedule.map((booking) => {
                    const statusCfg = getStatusConfig('booking', booking.status);
                    return (
                      <div
                        key={booking.id}
                        className="flex items-center gap-4 p-3 rounded-lg bg-[#f0f5fb]/50 hover:bg-[#f0f5fb] transition-colors"
                      >
                        {/* Time */}
                        <div className="shrink-0 text-center min-w-[60px]">
                          <p className="text-sm font-bold text-[#0a1f3f]">{formatTime(booking.start_time)}</p>
                        </div>
                        {/* Divider line */}
                        <div className="w-px h-10 bg-[#c8d8ea] shrink-0" />
                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-[#0a1f3f] text-sm truncate">{booking.name}</p>
                          <p className="text-xs text-[#4a6580] truncate">{booking.service_type}</p>
                        </div>
                        {/* Status badge */}
                        <Badge variant={statusCfg.variant} size="sm" dot>
                          {statusCfg.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Active Jobs */}
          <div className="bg-white rounded-xl border border-[#c8d8ea] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#c8d8ea]">
              <div>
                <h2 className="text-lg font-semibold text-[#0a1f3f] flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-[#f5a623]" />
                  Active Jobs
                </h2>
                <p className="text-xs text-[#4a6580] mt-0.5">{stats.activeWorkOrders} work orders in progress</p>
              </div>
              <Link
                href="/admin/service"
                className="text-sm font-medium text-[#e55b2b] hover:text-[#e55b2b]/80 flex items-center gap-1 transition-colors"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="p-4">
              {activeOrders.length === 0 ? (
                <EmptyState
                  icon={<Wrench className="h-7 w-7" />}
                  title="No active jobs"
                  description="All work orders are complete or pending assignment."
                  className="py-8"
                />
              ) : (
                <div className="space-y-2">
                  {activeOrders.map((wo) => {
                    const statusCfg = getStatusConfig('work_order', wo.status);
                    const priorityCfg = getStatusConfig('priority', wo.priority);
                    return (
                      <div
                        key={wo.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-[#f0f5fb]/50 hover:bg-[#f0f5fb] transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-[#0a1f3f] text-sm truncate">
                            {wo.description || 'Work Order'}
                          </p>
                          {wo.scheduled_date && (
                            <p className="text-xs text-[#4a6580]">
                              {new Date(wo.scheduled_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={priorityCfg.variant} size="sm">
                            {priorityCfg.label}
                          </Badge>
                          <Badge variant={statusCfg.variant} size="sm" dot>
                            {statusCfg.label}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Latest AI Call */}
          <div className="bg-white rounded-xl border border-[#c8d8ea] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#c8d8ea]">
              <h2 className="text-lg font-semibold text-[#0a1f3f] flex items-center gap-2">
                <Phone className="h-5 w-5 text-purple-500" />
                Latest AI Call
              </h2>
              <Link
                href="/admin/calls"
                className="text-sm font-medium text-[#e55b2b] hover:text-[#e55b2b]/80 flex items-center gap-1 transition-colors"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="p-4">
              {!latestCall ? (
                <EmptyState
                  icon={<Phone className="h-7 w-7" />}
                  title="No AI calls yet"
                  description="Incoming calls handled by the AI assistant will appear here."
                  className="py-8"
                />
              ) : (
                <div className="p-3 rounded-lg bg-[#f0f5fb]/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-[#0a1f3f] text-sm">{latestCall.caller_phone || 'Unknown caller'}</p>
                    <span className="text-xs text-[#4a6580]">{formatDate(latestCall.created_at)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {latestCall.intent && (() => {
                      const cfg = getStatusConfig('call_intent', latestCall.intent);
                      return <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>;
                    })()}
                    {latestCall.urgency && (() => {
                      const cfg = getStatusConfig('urgency', latestCall.urgency);
                      return <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>;
                    })()}
                    {latestCall.outcome && (() => {
                      const cfg = getStatusConfig('call_outcome', latestCall.outcome);
                      return <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>;
                    })()}
                  </div>
                  {latestCall.duration_seconds && (
                    <p className="text-xs text-[#4a6580]">
                      {Math.round(latestCall.duration_seconds / 60)} min call &bull; {latestCall.service_type || 'General'}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* RIGHT COLUMN (~40%)                                             */}
        {/* ============================================================== */}
        <div className="lg:col-span-2 space-y-5 sm:space-y-6">
          {/* Quick Actions */}
          {isAdminOrManager && (
            <div className="bg-white rounded-xl border border-[#c8d8ea] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#c8d8ea]">
                <h2 className="text-lg font-semibold text-[#0a1f3f] flex items-center gap-2">
                  <Zap className="h-5 w-5 text-[#e55b2b]" />
                  Quick Actions
                </h2>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3">
                  {quickActions.map((action) => (
                    <Link
                      key={action.label}
                      href={action.href}
                      className="flex flex-col items-center gap-2.5 p-4 rounded-xl border border-[#c8d8ea] hover:border-[#e55b2b]/30 hover:shadow-md transition-all text-center group"
                    >
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${action.color} transition-transform group-hover:scale-110`}>
                        <action.icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-medium text-[#0a1f3f]">{action.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Recent Payments */}
          <div className="bg-white rounded-xl border border-[#c8d8ea] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#c8d8ea]">
              <h2 className="text-lg font-semibold text-[#0a1f3f] flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-emerald-500" />
                Recent Payments
              </h2>
              <Link
                href="/admin/payments"
                className="text-sm font-medium text-[#e55b2b] hover:text-[#e55b2b]/80 flex items-center gap-1 transition-colors"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="p-4">
              {recentPayments.length === 0 ? (
                <EmptyState
                  icon={<DollarSign className="h-7 w-7" />}
                  title="No payments yet"
                  description="Payments will appear here as they are recorded."
                  className="py-8"
                />
              ) : (
                <div className="space-y-2">
                  {recentPayments.map((payment) => {
                    const statusCfg = getStatusConfig('payment', payment.status);
                    return (
                      <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg bg-[#f0f5fb]/50 hover:bg-[#f0f5fb] transition-colors">
                        <div className="min-w-0">
                          <p className="font-bold text-[#0a1f3f] text-sm">
                            {formatCurrency(payment.amount)}
                          </p>
                          <p className="text-xs text-[#4a6580] capitalize">{payment.method}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={statusCfg.variant} size="sm">
                            {statusCfg.label}
                          </Badge>
                          <span className="text-xs text-[#4a6580]">{formatDate(payment.created_at)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Activity Feed — Low Stock + Expiring Contracts */}
          <div className="bg-white rounded-xl border border-[#c8d8ea] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#c8d8ea]">
              <h2 className="text-lg font-semibold text-[#0a1f3f] flex items-center gap-2">
                <Activity className="h-5 w-5 text-[#e55b2b]" />
                Alerts &amp; Activity
              </h2>
            </div>
            <div className="p-4 space-y-4">
              {/* Low stock alerts */}
              {lowStockList.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-[#0a1f3f] flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      Low Stock
                    </p>
                    <Link
                      href="/admin/inventory"
                      className="text-xs font-medium text-[#e55b2b] hover:text-[#e55b2b]/80 flex items-center gap-0.5 transition-colors"
                    >
                      View <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                  <div className="space-y-1.5">
                    {lowStockList.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-2.5 rounded-lg bg-red-50/50">
                        <div className="min-w-0">
                          <p className="font-medium text-[#0a1f3f] text-sm truncate">{item.name}</p>
                          <p className="text-xs text-[#4a6580]">{item.van_name}</p>
                        </div>
                        <Badge variant="danger" size="sm">
                          {item.quantity}/{item.min_quantity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Expiring contracts */}
              {expiringContractsList.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-[#0a1f3f] flex items-center gap-1.5">
                      <RefreshCw className="h-4 w-4 text-[#f5a623]" />
                      Contract Renewals
                    </p>
                    <Link
                      href="/admin/contracts"
                      className="text-xs font-medium text-[#e55b2b] hover:text-[#e55b2b]/80 flex items-center gap-0.5 transition-colors"
                    >
                      View <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                  <div className="space-y-1.5">
                    {expiringContractsList.map((contract) => (
                      <Link key={contract.id} href={`/admin/contracts/${contract.id}`}>
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#fef9ee]/50 hover:bg-[#fef9ee] transition-colors">
                          <div className="min-w-0">
                            <p className="font-medium text-[#0a1f3f] text-sm truncate">{contract.title}</p>
                            <p className="text-xs text-[#4a6580]">{contract.customer_name}</p>
                          </div>
                          <div className="text-right shrink-0 ml-3">
                            <Badge variant="warning" size="sm">
                              {new Date(contract.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </Badge>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state if nothing to show */}
              {lowStockList.length === 0 && expiringContractsList.length === 0 && (
                <EmptyState
                  icon={<Activity className="h-7 w-7" />}
                  title="All clear"
                  description="No alerts or urgent items at this time."
                  className="py-6"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
