'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Wind, RefreshCw, Trash2, Gauge } from 'lucide-react';
import type { InstallDuctSegment, InstallRoom } from '@/lib/installs/types';

interface DuctLayoutTabProps {
  projectId: string;
  rooms: InstallRoom[];
}

const SEGMENT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  supply_trunk: { label: 'Supply Trunk', color: 'bg-blue-100 text-blue-700' },
  supply_branch: { label: 'Supply Branch', color: 'bg-cyan-100 text-cyan-700' },
  return_trunk: { label: 'Return Trunk', color: 'bg-orange-100 text-orange-700' },
  return_drop: { label: 'Return Drop', color: 'bg-red-100 text-red-700' },
};

export function DuctLayoutTab({ projectId, rooms }: DuctLayoutTabProps) {
  const [segments, setSegments] = useState<InstallDuctSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staticPressure, setStaticPressure] = useState<number | null>(null);

  const roomMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rooms) m.set(r.id, r.name);
    return m;
  }, [rooms]);

  const fetchSegments = useCallback(async () => {
    try {
      const res = await fetch(`/api/installs/ducts?project_id=${projectId}`);
      if (res.ok) setSegments(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchSegments(); }, [fetchSegments]);

  const autoGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/installs/ducts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, action: 'auto_generate' }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Generation failed');
      }
      const data = await res.json();
      setSegments(data.segments || []);
      setStaticPressure(data.staticPressure ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }, [projectId]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/installs/ducts?id=${id}`, { method: 'DELETE' });
      if (res.ok) setSegments(segments.filter(s => s.id !== id));
    } catch { /* silent */ }
  };

  // Summary stats
  const supplyBranches = segments.filter(s => s.segment_type === 'supply_branch');
  const returnDrops = segments.filter(s => s.segment_type === 'return_drop');
  const totalCfm = supplyBranches.reduce((s, seg) => s + (seg.cfm || 0), 0);
  const totalDuctFt = segments.reduce((s, seg) => s + (seg.length_ft || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-[var(--navy)]">Duct Layout</h3>
          <p className="text-sm text-[var(--steel)]">
            Auto-sized duct segments using equal friction method
          </p>
        </div>
        <button
          type="button"
          onClick={autoGenerate}
          disabled={generating || rooms.length === 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[var(--accent)] rounded-full hover:bg-[var(--accent-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wind className="w-4 h-4" />}
          {generating ? 'Generating...' : segments.length > 0 ? 'Regenerate' : 'Auto-Generate'}
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
      )}

      {/* Summary cards */}
      {segments.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Supply Branches" value={String(supplyBranches.length)} />
          <StatCard label="Return Drops" value={String(returnDrops.length)} />
          <StatCard label="Total CFM" value={totalCfm.toLocaleString()} />
          <StatCard
            label="Est. Static Pressure"
            value={staticPressure !== null ? `${staticPressure} in.w.c.` : `~${(totalDuctFt * 0.0012).toFixed(2)} in.w.c.`}
            icon={<Gauge className="w-4 h-4 text-purple-500" />}
          />
        </div>
      )}

      {/* Empty state */}
      {!loading && segments.length === 0 && !generating && (
        <div className="flex flex-col items-center justify-center py-16 px-6 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
          <Wind className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-sm font-semibold text-[var(--navy)] mb-1">No duct segments</p>
          <p className="text-sm text-[var(--steel)] text-center max-w-sm">
            Click &quot;Auto-Generate&quot; to create a duct layout from room CFM data.
            Make sure you&apos;ve calculated loads first.
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-[var(--accent)] rounded-full animate-spin" />
        </div>
      )}

      {/* Duct table */}
      {segments.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="px-4 py-2.5 text-left font-medium text-[var(--steel)]">Type</th>
                  <th className="px-4 py-2.5 text-left font-medium text-[var(--steel)]">Room</th>
                  <th className="px-4 py-2.5 text-right font-medium text-[var(--steel)]">Size</th>
                  <th className="px-4 py-2.5 text-right font-medium text-[var(--steel)]">Length</th>
                  <th className="px-4 py-2.5 text-right font-medium text-[var(--steel)]">CFM</th>
                  <th className="px-4 py-2.5 text-right font-medium text-[var(--steel)]">Velocity</th>
                  <th className="px-4 py-2.5 text-left font-medium text-[var(--steel)]">Material</th>
                  <th className="px-4 py-2.5 text-left font-medium text-[var(--steel)]">Register</th>
                  <th className="px-4 py-2.5 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {segments.map((seg) => {
                  const typeInfo = SEGMENT_TYPE_LABELS[seg.segment_type] || { label: seg.segment_type, color: 'bg-gray-100 text-gray-700' };
                  return (
                    <tr key={seg.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[var(--navy)]">
                        {seg.room_id ? roomMap.get(seg.room_id) || '—' : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium">
                        {seg.diameter_in ? `${seg.diameter_in}"∅` : seg.width_in && seg.height_in ? `${seg.width_in}x${seg.height_in}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right">{seg.length_ft ? `${seg.length_ft} ft` : '—'}</td>
                      <td className="px-4 py-2.5 text-right font-medium">{seg.cfm || '—'}</td>
                      <td className="px-4 py-2.5 text-right text-[var(--steel)]">
                        {seg.velocity_fpm ? `${seg.velocity_fpm} fpm` : '—'}
                      </td>
                      <td className="px-4 py-2.5 capitalize text-[var(--steel)]">{seg.material || '—'}</td>
                      <td className="px-4 py-2.5 text-[var(--steel)]">{seg.register_size || '—'}</td>
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          onClick={() => handleDelete(seg.id)}
                          className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-4 py-2.5" colSpan={3}>Totals</td>
                  <td className="px-4 py-2.5 text-right">{totalDuctFt} ft</td>
                  <td className="px-4 py-2.5 text-right">{totalCfm}</td>
                  <td colSpan={4}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-1">
        {icon || <Wind className="w-4 h-4 text-cyan-500" />}
        <span className="text-xs font-medium text-[var(--steel)]">{label}</span>
      </div>
      <p className="text-lg font-bold text-[var(--navy)]">{value}</p>
    </div>
  );
}
