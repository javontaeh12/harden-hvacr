'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Button, Input, Modal } from '@/components/ui';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/hooks/useToast';
import { getStatusConfig } from '@/lib/status';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  FileSignature,
  Plus,
  Search,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface Contract {
  id: string;
  customer_id: string | null;
  type: string;
  title: string;
  terms: Record<string, string>;
  start_date: string;
  end_date: string;
  auto_renew: boolean;
  status: string;
  total_value: number;
  signed_url: string | null;
  created_by: string | null;
  group_id: string;
  created_at: string;
  customers?: { full_name: string } | null;
}

interface CustomerOption {
  id: string;
  full_name: string;
}

const CONTRACT_TYPES = [
  { value: 'maintenance', label: 'Maintenance Agreement' },
  { value: 'membership', label: 'Membership' },
  { value: 'service_agreement', label: 'Service Agreement' },
  { value: 'warranty', label: 'Warranty' },
];

export default function ContractsPage() {
  const { groupId, profile, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  const [form, setForm] = useState({
    customer_id: '', type: 'maintenance', title: '',
    start_date: '', end_date: '', auto_renew: false,
    total_value: 0, scope: '', frequency: '', payment_terms: '',
  });

  useEffect(() => {
    if (!authLoading && groupId) fetchData();
  }, [authLoading, groupId]);

  const fetchData = async () => {
    const supabase = createClient();
    const [contractsRes, customersRes] = await Promise.all([
      supabase.from('contracts').select('*, customers(full_name)').eq('group_id', groupId!).order('created_at', { ascending: false }),
      supabase.from('customers').select('id, full_name').eq('group_id', groupId!).order('full_name'),
    ]);
    setContracts(contractsRes.data || []);
    setCustomers(customersRes.data || []);
    setIsLoading(false);
  };

  const createContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId) return;
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from('contracts').insert({
        customer_id: form.customer_id || null,
        type: form.type,
        title: form.title,
        terms: { scope: form.scope, frequency: form.frequency, payment_terms: form.payment_terms },
        start_date: form.start_date,
        end_date: form.end_date,
        auto_renew: form.auto_renew,
        total_value: form.total_value,
        created_by: profile?.id,
        group_id: groupId,
      } as Record<string, unknown>).select('*, customers(full_name)').single();
      if (error) throw error;
      if (data) {
        setContracts([data, ...contracts]);
        setIsCreateOpen(false);
        setForm({ customer_id: '', type: 'maintenance', title: '', start_date: '', end_date: '', auto_renew: false, total_value: 0, scope: '', frequency: '', payment_terms: '' });
        toast.success('Contract created', `"${form.title}" has been created`);
      }
    } catch (err) {
      console.error('Failed to create contract:', err);
      toast.error('Failed to create contract', 'Please try again');
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from('contracts').update({ status }).eq('id', id).select('*, customers(full_name)').single();
      if (error) throw error;
      if (data) {
        setContracts((prev) => prev.map((c) => c.id === data.id ? data : c));
        if (selectedContract?.id === id) setSelectedContract(data);
        const statusConf = getStatusConfig('contract', status);
        toast.success(`Contract ${statusConf.label.toLowerCase()}`, `Contract has been marked as ${statusConf.label.toLowerCase()}`);
      }
    } catch (err) {
      console.error('Failed to update contract status:', err);
      toast.error('Failed to update contract', 'Please try again');
    }
  };

  const filtered = contracts.filter((c) => {
    if (statusFilter && c.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return c.title.toLowerCase().includes(s) || c.customers?.full_name?.toLowerCase().includes(s);
    }
    return true;
  });

  // Find contracts expiring within 30 days
  const expiringContracts = contracts.filter((c) => {
    if (c.status !== 'active' && c.status !== 'signed') return false;
    const endDate = new Date(c.end_date);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return endDate <= thirtyDaysFromNow && endDate >= new Date();
  });

  if (isLoading || authLoading) {
    return <div className="animate-pulse space-y-4"><div className="h-8 bg-[#dceaf8]/50 rounded w-48" /><div className="h-64 bg-[#dceaf8]/50 rounded-xl" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0a1f3f]">Contracts</h1>
          <p className="text-[#4a6580] mt-1">Service agreements & maintenance contracts</p>
        </div>
        <Button className="bg-[#e55b2b] hover:bg-[#e55b2b]/90 text-white" onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Contract
        </Button>
      </div>

      {/* Renewal Alerts */}
      {expiringContracts.length > 0 && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
          <div className="flex items-center gap-2 text-amber-700 mb-2">
            <AlertCircle className="w-5 h-5" />
            <span className="font-semibold">Renewal Alerts</span>
          </div>
          <div className="space-y-1">
            {expiringContracts.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span className="text-[#0a1f3f]">{c.title} - {c.customers?.full_name}</span>
                <span className="text-amber-600 font-medium">Expires {formatDate(c.end_date)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['active', 'signed', 'draft', 'expired'].map((status) => {
          const conf = getStatusConfig('contract', status);
          return (
            <div
              key={status}
              className={`bg-white rounded-xl border cursor-pointer p-4 ${statusFilter === status ? 'border-[#e55b2b] ring-2 ring-[#e55b2b]/20' : 'border-[#c8d8ea]'}`}
              onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
            >
              <p className="text-xs font-medium text-[#4a6580]">{conf.label}</p>
              <p className="text-xl font-bold text-[#0a1f3f]">{contracts.filter((c) => c.status === status).length}</p>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a6580]" />
        <Input placeholder="Search contracts..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {/* Contracts List */}
      <div className="bg-white rounded-xl border border-[#c8d8ea]">
        <div className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<FileSignature className="w-7 h-7" />}
              title="No contracts found"
              description={search || statusFilter ? 'Try adjusting your filters' : 'Create your first contract to get started'}
              action={
                !search && !statusFilter ? (
                  <Button className="bg-[#e55b2b] hover:bg-[#e55b2b]/90 text-white" onClick={() => setIsCreateOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" /> New Contract
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="divide-y divide-[#c8d8ea]">
              {filtered.map((c) => {
                const conf = getStatusConfig('contract', c.status);
                return (
                  <div key={c.id} className="p-4 hover:bg-[#0a1f3f]/5 cursor-pointer flex items-center justify-between" onClick={() => setSelectedContract(c)}>
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={conf.variant}>{conf.label}</Badge>
                        <span className="font-medium text-[#0a1f3f]">{c.title}</span>
                        {c.auto_renew && <RefreshCw className="w-3.5 h-3.5 text-[#e55b2b]" />}
                      </div>
                      <p className="text-sm text-[#4a6580] mt-0.5">
                        {c.customers?.full_name || 'No customer'} &middot; {CONTRACT_TYPES.find((t) => t.value === c.type)?.label}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#0a1f3f]">{formatCurrency(c.total_value)}</p>
                      <p className="text-xs text-[#4a6580]">{formatDate(c.start_date)} - {formatDate(c.end_date)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Contract Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="New Contract" className="max-w-2xl">
        <form onSubmit={createContract} className="space-y-4">
          <Input label="Title" placeholder="Annual Maintenance Agreement" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#0a1f3f] mb-1">Customer</label>
              <select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} className="w-full border border-[#c8d8ea] rounded-lg px-3 py-2 text-sm">
                <option value="">Select customer...</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0a1f3f] mb-1">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full border border-[#c8d8ea] rounded-lg px-3 py-2 text-sm">
                {CONTRACT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <Input label="Start Date" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
            <Input label="End Date" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required />
            <Input label="Total Value ($)" type="number" value={form.total_value} onChange={(e) => setForm({ ...form, total_value: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })} />
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" id="auto_renew" checked={form.auto_renew} onChange={(e) => setForm({ ...form, auto_renew: e.target.checked })} className="rounded" />
              <label htmlFor="auto_renew" className="text-sm text-[#0a1f3f]">Auto-renew</label>
            </div>
          </div>
          <textarea value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} placeholder="Scope of service..." rows={3} className="w-full border border-[#c8d8ea] rounded-lg px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Service Frequency" placeholder="e.g. Bi-annual" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} />
            <Input label="Payment Terms" placeholder="e.g. Net 30" value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-[#c8d8ea]">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-[#e55b2b] hover:bg-[#e55b2b]/90 text-white">Create Contract</Button>
          </div>
        </form>
      </Modal>

      {/* Contract Detail Modal */}
      <Modal isOpen={!!selectedContract} onClose={() => setSelectedContract(null)} title="Contract Details" className="max-w-2xl">
        {selectedContract && (() => {
          const detailConf = getStatusConfig('contract', selectedContract.status);
          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={detailConf.variant} size="md">
                    {detailConf.label}
                  </Badge>
                  {selectedContract.auto_renew && <span className="text-sm text-[#e55b2b] flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" /> Auto-renew</span>}
                </div>
                <div className="flex gap-2">
                  {selectedContract.status === 'draft' && <Button variant="outline" onClick={() => updateStatus(selectedContract.id, 'sent')}>Send</Button>}
                  {selectedContract.status === 'sent' && <Button className="bg-[#e55b2b] hover:bg-[#e55b2b]/90 text-white" onClick={() => updateStatus(selectedContract.id, 'signed')}>Mark Signed</Button>}
                  {selectedContract.status === 'signed' && <Button className="bg-[#e55b2b] hover:bg-[#e55b2b]/90 text-white" onClick={() => updateStatus(selectedContract.id, 'active')}>Activate</Button>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-[#4a6580]">Title</p><p className="font-medium text-[#0a1f3f]">{selectedContract.title}</p></div>
                <div><p className="text-sm text-[#4a6580]">Customer</p><p className="font-medium text-[#0a1f3f]">{selectedContract.customers?.full_name || '-'}</p></div>
                <div><p className="text-sm text-[#4a6580]">Type</p><p className="font-medium text-[#0a1f3f]">{CONTRACT_TYPES.find((t) => t.value === selectedContract.type)?.label}</p></div>
                <div><p className="text-sm text-[#4a6580]">Value</p><p className="font-medium text-[#0a1f3f]">{formatCurrency(selectedContract.total_value)}</p></div>
                <div><p className="text-sm text-[#4a6580]">Start Date</p><p className="font-medium text-[#0a1f3f]">{formatDate(selectedContract.start_date)}</p></div>
                <div><p className="text-sm text-[#4a6580]">End Date</p><p className="font-medium text-[#0a1f3f]">{formatDate(selectedContract.end_date)}</p></div>
              </div>

              {selectedContract.terms && Object.keys(selectedContract.terms).length > 0 && (
                <div className="border-t border-[#c8d8ea] pt-4">
                  <h4 className="text-sm font-semibold text-[#0a1f3f] mb-2">Terms</h4>
                  <div className="space-y-2">
                    {Object.entries(selectedContract.terms).map(([key, value]) => (
                      value ? (
                        <div key={key}>
                          <p className="text-xs text-[#4a6580] capitalize">{key.replace(/_/g, ' ')}</p>
                          <p className="text-sm text-[#0a1f3f]">{value}</p>
                        </div>
                      ) : null
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
