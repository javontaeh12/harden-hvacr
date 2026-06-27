'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, Button, Input, Modal } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import {
  ClipboardCheck,
  Plus,
  Search,
  Star,
  AlertTriangle,
  Thermometer,
  Wind,
  Gauge,
  Eye,
} from 'lucide-react';

interface SystemReport {
  id: string;
  work_order_id: string | null;
  customer_id: string | null;
  equipment_id: string | null;
  ratings: Record<string, number>;
  recommendations: Array<{ item: string; priority: string; estimated_cost: number }>;
  photos: Array<{ url: string; caption: string }>;
  notes: string | null;
  created_by: string | null;
  group_id: string;
  created_at: string;
  customers?: { full_name: string } | null;
  customer_equipment?: { equipment_type: string; make: string | null; model: string | null } | null;
}

interface CustomerOption { id: string; full_name: string; }
interface EquipmentOption { id: string; equipment_type: string; make: string | null; model: string | null; customer_id: string; }
interface WorkOrderOption { id: string; description: string | null; customer_id: string | null; }

const RATING_COMPONENTS = [
  { key: 'condenser', label: 'Condenser', icon: Wind },
  { key: 'air_handler', label: 'Air Handler', icon: Wind },
  { key: 'ductwork', label: 'Ductwork', icon: Gauge },
  { key: 'thermostat', label: 'Thermostat', icon: Thermometer },
  { key: 'refrigerant', label: 'Refrigerant Levels', icon: Gauge },
  { key: 'electrical', label: 'Electrical', icon: Gauge },
];

const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'critical'];

