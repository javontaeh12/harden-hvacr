'use client';

import { useState } from 'react';
import { Card, CardContent, Button, Input, Modal } from '@/components/ui';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/hooks/useToast';
import { WORK_ORDER_STATUS, PRIORITY_LEVELS } from '@/lib/status';
import { formatDate } from '@/lib/utils';
import {
  HardHat,
  Plus,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  User,
  Phone,
  Search,
  Trash2,
} from 'lucide-react';

interface WorkOrder {
  id: string;
  booking_id: string | null;
  customer_id: string | null;
  assigned_tech_id: string | null;
  status: string;
  priority: string;
  description: string | null;
  notes: string | null;
  parts_used: Array<{ name: string; quantity: number; cost: number }>;
  signature_url: string | null;
  started_at: string | null;
  completed_at: string | null;
  group_id: string;
  created_at: string;
  customers?: { full_name: string; phone: string | null; address: string | null } | null;
  profiles?: { full_name: string | null } | null;
}

interface Tech {
  id: string;
  full_name: string | null;
}

interface CustomerOption {
  id: string;
  full_name: string;
}

export interface ServicePageClientProps {
  initialWorkOrders: WorkOrder[];
  initialCustomers: CustomerOption[];
  initialTechs: Tech[];
  groupId: string;
}

/** Map a work-order DB status key to a Badge variant */
function woBadgeVariant(status: string) {
  const cfg = WORK_ORDER_STATUS[status];
  return cfg?.variant ?? 'default';
}

/** Get display label for a WO status */
function woLabel(status: string) {
  const cfg = WORK_ORDER_STATUS[status];
  return cfg?.label ?? status;
}

/** Map a priority DB key to a Badge variant */
function priorityBadgeVariant(priority: string) {
  const cfg = PRIORITY_LEVELS[priority];
  return cfg?.variant ?? 'default';
}

/** Get display label for a priority */
function priorityLabel(priority: string) {
  const cfg = PRIORITY_LEVELS[priority];
  return cfg?.label ?? priority;
}

