'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/hooks/useToast';
import { Tabs } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Truck,
  Package,
  Gauge,
  Droplets,
  Wrench,
  Plus,
  AlertTriangle,
  Calendar,
  Loader2,
  TrendingUp,
  X,
} from 'lucide-react';

type TabId = 'stock' | 'mileage' | 'gas' | 'maintenance';

interface Van {
  id: string;
  name: string;
  van_number: string;
  license_plate: string | null;
  assigned_tech_id: string | null;
  group_id: string;
  created_at: string;
}

interface InventoryItem {
  id: string;
  van_id: string;
  group_id: string;
  name: string;
  quantity: number;
  min_quantity: number;
  category?: string | null;
  created_at: string;
}

interface MileageLog {
  id: string;
  van_id: string;
  date: string;
  start_miles: number;
  end_miles: number;
  total_miles: number;
  notes: string | null;
  created_at: string;
}

interface GasLog {
  id: string;
  van_id: string;
  date: string;
  gallons: number;
  price_per_gallon: number;
  total_cost: number;
  odometer: number | null;
  station: string | null;
  created_at: string;
}

interface MaintenanceLog {
  id: string;
  van_id: string;
  date: string;
  type: string;
  description: string | null;
  cost: number | null;
  vendor: string | null;
  next_due_date: string | null;
  next_due_miles: number | null;
  created_at: string;
}

const MPG_ESTIMATE = 12;
const GAS_PRICE_ESTIMATE = 3.5;

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

const MAINTENANCE_TYPES = [
  'Oil Change',
  'Tire Rotation',
  'Brake Service',
  'Transmission',
  'AC Service',
  'Other',
];

