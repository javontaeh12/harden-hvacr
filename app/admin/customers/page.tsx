'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, Button, Input, Modal } from '@/components/ui';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  Contact,
  Search,
  Plus,
  Eye,
  Users,
  Gift,
  Share2,
  Mail,
  Phone,
  Tag,
  StickyNote,
  Wrench,
  MessageCircle,
  CalendarClock,
  X,
  ChevronRight,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface Customer {
  id: string;
  user_id: string | null;
  email: string | null;
  full_name: string;
  phone: string | null;
  address: string | null;
  referral_code: string | null;
  group_id: string;
  created_at: string;
  customer_rewards?: Array<{ balance: number; lifetime_earned: number }>;
  customer_tags?: Array<{ id: string; tag: string }>;
}

interface CustomerNote {
  id: string;
  note: string;
  created_by: string | null;
  created_at: string;
}

interface CustomerEquipment {
  id: string;
  equipment_type: string;
  make: string | null;
  model: string | null;
  serial_number: string | null;
  install_date: string | null;
  last_service: string | null;
  notes: string | null;
}

interface CustomerCommunication {
  id: string;
  type: string;
  summary: string;
  created_at: string;
}

interface FollowUp {
  id: string;
  due_date: string;
  description: string;
  status: string;
  assigned_to: string | null;
}

interface CustomerDetail {
  customer: Customer;
  payments: Array<{ id: string; amount: number; method: string; status: string; created_at: string }>;
  bookings: Array<{ id: string; service_type: string; status: string; start_time: string }>;
  referrals: Array<{ id: string; referred_email: string; status: string; created_at: string }>;
  notes: CustomerNote[];
  equipment: CustomerEquipment[];
  communications: CustomerCommunication[];
  followUps: FollowUp[];
}

const TAG_PRESETS = ['VIP', 'Membership', 'Commercial', 'Residential', 'Priority', 'New'];
const COMM_TYPES = ['call', 'text', 'email', 'in_person'] as const;

