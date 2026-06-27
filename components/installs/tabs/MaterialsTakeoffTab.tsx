'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Package, RefreshCw, Trash2, Edit3, Check, X } from 'lucide-react';
import type { InstallMaterial, MaterialCategory } from '@/lib/installs/types';

interface MaterialsTakeoffTabProps {
  projectId: string;
}

const CATEGORY_LABELS: Record<MaterialCategory, { label: string; color: string }> = {
  equipment: { label: 'Equipment', color: 'bg-purple-100 text-purple-700' },
  ductwork: { label: 'Ductwork', color: 'bg-blue-100 text-blue-700' },
  electrical: { label: 'Electrical', color: 'bg-yellow-100 text-yellow-700' },
  refrigerant: { label: 'Refrigerant', color: 'bg-cyan-100 text-cyan-700' },
  fittings: { label: 'Fittings', color: 'bg-indigo-100 text-indigo-700' },
  supports: { label: 'Supports', color: 'bg-gray-100 text-gray-700' },
  insulation: { label: 'Insulation', color: 'bg-pink-100 text-pink-700' },
  misc: { label: 'Misc', color: 'bg-emerald-100 text-emerald-700' },
  disposal: { label: 'Disposal', color: 'bg-red-100 text-red-700' },
};

const CATEGORY_ORDER: MaterialCategory[] = [
  'equipment', 'ductwork', 'fittings', 'electrical', 'refrigerant',
  'supports', 'insulation', 'misc', 'disposal',
];

export function MaterialsTakeoffTab({ projectId }: MaterialsTakeoffTabProps) {
  const [materials, setMaterials] = useState<InstallMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState(0);
  const [editCost, setEditCost] = useState(0);

  const fetchMaterials = useCallback(async () => {
    try {
      const res = await fetch(`/api/installs/materials?project_id=${projectId}`);
      if (res.ok) setMaterials(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchMaterials(); }, [fetchMaterials]);

  const autoGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/installs/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, action: 'auto_generate' }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Generation failed');
      }
      const data = await res.json();
      setMaterials(data.materials || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }, [projectId]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/installs/materials?id=${id}`, { method: 'DELETE' });
      if (res.ok) setMaterials(materials.filter(m => m.id !== id));
    } catch { /* silent */ }
  };

  const startEdit = (m: InstallMaterial) => {
    setEditingId(m.id);
    setEditQty(m.quantity);
    setEditCost(m.unit_cost);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: string) => {
    try {
      const res = await fetch('/api/installs/materials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, quantity: editQty, unit_cost: editCost }),
      });
      if (res.ok) {
        const updated = await res.json();
        setMaterials(materials.map(m => m.id === id ? updated : m));
      }
    } catch { /* silent */ }
    setEditingId(null);
  };

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<MaterialCategory, InstallMaterial[]>();
    for (const m of materials) {
      const cat = m.category as MaterialCategory;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(m);
    }
    return map;
  }, [materials]);

  const totalCost = useMemo(
    () => materials.reduce((s, m) => s + m.total_cost, 0),
    [materials],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-[var(--navy)]">Materials Takeoff</h3>
          <p className="text-sm text-[var(--steel)]">
            Auto-generated bill of materials from duct layout and equipment
          </p>
        </div>
        <button
          type="button"
          onClick={autoGenerate}
          disabled={generating}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[var(--accent)] rounded-full hover:bg-[var(--accent-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
          {generating ? 'Generating...' : materials.length > 0 ? 'Regenerate' : 'Auto-Generate'}
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
      )}

      {/* Empty state */}
      {!loading && materials.length === 0 && !generating && (
        <div className="flex flex-col items-center justify-center py-16 px-6 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
          <Package className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-sm font-semibold text-[var(--navy)] mb-1">No materials generated</p>
          <p className="text-sm text-[var(--steel)] text-center max-w-sm">
            Click &quot;Auto-Generate&quot; to create a bill of materials from your duct layout and equipment selection.
          </p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-[var(--accent)] rounded-full animate-spin" />
        </div>
      )}

      {/* Materials by category */}
      {materials.length > 0 && (
        <>
          {CATEGORY_ORDER.map(cat => {
            const items = grouped.get(cat);
            if (!items || items.length === 0) return null;
            const catInfo = CATEGORY_LABELS[cat];
            const catTotal = items.reduce((s, m) => s + m.total_cost, 0);

            return (
              <div key={cat} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${catInfo.color}`}>
                      {catInfo.label}
                    </span>
                    <span className="text-xs text-[var(--steel)]">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                  </div>
                  <span className="text-sm font-semibold text-[var(--navy)]">
                    ${catTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {items.map(m => (
                      <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/30">
                        <td className="px-5 py-2.5 text-[var(--navy)] font-medium">{m.name}</td>
                        <td className="px-3 py-2.5 text-right w-24">
                          {editingId === m.id ? (
                            <input
                              type="number"
                              value={editQty}
                              onChange={e => setEditQty(Number(e.target.value))}
                              className="w-20 px-2 py-1 border rounded text-right text-sm"
                              autoFocus
                            />
                          ) : (
                            <span className="text-[var(--steel)]">{m.quantity} {m.unit}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right w-24">
                          {editingId === m.id ? (
                            <input
                              type="number"
                              value={editCost}
                              onChange={e => setEditCost(Number(e.target.value))}
                              step="0.01"
                              className="w-20 px-2 py-1 border rounded text-right text-sm"
                            />
                          ) : (
                            <span className="text-[var(--steel)]">${m.unit_cost.toFixed(2)}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right w-24 font-medium text-[var(--navy)]">
                          ${(editingId === m.id ? editQty * editCost : m.total_cost).toFixed(2)}
                        </td>
                        <td className="px-3 py-2.5 w-20 text-right">
                          {editingId === m.id ? (
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => saveEdit(m.id)}
                                className="p-1 rounded hover:bg-emerald-50 text-emerald-500"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="p-1 rounded hover:bg-gray-100 text-gray-400"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => startEdit(m)}
                                className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-500"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(m.id)}
                                className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}

          {/* Grand total */}
          <div className="bg-[var(--navy)] rounded-xl p-5 flex items-center justify-between text-white">
            <span className="text-sm font-medium">Total Materials Cost</span>
            <span className="text-2xl font-bold">
              ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
