'use client';

import { useState } from 'react';
import { Card, CardContent, Button, Input, Modal } from '@/components/ui';
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

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  assigned: { label: 'Assigned', color: 'text-blue-700', bg: 'bg-blue-100' },
  en_route: { label: 'En Route', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  in_progress: { label: 'On Site', color: 'text-orange-700', bg: 'bg-orange-100' },
  completed: { label: 'Completed', color: 'text-green-700', bg: 'bg-green-100' },
  cancelled: { label: 'Cancelled', color: 'text-gray-700', bg: 'bg-gray-100' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  low: { label: 'Low', color: 'text-gray-600', bg: 'bg-gray-100' },
  normal: { label: 'Normal', color: 'text-blue-600', bg: 'bg-blue-50' },
  high: { label: 'High', color: 'text-orange-600', bg: 'bg-orange-50' },
  urgent: { label: 'Urgent', color: 'text-red-600', bg: 'bg-red-50' },
};

export interface ServicePageClientProps {
  initialWorkOrders: WorkOrder[];
  initialCustomers: CustomerOption[];
  initialTechs: Tech[];
  groupId: string;
}

export default function ServicePageClient({
  initialWorkOrders,
  initialCustomers,
  initialTechs,
  groupId,
}: ServicePageClientProps) {
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
    } catch (err) {
      console.error('Create WO exception:', err);
      setCreateError(err instanceof Error ? err.message : 'Unknown error occurred');
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
      }
    } finally {
      setUpdatingStatus((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
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
          <h1 className="text-2xl font-bold text-gray-900">Service / Work Orders</h1>
          <p className="text-gray-600 mt-1">Manage field service operations</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Work Order
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs font-medium text-gray-500">Active Jobs</p><p className="text-2xl font-bold text-gray-900">{statCounts.active}</p></div>
              <div className="bg-blue-500 p-2 rounded-lg"><HardHat className="w-5 h-5 text-white" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs font-medium text-gray-500">Completed</p><p className="text-2xl font-bold text-gray-900">{statCounts.completed}</p></div>
              <div className="bg-green-500 p-2 rounded-lg"><CheckCircle2 className="w-5 h-5 text-white" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs font-medium text-gray-500">Urgent</p><p className="text-2xl font-bold text-gray-900">{statCounts.urgent}</p></div>
              <div className="bg-red-500 p-2 rounded-lg"><AlertTriangle className="w-5 h-5 text-white" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search work orders..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            <option value="">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      {/* Work Orders List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <HardHat className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No work orders</h3>
              <p className="text-gray-600">Create your first work order to get started</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((wo) => {
            const statusConf = STATUS_CONFIG[wo.status] || STATUS_CONFIG.assigned;
            const priorityConf = PRIORITY_CONFIG[wo.priority] || PRIORITY_CONFIG.normal;
            const nextStatus = getNextStatus(wo.status);

            return (
              <Card key={wo.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedWO(wo)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConf.bg} ${statusConf.color}`}>
                          {statusConf.label}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityConf.bg} ${priorityConf.color}`}>
                          {priorityConf.label}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">{wo.id.slice(0, 8)}</span>
                      </div>
                      <p className="font-medium text-gray-900 mt-1">{wo.description || 'No description'}</p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
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
                            STATUS_CONFIG[nextStatus]?.label
                          )}
                        </Button>
                      )}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <div className="flex gap-2">
              <select value={newWO.customer_id} onChange={(e) => setNewWO({ ...newWO, customer_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">{customers.length === 0 ? 'No customers yet — add one below' : 'Select customer...'}</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
              <Button type="button" variant="outline" onClick={() => setShowQuickAdd(!showQuickAdd)} className="shrink-0 text-xs">
                <Plus className="w-3 h-3 mr-1" /> New
              </Button>
            </div>
            {showQuickAdd && (
              <div className="mt-2 p-3 border border-blue-200 bg-blue-50 rounded-lg space-y-2">
                <p className="text-xs font-semibold text-blue-800">Quick Add Customer</p>
                <Input placeholder="Full name *" value={quickCustomer.full_name} onChange={(e) => setQuickCustomer({ ...quickCustomer, full_name: e.target.value })} />
                <Input placeholder="Phone" value={quickCustomer.phone} onChange={(e) => setQuickCustomer({ ...quickCustomer, phone: e.target.value })} />
                <Input placeholder="Email" value={quickCustomer.email} onChange={(e) => setQuickCustomer({ ...quickCustomer, email: e.target.value })} />
                <Input placeholder="Address" value={quickCustomer.address} onChange={(e) => setQuickCustomer({ ...quickCustomer, address: e.target.value })} />
                <div className="flex gap-2">
                  <Button type="button" onClick={quickAddCustomer} disabled={!quickCustomer.full_name.trim()} className="text-xs">Add Customer</Button>
                  <Button type="button" variant="outline" onClick={() => setShowQuickAdd(false)} className="text-xs">Cancel</Button>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assign Tech</label>
            <select value={newWO.assigned_tech_id} onChange={(e) => setNewWO({ ...newWO, assigned_tech_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">Select tech...</option>
              {techs.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select value={newWO.priority} onChange={(e) => setNewWO({ ...newWO, priority: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
              {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date</label>
            <input
              type="date"
              value={newWO.scheduled_date}
              onChange={(e) => setNewWO({ ...newWO, scheduled_date: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={newWO.description}
              onChange={(e) => setNewWO({ ...newWO, description: e.target.value })}
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Describe the work to be done..."
            />
          </div>
          {createError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {createError}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={creating}>{creating ? 'Creating...' : 'Create Work Order'}</Button>
          </div>
        </form>
      </Modal>

      {/* Work Order Detail Modal */}
      <Modal isOpen={!!selectedWO} onClose={() => setSelectedWO(null)} title="Work Order Details" className="max-w-2xl">
        {selectedWO && (
          <div className="space-y-6">
            {/* Status + Priority */}
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_CONFIG[selectedWO.status]?.bg} ${STATUS_CONFIG[selectedWO.status]?.color}`}>
                {STATUS_CONFIG[selectedWO.status]?.label}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${PRIORITY_CONFIG[selectedWO.priority]?.bg} ${PRIORITY_CONFIG[selectedWO.priority]?.color}`}>
                {PRIORITY_CONFIG[selectedWO.priority]?.label}
              </span>
              {getNextStatus(selectedWO.status) && (
                <Button onClick={() => updateStatus(selectedWO.id, getNextStatus(selectedWO.status)!)} className="ml-auto">
                  Move to {STATUS_CONFIG[getNextStatus(selectedWO.status)!]?.label}
                </Button>
              )}
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Customer</p>
                <p className="font-medium text-gray-900">{selectedWO.customers?.full_name || '-'}</p>
                {selectedWO.customers?.phone && <p className="text-sm text-gray-600 flex items-center gap-1"><Phone className="w-3 h-3" />{selectedWO.customers.phone}</p>}
              </div>
              <div>
                <p className="text-sm text-gray-500">Technician</p>
                <p className="font-medium text-gray-900">{selectedWO.profiles?.full_name || 'Unassigned'}</p>
              </div>
              {selectedWO.customers?.address && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="font-medium text-gray-900">{selectedWO.customers.address}</p>
                </div>
              )}
              <div className="col-span-2">
                <p className="text-sm text-gray-500">Description</p>
                <p className="font-medium text-gray-900">{selectedWO.description || '-'}</p>
              </div>
            </div>

            {/* Times */}
            <div className="flex gap-4 text-sm text-gray-500">
              <span>Created: {formatDate(selectedWO.created_at)}</span>
              {selectedWO.started_at && <span>Started: {formatDate(selectedWO.started_at)}</span>}
              {selectedWO.completed_at && <span>Completed: {formatDate(selectedWO.completed_at)}</span>}
            </div>

            {/* Notes */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Notes</h4>
              {selectedWO.notes && (
                <div className="bg-gray-50 rounded-lg p-3 mb-3 text-sm whitespace-pre-wrap">{selectedWO.notes}</div>
              )}
              <div className="flex gap-2">
                <Input placeholder="Add a note..." value={newNote} onChange={(e) => setNewNote(e.target.value)} className="flex-1" />
                <Button onClick={addNoteToWO} disabled={!newNote.trim()}>Add</Button>
              </div>
            </div>

            {/* Parts Used */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Parts Used</h4>
              {selectedWO.parts_used?.length > 0 && (
                <div className="space-y-1 mb-3">
                  {selectedWO.parts_used.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                      <span>{p.name} x{p.quantity}</span>
                      <span className="text-gray-600">${(p.cost * p.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
              {selectedWO.status !== 'completed' && (
                <div className="flex gap-2">
                  <Input placeholder="Part name" value={newPart.name} onChange={(e) => setNewPart({ ...newPart, name: e.target.value })} className="flex-1" />
                  <Input type="number" placeholder="Qty" value={newPart.quantity} onChange={(e) => setNewPart({ ...newPart, quantity: parseInt(e.target.value) || 1 })} className="w-16" />
                  <Input type="number" placeholder="Cost" value={newPart.cost} onChange={(e) => setNewPart({ ...newPart, cost: parseFloat(e.target.value) || 0 })} className="w-20" />
                  <Button onClick={addPartToWO} disabled={!newPart.name.trim()}>Add</Button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