export default function CustomersPage() {
  const { groupId, profile, isLoading: authLoading } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'equipment' | 'notes' | 'comms' | 'followups'>('overview');

  // Form states
  const [newCustomer, setNewCustomer] = useState({ full_name: '', email: '', phone: '', address: '' });
  const [newNote, setNewNote] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newComm, setNewComm] = useState({ type: 'call' as string, summary: '' });
  const [newFollowUp, setNewFollowUp] = useState({ due_date: '', description: '' });
  const [newEquipment, setNewEquipment] = useState({
    equipment_type: '', make: '', model: '', serial_number: '', install_date: '', notes: '',
  });

  const fetchCustomers = async () => {
    if (!groupId) return;
    try {
      setIsLoading(true);
      const res = await fetch(`/api/customers?group_id=${groupId}`);
      if (!res.ok) throw new Error('Failed to fetch customers');
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && groupId) fetchCustomers();
  }, [authLoading, groupId]);

  useEffect(() => {
    const handleFocus = () => {
      if (groupId) fetchCustomers();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [groupId]);

  const filteredCustomers = useMemo(() => {
    let result = customers;
    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.full_name.toLowerCase().includes(lower) ||
          (c.email && c.email.toLowerCase().includes(lower)) ||
          (c.phone && c.phone.includes(search))
      );
    }
    if (tagFilter) {
      result = result.filter((c) => c.customer_tags?.some((t) => t.tag === tagFilter));
    }
    return result;
  }, [customers, search, tagFilter]);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId) return;
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('customers')
        .insert({ ...newCustomer, group_id: groupId } as Record<string, unknown>)
        .select()
        .single();
      if (error) throw error;
      await supabase.from('customer_rewards').insert({
        customer_id: data.id, balance: 0, lifetime_earned: 0,
      } as Record<string, unknown>);
      setCustomers([{ ...data, customer_rewards: [{ balance: 0, lifetime_earned: 0 }], customer_tags: [] }, ...customers]);
      setIsAddOpen(false);
      setNewCustomer({ full_name: '', email: '', phone: '', address: '' });
    } catch (err) {
      console.error('Failed to add customer:', err);
    }
  };

  const openDetail = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setActiveTab('overview');
    setDetailLoading(true);
    try {
      const supabase = createClient();
      const [payments, bookings, referrals, notes, equipment, comms, followUps] = await Promise.all([
        supabase.from('payments').select('id, amount, method, status, created_at').eq('customer_id', customer.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('bookings').select('id, service_type, status, start_time').eq('customer_id', customer.id).order('start_time', { ascending: false }).limit(20),
        supabase.from('referrals').select('id, referred_email, status, created_at').eq('referrer_id', customer.id).order('created_at', { ascending: false }),
        supabase.from('customer_notes').select('*').eq('customer_id', customer.id).order('created_at', { ascending: false }),
        supabase.from('customer_equipment').select('*').eq('customer_id', customer.id).order('created_at', { ascending: false }),
        supabase.from('customer_communications').select('*').eq('customer_id', customer.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('follow_ups').select('*').eq('customer_id', customer.id).order('due_date', { ascending: true }),
      ]);
      setDetail({
        customer,
        payments: payments.data || [],
        bookings: bookings.data || [],
        referrals: referrals.data || [],
        notes: notes.data || [],
        equipment: equipment.data || [],
        communications: comms.data || [],
        followUps: followUps.data || [],
      });
    } catch {
      setDetail({ customer, payments: [], bookings: [], referrals: [], notes: [], equipment: [], communications: [], followUps: [] });
    } finally {
      setDetailLoading(false);
    }
  };

  const addNote = async () => {
    if (!newNote.trim() || !selectedCustomer || !groupId) return;
    const supabase = createClient();
    const { data, error } = await supabase.from('customer_notes').insert({
      customer_id: selectedCustomer.id, note: newNote, created_by: profile?.id, group_id: groupId,
    } as Record<string, unknown>).select().single();
    if (!error && data) {
      setDetail((prev) => prev ? { ...prev, notes: [data, ...prev.notes] } : prev);
      setNewNote('');
    }
  };

  const addTag = async (tag: string) => {
    if (!selectedCustomer || !groupId) return;
    const supabase = createClient();
    const { error } = await supabase.from('customer_tags').insert({
      customer_id: selectedCustomer.id, tag, group_id: groupId,
    } as Record<string, unknown>);
    if (!error) {
      setCustomers((prev) => prev.map((c) =>
        c.id === selectedCustomer.id
          ? { ...c, customer_tags: [...(c.customer_tags || []), { id: crypto.randomUUID(), tag }] }
          : c
      ));
      setSelectedCustomer((prev) => prev ? {
        ...prev,
        customer_tags: [...(prev.customer_tags || []), { id: crypto.randomUUID(), tag }],
      } : prev);
    }
    setNewTag('');
  };

  const removeTag = async (tagId: string) => {
    const supabase = createClient();
    await supabase.from('customer_tags').delete().eq('id', tagId);
    setCustomers((prev) => prev.map((c) =>
      c.id === selectedCustomer?.id
        ? { ...c, customer_tags: c.customer_tags?.filter((t) => t.id !== tagId) }
        : c
    ));
    setSelectedCustomer((prev) => prev ? {
      ...prev,
      customer_tags: prev.customer_tags?.filter((t) => t.id !== tagId),
    } : prev);
  };

  const addCommunication = async () => {
    if (!newComm.summary.trim() || !selectedCustomer || !groupId) return;
    const supabase = createClient();
    const { data, error } = await supabase.from('customer_communications').insert({
      customer_id: selectedCustomer.id, type: newComm.type, summary: newComm.summary,
      created_by: profile?.id, group_id: groupId,
    } as Record<string, unknown>).select().single();
    if (!error && data) {
      setDetail((prev) => prev ? { ...prev, communications: [data, ...prev.communications] } : prev);
      setNewComm({ type: 'call', summary: '' });
    }
  };

  const addFollowUp = async () => {
    if (!newFollowUp.due_date || !newFollowUp.description.trim() || !selectedCustomer || !groupId) return;
    const supabase = createClient();
    const { data, error } = await supabase.from('follow_ups').insert({
      customer_id: selectedCustomer.id, due_date: newFollowUp.due_date,
      description: newFollowUp.description, assigned_to: profile?.id, group_id: groupId,
    } as Record<string, unknown>).select().single();
    if (!error && data) {
      setDetail((prev) => prev ? { ...prev, followUps: [...prev.followUps, data].sort((a, b) => a.due_date.localeCompare(b.due_date)) } : prev);
      setNewFollowUp({ due_date: '', description: '' });
    }
  };

  const completeFollowUp = async (id: string) => {
    const supabase = createClient();
    await supabase.from('follow_ups').update({ status: 'completed' }).eq('id', id);
    setDetail((prev) => prev ? {
      ...prev, followUps: prev.followUps.map((f) => f.id === id ? { ...f, status: 'completed' } : f),
    } : prev);
  };

  const addEquipment = async () => {
    if (!newEquipment.equipment_type.trim() || !selectedCustomer || !groupId) return;
    const supabase = createClient();
    const { data, error } = await supabase.from('customer_equipment').insert({
      customer_id: selectedCustomer.id, ...newEquipment, group_id: groupId,
    } as Record<string, unknown>).select().single();
    if (!error && data) {
      setDetail((prev) => prev ? { ...prev, equipment: [data, ...prev.equipment] } : prev);
      setNewEquipment({ equipment_type: '', make: '', model: '', serial_number: '', install_date: '', notes: '' });
    }
  };

  const getRewardsBalance = (customer: Customer) => customer.customer_rewards?.[0]?.balance || 0;

  if (isLoading || authLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800 font-medium">Failed to load customers</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  // All unique tags across customers
  const allTags = [...new Set(customers.flatMap((c) => c.customer_tags?.map((t) => t.tag) || []))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600 mt-1">Manage your customer database & CRM</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Total</p>
                <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
              </div>
              <div className="bg-blue-500 p-2 rounded-lg"><Users className="w-5 h-5 text-white" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">With Rewards</p>
                <p className="text-2xl font-bold text-gray-900">{customers.filter((c) => getRewardsBalance(c) > 0).length}</p>
              </div>
              <div className="bg-purple-500 p-2 rounded-lg"><Gift className="w-5 h-5 text-white" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">With Email</p>
                <p className="text-2xl font-bold text-gray-900">{customers.filter((c) => c.email).length}</p>
              </div>
              <div className="bg-green-500 p-2 rounded-lg"><Mail className="w-5 h-5 text-white" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">With Referrals</p>
                <p className="text-2xl font-bold text-gray-900">{customers.filter((c) => c.referral_code).length}</p>
              </div>
              <div className="bg-orange-500 p-2 rounded-lg"><Share2 className="w-5 h-5 text-white" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Tag Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search by name, email, or phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        {allTags.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {tagFilter && (
              <button onClick={() => setTagFilter('')} className="px-3 py-1.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 flex items-center gap-1">
                {tagFilter} <X className="w-3 h-3" />
              </button>
            )}
            {!tagFilter && allTags.map((tag) => (
              <button key={tag} onClick={() => setTagFilter(tag)} className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200">
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Customers Table */}
      <Card>
        <CardContent className="p-0">
          {filteredCustomers.length === 0 ? (
            <div className="p-12 text-center">
              <Contact className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
              <p className="text-gray-600">{search ? 'Try adjusting your search' : 'Add your first customer to get started'}</p>
            </div>
          ) : (
            <>
              {/* Mobile layout */}
              <div className="sm:hidden divide-y divide-gray-200">
                {filteredCustomers.map((customer) => (
                  <div key={customer.id} className="p-4 hover:bg-gray-50 cursor-pointer" onClick={() => openDetail(customer)}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">{customer.full_name}</p>
                        {customer.email && <p className="text-sm text-gray-500 truncate">{customer.email}</p>}
                        {customer.phone && <p className="text-xs text-gray-400 mt-0.5">{customer.phone}</p>}
                        {customer.customer_tags && customer.customer_tags.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {customer.customer_tags.map((t) => (
                              <span key={t.id} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600">{t.tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 mt-1 shrink-0" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-500 border-b bg-gray-50">
                      <th className="px-6 py-3 font-medium">Name</th>
                      <th className="px-6 py-3 font-medium">Email</th>
                      <th className="px-6 py-3 font-medium">Phone</th>
                      <th className="px-6 py-3 font-medium">Tags</th>
                      <th className="px-6 py-3 font-medium">Rewards</th>
                      <th className="px-6 py-3 font-medium">Joined</th>
                      <th className="px-6 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredCustomers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{customer.full_name}</td>
                        <td className="px-6 py-4 text-gray-600">{customer.email || '-'}</td>
                        <td className="px-6 py-4 text-gray-600">{customer.phone || '-'}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-1 flex-wrap">
                            {customer.customer_tags?.map((t) => (
                              <span key={t.id} className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">{t.tag}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {getRewardsBalance(customer) > 0 ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                              <Gift className="w-3 h-3 mr-1" />{getRewardsBalance(customer)} pts
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">0</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{formatDate(customer.created_at)}</td>
                        <td className="px-6 py-4">
                          <button onClick={() => openDetail(customer)} className="text-blue-600 hover:text-blue-700">
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

      {/* Add Customer Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add Customer">
        <form onSubmit={handleAddCustomer} className="space-y-4">
          <Input label="Full Name" placeholder="John Smith" value={newCustomer.full_name} onChange={(e) => setNewCustomer({ ...newCustomer, full_name: e.target.value })} required />
          <Input label="Email" type="email" placeholder="john@example.com" value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} />
          <Input label="Phone" placeholder="(555) 123-4567" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
          <Input label="Address" placeholder="123 Main St" value={newCustomer.address} onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })} />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button type="submit">Add Customer</Button>
          </div>
        </form>
      </Modal>

      {/* Customer Detail Slide-Over */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedCustomer(null)} />
          <div className="relative w-full max-w-2xl bg-white shadow-xl overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selectedCustomer.full_name}</h2>
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                  {selectedCustomer.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{selectedCustomer.email}</span>}
                  {selectedCustomer.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{selectedCustomer.phone}</span>}
                </div>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tags */}
            <div className="px-6 py-3 border-b bg-gray-50">
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="w-4 h-4 text-gray-400" />
                {selectedCustomer.customer_tags?.map((t) => (
                  <span key={t.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    {t.tag}
                    <button onClick={() => removeTag(t.id)} className="hover:text-red-600"><X className="w-3 h-3" /></button>
                  </span>
                ))}
                <div className="flex gap-1">
                  {TAG_PRESETS.filter((t) => !selectedCustomer.customer_tags?.some((ct) => ct.tag === t)).map((t) => (
                    <button key={t} onClick={() => addTag(t)} className="px-2 py-0.5 rounded-full text-xs border border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600">
                      + {t}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1 items-center">
                  <input
                    type="text"
                    placeholder="Custom tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && newTag.trim()) { addTag(newTag.trim()); } }}
                    className="w-24 text-xs px-2 py-1 border rounded"
                  />
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="px-6 border-b">
              <div className="flex gap-1 overflow-x-auto">
                {([
                  { key: 'overview', label: 'Overview', icon: Eye },
                  { key: 'equipment', label: 'Equipment', icon: Wrench },
                  { key: 'notes', label: 'Notes', icon: StickyNote },
                  { key: 'comms', label: 'Comms', icon: MessageCircle },
                  { key: 'followups', label: 'Follow-ups', icon: CalendarClock },
                ] as const).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
                      activeTab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                    {key === 'notes' && detail?.notes.length ? <span className="bg-gray-100 text-gray-600 text-xs px-1.5 rounded-full">{detail.notes.length}</span> : null}
                    {key === 'followups' && detail?.followUps.filter((f) => f.status === 'pending').length ? (
                      <span className="bg-orange-100 text-orange-600 text-xs px-1.5 rounded-full">{detail.followUps.filter((f) => f.status === 'pending').length}</span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="px-6 py-4">
              {detailLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-6 bg-gray-200 rounded w-48" />
                  <div className="h-32 bg-gray-200 rounded" />
                </div>
              ) : detail ? (
                <>
                  {/* OVERVIEW TAB */}
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Address</p>
                          <p className="font-medium text-gray-900">{selectedCustomer.address || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Rewards Balance</p>
                          <p className="font-medium text-gray-900">{getRewardsBalance(selectedCustomer)} pts</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Customer Since</p>
                          <p className="font-medium text-gray-900">{formatDate(selectedCustomer.created_at)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Equipment on File</p>
                          <p className="font-medium text-gray-900">{detail.equipment.length} units</p>
                        </div>
                      </div>

                      {/* Service History Timeline */}
                      {detail.bookings.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">Service History</h4>
                          <div className="space-y-2">
                            {detail.bookings.map((b) => (
                              <div key={b.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                                <span className="text-gray-700">{b.service_type}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500">{formatDate(b.start_time)}</span>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    b.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                  }`}>{b.status}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Payment History */}
                      {detail.payments.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">Payment History</h4>
                          <div className="space-y-2">
                            {detail.payments.map((p) => (
                              <div key={p.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                                <div>
                                  <span className="text-gray-700 font-medium">{formatCurrency(p.amount)}</span>
                                  <span className="text-gray-500 ml-2">{p.method}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500">{formatDate(p.created_at)}</span>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    p.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                  }`}>{p.status}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Referrals */}
                      {detail.referrals.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">Referrals</h4>
                          <div className="space-y-2">
                            {detail.referrals.map((r) => (
                              <div key={r.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                                <span className="text-gray-700">{r.referred_email}</span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  r.status === 'converted' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                }`}>{r.status}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* EQUIPMENT TAB */}
                  {activeTab === 'equipment' && (
                    <div className="space-y-4">
                      {detail.equipment.map((eq) => (
                        <Card key={eq.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-gray-900">{eq.equipment_type}</p>
                                <p className="text-sm text-gray-600">{[eq.make, eq.model].filter(Boolean).join(' ') || 'No make/model'}</p>
                              </div>
                              {eq.serial_number && <span className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">{eq.serial_number}</span>}
                            </div>
                            <div className="flex gap-4 mt-2 text-xs text-gray-500">
                              {eq.install_date && <span>Installed: {formatDate(eq.install_date)}</span>}
                              {eq.last_service && <span>Last Service: {formatDate(eq.last_service)}</span>}
                            </div>
                            {eq.notes && <p className="text-sm text-gray-600 mt-2">{eq.notes}</p>}
                          </CardContent>
                        </Card>
                      ))}

                      <Card>
                        <CardContent className="p-4">
                          <h4 className="text-sm font-semibold mb-3">Add Equipment</h4>
                          <div className="grid grid-cols-2 gap-3">
                            <Input label="Type" placeholder="e.g. Central AC" value={newEquipment.equipment_type} onChange={(e) => setNewEquipment({ ...newEquipment, equipment_type: e.target.value })} />
                            <Input label="Make" placeholder="e.g. Carrier" value={newEquipment.make} onChange={(e) => setNewEquipment({ ...newEquipment, make: e.target.value })} />
                            <Input label="Model" placeholder="Model #" value={newEquipment.model} onChange={(e) => setNewEquipment({ ...newEquipment, model: e.target.value })} />
                            <Input label="Serial #" placeholder="Serial number" value={newEquipment.serial_number} onChange={(e) => setNewEquipment({ ...newEquipment, serial_number: e.target.value })} />
                            <Input label="Install Date" type="date" value={newEquipment.install_date} onChange={(e) => setNewEquipment({ ...newEquipment, install_date: e.target.value })} />
                            <Input label="Notes" placeholder="Any notes..." value={newEquipment.notes} onChange={(e) => setNewEquipment({ ...newEquipment, notes: e.target.value })} />
                          </div>
                          <Button onClick={addEquipment} className="mt-3" disabled={!newEquipment.equipment_type.trim()}>
                            <Plus className="w-4 h-4 mr-1" /> Add Equipment
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* NOTES TAB */}
                  {activeTab === 'notes' && (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Input placeholder="Add a note..." value={newNote} onChange={(e) => setNewNote(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addNote(); }} className="flex-1" />
                        <Button onClick={addNote} disabled={!newNote.trim()}>Add</Button>
                      </div>
                      {detail.notes.map((n) => (
                        <div key={n.id} className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-800">{n.note}</p>
                          <p className="text-xs text-gray-400 mt-1">{formatDate(n.created_at)}</p>
                        </div>
                      ))}
                      {detail.notes.length === 0 && <p className="text-sm text-gray-500 text-center py-8">No notes yet</p>}
                    </div>
                  )}

                  {/* COMMUNICATIONS TAB */}
                  {activeTab === 'comms' && (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <select
                          value={newComm.type}
                          onChange={(e) => setNewComm({ ...newComm, type: e.target.value })}
                          className="border rounded-lg px-3 py-2 text-sm"
                        >
                          {COMM_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                        </select>
                        <Input placeholder="Summary..." value={newComm.summary} onChange={(e) => setNewComm({ ...newComm, summary: e.target.value })} className="flex-1" />
                        <Button onClick={addCommunication} disabled={!newComm.summary.trim()}>Log</Button>
                      </div>
                      {detail.communications.map((c) => (
                        <div key={c.id} className="p-3 bg-gray-50 rounded-lg flex items-start gap-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            c.type === 'call' ? 'bg-green-100 text-green-700' :
                            c.type === 'email' ? 'bg-blue-100 text-blue-700' :
                            c.type === 'text' ? 'bg-purple-100 text-purple-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>{c.type}</span>
                          <div className="flex-1">
                            <p className="text-sm text-gray-800">{c.summary}</p>
                            <p className="text-xs text-gray-400 mt-1">{formatDate(c.created_at)}</p>
                          </div>
                        </div>
                      ))}
                      {detail.communications.length === 0 && <p className="text-sm text-gray-500 text-center py-8">No communications logged</p>}
                    </div>
                  )}

                  {/* FOLLOW-UPS TAB */}
                  {activeTab === 'followups' && (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Input type="date" value={newFollowUp.due_date} onChange={(e) => setNewFollowUp({ ...newFollowUp, due_date: e.target.value })} className="w-40" />
                        <Input placeholder="Description..." value={newFollowUp.description} onChange={(e) => setNewFollowUp({ ...newFollowUp, description: e.target.value })} className="flex-1" />
                        <Button onClick={addFollowUp} disabled={!newFollowUp.due_date || !newFollowUp.description.trim()}>Add</Button>
                      </div>
                      {detail.followUps.map((f) => (
                        <div key={f.id} className={`p-3 rounded-lg flex items-center justify-between ${f.status === 'completed' ? 'bg-green-50' : 'bg-orange-50'}`}>
                          <div className="flex items-center gap-3">
                            {f.status === 'completed' ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            ) : (
                              <Clock className="w-5 h-5 text-orange-600" />
                            )}
                            <div>
                              <p className={`text-sm ${f.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-800'}`}>{f.description}</p>
                              <p className="text-xs text-gray-400">Due: {formatDate(f.due_date)}</p>
                            </div>
                          </div>
                          {f.status === 'pending' && (
                            <Button variant="outline" onClick={() => completeFollowUp(f.id)} className="text-xs">Complete</Button>
                          )}
                        </div>
                      ))}
                      {detail.followUps.length === 0 && <p className="text-sm text-gray-500 text-center py-8">No follow-ups scheduled</p>}
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
