'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Button, Input, Modal } from '@/components/ui';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/hooks/useToast';
import type { BadgeVariant } from '@/components/ui/Badge';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  Crown,
  Plus,
  Search,
  Users,
  DollarSign,
  AlertTriangle,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  MapPin,
  Wrench,
  StickyNote,
  CreditCard,
  FileText,
  Shield,
} from 'lucide-react';

/* ---------- Types ---------- */

interface MemberCustomer {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
}

interface Membership {
  id: string;
  customer_id: string | null;
  title: string;
  terms: Record<string, unknown> | null;
  start_date: string;
  end_date: string;
  auto_renew: boolean;
  status: string;
  total_value: number;
  signed_url: string | null;
  created_by: string | null;
  group_id: string;
  created_at: string;
  customers: MemberCustomer | null;
}

interface Equipment {
  id: string;
  customer_id: string;
  equipment_type: string | null;
  make: string | null;
  model: string | null;
  serial_number: string | null;
  install_date: string | null;
  last_service: string | null;
  notes: string | null;
}

interface CustomerNote {
  id: string;
  customer_id: string;
  note: string;
  created_by: string | null;
  created_at: string;
}

interface Payment {
  id: string;
  customer_id: string;
  amount: number;
  status: string;
  created_at: string;
}

interface MemberDetail {
  equipment: Equipment[];
  notes: CustomerNote[];
  payments: Payment[];
}

interface CustomerOption {
  id: string;
  full_name: string;
}

/* ---------- Constants ---------- */

interface MembershipStatusConfig {
  label: string;
  variant: BadgeVariant;
}

const STATUS_CONFIG: Record<string, MembershipStatusConfig> = {
  draft: { label: 'Draft', variant: 'default' },
  sent: { label: 'Sent', variant: 'info' },
  signed: { label: 'Signed', variant: 'premium' },
  active: { label: 'Active', variant: 'success' },
  expired: { label: 'Expired', variant: 'warning' },
  cancelled: { label: 'Cancelled', variant: 'danger' },
};

const UPGRADE_KEYWORDS = ['upgrade', 'recommend', 'suggest', 'replace', 'new unit', 'new system'];

/* ---------- Component ---------- */