export default function ReportsPage() {
  const { groupId, profile, isLoading: authLoading } = useAuth();
  const [reports, setReports] = useState<SystemReport[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [equipment, setEquipment] = useState<EquipmentOption[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<SystemReport | null>(null);

  // Builder state
  const [builderCustomer, setBuilderCustomer] = useState('');
  const [builderEquipment, setBuilderEquipment] = useState('');
  const [builderWorkOrder, setBuilderWorkOrder] = useState('');
  const [builderRatings, setBuilderRatings] = useState<Record<string, number>>({});
  const [builderRecs, setBuilderRecs] = useState<Array<{ item: string; priority: string; estimated_cost: number }>>([]);
  const [builderNotes, setBuilderNotes] = useState('');
  const [newRec, setNewRec] = useState({ item: '', priority: 'medium', estimated_cost: 0 });

  useEffect(() => {
    if (!authLoading && groupId) fetchData();
  }, [authLoading, groupId]);

  const fetchData = async () => {
    const supabase = createClient();
    const [reportsRes, customersRes, equipmentRes, woRes] = await Promise.all([
      supabase.from('system_reports').select('*, customers(full_name), customer_equipment(equipment_type, make, model)').eq('group_id', groupId!).order('created_at', { ascending: false }),
      supabase.from('customers').select('id, full_name').eq('group_id', groupId!).order('full_name'),
      supabase.from('customer_equipment').select('id, equipment_type, make, model, customer_id').eq('group_id', groupId!),
      supabase.from('work_orders').select('id, description, customer_id').eq('group_id', groupId!).neq('status', 'cancelled'),
    ]);
    setReports(reportsRes.data || []);
    setCustomers(customersRes.data || []);
    setEquipment(equipmentRes.data || []);
    setWorkOrders(woRes.data || []);
    setIsLoading(false);
  };

  const openBuilder = () => {
    setBuilderCustomer('');
    setBuilderEquipment('');
    setBuilderWorkOrder('');
    setBuilderRatings({});
    setBuilderRecs([]);
    setBuilderNotes('');
    setIsBuilderOpen(true);
  };

  const setRating = (key: string, value: number) => {
    setBuilderRatings({ ...builderRatings, [key]: value });
  };

  const addRecommendation = () => {
    if (!newRec.item.trim()) return;
    setBuilderRecs([...builderRecs, { ...newRec }]);
    setNewRec({ item: '', priority: 'medium', estimated_cost: 0 });
  };

  const removeRec = (index: number) => {
    setBuilderRecs(builderRecs.filter((_, i) => i !== index));
  };

  const saveReport = async () => {
    if (!groupId) return;
    const supabase = createClient();
    const { data, error } = await supabase.from('system_reports').insert({
      customer_id: builderCustomer || null,
      equipment_id: builderEquipment || null,
      work_order_id: builderWorkOrder || null,
      ratings: builderRatings,
      recommendations: builderRecs,
      photos: [],
      notes: builderNotes || null,
      created_by: profile?.id,
      group_id: groupId,
    } as Record<string, unknown>).select('*, customers(full_name), customer_equipment(equipment_type, make, model)').single();
    if (!error && data) {
      setReports([data, ...reports]);
      setIsBuilderOpen(false);
    }
  };

  const filteredEquipment = builderCustomer ? equipment.filter((e) => e.customer_id === builderCustomer) : equipment;
  const filteredWOs = builderCustomer ? workOrders.filter((w) => w.customer_id === builderCustomer) : workOrders;

  const filtered = reports.filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return r.customers?.full_name?.toLowerCase().includes(s) || r.customer_equipment?.equipment_type?.toLowerCase().includes(s);
  });

  // Health overview stats
  const avgRating = reports.length > 0
    ? reports.reduce((sum, r) => {
        const vals = Object.values(r.ratings || {});
        return sum + (vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0);
      }, 0) / reports.length
    : 0;

  const criticalCount = reports.reduce((count, r) => count + (r.recommendations || []).filter((rec) => rec.priority === 'critical' || rec.priority === 'high').length, 0);

  if (isLoading || authLoading) {
    return <div className="animate-pulse space-y-4"><div className="h-8 bg-gray-200 rounded w-48" /><div className="h-64 bg-gray-200 rounded-xl" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Health Reports</h1>
          <p className="text-gray-600 mt-1">Generate and track HVAC system assessments</p>
        </div>
        <Button onClick={openBuilder}>
          <Plus className="w-4 h-4 mr-2" /> New Report
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs font-medium text-gray-500">Total Reports</p><p className="text-2xl font-bold">{reports.length}</p></div>
              <div className="bg-blue-500 p-2 rounded-lg"><ClipboardCheck className="w-5 h-5 text-white" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs font-medium text-gray-500">Avg Health Score</p><p className="text-2xl font-bold">{avgRating.toFixed(1)}/10</p></div>
              <div className="bg-green-500 p-2 rounded-lg"><Star className="w-5 h-5 text-white" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs font-medium text-gray-500">Critical Issues</p><p className="text-2xl font-bold">{criticalCount}</p></div>
              <div className="bg-red-500 p-2 rounded-lg"><AlertTriangle className="w-5 h-5 text-white" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Search reports..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {/* Reports List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <ClipboardCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No reports yet</h3>
              <p className="text-gray-600">Generate your first system health report</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((report) => {
            const ratings = Object.values(report.ratings || {});
            const avgScore = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
            const recCount = (report.recommendations || []).length;

            return (
              <Card key={report.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedReport(report)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{report.customers?.full_name || 'Unknown Customer'}</span>
                        {report.customer_equipment && (
                          <span className="text-sm text-gray-500">&middot; {report.customer_equipment.equipment_type} {report.customer_equipment.make || ''}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{formatDate(report.created_at)} &middot; {recCount} recommendations</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1 rounded-full text-sm font-bold ${avgScore >= 7 ? 'bg-green-100 text-green-700' : avgScore >= 4 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                        {avgScore.toFixed(1)}/10
                      </div>
                      <Eye className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Report Builder Modal */}
      <Modal isOpen={isBuilderOpen} onClose={() => setIsBuilderOpen(false)} title="New System Health Report" className="max-w-3xl">
        <div className="space-y-6">
          {/* Customer & Equipment Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
              <select value={builderCustomer} onChange={(e) => setBuilderCustomer(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Select customer...</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Equipment</label>
              <select value={builderEquipment} onChange={(e) => setBuilderEquipment(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Select equipment...</option>
                {filteredEquipment.map((e) => <option key={e.id} value={e.id}>{e.equipment_type} {e.make || ''} {e.model || ''}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work Order</label>
              <select value={builderWorkOrder} onChange={(e) => setBuilderWorkOrder(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Link work order...</option>
                {filteredWOs.map((w) => <option key={w.id} value={w.id}>{w.description || w.id.slice(0, 8)}</option>)}
              </select>
            </div>
          </div>

          {/* Component Ratings */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Component Ratings (1-10)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {RATING_COMPONENTS.map(({ key, label, icon: Icon }) => (
                <div key={key} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Icon className="w-5 h-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 flex-1">{label}</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
                      <button
                        key={v}
                        onClick={() => setRating(key, v)}
                        className={`w-6 h-6 rounded text-xs font-bold ${
                          (builderRatings[key] || 0) >= v
                            ? v >= 7 ? 'bg-green-500 text-white' : v >= 4 ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'
                            : 'bg-gray-200 text-gray-400'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Recommendations</h4>
            {builderRecs.map((rec, i) => (
              <div key={i} className="flex items-center gap-2 mb-2 p-2 bg-gray-50 rounded">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  rec.priority === 'critical' ? 'bg-red-100 text-red-700' :
                  rec.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                  rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>{rec.priority}</span>
                <span className="text-sm flex-1">{rec.item}</span>
                <span className="text-sm text-gray-500">${rec.estimated_cost}</span>
                <button onClick={() => removeRec(i)} className="text-red-500 text-xs">Remove</button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input placeholder="Recommendation..." value={newRec.item} onChange={(e) => setNewRec({ ...newRec, item: e.target.value })} className="flex-1" />
              <select value={newRec.priority} onChange={(e) => setNewRec({ ...newRec, priority: e.target.value })} className="border rounded-lg px-2 py-2 text-sm w-24">
                {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <Input type="number" placeholder="Cost" value={newRec.estimated_cost} onChange={(e) => setNewRec({ ...newRec, estimated_cost: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })} className="w-24" />
              <Button variant="outline" onClick={addRecommendation} disabled={!newRec.item.trim()}>Add</Button>
            </div>
          </div>

          {/* Notes */}
          <textarea value={builderNotes} onChange={(e) => setBuilderNotes(e.target.value)} placeholder="Additional notes..." rows={3} className="w-full border rounded-lg px-3 py-2 text-sm" />

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsBuilderOpen(false)}>Cancel</Button>
            <Button onClick={saveReport}>Save Report</Button>
          </div>
        </div>
      </Modal>

      {/* Report Detail Modal */}
      <Modal isOpen={!!selectedReport} onClose={() => setSelectedReport(null)} title="System Health Report" className="max-w-2xl">
        {selectedReport && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-sm text-gray-500">Customer</p><p className="font-medium">{selectedReport.customers?.full_name || '-'}</p></div>
              <div><p className="text-sm text-gray-500">Equipment</p><p className="font-medium">{selectedReport.customer_equipment ? `${selectedReport.customer_equipment.equipment_type} ${selectedReport.customer_equipment.make || ''}` : '-'}</p></div>
              <div><p className="text-sm text-gray-500">Date</p><p className="font-medium">{formatDate(selectedReport.created_at)}</p></div>
            </div>

            {/* Ratings */}
            {Object.keys(selectedReport.ratings || {}).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3">Component Ratings</h4>
                <div className="grid grid-cols-2 gap-2">
                  {RATING_COMPONENTS.map(({ key, label }) => {
                    const val = selectedReport.ratings[key];
                    if (!val) return null;
                    return (
                      <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">{label}</span>
                        <span className={`px-2 py-0.5 rounded text-sm font-bold ${val >= 7 ? 'bg-green-100 text-green-700' : val >= 4 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{val}/10</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {selectedReport.recommendations?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3">Recommendations</h4>
                <div className="space-y-2">
                  {selectedReport.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        rec.priority === 'critical' ? 'bg-red-100 text-red-700' :
                        rec.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                        rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>{rec.priority}</span>
                      <span className="text-sm flex-1">{rec.item}</span>
                      <span className="text-sm font-medium">${rec.estimated_cost}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedReport.notes && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Notes</p>
                <p className="text-sm">{selectedReport.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
