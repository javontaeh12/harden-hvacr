'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Button, Input, Select } from '@/components/ui';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/hooks/useToast';
import { getStatusConfig } from '@/lib/status';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  CreditCard,
  DollarSign,
  Search,
  Clock,
  CheckCircle2,
  TrendingUp,
  Banknote,
} from 'lucide-react';

interface Payment {
  id: string;
  booking_id: string | null;
  customer_id: string | null;
  amount: number;
  method: 'square' | 'cash' | 'check';
  status: 'paid' | 'pending' | 'refunded';
  notes: string | null;
  group_id: string;
  created_at: string;
  customers?: { full_name: string } | null;
  bookings?: { service_type: string } | null;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'refunded', label: 'Refunded' },
];

const METHOD_OPTIONS = [
  { value: '', label: 'All Methods' },
  { value: 'square', label: 'Square' },
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
];

const METHOD_LABELS: Record<string, string> = {
  square: 'Square',
  cash: 'Cash',
  check: 'Check',
};

export default function PaymentsPage() {
  const { groupId, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    if (!authLoading) fetchPayments();
  }, [authLoading]);

  const fetchPayments = async () => {
    if (!groupId) return;
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('payments')
        .select('*, customers(full_name), bookings(service_type)')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const customerName = p.customers?.full_name || '';
      const matchesSearch =
        !search || customerName.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = !statusFilter || p.status === statusFilter;
      const matchesMethod = !methodFilter || p.method === methodFilter;
      const matchesFrom = !dateFrom || p.created_at >= dateFrom;
      const matchesTo = !dateTo || p.created_at <= dateTo + 'T23:59:59';
      return matchesSearch && matchesStatus && matchesMethod && matchesFrom && matchesTo;
    });
  }, [payments, search, statusFilter, methodFilter, dateFrom, dateTo]);

  const summaryStats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const monthPayments = payments.filter(
      (p) => p.created_at >= monthStart && p.status === 'paid'
    );
    const todayPayments = payments.filter(
      (p) => p.created_at >= todayStart && p.status === 'paid'
    );
    const outstanding = payments
      .filter((p) => p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      monthRevenue: monthPayments.reduce((sum, p) => sum + p.amount, 0),
      outstanding,
      todayCollected: todayPayments.reduce((sum, p) => sum + p.amount, 0),
    };
  }, [payments]);

  // Aging report
  const agingReport = useMemo(() => {
    const now = new Date();
    const pending = payments.filter((p) => p.status === 'pending');
    const aging = { current: 0, days30: 0, days60: 0, days90: 0 };
    pending.forEach((p) => {
      const days = Math.floor((now.getTime() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24));
      if (days <= 30) aging.current += p.amount;
      else if (days <= 60) aging.days30 += p.amount;
      else if (days <= 90) aging.days60 += p.amount;
      else aging.days90 += p.amount;
    });
    return aging;
  }, [payments]);

  const handleMarkPaid = async (id: string) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('payments')
        .update({ status: 'paid' })
        .eq('id', id)
        .select('*, customers(full_name), bookings(service_type)')
        .single();

      if (error) throw error;
      setPayments(payments.map((p) => (p.id === id ? data : p)));
      toast.success('Payment recorded', `Payment of ${formatCurrency(data.amount)} has been marked as paid`);
    } catch (err) {
      console.error('Failed to update payment:', err);
      toast.error('Failed to update payment', 'Please try again');
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-[#dceaf8]/50 rounded w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-[#dceaf8]/50 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-[#dceaf8]/50 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800 font-medium">Failed to load payments</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0a1f3f]">Payments</h1>
        <p className="text-[#4a6580] mt-1">Track revenue and manage payment records</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-[#c8d8ea] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#4a6580]">Monthly Revenue</p>
              <p className="text-2xl font-bold text-[#0a1f3f] mt-1">
                {formatCurrency(summaryStats.monthRevenue)}
              </p>
            </div>
            <div className="bg-emerald-500/10 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#c8d8ea] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#4a6580]">Outstanding</p>
              <p className="text-2xl font-bold text-[#0a1f3f] mt-1">
                {formatCurrency(summaryStats.outstanding)}
              </p>
            </div>
            <div className={`${summaryStats.outstanding > 0 ? 'bg-amber-500/10' : 'bg-emerald-500/10'} p-3 rounded-lg`}>
              <Clock className={`w-6 h-6 ${summaryStats.outstanding > 0 ? 'text-amber-600' : 'text-emerald-600'}`} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#c8d8ea] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#4a6580]">Collected Today</p>
              <p className="text-2xl font-bold text-[#0a1f3f] mt-1">
                {formatCurrency(summaryStats.todayCollected)}
              </p>
            </div>
            <div className="bg-[#e55b2b]/10 p-3 rounded-lg">
              <Banknote className="w-6 h-6 text-[#e55b2b]" />
            </div>
          </div>
        </div>
      </div>

      {/* Aging Report */}
      {summaryStats.outstanding > 0 && (
        <div className="bg-white rounded-xl border border-[#c8d8ea]">
          <div className="pt-4 pb-4 px-6">
            <h3 className="text-sm font-semibold text-[#0a1f3f] mb-3">Aging Report</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-xs text-[#4a6580]">Current</p>
                <p className="text-lg font-bold text-emerald-600">{formatCurrency(agingReport.current)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-[#4a6580]">31-60 Days</p>
                <p className="text-lg font-bold text-amber-600">{formatCurrency(agingReport.days30)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-[#4a6580]">61-90 Days</p>
                <p className="text-lg font-bold text-orange-600">{formatCurrency(agingReport.days60)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-[#4a6580]">90+ Days</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(agingReport.days90)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a6580]" />
          <Input
            placeholder="Search by customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-40"
        />
        <Select
          options={METHOD_OPTIONS}
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="w-full sm:w-40"
        />
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-full sm:w-40"
          placeholder="From"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-full sm:w-40"
          placeholder="To"
        />
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl border border-[#c8d8ea]">
        <div className="p-0">
          {filteredPayments.length === 0 ? (
            <EmptyState
              icon={<CreditCard className="w-7 h-7" />}
              title="No payments found"
              description={
                search || statusFilter || methodFilter
                  ? 'Try adjusting your filters'
                  : 'Payments will appear here when recorded'
              }
            />
          ) : (
            <>
              {/* Mobile layout */}
              <div className="sm:hidden divide-y divide-[#c8d8ea]">
                {filteredPayments.map((payment) => {
                  const statusConf = getStatusConfig('payment', payment.status);
                  return (
                    <div key={payment.id} className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-[#0a1f3f]">
                            {payment.customers?.full_name || 'Unknown Customer'}
                          </p>
                          <p className="text-sm text-[#4a6580] mt-0.5">
                            {payment.bookings?.service_type || 'N/A'}
                          </p>
                          <p className="text-xs text-[#4a6580]/70 mt-1">{formatDate(payment.created_at)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-[#0a1f3f]">{formatCurrency(payment.amount)}</p>
                          <Badge variant={statusConf.variant} className="mt-1">
                            {statusConf.label}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-[#4a6580]">{METHOD_LABELS[payment.method]}</span>
                        {payment.status === 'pending' && (
                          <Button size="sm" className="bg-[#e55b2b] hover:bg-[#e55b2b]/90 text-white" onClick={() => handleMarkPaid(payment.id)}>
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Mark Paid
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-[#4a6580] border-b border-[#c8d8ea] bg-[#dceaf8]/50">
                      <th className="px-6 py-3 font-medium">Date</th>
                      <th className="px-6 py-3 font-medium">Customer</th>
                      <th className="px-6 py-3 font-medium">Service</th>
                      <th className="px-6 py-3 font-medium">Amount</th>
                      <th className="px-6 py-3 font-medium">Method</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#c8d8ea]">
                    {filteredPayments.map((payment) => {
                      const statusConf = getStatusConfig('payment', payment.status);
                      return (
                        <tr key={payment.id} className="hover:bg-[#0a1f3f]/5">
                          <td className="px-6 py-4 text-[#4a6580] text-sm">
                            {formatDate(payment.created_at)}
                          </td>
                          <td className="px-6 py-4 font-medium text-[#0a1f3f]">
                            {payment.customers?.full_name || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 text-[#4a6580]">
                            {payment.bookings?.service_type || 'N/A'}
                          </td>
                          <td className="px-6 py-4 font-medium text-[#0a1f3f]">
                            {formatCurrency(payment.amount)}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 text-sm text-[#4a6580]">
                              <DollarSign className="w-3 h-3" />
                              {METHOD_LABELS[payment.method]}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={statusConf.variant}>
                              {statusConf.label}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            {payment.status === 'pending' && (
                              <Button size="sm" className="bg-[#e55b2b] hover:bg-[#e55b2b]/90 text-white" onClick={() => handleMarkPaid(payment.id)}>
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Mark Paid
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