export default function MembershipsPage() {
  const { groupId, profile, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [memberDetails, setMemberDetails] = useState<Record<string, MemberDetail>>({});
  const [detailLoading, setDetailLoading] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [form, setForm] = useState({
    customer_id: '',
    title: 'Premier Membership',
    start_date: '',
    end_date: '',
    auto_renew: true,
    total_value: 0,
    scope: '',
    frequency: 'Annual',
    payment_terms: '',
  });

  /* ---------- Data loading ---------- */

  const fetchData = useCallback(async () => {
    if (!groupId) return;
    const supabase = createClient();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [membershipsRes, customersRes, paymentsRes] = await Promise.all([
      supabase
        .from('contracts')
        .select('*, customers(id, full_name, email, phone, address)')
        .eq('group_id', groupId)
        .eq('type', 'membership')
        .order('created_at', { ascending: false }),
      supabase
        .from('customers')
        .select('id, full_name')
        .eq('group_id', groupId)
        .order('full_name'),
      supabase
        .from('payments')
        .select('id, customer_id, amount, status, created_at')
        .eq('group_id', groupId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .eq('status', 'paid'),
    ]);

    setMemberships(membershipsRes.data || []);
    setCustomers(customersRes.data || []);
    setRecentPayments(paymentsRes.data || []);
    setIsLoading(false);
  }, [groupId]);

  useEffect(() => {
    if (!authLoading && groupId) fetchData();
  }, [authLoading, groupId, fetchData]);

  /* ---------- Detail loading ---------- */

  const loadMemberDetail = async (customerId: string) => {
    if (memberDetails[customerId]) return;
    setDetailLoading(customerId);
    const supabase = createClient();

    const [eqRes, notesRes, payRes] = await Promise.all([
      supabase
        .from('customer_equipment')
        .select('*')
        .eq('customer_id', customerId)
        .order('install_date', { ascending: false }),
      supabase
        .from('customer_notes')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('payments')
        .select('id, customer_id, amount, status, created_at')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    setMemberDetails((prev) => ({
      ...prev,
      [customerId]: {
        equipment: eqRes.data || [],
        notes: notesRes.data || [],
        payments: payRes.data || [],
      },
    }));
    setDetailLoading(null);
  };

  const toggleExpand = (membership: Membership) => {
    if (expandedId === membership.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(membership.id);
    if (membership.customer_id) {
      loadMemberDetail(membership.customer_id);
    }
  };

  /* ---------- Create membership ---------- */

  const createMembership = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId) return;
    const supabase = createClient();

    const { data, error } = await supabase
      .from('contracts')
      .insert({
        customer_id: form.customer_id || null,
        type: 'membership',
        title: form.title,
        terms: {
          scope: form.scope,
          frequency: form.frequency,
          payment_terms: form.payment_terms,
        },
        start_date: form.start_date,
        end_date: form.end_date,
        auto_renew: form.auto_renew,
        total_value: form.total_value,
        status: 'active',
        created_by: profile?.id,
        group_id: groupId,
      } as Record<string, unknown>)
      .select('*, customers(id, full_name, email, phone, address)')
      .single();

    if (!error && data) {
      setMemberships([data, ...memberships]);
      setIsCreateOpen(false);
      setForm({
        customer_id: '',
        title: 'Premier Membership',
        start_date: '',
        end_date: '',
        auto_renew: true,
        total_value: 0,
        scope: '',
        frequency: 'Annual',
        payment_terms: '',
      });
      toast.success('Member added', 'New Premier Membership created successfully');
    } else if (error) {
      toast.error('Failed to create membership', error.message);
    }
  };

  /* ---------- Helpers ---------- */

  const isPaymentCurrent = (customerId: string | null): boolean => {
    if (!customerId) return false;
    return recentPayments.some((p) => p.customer_id === customerId);
  };

  const activeMemberships = memberships.filter(
    (m) => m.status === 'active' || m.status === 'signed'
  );

  const monthlyRevenue = activeMemberships.reduce((sum, m) => {
    return sum + (m.total_value || 0) / 12;
  }, 0);

  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(now.getDate() + 30);

  const expiringSoon = activeMemberships.filter((m) => {
    const endDate = new Date(m.end_date);
    return endDate <= thirtyDaysFromNow && endDate >= now;
  });

  const pastDue = activeMemberships.filter(
    (m) => !isPaymentCurrent(m.customer_id)
  );

  const filtered = memberships.filter((m) => {
    if (statusFilter && m.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        m.title.toLowerCase().includes(s) ||
        m.customers?.full_name?.toLowerCase().includes(s) ||
        m.customers?.email?.toLowerCase().includes(s) ||
        m.customers?.phone?.includes(s)
      );
    }
    return true;
  });

  const getUpgradeNotes = (notes: CustomerNote[]) => {
    return notes.filter((n) =>
      UPGRADE_KEYWORDS.some((kw) => n.note.toLowerCase().includes(kw))
    );
  };

  /* ---------- Loading state ---------- */

  if (isLoading || authLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  /* ---------- Render ---------- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Crown className="w-6 h-6 text-amber-500" />
            <h1 className="text-2xl font-bold text-[#0a1f3f]">Premier Memberships</h1>
          </div>
          <p className="text-[#4a6580] mt-1">
            Manage member plans, equipment, and payment status
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add Member
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[#c8d8ea] p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#4a6580]">Active Members</p>
              <p className="text-2xl font-bold text-[#0a1f3f]">{activeMemberships.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#c8d8ea] p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#e55b2b]/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-[#e55b2b]" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#4a6580]">Monthly Revenue</p>
              <p className="text-2xl font-bold text-[#0a1f3f]">
                {formatCurrency(Math.round(monthlyRevenue))}
              </p>
            </div>
          </div>
        </div>

        <div
          className={`bg-white rounded-xl border p-4 cursor-pointer transition-colors ${
            statusFilter === '__expiring' ? 'border-[#e55b2b] bg-[#e55b2b]/5 ring-2 ring-[#e55b2b]' : 'border-[#c8d8ea] hover:bg-[#0a1f3f]/5'
          }`}
          onClick={() => setStatusFilter(statusFilter === '__expiring' ? '' : '__expiring')}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#4a6580]">Expiring Soon</p>
              <p className="text-2xl font-bold text-[#0a1f3f]">{expiringSoon.length}</p>
            </div>
          </div>
        </div>

        <div
          className={`bg-white rounded-xl border p-4 cursor-pointer transition-colors ${
            statusFilter === '__pastdue' ? 'border-red-500 bg-red-50 ring-2 ring-red-500' : 'border-[#c8d8ea] hover:bg-[#0a1f3f]/5'
          }`}
          onClick={() => setStatusFilter(statusFilter === '__pastdue' ? '' : '__pastdue')}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#4a6580]">Past Due</p>
              <p className="text-2xl font-bold text-[#0a1f3f]">{pastDue.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a6580]" />
          <Input
            placeholder="Search members by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-[#c8d8ea] rounded-lg px-3 py-2 text-sm bg-white min-w-[160px] focus:ring-[#e55b2b] focus:border-[#e55b2b]"
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([key, conf]) => (
            <option key={key} value={key}>
              {conf.label}
            </option>
          ))}
          <option value="__expiring">Expiring Soon</option>
          <option value="__pastdue">Past Due</option>
        </select>
      </div>

      {/* Members List */}
      <div className="bg-white rounded-xl border border-[#c8d8ea]">
        {(() => {
          // Apply special filters
          let displayList = filtered;
          if (statusFilter === '__expiring') {
            displayList = expiringSoon;
          } else if (statusFilter === '__pastdue') {
            displayList = pastDue;
          }

          if (displayList.length === 0) {
            return (
              <EmptyState
                icon={<Shield className="w-8 h-8" />}
                title={memberships.length === 0 ? 'No memberships yet' : 'No matching members'}
                description={
                  memberships.length === 0
                    ? 'Add your first Premier Member to get started.'
                    : 'Try adjusting your search or filter.'
                }
                action={
                  memberships.length === 0 ? (
                    <Button onClick={() => setIsCreateOpen(true)}>
                      <Crown className="w-4 h-4 mr-2" /> Add First Member
                    </Button>
                  ) : undefined
                }
              />
            );
          }

          return (
            <div className="divide-y divide-[#c8d8ea]">
              {displayList.map((m) => {
                const conf = STATUS_CONFIG[m.status] || STATUS_CONFIG.draft;
                const isExpanded = expandedId === m.id;
                const paymentOk = isPaymentCurrent(m.customer_id);
                const detail = m.customer_id ? memberDetails[m.customer_id] : null;
                const isDetailLoading = detailLoading === m.customer_id;

                return (
                  <div key={m.id}>
                    {/* Row */}
                    <div
                      className="p-4 hover:bg-[#0a1f3f]/5 cursor-pointer transition-colors"
                      onClick={() => toggleExpand(m)}
                    >
                      {/* Desktop layout */}
                      <div className="hidden md:flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                            <Crown className="w-5 h-5 text-amber-600" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-[#0a1f3f] truncate">
                                {m.customers?.full_name || 'No customer'}
                              </span>
                              <Badge variant={conf.variant}>
                                {conf.label}
                              </Badge>
                              {m.auto_renew && (
                                <RefreshCw className="w-3.5 h-3.5 text-[#e55b2b] flex-shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-[#4a6580] mt-0.5">
                              {m.customers?.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {m.customers.phone}
                                </span>
                              )}
                              {m.customers?.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {m.customers.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-xs text-[#4a6580]">
                              {formatDate(m.start_date)} - {formatDate(m.end_date)}
                            </p>
                            <p className="font-bold text-[#0a1f3f]">
                              {formatCurrency(m.total_value)}
                              <span className="text-xs font-normal text-[#4a6580]">/yr</span>
                            </p>
                          </div>
                          <Badge variant={paymentOk ? 'success' : 'danger'}>
                            {paymentOk ? 'Paid' : 'Past Due'}
                          </Badge>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-[#4a6580]" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-[#4a6580]" />
                          )}
                        </div>
                      </div>

                      {/* Mobile layout */}
                      <div className="md:hidden">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                              <Crown className="w-4 h-4 text-amber-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-[#0a1f3f] truncate">
                                {m.customers?.full_name || 'No customer'}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant={conf.variant}>
                                  {conf.label}
                                </Badge>
                                <Badge variant={paymentOk ? 'success' : 'danger'}>
                                  {paymentOk ? 'Paid' : 'Past Due'}
                                </Badge>
                                {m.auto_renew && (
                                  <RefreshCw className="w-3 h-3 text-[#e55b2b]" />
                                )}
                              </div>
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-[#4a6580] flex-shrink-0" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-[#4a6580] flex-shrink-0" />
                          )}
                        </div>
                        <div className="mt-2 flex items-center justify-between text-sm">
                          <span className="text-[#4a6580]">
                            {formatDate(m.start_date)} - {formatDate(m.end_date)}
                          </span>
                          <span className="font-bold text-[#0a1f3f]">
                            {formatCurrency(m.total_value)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <div className="border-t border-[#c8d8ea] bg-[#dceaf8]/20 px-4 py-5">
                        {isDetailLoading ? (
                          <div className="animate-pulse space-y-3">
                            <div className="h-4 bg-gray-200 rounded w-1/3" />
                            <div className="h-20 bg-gray-200 rounded" />
                            <div className="h-4 bg-gray-200 rounded w-1/4" />
                            <div className="h-20 bg-gray-200 rounded" />
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            {/* Customer Info */}
                            <div className="space-y-3">
                              <h4 className="text-sm font-semibold text-[#0a1f3f] flex items-center gap-2">
                                <Users className="w-4 h-4 text-[#4a6580]" />
                                Customer Info
                              </h4>
                              <div className="bg-white rounded-lg border border-[#c8d8ea] p-3 space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="font-medium text-[#0a1f3f]">
                                    {m.customers?.full_name || '-'}
                                  </span>
                                </div>
                                {m.customers?.email && (
                                  <div className="flex items-center gap-2 text-sm text-[#4a6580]">
                                    <Mail className="w-3.5 h-3.5" />
                                    <a
                                      href={`mailto:${m.customers.email}`}
                                      className="hover:text-[#e55b2b]"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {m.customers.email}
                                    </a>
                                  </div>
                                )}
                                {m.customers?.phone && (
                                  <div className="flex items-center gap-2 text-sm text-[#4a6580]">
                                    <Phone className="w-3.5 h-3.5" />
                                    <a
                                      href={`tel:${m.customers.phone}`}
                                      className="hover:text-[#e55b2b]"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {m.customers.phone}
                                    </a>
                                  </div>
                                )}
                                {m.customers?.address && (
                                  <div className="flex items-center gap-2 text-sm text-[#4a6580]">
                                    <MapPin className="w-3.5 h-3.5" />
                                    {m.customers.address}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Contract Terms */}
                            <div className="space-y-3">
                              <h4 className="text-sm font-semibold text-[#0a1f3f] flex items-center gap-2">
                                <FileText className="w-4 h-4 text-[#4a6580]" />
                                Contract Terms
                              </h4>
                              <div className="bg-white rounded-lg border border-[#c8d8ea] p-3 space-y-2">
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <p className="text-xs text-[#4a6580]">Plan Value</p>
                                    <p className="font-medium text-[#0a1f3f]">{formatCurrency(m.total_value)}/yr</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-[#4a6580]">Auto-Renew</p>
                                    <p className="font-medium text-[#0a1f3f]">{m.auto_renew ? 'Yes' : 'No'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-[#4a6580]">Start</p>
                                    <p className="font-medium text-[#0a1f3f]">{formatDate(m.start_date)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-[#4a6580]">End</p>
                                    <p className="font-medium text-[#0a1f3f]">{formatDate(m.end_date)}</p>
                                  </div>
                                </div>
                                {m.terms && Object.keys(m.terms).length > 0 && (
                                  <div className="border-t border-[#c8d8ea] pt-2 mt-2 space-y-1.5">
                                    {Object.entries(m.terms).map(([key, value]) =>
                                      value ? (
                                        <div key={key}>
                                          <p className="text-xs text-[#4a6580] capitalize">
                                            {key.replace(/_/g, ' ')}
                                          </p>
                                          <p className="text-sm text-[#0a1f3f]">{String(value)}</p>
                                        </div>
                                      ) : null
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Equipment */}
                            <div className="space-y-3">
                              <h4 className="text-sm font-semibold text-[#0a1f3f] flex items-center gap-2">
                                <Wrench className="w-4 h-4 text-[#4a6580]" />
                                Equipment
                                {detail && (
                                  <span className="text-xs text-[#4a6580] font-normal">
                                    ({detail.equipment.length})
                                  </span>
                                )}
                              </h4>
                              <div className="bg-white rounded-lg border border-[#c8d8ea] divide-y divide-[#c8d8ea]">
                                {!detail || detail.equipment.length === 0 ? (
                                  <p className="p-3 text-sm text-[#4a6580]">No equipment on file</p>
                                ) : (
                                  detail.equipment.map((eq) => (
                                    <div key={eq.id} className="p-3">
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-[#0a1f3f]">
                                          {eq.equipment_type || 'Unknown'}
                                        </span>
                                        {eq.last_service && (
                                          <span className="text-xs text-[#4a6580]">
                                            Last: {formatDate(eq.last_service)}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-[#4a6580] mt-0.5">
                                        {[eq.make, eq.model].filter(Boolean).join(' ') || 'No make/model'}
                                        {eq.serial_number && ` | S/N: ${eq.serial_number}`}
                                      </p>
                                      {eq.install_date && (
                                        <p className="text-xs text-[#4a6580] mt-0.5">
                                          Installed: {formatDate(eq.install_date)}
                                        </p>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                            {/* Payment History */}
                            <div className="space-y-3">
                              <h4 className="text-sm font-semibold text-[#0a1f3f] flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-[#4a6580]" />
                                Payment History
                              </h4>
                              <div className="bg-white rounded-lg border border-[#c8d8ea] divide-y divide-[#c8d8ea]">
                                {!detail || detail.payments.length === 0 ? (
                                  <p className="p-3 text-sm text-[#4a6580]">No payments recorded</p>
                                ) : (
                                  detail.payments.map((pay) => (
                                    <div
                                      key={pay.id}
                                      className="p-3 flex items-center justify-between"
                                    >
                                      <div>
                                        <p className="text-sm font-medium text-[#0a1f3f]">
                                          {formatCurrency(pay.amount)}
                                        </p>
                                        <p className="text-xs text-[#4a6580]">
                                          {formatDate(pay.created_at)}
                                        </p>
                                      </div>
                                      <Badge
                                        variant={
                                          pay.status === 'paid'
                                            ? 'success'
                                            : pay.status === 'pending'
                                            ? 'default'
                                            : 'danger'
                                        }
                                      >
                                        {pay.status}
                                      </Badge>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                            {/* Upgrade Notes */}
                            {detail && detail.notes.length > 0 && (
                              <div className="space-y-3 lg:col-span-2">
                                <h4 className="text-sm font-semibold text-[#0a1f3f] flex items-center gap-2">
                                  <StickyNote className="w-4 h-4 text-[#4a6580]" />
                                  Notes & Upgrade Recommendations
                                </h4>
                                <div className="bg-white rounded-lg border border-[#c8d8ea] divide-y divide-[#c8d8ea]">
                                  {(() => {
                                    const upgradeNotes = getUpgradeNotes(detail.notes);
                                    const notesToShow =
                                      upgradeNotes.length > 0 ? upgradeNotes : detail.notes.slice(0, 5);
                                    return notesToShow.map((n) => {
                                      const isUpgrade = UPGRADE_KEYWORDS.some((kw) =>
                                        n.note.toLowerCase().includes(kw)
                                      );
                                      return (
                                        <div
                                          key={n.id}
                                          className={`p-3 ${isUpgrade ? 'bg-amber-50' : ''}`}
                                        >
                                          <div className="flex items-start justify-between gap-2">
                                            <p className="text-sm text-[#0a1f3f]">{n.note}</p>
                                            {isUpgrade && (
                                              <Badge variant="premium" className="flex-shrink-0">
                                                Upgrade
                                              </Badge>
                                            )}
                                          </div>
                                          <p className="text-xs text-[#4a6580] mt-1">
                                            {formatDate(n.created_at)}
                                          </p>
                                        </div>
                                      );
                                    });
                                  })()}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Create Membership Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add Premier Member"
        className="max-w-2xl"
      >
        <form onSubmit={createMembership} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#0a1f3f] mb-1">
                Customer
              </label>
              <select
                value={form.customer_id}
                onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
                className="w-full border border-[#c8d8ea] rounded-lg px-3 py-2 text-sm focus:ring-[#e55b2b] focus:border-[#e55b2b]"
                required
              >
                <option value="">Select customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Plan Title"
              placeholder="Premier Membership"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Annual Value ($)"
              type="number"
              value={form.total_value}
              onChange={(e) =>
                setForm({ ...form, total_value: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })
              }
            />
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="membership_auto_renew"
                checked={form.auto_renew}
                onChange={(e) => setForm({ ...form, auto_renew: e.target.checked })}
                className="rounded accent-[#e55b2b]"
              />
              <label htmlFor="membership_auto_renew" className="text-sm text-[#0a1f3f]">
                Auto-renew membership
              </label>
            </div>
          </div>

          <textarea
            value={form.scope}
            onChange={(e) => setForm({ ...form, scope: e.target.value })}
            placeholder="Scope of membership (included services, visit frequency, etc.)"
            rows={3}
            className="w-full border border-[#c8d8ea] rounded-lg px-3 py-2 text-sm focus:ring-[#e55b2b] focus:border-[#e55b2b]"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Service Frequency"
              placeholder="e.g. Bi-annual"
              value={form.frequency}
              onChange={(e) => setForm({ ...form, frequency: e.target.value })}
            />
            <Input
              label="Payment Terms"
              placeholder="e.g. Monthly, Net 30"
              value={form.payment_terms}
              onChange={(e) => setForm({ ...form, payment_terms: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#c8d8ea]">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              <Crown className="w-4 h-4 mr-2" /> Add Member
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