export default function ServicePageClient({
  initialWorkOrders,
  initialCustomers,
  initialTechs,
  groupId,
}: ServicePageClientProps) {
  const { toast } = useToast();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(initialWorkOrders);
  const [techs] = useState<Tech[]>(initialTechs);
  const [customers, setCustomers] = useState<CustomerOption[]>(initialCustomers);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [newWO, setNewWO] = useState({
    customer_id: '', assigned_tech_id: '', priority: 'normal', description: '', scheduled_date: '',
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [newPart, setNewPart] = useState({ name: '', quantity: 1, cost: 0 });
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickCustomer, setQuickCustomer] = useState({ full_name: '', phone: '', email: '', address: '' });
  const [updatingStatus, setUpdatingStatus] = useState<Set<string>>(new Set());

  // Status filter tabs
  const statusTabs = [
    { value: '', label: 'All', count: workOrders.length },
    ...Object.entries(WORK_ORDER_STATUS)
      .filter(([key]) => ['assigned', 'en_route', 'in_progress', 'completed', 'cancelled'].includes(key))
      .map(([key, cfg]) => ({
        value: key,
        label: cfg.label,
        count: workOrders.filter((wo) => wo.status === key).length,
      })),
  ];

  const quickAddCustomer = async () => {
    if (!quickCustomer.full_name.trim()) return;
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: quickCustomer.full_name,
          phone: quickCustomer.phone || null,
          email: quickCustomer.email || null,
          address: quickCustomer.address || null,
          group_id: groupId,
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setCustomers((prev) => [...prev, { id: data.id, full_name: data.full_name }].sort((a, b) => a.full_name.localeCompare(b.full_name)));
      setNewWO({ ...newWO, customer_id: data.id });
      setShowQuickAdd(false);
      setQuickCustomer({ full_name: '', phone: '', email: '', address: '' });
    } catch (err) {
      console.error('Quick add customer error:', err);
    }
  };

  const createWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCreateError(null);
    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        customer_id: newWO.customer_id || null,
        assigned_tech_id: newWO.assigned_tech_id || null,
        priority: newWO.priority,
        description: newWO.description,
        group_id: groupId,
      };
      if (newWO.scheduled_date) {
        body.scheduled_date = newWO.scheduled_date;
      }
      const res = await fetch('/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        setCreateError(err.error || 'Failed to create work order');
        return;
      }
      const data = await res.json();
      setWorkOrders([data, ...workOrders]);
      setIsCreateOpen(false);
      setNewWO({ customer_id: '', assigned_tech_id: '', priority: 'normal', description: '', scheduled_date: '' });
      toast.success('Work order created', 'The new work order is ready.');
    } catch (err) {
      console.error('Create WO exception:', err);
      setCreateError(err instanceof Error ? err.message : 'Unknown error occurred');
      toast.error('Failed to create work order');
    } finally {
      setCreating(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdatingStatus((prev) => new Set(prev).add(id));
    try {
      const updates: Record<string, unknown> = { id, status };
      if (status === 'in_progress') updates.started_at = new Date().toISOString();
      if (status === 'completed') updates.completed_at = new Date().toISOString();

      const res = await fetch('/api/work-orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const wo = await res.json() as WorkOrder;
        setWorkOrders((prev) => prev.map((w) => w.id === id ? wo : w));
        if (selectedWO?.id === id) setSelectedWO(wo);
        toast.success('Status updated', `Work order moved to ${woLabel(status)}.`);
      }
    } finally {
      setUpdatingStatus((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const deleteWorkOrder = async (id: string) => {
    if (!confirm('Delete this work order? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/work-orders?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setWorkOrders((prev) => prev.filter((w) => w.id !== id));
        if (selectedWO?.id === id) setSelectedWO(null);
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const addNoteToWO = async () => {
    if (!selectedWO || !newNote.trim()) return;
    const currentNotes = selectedWO.notes || '';
    const timestamp = new Date().toLocaleString();
    const updatedNotes = `${currentNotes}\n[${timestamp}] ${newNote}`.trim();

    const res = await fetch('/api/work-orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedWO.id, notes: updatedNotes }),
    });
    if (res.ok) {
      const wo = await res.json() as WorkOrder;
      setWorkOrders((prev) => prev.map((w) => w.id === wo.id ? wo : w));
      setSelectedWO(wo);
      setNewNote('');
    }
  };

  const addPartToWO = async () => {
    if (!selectedWO || !newPart.name.trim()) return;
    const parts = [...(selectedWO.parts_used || []), { ...newPart }];

    const res = await fetch('/api/work-orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedWO.id, parts_used: parts }),
    });
    if (res.ok) {
      const wo = await res.json() as WorkOrder;
      setWorkOrders((prev) => prev.map((w) => w.id === wo.id ? wo : w));
      setSelectedWO(wo);
      setNewPart({ name: '', quantity: 1, cost: 0 });
    }
  };

  const getNextStatus = (current: string) => {
    const flow: Record<string, string> = {
      assigned: 'en_route', en_route: 'in_progress', in_progress: 'completed',
    };
    return flow[current] || null;
  };

  const filtered = workOrders.filter((wo) => {
    if (statusFilter && wo.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        wo.customers?.full_name?.toLowerCase().includes(q) ||
        wo.description?.toLowerCase().includes(q) ||
        wo.id.includes(q)
      );
    }
    return true;
  });

  const statCounts = {
    active: workOrders.filter((wo) => ['assigned', 'en_route', 'in_progress'].includes(wo.status)).length,
    completed: workOrders.filter((wo) => wo.status === 'completed').length,
    urgent: workOrders.filter((wo) => wo.priority === 'urgent' && wo.status !== 'completed').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0a1f3f]">Service / Work Orders</h1>
          <p className="text-[#4a6580] mt-1">Manage field service operations</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="bg-[#e55b2b] hover:bg-[#e55b2b]/90 text-white">
          <Plus className="w-4 h-4 mr-2" /> New Work Order
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-white rounded-xl border border-[#c8d8ea]">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs font-medium text-[#4a6580]">Active Jobs</p><p className="text-2xl font-bold text-[#0a1f3f]">{statCounts.active}</p></div>
              <div className="bg-[#e55b2b] p-2 rounded-lg"><HardHat className="w-5 h-5 text-white" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white rounded-xl border border-[#c8d8ea]">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs font-medium text-[#4a6580]">Completed</p><p className="text-2xl font-bold text-[#0a1f3f]">{statCounts.completed}</p></div>
              <div className="bg-emerald-500 p-2 rounded-lg"><CheckCircle2 className="w-5 h-5 text-white" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white rounded-xl border border-[#c8d8ea]">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs font-medium text-[#4a6580]">Urgent</p><p className="text-2xl font-bold text-[#0a1f3f]">{statCounts.urgent}</p></div>
              <div className="bg-red-500 p-2 rounded-lg"><AlertTriangle className="w-5 h-5 text-white" /></div>
            </div>
          </CardContent>
        </Card>
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
          <Input placeholder="Search work orders..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
      </div>

      {/* Work Orders List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="bg-white rounded-xl border border-[#c8d8ea]">
            <CardContent className="p-0">
              <EmptyState
                icon={<HardHat className="w-8 h-8" />}
                title="No work orders"
                description={search || statusFilter ? 'Try adjusting your filters' : 'Create your first work order to get started'}
                action={
                  !search && !statusFilter ? (
                    <Button onClick={() => setIsCreateOpen(true)} className="bg-[#e55b2b] hover:bg-[#e55b2b]/90 text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      New Work Order
                    </Button>
                  ) : undefined
                }
              />
            </CardContent>
          </Card>
        ) : (
          filtered.map((wo) => {
            const nextStatus = getNextStatus(wo.status);

            return (
              <Card key={wo.id} className="hover:shadow-md transition-shadow cursor-pointer bg-white rounded-xl border border-[#c8d8ea]" onClick={() => setSelectedWO(wo)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={woBadgeVariant(wo.status)}>
                          {woLabel(wo.status)}
                        </Badge>
                        <Badge variant={priorityBadgeVariant(wo.priority)}>
                          {priorityLabel(wo.priority)}
                        </Badge>
                        <span className="text-xs text-[#4a6580]/70 font-mono">{wo.id.slice(0, 8)}</span>
                      </div>
                      <p className="font-medium text-[#0a1f3f] mt-1">{wo.description || 'No description'}</p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-[#4a6580]">
                        {wo.customers && (
                          <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{wo.customers.full_name}</span>
                        )}
                        {wo.profiles?.full_name && (
                          <span className="flex items-center gap-1"><HardHat className="w-3.5 h-3.5" />{wo.profiles.full_name}</span>
                        )}
                        {wo.customers?.address && (
                          <span className="flex items-center gap-1 hidden sm:flex"><MapPin className="w-3.5 h-3.5" />{wo.customers.address}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {nextStatus && (
                        <Button
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); updateStatus(wo.id, nextStatus); }}
                          disabled={updatingStatus.has(wo.id)}
                          className="text-xs"
                        >
                          {updatingStatus.has(wo.id) ? (
                            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            woLabel(nextStatus)
                          )}
                        </Button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteWorkOrder(wo.id); }}
                        className="p-1.5 rounded-lg text-[#4a6580] hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete work order"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Create Work Order Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="New Work Order">
        <form onSubmit={createWorkOrder} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#0a1f3f] mb-1">Customer</label>
            <div className="flex gap-2">
              <select value={newWO.customer_id} onChange={(e) => setNewWO({ ...newWO, customer_id: e.target.value })} className="w-full border border-[#c8d8ea] rounded-lg px-3 py-2 text-sm">
                <option value="">{customers.length === 0 ? 'No customers yet -- add one below' : 'Select customer...'}</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
              <Button type="button" variant="outline" onClick={() => setShowQuickAdd(!showQuickAdd)} className="shrink-0 text-xs">
                <Plus className="w-3 h-3 mr-1" /> New
              </Button>
            </div>
            {showQuickAdd && (
              <div className="mt-2 p-3 border border-[#e55b2b]/30 bg-[#e55b2b]/5 rounded-lg space-y-2">
                <p className="text-xs font-semibold text-[#0a1f3f]">Quick Add Customer</p>
                <Input placeholder="Full name *" value={quickCustomer.full_name} onChange={(e) => setQuickCustomer({ ...quickCustomer, full_name: e.target.value })} />
                <Input placeholder="Phone" value={quickCustomer.phone} onChange={(e) => setQuickCustomer({ ...quickCustomer, phone: e.target.value })} />
                <Input placeholder="Email" value={quickCustomer.email} onChange={(e) => setQuickCustomer({ ...quickCustomer, email: e.target.value })} />
                <Input placeholder="Address" value={quickCustomer.address} onChange={(e) => setQuickCustomer({ ...quickCustomer, address: e.target.value })} />
                <div className="flex gap-2">
                  <Button type="button" onClick={quickAddCustomer} disabled={!quickCustomer.full_name.trim()} className="text-xs bg-[#e55b2b] hover:bg-[#e55b2b]/90 text-white">Add Customer</Button>
                  <Button type="button" variant="outline" onClick={() => setShowQuickAdd(false)} className="text-xs">Cancel</Button>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-[#0a1f3f] mb-1">Assign Tech</label>
            <select value={newWO.assigned_tech_id} onChange={(e) => setNewWO({ ...newWO, assigned_tech_id: e.target.value })} className="w-full border border-[#c8d8ea] rounded-lg px-3 py-2 text-sm">
              <option value="">Select tech...</option>
              {techs.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#0a1f3f] mb-1">Priority</label>
            <select value={newWO.priority} onChange={(e) => setNewWO({ ...newWO, priority: e.target.value })} className="w-full border border-[#c8d8ea] rounded-lg px-3 py-2 text-sm">
              {Object.entries(PRIORITY_LEVELS)
                .filter(([k]) => ['low', 'normal', 'high', 'urgent'].includes(k))
                .map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#0a1f3f] mb-1">Scheduled Date</label>
            <input
              type="date"
              value={newWO.scheduled_date}
              onChange={(e) => setNewWO({ ...newWO, scheduled_date: e.target.value })}
              className="w-full border border-[#c8d8ea] rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#0a1f3f] mb-1">Description</label>
            <textarea
              value={newWO.description}
              onChange={(e) => setNewWO({ ...newWO, description: e.target.value })}
              rows={3}
              className="w-full border border-[#c8d8ea] rounded-lg px-3 py-2 text-sm placeholder-[#4a6580]/50 focus:border-[#e55b2b] focus:outline-none focus:ring-1 focus:ring-[#e55b2b]"
              placeholder="Describe the work to be done..."
            />
          </div>
          {createError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {createError}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-[#c8d8ea]">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={creating} className="bg-[#e55b2b] hover:bg-[#e55b2b]/90 text-white">{creating ? 'Creating...' : 'Create Work Order'}</Button>
          </div>
        </form>
      </Modal>

      {/* Work Order Detail Modal */}
      <Modal isOpen={!!selectedWO} onClose={() => setSelectedWO(null)} title="Work Order Details" className="max-w-2xl">
        {selectedWO && (
          <div className="space-y-6">
            {/* Status + Priority */}
            <div className="flex items-center gap-3">
              <Badge variant={woBadgeVariant(selectedWO.status)} size="md">
                {woLabel(selectedWO.status)}
              </Badge>
              <Badge variant={priorityBadgeVariant(selectedWO.priority)} size="md">
                {priorityLabel(selectedWO.priority)}
              </Badge>
              {getNextStatus(selectedWO.status) && (
                <Button onClick={() => updateStatus(selectedWO.id, getNextStatus(selectedWO.status)!)} className="ml-auto bg-[#e55b2b] hover:bg-[#e55b2b]/90 text-white">
                  Move to {woLabel(getNextStatus(selectedWO.status)!)}
                </Button>
              )}
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-[#4a6580]">Customer</p>
                <p className="font-medium text-[#0a1f3f]">{selectedWO.customers?.full_name || '-'}</p>
                {selectedWO.customers?.phone && <p className="text-sm text-[#4a6580] flex items-center gap-1"><Phone className="w-3 h-3" />{selectedWO.customers.phone}</p>}
              </div>
              <div>
                <p className="text-sm text-[#4a6580]">Technician</p>
                <p className="font-medium text-[#0a1f3f]">{selectedWO.profiles?.full_name || 'Unassigned'}</p>
              </div>
              {selectedWO.customers?.address && (
                <div className="col-span-2">
                  <p className="text-sm text-[#4a6580]">Address</p>
                  <p className="font-medium text-[#0a1f3f]">{selectedWO.customers.address}</p>
                </div>
              )}
              <div className="col-span-2">
                <p className="text-sm text-[#4a6580]">Description</p>
                <p className="font-medium text-[#0a1f3f]">{selectedWO.description || '-'}</p>
              </div>
            </div>

            {/* Times */}
            <div className="flex gap-4 text-sm text-[#4a6580]">
              <span>Created: {formatDate(selectedWO.created_at)}</span>
              {selectedWO.started_at && <span>Started: {formatDate(selectedWO.started_at)}</span>}
              {selectedWO.completed_at && <span>Completed: {formatDate(selectedWO.completed_at)}</span>}
            </div>

            {/* Notes */}
            <div>
              <h4 className="text-sm font-semibold text-[#0a1f3f] mb-2">Notes</h4>
              {selectedWO.notes && (
                <div className="bg-gray-50 rounded-lg p-3 mb-3 text-sm whitespace-pre-wrap text-[#0a1f3f]">{selectedWO.notes}</div>
              )}
              <div className="flex gap-2">
                <Input placeholder="Add a note..." value={newNote} onChange={(e) => setNewNote(e.target.value)} className="flex-1" />
                <Button onClick={addNoteToWO} disabled={!newNote.trim()} className="bg-[#e55b2b] hover:bg-[#e55b2b]/90 text-white">Add</Button>
              </div>
            </div>

            {/* Parts Used */}
            <div>
              <h4 className="text-sm font-semibold text-[#0a1f3f] mb-2">Parts Used</h4>
              {selectedWO.parts_used?.length > 0 && (
                <div className="space-y-1 mb-3">
                  {selectedWO.parts_used.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                      <span className="text-[#0a1f3f]">{p.name} x{p.quantity}</span>
                      <span className="text-[#4a6580]">${(p.cost * p.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
              {selectedWO.status !== 'completed' && (
                <div className="flex gap-2">
                  <Input placeholder="Part name" value={newPart.name} onChange={(e) => setNewPart({ ...newPart, name: e.target.value })} className="flex-1" />
                  <Input type="number" placeholder="Qty" value={newPart.quantity} onChange={(e) => setNewPart({ ...newPart, quantity: e.target.value === '' ? 0 : parseInt(e.target.value) || 1 })} className="w-16" />
                  <Input type="number" placeholder="Cost" value={newPart.cost} onChange={(e) => setNewPart({ ...newPart, cost: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })} className="w-20" />
                  <Button onClick={addPartToWO} disabled={!newPart.name.trim()} className="bg-[#e55b2b] hover:bg-[#e55b2b]/90 text-white">Add</Button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
