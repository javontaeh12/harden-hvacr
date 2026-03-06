'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase';
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

type Tab = 'stock' | 'mileage' | 'gas' | 'maintenance';

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
  const vanId = profile?.van_id;

  const [activeTab, setActiveTab] = useState<Tab>('stock');
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

  const tabs = [
    { id: 'stock' as Tab, label: 'Stock', icon: Package },
    { id: 'mileage' as Tab, label: 'Mileage', icon: Gauge },
    { id: 'gas' as Tab, label: 'Gas', icon: Droplets },
    { id: 'maintenance' as Tab, label: 'Maint.', icon: Wrench },
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
        <div className="text-center py-16">
          <Truck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">No Van Assigned</h1>
          <p className="text-gray-500 text-sm">
            You don&apos;t have a van assigned to your account yet. Contact your admin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4 pb-24 px-4 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Truck className="w-6 h-6 text-orange-500" />
          My Van
        </h1>
        {vanLoading ? (
          <div className="flex items-center gap-2 mt-1">
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            <span className="text-gray-500 text-xs">Loading van info...</span>
          </div>
        ) : van ? (
          <p className="text-gray-600 text-xs mt-1">
            Van #{van.van_number} {van.name ? `- ${van.name}` : ''}
            {van.license_plate ? ` | ${van.license_plate}` : ''}
          </p>
        ) : null}
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <p className="text-red-700 text-sm">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-sm ml-2">
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors flex-1 whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-600'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ========== STOCK TAB ========== */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          {lowStockItems.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
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
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-500">Total Items</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{inventory.length}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-500">Low Stock</p>
              <p className={`text-2xl font-bold mt-1 ${lowStockItems.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {lowStockItems.length}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Van Inventory</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {inventoryLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : inventory.length === 0 ? (
                <div className="p-8 text-center">
                  <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No inventory items found</p>
                </div>
              ) : (
                inventory.map((item) => {
                  const isLow = item.quantity < item.min_quantity;
                  return (
                    <div key={item.id} className="px-4 py-3 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                          {item.name}
                        </p>
                        <p className="text-[11px] text-gray-500">Min: {item.min_quantity}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <span
                          className={`text-sm font-bold px-2.5 py-1 rounded-lg ${
                            isLow ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {item.quantity}
                        </span>
                        {isLow && <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />}
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
            <label className="text-sm text-gray-600">Month:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-500">Total Miles</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalMilesThisMonth.toFixed(1)}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-500">Avg Daily Miles</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{avgDailyMiles.toFixed(1)}</p>
            </div>
          </div>

          {mileageLogs.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-semibold text-gray-900">Estimated Gas Usage</h3>
                <span className="text-[10px] text-gray-400 ml-auto">~{MPG_ESTIMATE} MPG @ {formatCurrency(GAS_PRICE_ESTIMATE)}/gal</span>
              </div>
              <div className="p-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">Daily</p>
                  <p className="text-sm font-bold text-gray-900">{estDailyGallons.toFixed(1)} gal</p>
                  <p className="text-[11px] text-orange-600">{formatCurrency(estDailyGallons * GAS_PRICE_ESTIMATE)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">Weekly</p>
                  <p className="text-sm font-bold text-gray-900">{estWeeklyGallons.toFixed(1)} gal</p>
                  <p className="text-[11px] text-orange-600">{formatCurrency(estWeeklyGallons * GAS_PRICE_ESTIMATE)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">Monthly</p>
                  <p className="text-sm font-bold text-gray-900">{estMonthlyGallons.toFixed(1)} gal</p>
                  <p className="text-[11px] text-orange-600">{formatCurrency(estMonthlyGallons * GAS_PRICE_ESTIMATE)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">Yearly</p>
                  <p className="text-sm font-bold text-gray-900">{estYearlyGallons.toFixed(1)} gal</p>
                  <p className="text-[11px] text-orange-600">{formatCurrency(estYearlyGallons * GAS_PRICE_ESTIMATE)}</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Mileage Log</h3>
              <button
                onClick={() => setShowMileageForm(!showMileageForm)}
                className="flex items-center gap-1 text-xs font-medium text-blue-600"
              >
                {showMileageForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showMileageForm ? 'Close' : 'Add Entry'}
              </button>
            </div>

            {showMileageForm && (
              <form onSubmit={handleMileageSubmit} className="p-4 border-b border-gray-100 bg-gray-50 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                  <input name="date" type="date" required defaultValue={todayISO()} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Start Miles</label>
                    <input name="start_miles" type="number" step="0.1" required placeholder="e.g. 45000" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">End Miles</label>
                    <input name="end_miles" type="number" step="0.1" required placeholder="e.g. 45150" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional)</label>
                  <input name="notes" placeholder="Route details, etc." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900" />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={() => setShowMileageForm(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg disabled:opacity-50 flex items-center gap-2">
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save
                  </button>
                </div>
              </form>
            )}

            <div className="divide-y divide-gray-50">
              {mileageLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : mileageLogs.length === 0 ? (
                <div className="p-8 text-center">
                  <Gauge className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No mileage entries this month</p>
                </div>
              ) : (
                mileageLogs.map((log) => (
                  <div key={log.id} className="px-4 py-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{formatDate(log.date)}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {log.start_miles.toLocaleString()} - {log.end_miles.toLocaleString()}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-blue-600">{log.total_miles?.toFixed(1)} mi</span>
                    </div>
                    {log.notes && <p className="text-xs text-gray-400 mt-1">{log.notes}</p>}
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
            <label className="text-sm text-gray-600">Month:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <p className="text-xs font-medium text-gray-500">Total Cost</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(totalGasCost)}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <p className="text-xs font-medium text-gray-500">Gallons</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{totalGallons.toFixed(1)}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <p className="text-xs font-medium text-gray-500">Avg $/gal</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(avgPricePerGallon)}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Gas Log</h3>
              <button
                onClick={() => setShowGasForm(!showGasForm)}
                className="flex items-center gap-1 text-xs font-medium text-blue-600"
              >
                {showGasForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showGasForm ? 'Close' : 'Add Entry'}
              </button>
            </div>

            {showGasForm && (
              <form onSubmit={handleGasSubmit} className="p-4 border-b border-gray-100 bg-gray-50 space-y-3">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-700">
                    <Calendar className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                    Date auto-set to today: <span className="font-semibold">{formatDate(todayISO())}</span>
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Gallons</label>
                    <input name="gallons" type="number" step="0.001" required placeholder="e.g. 15.5" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Price/Gallon</label>
                    <input name="price_per_gallon" type="number" step="0.001" required placeholder="e.g. 3.459" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Odometer (optional)</label>
                  <input name="odometer" type="number" step="0.1" placeholder="e.g. 45150" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Station (optional)</label>
                  <input name="station" placeholder="e.g. Shell on Main St" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900" />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={() => setShowGasForm(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg disabled:opacity-50 flex items-center gap-2">
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save
                  </button>
                </div>
              </form>
            )}

            <div className="divide-y divide-gray-50">
              {gasLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : gasLogs.length === 0 ? (
                <div className="p-8 text-center">
                  <Droplets className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No gas entries this month</p>
                </div>
              ) : (
                gasLogs.map((log) => (
                  <div key={log.id} className="px-4 py-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{formatDate(log.date)}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {log.gallons} gal @ {formatCurrency(log.price_per_gallon)}/gal
                        </p>
                      </div>
                      <span className="text-sm font-bold text-green-600">{formatCurrency(log.total_cost)}</span>
                    </div>
                    {log.station && <p className="text-xs text-gray-400 mt-1">{log.station}</p>}
                    {log.odometer && (
                      <p className="text-xs text-gray-400 mt-0.5">Odometer: {log.odometer.toLocaleString()}</p>
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
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <p className="text-xs font-medium text-gray-500">Total Cost</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(totalMaintenanceCost)}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <p className="text-xs font-medium text-gray-500">Records</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{maintenanceLogs.length}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <p className="text-xs font-medium text-gray-500">Upcoming</p>
              <p className={`text-lg font-bold mt-1 ${upcomingCount > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
                {upcomingCount}
              </p>
            </div>
          </div>

          {upcomingMaintenance.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg">
              <div className="px-4 py-3 border-b border-orange-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <h3 className="text-sm font-semibold text-orange-700">Upcoming Maintenance</h3>
              </div>
              <div className="divide-y divide-orange-100">
                {upcomingMaintenance.slice(0, 5).map((log) => (
                  <div key={log.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{log.type}</p>
                      <p className="text-xs text-gray-500">
                        {log.description && `${log.description} - `}
                        Due: {log.next_due_date ? formatDate(log.next_due_date) : `${log.next_due_miles?.toLocaleString()} miles`}
                      </p>
                    </div>
                    <Calendar className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Maintenance History</h3>
              <button
                onClick={() => setShowMaintenanceForm(!showMaintenanceForm)}
                className="flex items-center gap-1 text-xs font-medium text-blue-600"
              >
                {showMaintenanceForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showMaintenanceForm ? 'Close' : 'Add Entry'}
              </button>
            </div>

            {showMaintenanceForm && (
              <form onSubmit={handleMaintenanceSubmit} className="p-4 border-b border-gray-100 bg-gray-50 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                  <input name="date" type="date" required defaultValue={todayISO()} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                  <select name="type" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white">
                    <option value="">Select type...</option>
                    {MAINTENANCE_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Description (optional)</label>
                  <input name="description" placeholder="Details about the service" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Cost (optional)</label>
                    <input name="cost" type="number" step="0.01" placeholder="e.g. 75.00" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Vendor (optional)</label>
                    <input name="vendor" placeholder="e.g. Jiffy Lube" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Next Due Date</label>
                    <input name="next_due_date" type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Next Due Miles</label>
                    <input name="next_due_miles" type="number" step="0.1" placeholder="e.g. 50000" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={() => setShowMaintenanceForm(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg disabled:opacity-50 flex items-center gap-2">
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save
                  </button>
                </div>
              </form>
            )}

            <div className="divide-y divide-gray-50">
              {maintenanceLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : maintenanceLogs.length === 0 ? (
                <div className="p-8 text-center">
                  <Wrench className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No maintenance records</p>
                </div>
              ) : (
                maintenanceLogs.map((log) => (
                  <div key={log.id} className="px-4 py-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{formatDate(log.date)}</p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700 mt-1">
                          {log.type}
                        </span>
                      </div>
                      {log.cost != null && (
                        <span className="text-sm font-bold text-red-600">{formatCurrency(log.cost)}</span>
                      )}
                    </div>
                    {log.description && (
                      <p className="text-xs text-gray-500 mt-1">{log.description}</p>
                    )}
                    {log.vendor && (
                      <p className="text-xs text-gray-400 mt-0.5">{log.vendor}</p>
                    )}
                    {(log.next_due_date || log.next_due_miles) && (
                      <p className="text-xs text-orange-600 mt-1">
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