export default function VanPage() {
  const { profile, groupId } = useAuth();
  const { toast } = useToast();
  const vanId = profile?.van_id;

  const [activeTab, setActiveTab] = useState<TabId>('stock');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  const [van, setVan] = useState<Van | null>(null);
  const [vanLoading, setVanLoading] = useState(true);

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);

  const [mileageLogs, setMileageLogs] = useState<MileageLog[]>([]);
  const [mileageLoading, setMileageLoading] = useState(false);
  const [showMileageForm, setShowMileageForm] = useState(false);

  const [gasLogs, setGasLogs] = useState<GasLog[]>([]);
  const [gasLoading, setGasLoading] = useState(false);
  const [showGasForm, setShowGasForm] = useState(false);

  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [upcomingMaintenance, setUpcomingMaintenance] = useState<MaintenanceLog[]>([]);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch van info
  useEffect(() => {
    if (!vanId) {
      setVanLoading(false);
      return;
    }
    const supabase = createClient();
    supabase
      .from('vans')
      .select('*')
      .eq('id', vanId)
      .single()
      .then(({ data, error: err }) => {
        if (err) {
          console.error('Failed to load van info:', err);
        } else {
          setVan(data as Van);
        }
        setVanLoading(false);
      });
  }, [vanId]);

  const fetchInventory = useCallback(async () => {
    if (!vanId || !groupId) return;
    setInventoryLoading(true);
    try {
      const supabase = createClient();
      const { data, error: err } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('van_id', vanId)
        .eq('group_id', groupId)
        .order('name', { ascending: true });
      if (err) throw err;
      setInventory((data as InventoryItem[]) || []);
    } catch {
      setError('Failed to load inventory');
    } finally {
      setInventoryLoading(false);
    }
  }, [vanId, groupId]);

  const fetchMileage = useCallback(async () => {
    if (!vanId) return;
    setMileageLoading(true);
    try {
      const params = new URLSearchParams({ month: selectedMonth });
      params.set('van_id', vanId);
      const res = await fetch(`/api/truck/mileage?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      setMileageLogs(await res.json());
    } catch {
      setError('Failed to load mileage logs');
    } finally {
      setMileageLoading(false);
    }
  }, [selectedMonth, vanId]);

  const fetchGas = useCallback(async () => {
    if (!vanId) return;
    setGasLoading(true);
    try {
      const params = new URLSearchParams({ month: selectedMonth });
      params.set('van_id', vanId);
      const res = await fetch(`/api/truck/gas?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      setGasLogs(await res.json());
    } catch {
      setError('Failed to load gas logs');
    } finally {
      setGasLoading(false);
    }
  }, [selectedMonth, vanId]);

  const fetchMaintenance = useCallback(async () => {
    if (!vanId) return;
    setMaintenanceLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('van_id', vanId);
      const [logsRes, upcomingRes] = await Promise.all([
        fetch(`/api/truck/maintenance?${params}`),
        fetch(`/api/truck/maintenance?upcoming=true&${params}`),
      ]);
      if (!logsRes.ok || !upcomingRes.ok) throw new Error('Failed to fetch');
      setMaintenanceLogs(await logsRes.json());
      setUpcomingMaintenance(await upcomingRes.json());
    } catch {
      setError('Failed to load maintenance logs');
    } finally {
      setMaintenanceLoading(false);
    }
  }, [vanId]);

  useEffect(() => {
    if (activeTab === 'stock') fetchInventory();
    else if (activeTab === 'mileage') fetchMileage();
    else if (activeTab === 'gas') fetchGas();
    else if (activeTab === 'maintenance') fetchMaintenance();
  }, [activeTab, fetchInventory, fetchMileage, fetchGas, fetchMaintenance]);

  const totalMilesThisMonth = mileageLogs.reduce((sum, l) => sum + (l.total_miles || 0), 0);
  const avgDailyMiles = mileageLogs.length > 0 ? totalMilesThisMonth / mileageLogs.length : 0;

  const estDailyGallons = avgDailyMiles / MPG_ESTIMATE;
  const estWeeklyGallons = estDailyGallons * 5;
  const estMonthlyGallons = estDailyGallons * 22;
  const estYearlyGallons = estDailyGallons * 260;

  const totalGasCost = gasLogs.reduce((sum, l) => sum + (l.total_cost || 0), 0);
  const totalGallons = gasLogs.reduce((sum, l) => sum + (l.gallons || 0), 0);
  const avgPricePerGallon =
    gasLogs.length > 0
      ? gasLogs.reduce((sum, l) => sum + (l.price_per_gallon || 0), 0) / gasLogs.length
      : 0;

  const totalMaintenanceCost = maintenanceLogs.reduce((sum, l) => sum + (l.cost || 0), 0);
  const upcomingCount = upcomingMaintenance.length;

  const lowStockItems = inventory.filter((item) => item.quantity < item.min_quantity);

  const tabItems = [
    { value: 'stock', label: 'Stock', icon: <Package className="w-4 h-4" /> },
    { value: 'mileage', label: 'Mileage', icon: <Gauge className="w-4 h-4" /> },
    { value: 'gas', label: 'Gas', icon: <Droplets className="w-4 h-4" /> },
    { value: 'maintenance', label: 'Maint.', icon: <Wrench className="w-4 h-4" /> },
  ];

  async function handleMileageSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/truck/mileage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          van_id: vanId,
          date: form.get('date'),
          start_miles: form.get('start_miles'),
          end_miles: form.get('end_miles'),
          notes: form.get('notes') || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }
      setShowMileageForm(false);
      toast.success('Saved', 'Mileage entry recorded');
      fetchMileage();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save mileage');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGasSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/truck/gas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          van_id: vanId,
          date: todayISO(),
          gallons: form.get('gallons'),
          price_per_gallon: form.get('price_per_gallon'),
          odometer: form.get('odometer') || null,
          station: form.get('station') || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }
      setShowGasForm(false);
      toast.success('Saved', 'Gas log recorded');
      fetchGas();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save gas log');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMaintenanceSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/truck/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          van_id: vanId,
          date: form.get('date'),
          type: form.get('type'),
          description: form.get('description') || null,
          cost: form.get('cost') || null,
          vendor: form.get('vendor') || null,
          next_due_date: form.get('next_due_date') || null,
          next_due_miles: form.get('next_due_miles') || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }
      setShowMaintenanceForm(false);
      toast.success('Saved', 'Maintenance record added');
      fetchMaintenance();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save maintenance log');
    } finally {
      setSubmitting(false);
    }
  }

  if (!vanLoading && !vanId) {
    return (
      <div className="pt-6 pb-24 px-4">
        <EmptyState
          icon={<Truck className="w-8 h-8" />}
          title="No Van Assigned"
          description="You don't have a van assigned to your account yet. Contact your admin."
        />
      </div>
    );
  }

  return (
    <div className="pt-4 pb-24 px-4 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-[#0a1f3f] flex items-center gap-2">
          <Truck className="w-6 h-6 text-[#e55b2b]" />
          My Van
        </h1>
        {vanLoading ? (
          <div className="flex items-center gap-2 mt-1">
            <Loader2 className="w-4 h-4 animate-spin text-[#4a6580]" />
            <span className="text-[#4a6580] text-xs">Loading van info...</span>
          </div>
        ) : van ? (
          <p className="text-[#4a6580] text-xs mt-1">
            Van #{van.van_number} {van.name ? `- ${van.name}` : ''}
            {van.license_plate ? ` | ${van.license_plate}` : ''}
          </p>
        ) : null}
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
          <p className="text-red-700 text-sm">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-sm ml-2">
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs — using boxed variant */}
      <Tabs
        tabs={tabItems}
        value={activeTab}
        onChange={(v) => setActiveTab(v as TabId)}
        variant="boxed"
        fullWidth
      />

      {/* ========== STOCK TAB ========== */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          {lowStockItems.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-red-700 text-sm font-semibold">
                  {lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} below minimum stock
                </span>
              </div>
              <div className="space-y-1">
                {lowStockItems.map((item) => (
                  <p key={item.id} className="text-red-600 text-xs">
                    {item.name}: {item.quantity} on hand (min: {item.min_quantity})
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-[#c8d8ea] p-4">
              <p className="text-xs font-medium text-[#4a6580]">Total Items</p>
              <p className="text-2xl font-bold text-[#0a1f3f] mt-1">{inventory.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-[#c8d8ea] p-4">
              <p className="text-xs font-medium text-[#4a6580]">Low Stock</p>
              <p className={`text-2xl font-bold mt-1 ${lowStockItems.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {lowStockItems.length}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#c8d8ea]">
            <div className="px-4 py-3 border-b border-[#c8d8ea]/50">
              <h3 className="text-sm font-semibold text-[#0a1f3f]">Van Inventory</h3>
            </div>
            <div className="divide-y divide-[#c8d8ea]/30">
              {inventoryLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-10 bg-[#e8f0f8] rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : inventory.length === 0 ? (
                <EmptyState
                  icon={<Package className="w-8 h-8" />}
                  title="No Inventory Items"
                  description="No inventory items found for this van"
                />
              ) : (
                inventory.map((item) => {
                  const isLow = item.quantity < item.min_quantity;
                  return (
                    <div key={item.id} className="px-4 py-3 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isLow ? 'text-red-600' : 'text-[#0a1f3f]'}`}>
                          {item.name}
                        </p>
                        <p className="text-[11px] text-[#4a6580]">Min: {item.min_quantity}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <span
                          className={`text-sm font-bold px-2.5 py-1 rounded-lg ${
                            isLow ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {item.quantity}
                        </span>
                        {isLow && <Badge variant="warning" size="sm">Low</Badge>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========== MILEAGE TAB ========== */}
      {activeTab === 'mileage' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-[#4a6580]">Month:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border border-[#c8d8ea] rounded-xl px-3 py-1.5 text-sm text-[#0a1f3f] focus:outline-none focus:ring-2 focus:ring-[#e55b2b]/20 focus:border-[#e55b2b]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-[#c8d8ea] p-4">
              <p className="text-xs font-medium text-[#4a6580]">Total Miles</p>
              <p className="text-2xl font-bold text-[#0a1f3f] mt-1">{totalMilesThisMonth.toFixed(1)}</p>
            </div>
            <div className="bg-white rounded-xl border border-[#c8d8ea] p-4">
              <p className="text-xs font-medium text-[#4a6580]">Avg Daily Miles</p>
              <p className="text-2xl font-bold text-[#0a1f3f] mt-1">{avgDailyMiles.toFixed(1)}</p>
            </div>
          </div>

          {mileageLogs.length > 0 && (
            <div className="bg-white rounded-xl border border-[#c8d8ea]">
              <div className="px-4 py-3 border-b border-[#c8d8ea]/50 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#e55b2b]" />
                <h3 className="text-sm font-semibold text-[#0a1f3f]">Estimated Gas Usage</h3>
                <span className="text-[10px] text-[#4a6580] ml-auto">~{MPG_ESTIMATE} MPG @ {formatCurrency(GAS_PRICE_ESTIMATE)}/gal</span>
              </div>
              <div className="p-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#4a6580]">Daily</p>
                  <p className="text-sm font-bold text-[#0a1f3f]">{estDailyGallons.toFixed(1)} gal</p>
                  <p className="text-[11px] text-[#e55b2b]">{formatCurrency(estDailyGallons * GAS_PRICE_ESTIMATE)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#4a6580]">Weekly</p>
                  <p className="text-sm font-bold text-[#0a1f3f]">{estWeeklyGallons.toFixed(1)} gal</p>
                  <p className="text-[11px] text-[#e55b2b]">{formatCurrency(estWeeklyGallons * GAS_PRICE_ESTIMATE)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#4a6580]">Monthly</p>
                  <p className="text-sm font-bold text-[#0a1f3f]">{estMonthlyGallons.toFixed(1)} gal</p>
                  <p className="text-[11px] text-[#e55b2b]">{formatCurrency(estMonthlyGallons * GAS_PRICE_ESTIMATE)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#4a6580]">Yearly</p>
                  <p className="text-sm font-bold text-[#0a1f3f]">{estYearlyGallons.toFixed(1)} gal</p>
                  <p className="text-[11px] text-[#e55b2b]">{formatCurrency(estYearlyGallons * GAS_PRICE_ESTIMATE)}</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-[#c8d8ea]">
            <div className="px-4 py-3 border-b border-[#c8d8ea]/50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#0a1f3f]">Mileage Log</h3>
              <button
                onClick={() => setShowMileageForm(!showMileageForm)}
                className="flex items-center gap-1 text-xs font-medium text-[#e55b2b]"
              >
                {showMileageForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showMileageForm ? 'Close' : 'Add Entry'}
              </button>
            </div>

            {showMileageForm && (
              <form onSubmit={handleMileageSubmit} className="p-4 border-b border-[#c8d8ea]/50 bg-[#e8f0f8]/50 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[#4a6580] mb-1">Date</label>
                  <input name="date" type="date" required defaultValue={todayISO()} className="w-full border border-[#c8d8ea] rounded-xl px-3 py-2 text-sm text-[#0a1f3f] focus:outline-none focus:ring-2 focus:ring-[#e55b2b]/20 focus:border-[#e55b2b]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#4a6580] mb-1">Start Miles</label>
                    <input name="start_miles" type="number" step="0.1" required placeholder="e.g. 45000" className="w-full border border-[#c8d8ea] rounded-xl px-3 py-2 text-sm text-[#0a1f3f] focus:outline-none focus:ring-2 focus:ring-[#e55b2b]/20 focus:border-[#e55b2b]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#4a6580] mb-1">End Miles</label>
                    <input name="end_miles" type="number" step="0.1" required placeholder="e.g. 45150" className="w-full border border-[#c8d8ea] rounded-xl px-3 py-2 text-sm text-[#0a1f3f] focus:outline-none focus:ring-2 focus:ring-[#e55b2b]/20 focus:border-[#e55b2b]" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#4a6580] mb-1">Notes (optional)</label>
                  <input name="notes" placeholder="Route details, etc." className="w-full border border-[#c8d8ea] rounded-xl px-3 py-2 text-sm text-[#0a1f3f] focus:outline-none focus:ring-2 focus:ring-[#e55b2b]/20 focus:border-[#e55b2b]" />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={() => setShowMileageForm(false)} className="px-4 py-2 text-sm text-[#4a6580] border border-[#c8d8ea] rounded-xl hover:bg-[#e8f0f8]">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-bold text-white bg-[#e55b2b] rounded-xl hover:bg-[#d14e22] disabled:opacity-50 flex items-center gap-2">
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save
                  </button>
                </div>
              </form>
            )}

            <div className="divide-y divide-[#c8d8ea]/30">
              {mileageLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-[#e8f0f8] rounded animate-pulse" />
                  ))}
                </div>
              ) : mileageLogs.length === 0 ? (
                <EmptyState
                  icon={<Gauge className="w-8 h-8" />}
                  title="No Mileage Entries"
                  description="No mileage entries this month"
                />
              ) : (
                mileageLogs.map((log) => (
                  <div key={log.id} className="px-4 py-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-[#0a1f3f]">{formatDate(log.date)}</p>
                        <p className="text-xs text-[#4a6580] mt-0.5">
                          {log.start_miles.toLocaleString()} - {log.end_miles.toLocaleString()}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-[#e55b2b]">{log.total_miles?.toFixed(1)} mi</span>
                    </div>
                    {log.notes && <p className="text-xs text-[#4a6580] mt-1">{log.notes}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========== GAS TAB ========== */}
      {activeTab === 'gas' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-[#4a6580]">Month:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border border-[#c8d8ea] rounded-xl px-3 py-1.5 text-sm text-[#0a1f3f] focus:outline-none focus:ring-2 focus:ring-[#e55b2b]/20 focus:border-[#e55b2b]"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-[#c8d8ea] p-3">
              <p className="text-xs font-medium text-[#4a6580]">Total Cost</p>
              <p className="text-lg font-bold text-[#0a1f3f] mt-1">{formatCurrency(totalGasCost)}</p>
            </div>
            <div className="bg-white rounded-xl border border-[#c8d8ea] p-3">
              <p className="text-xs font-medium text-[#4a6580]">Gallons</p>
              <p className="text-lg font-bold text-[#0a1f3f] mt-1">{totalGallons.toFixed(1)}</p>
            </div>
            <div className="bg-white rounded-xl border border-[#c8d8ea] p-3">
              <p className="text-xs font-medium text-[#4a6580]">Avg $/gal</p>
              <p className="text-lg font-bold text-[#0a1f3f] mt-1">{formatCurrency(avgPricePerGallon)}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#c8d8ea]">
            <div className="px-4 py-3 border-b border-[#c8d8ea]/50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#0a1f3f]">Gas Log</h3>
              <button
                onClick={() => setShowGasForm(!showGasForm)}
                className="flex items-center gap-1 text-xs font-medium text-[#e55b2b]"
              >
                {showGasForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showGasForm ? 'Close' : 'Add Entry'}
              </button>
            </div>

            {showGasForm && (
              <form onSubmit={handleGasSubmit} className="p-4 border-b border-[#c8d8ea]/50 bg-[#e8f0f8]/50 space-y-3">
                <div className="p-3 bg-[#e55b2b]/5 border border-[#e55b2b]/20 rounded-xl">
                  <p className="text-xs text-[#e55b2b]">
                    <Calendar className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                    Date auto-set to today: <span className="font-semibold">{formatDate(todayISO())}</span>
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#4a6580] mb-1">Gallons</label>
                    <input name="gallons" type="number" step="0.001" required placeholder="e.g. 15.5" className="w-full border border-[#c8d8ea] rounded-xl px-3 py-2 text-sm text-[#0a1f3f] focus:outline-none focus:ring-2 focus:ring-[#e55b2b]/20 focus:border-[#e55b2b]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#4a6580] mb-1">Price/Gallon</label>
                    <input name="price_per_gallon" type="number" step="0.001" required placeholder="e.g. 3.459" className="w-full border border-[#c8d8ea] rounded-xl px-3 py-2 text-sm text-[#0a1f3f] focus:outline-none focus:ring-2 focus:ring-[#e55b2b]/20 focus:border-[#e55b2b]" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#4a6580] mb-1">Odometer (optional)</label>
                  <input name="odometer" type="number" step="0.1" placeholder="e.g. 45150" className="w-full border border-[#c8d8ea] rounded-xl px-3 py-2 text-sm text-[#0a1f3f] focus:outline-none focus:ring-2 focus:ring-[#e55b2b]/20 focus:border-[#e55b2b]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#4a6580] mb-1">Station (optional)</label>
                  <input name="station" placeholder="e.g. Shell on Main St" className="w-full border border-[#c8d8ea] rounded-xl px-3 py-2 text-sm text-[#0a1f3f] focus:outline-none focus:ring-2 focus:ring-[#e55b2b]/20 focus:border-[#e55b2b]" />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={() => setShowGasForm(false)} className="px-4 py-2 text-sm text-[#4a6580] border border-[#c8d8ea] rounded-xl hover:bg-[#e8f0f8]">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-bold text-white bg-[#e55b2b] rounded-xl hover:bg-[#d14e22] disabled:opacity-50 flex items-center gap-2">
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save
                  </button>
                </div>
              </form>
            )}

            <div className="divide-y divide-[#c8d8ea]/30">
              {gasLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-[#e8f0f8] rounded animate-pulse" />
                  ))}
                </div>
              ) : gasLogs.length === 0 ? (
                <EmptyState
                  icon={<Droplets className="w-8 h-8" />}
                  title="No Gas Entries"
                  description="No gas entries this month"
                />
              ) : (
                gasLogs.map((log) => (
                  <div key={log.id} className="px-4 py-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-[#0a1f3f]">{formatDate(log.date)}</p>
                        <p className="text-xs text-[#4a6580] mt-0.5">
                          {log.gallons} gal @ {formatCurrency(log.price_per_gallon)}/gal
                        </p>
                      </div>
                      <span className="text-sm font-bold text-emerald-600">{formatCurrency(log.total_cost)}</span>
                    </div>
                    {log.station && <p className="text-xs text-[#4a6580] mt-1">{log.station}</p>}
                    {log.odometer && (
                      <p className="text-xs text-[#4a6580] mt-0.5">Odometer: {log.odometer.toLocaleString()}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========== MAINTENANCE TAB ========== */}
      {activeTab === 'maintenance' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-[#c8d8ea] p-3">
              <p className="text-xs font-medium text-[#4a6580]">Total Cost</p>
              <p className="text-lg font-bold text-[#0a1f3f] mt-1">{formatCurrency(totalMaintenanceCost)}</p>
            </div>
            <div className="bg-white rounded-xl border border-[#c8d8ea] p-3">
              <p className="text-xs font-medium text-[#4a6580]">Records</p>
              <p className="text-lg font-bold text-[#0a1f3f] mt-1">{maintenanceLogs.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-[#c8d8ea] p-3">
              <p className="text-xs font-medium text-[#4a6580]">Upcoming</p>
              <p className={`text-lg font-bold mt-1 ${upcomingCount > 0 ? 'text-[#e55b2b]' : 'text-[#0a1f3f]'}`}>
                {upcomingCount}
              </p>
            </div>
          </div>

          {upcomingMaintenance.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl">
              <div className="px-4 py-3 border-b border-amber-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-amber-700">Upcoming Maintenance</h3>
              </div>
              <div className="divide-y divide-amber-100">
                {upcomingMaintenance.slice(0, 5).map((log) => {
                  const isDueSoon = log.next_due_date && new Date(log.next_due_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                  const isOverdue = log.next_due_date && new Date(log.next_due_date) < new Date();
                  return (
                    <div key={log.id} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-[#0a1f3f]">{log.type}</p>
                          {isOverdue ? (
                            <Badge variant="danger" size="sm">Overdue</Badge>
                          ) : isDueSoon ? (
                            <Badge variant="warning" size="sm">Due Soon</Badge>
                          ) : null}
                        </div>
                        <p className="text-xs text-[#4a6580]">
                          {log.description && `${log.description} - `}
                          Due: {log.next_due_date ? formatDate(log.next_due_date) : `${log.next_due_miles?.toLocaleString()} miles`}
                        </p>
                      </div>
                      <Calendar className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-[#c8d8ea]">
            <div className="px-4 py-3 border-b border-[#c8d8ea]/50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#0a1f3f]">Maintenance History</h3>
              <button
                onClick={() => setShowMaintenanceForm(!showMaintenanceForm)}
                className="flex items-center gap-1 text-xs font-medium text-[#e55b2b]"
              >
                {showMaintenanceForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showMaintenanceForm ? 'Close' : 'Add Entry'}
              </button>
            </div>

            {showMaintenanceForm && (
              <form onSubmit={handleMaintenanceSubmit} className="p-4 border-b border-[#c8d8ea]/50 bg-[#e8f0f8]/50 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[#4a6580] mb-1">Date</label>
                  <input name="date" type="date" required defaultValue={todayISO()} className="w-full border border-[#c8d8ea] rounded-xl px-3 py-2 text-sm text-[#0a1f3f] focus:outline-none focus:ring-2 focus:ring-[#e55b2b]/20 focus:border-[#e55b2b]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#4a6580] mb-1">Type</label>
                  <select name="type" required className="w-full border border-[#c8d8ea] rounded-xl px-3 py-2 text-sm text-[#0a1f3f] bg-white focus:outline-none focus:ring-2 focus:ring-[#e55b2b]/20 focus:border-[#e55b2b]">
                    <option value="">Select type...</option>
                    {MAINTENANCE_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#4a6580] mb-1">Description (optional)</label>
                  <input name="description" placeholder="Details about the service" className="w-full border border-[#c8d8ea] rounded-xl px-3 py-2 text-sm text-[#0a1f3f] focus:outline-none focus:ring-2 focus:ring-[#e55b2b]/20 focus:border-[#e55b2b]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#4a6580] mb-1">Cost (optional)</label>
                    <input name="cost" type="number" step="0.01" placeholder="e.g. 75.00" className="w-full border border-[#c8d8ea] rounded-xl px-3 py-2 text-sm text-[#0a1f3f] focus:outline-none focus:ring-2 focus:ring-[#e55b2b]/20 focus:border-[#e55b2b]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#4a6580] mb-1">Vendor (optional)</label>
                    <input name="vendor" placeholder="e.g. Jiffy Lube" className="w-full border border-[#c8d8ea] rounded-xl px-3 py-2 text-sm text-[#0a1f3f] focus:outline-none focus:ring-2 focus:ring-[#e55b2b]/20 focus:border-[#e55b2b]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#4a6580] mb-1">Next Due Date</label>
                    <input name="next_due_date" type="date" className="w-full border border-[#c8d8ea] rounded-xl px-3 py-2 text-sm text-[#0a1f3f] focus:outline-none focus:ring-2 focus:ring-[#e55b2b]/20 focus:border-[#e55b2b]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#4a6580] mb-1">Next Due Miles</label>
                    <input name="next_due_miles" type="number" step="0.1" placeholder="e.g. 50000" className="w-full border border-[#c8d8ea] rounded-xl px-3 py-2 text-sm text-[#0a1f3f] focus:outline-none focus:ring-2 focus:ring-[#e55b2b]/20 focus:border-[#e55b2b]" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={() => setShowMaintenanceForm(false)} className="px-4 py-2 text-sm text-[#4a6580] border border-[#c8d8ea] rounded-xl hover:bg-[#e8f0f8]">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-bold text-white bg-[#e55b2b] rounded-xl hover:bg-[#d14e22] disabled:opacity-50 flex items-center gap-2">
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save
                  </button>
                </div>
              </form>
            )}

            <div className="divide-y divide-[#c8d8ea]/30">
              {maintenanceLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-[#e8f0f8] rounded animate-pulse" />
                  ))}
                </div>
              ) : maintenanceLogs.length === 0 ? (
                <EmptyState
                  icon={<Wrench className="w-8 h-8" />}
                  title="No Maintenance Records"
                  description="No maintenance records yet"
                />
              ) : (
                maintenanceLogs.map((log) => (
                  <div key={log.id} className="px-4 py-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-[#0a1f3f]">{formatDate(log.date)}</p>
                        <Badge variant="info" size="sm" className="mt-1">{log.type}</Badge>
                      </div>
                      {log.cost != null && (
                        <span className="text-sm font-bold text-red-600">{formatCurrency(log.cost)}</span>
                      )}
                    </div>
                    {log.description && (
                      <p className="text-xs text-[#4a6580] mt-1">{log.description}</p>
                    )}
                    {log.vendor && (
                      <p className="text-xs text-[#4a6580] mt-0.5">{log.vendor}</p>
                    )}
                    {(log.next_due_date || log.next_due_miles) && (
                      <p className="text-xs text-[#e55b2b] mt-1">
                        Next due: {log.next_due_date ? formatDate(log.next_due_date) : `${log.next_due_miles?.toLocaleString()} mi`}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
