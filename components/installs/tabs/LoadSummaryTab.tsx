'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calculator, RefreshCw, Thermometer, Wind, Snowflake, Flame } from 'lucide-react';
import type { InstallLoad, InstallRoom } from '@/lib/installs/types';

interface LoadSummaryTabProps {
  projectId: string;
  rooms: InstallRoom[];
  onRoomsChange: (rooms: InstallRoom[]) => void;
}

interface LoadResults {
  loads: InstallLoad[];
  totals: {
    totalSensibleCooling: number;
    totalLatentCooling: number;
    totalCooling: number;
    totalHeating: number;
    coolingCFM: number;
    heatingCFM: number;
    tonnageRequired: number;
  };
  recommendedTonnage: number;
  roomAirflow: Record<string, { coolingCfm: number; heatingCfm: number }>;
}

function formatBTU(btu: number): string {
  if (Math.abs(btu) >= 1000) {
    return `${(btu / 1000).toFixed(1)}k`;
  }
  return btu.toLocaleString();
}

export function LoadSummaryTab({ projectId, rooms, onRoomsChange }: LoadSummaryTabProps) {
  const [results, setResults] = useState<LoadResults | null>(null);
  const [existingLoads, setExistingLoads] = useState<InstallLoad[]>([]);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing loads on mount
  useEffect(() => {
    async function fetchLoads() {
      try {
        const res = await fetch(`/api/installs/loads?project_id=${projectId}`);
        if (res.ok) {
          const data = await res.json();
          setExistingLoads(data);
        }
      } catch {
        // Silently handle — user can recalculate
      }
    }
    fetchLoads();
  }, [projectId]);

  const runCalculation = useCallback(async () => {
    setCalculating(true);
    setError(null);
    try {
      const res = await fetch('/api/installs/loads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Calculation failed');
      }

      const data: LoadResults = await res.json();
      setResults(data);
      setExistingLoads(data.loads);

      // Update rooms with new CFM values
      if (data.roomAirflow) {
        const updatedRooms = rooms.map(r => {
          const af = data.roomAirflow[r.id];
          if (af) {
            return { ...r, cooling_cfm: af.coolingCfm, heating_cfm: af.heatingCfm };
          }
          return r;
        });
        onRoomsChange(updatedRooms);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed');
    } finally {
      setCalculating(false);
    }
  }, [projectId, rooms, onRoomsChange]);

  const totalLoad = existingLoads.find(l => l.load_type === 'total');
  const roomLoads = existingLoads.filter(l => l.load_type === 'room');
  const hasResults = results !== null || totalLoad !== null;

  // Use results if fresh, otherwise fall back to stored data
  const displayTotals = results?.totals ?? (totalLoad ? {
    totalSensibleCooling: totalLoad.total_sensible_cooling,
    totalLatentCooling: totalLoad.total_latent_cooling,
    totalCooling: totalLoad.total_cooling,
    totalHeating: totalLoad.total_heating,
    coolingCFM: totalLoad.cooling_cfm,
    heatingCFM: totalLoad.heating_cfm,
    tonnageRequired: totalLoad.tonnage_required,
  } : null);

  const displayTonnage = results?.recommendedTonnage ??
    (displayTotals ? Math.ceil(displayTotals.tonnageRequired * 2) / 2 : null);

  return (
    <div className="space-y-6">
      {/* Header with Calculate button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-[var(--navy)]">Load Calculation</h3>
          <p className="text-sm text-[var(--steel)]">
            Manual J-style heating and cooling load analysis
          </p>
        </div>
        <button
          type="button"
          onClick={runCalculation}
          disabled={calculating || rooms.length === 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[var(--accent)] rounded-full hover:bg-[var(--accent-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {calculating ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Calculator className="w-4 h-4" />
          )}
          {calculating ? 'Calculating...' : hasResults ? 'Recalculate' : 'Calculate Loads'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!hasResults && !calculating && rooms.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-6 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
          <Thermometer className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-sm font-semibold text-[var(--navy)] mb-1">Add rooms first</p>
          <p className="text-sm text-[var(--steel)] text-center max-w-sm">
            Go to the Building Model tab to add rooms, then return here to calculate loads.
          </p>
        </div>
      )}

      {!hasResults && !calculating && rooms.length > 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-6 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
          <Calculator className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-sm font-semibold text-[var(--navy)] mb-1">Ready to calculate</p>
          <p className="text-sm text-[var(--steel)] text-center max-w-sm">
            {rooms.length} room{rooms.length !== 1 ? 's' : ''} loaded. Click &quot;Calculate Loads&quot; to run the analysis.
          </p>
        </div>
      )}

      {/* Results */}
      {displayTotals && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              icon={<Snowflake className="w-5 h-5 text-blue-500" />}
              label="Total Cooling"
              value={`${formatBTU(displayTotals.totalCooling)} BTU/hr`}
              sublabel={`${displayTotals.tonnageRequired.toFixed(1)} tons calculated`}
              bg="bg-blue-50"
            />
            <SummaryCard
              icon={<Flame className="w-5 h-5 text-orange-500" />}
              label="Total Heating"
              value={`${formatBTU(displayTotals.totalHeating)} BTU/hr`}
              bg="bg-orange-50"
            />
            <SummaryCard
              icon={<Wind className="w-5 h-5 text-cyan-500" />}
              label="Cooling CFM"
              value={`${displayTotals.coolingCFM.toLocaleString()}`}
              sublabel={`Heating: ${displayTotals.heatingCFM.toLocaleString()} CFM`}
              bg="bg-cyan-50"
            />
            <SummaryCard
              icon={<Thermometer className="w-5 h-5 text-emerald-600" />}
              label="Recommended Size"
              value={`${displayTonnage} Ton`}
              sublabel="Standard equipment size"
              bg="bg-emerald-50"
            />
          </div>

          {/* Sensible / Latent breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
              <h4 className="text-sm font-semibold text-[var(--navy)]">Cooling Load Breakdown</h4>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-[var(--steel)] mb-1">Sensible</p>
                  <p className="text-lg font-bold text-[var(--navy)]">
                    {formatBTU(displayTotals.totalSensibleCooling)} BTU/hr
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--steel)] mb-1">Latent</p>
                  <p className="text-lg font-bold text-[var(--navy)]">
                    {formatBTU(displayTotals.totalLatentCooling)} BTU/hr
                  </p>
                </div>
              </div>
              {/* SHR */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{
                      width: `${displayTotals.totalCooling > 0
                        ? (displayTotals.totalSensibleCooling / displayTotals.totalCooling) * 100
                        : 0}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-[var(--steel)] whitespace-nowrap">
                  SHR {displayTotals.totalCooling > 0
                    ? (displayTotals.totalSensibleCooling / displayTotals.totalCooling).toFixed(2)
                    : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Room-by-room breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
              <h4 className="text-sm font-semibold text-[var(--navy)]">Room-by-Room Summary</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-4 py-2.5 font-medium text-[var(--steel)]">Room</th>
                    <th className="px-4 py-2.5 font-medium text-[var(--steel)] text-right">Cooling</th>
                    <th className="px-4 py-2.5 font-medium text-[var(--steel)] text-right">Heating</th>
                    <th className="px-4 py-2.5 font-medium text-[var(--steel)] text-right">CFM</th>
                    <th className="px-4 py-2.5 font-medium text-[var(--steel)] text-right">% Share</th>
                  </tr>
                </thead>
                <tbody>
                  {roomLoads.map((load) => {
                    const room = rooms.find(r => r.id === load.room_id);
                    const share = displayTotals.totalCooling > 0
                      ? ((load.total_cooling / displayTotals.totalCooling) * 100).toFixed(1)
                      : '0.0';
                    return (
                      <tr key={load.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-4 py-2.5 font-medium text-[var(--navy)]">
                          {room?.name || 'Unknown'}
                        </td>
                        <td className="px-4 py-2.5 text-right text-blue-600">
                          {formatBTU(load.total_cooling)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-orange-600">
                          {formatBTU(load.total_heating)}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {load.cooling_cfm}
                        </td>
                        <td className="px-4 py-2.5 text-right text-[var(--steel)]">
                          {share}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {roomLoads.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-50 font-semibold">
                      <td className="px-4 py-2.5 text-[var(--navy)]">Total</td>
                      <td className="px-4 py-2.5 text-right text-blue-700">
                        {formatBTU(displayTotals.totalCooling)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-orange-700">
                        {formatBTU(displayTotals.totalHeating)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {displayTotals.coolingCFM}
                      </td>
                      <td className="px-4 py-2.5 text-right text-[var(--steel)]">100%</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Detailed breakdown for total (expandable) */}
          {totalLoad && <DetailedBreakdown load={totalLoad} />}
        </>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  sublabel,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel?: string;
  bg: string;
}) {
  return (
    <div className={`${bg} rounded-xl p-4 border border-gray-200/50`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium text-[var(--steel)]">{label}</span>
      </div>
      <p className="text-lg font-bold text-[var(--navy)]">{value}</p>
      {sublabel && <p className="text-xs text-[var(--steel)] mt-0.5">{sublabel}</p>}
    </div>
  );
}

function DetailedBreakdown({ load }: { load: InstallLoad }) {
  const [open, setOpen] = useState(false);

  const coolingItems = [
    { label: 'Walls', value: load.sensible_wall },
    { label: 'Ceiling', value: load.sensible_ceiling },
    { label: 'Floor', value: load.sensible_floor },
    { label: 'Window Conduction', value: load.sensible_window_conduction },
    { label: 'Window Solar', value: load.sensible_window_solar },
    { label: 'Doors', value: load.sensible_door },
    { label: 'Infiltration', value: load.sensible_infiltration },
    { label: 'Internal Gains', value: load.sensible_internal },
    { label: 'Duct Losses', value: load.sensible_duct },
  ];

  const heatingItems = [
    { label: 'Walls', value: load.heating_wall },
    { label: 'Ceiling', value: load.heating_ceiling },
    { label: 'Floor', value: load.heating_floor },
    { label: 'Windows', value: load.heating_window },
    { label: 'Doors', value: load.heating_door },
    { label: 'Infiltration', value: load.heating_infiltration },
    { label: 'Duct Losses', value: load.heating_duct },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-3 flex items-center justify-between border-b border-gray-100 bg-gray-50/50 hover:bg-gray-100/50 transition-colors"
      >
        <h4 className="text-sm font-semibold text-[var(--navy)]">Detailed Component Breakdown</h4>
        <span className="text-xs text-[var(--steel)]">{open ? 'Collapse' : 'Expand'}</span>
      </button>
      {open && (
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h5 className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3">
              Cooling Components (Sensible)
            </h5>
            <div className="space-y-2">
              {coolingItems.map((item) => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span className="text-[var(--steel)]">{item.label}</span>
                  <span className="font-medium text-[var(--navy)]">{formatBTU(item.value)}</span>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-semibold">
                <span className="text-blue-600">Sensible Total</span>
                <span className="text-blue-700">{formatBTU(load.total_sensible_cooling)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--steel)]">Latent</span>
                <span className="font-medium text-[var(--navy)]">{formatBTU(load.total_latent_cooling)}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-bold">
                <span className="text-blue-700">Total Cooling</span>
                <span className="text-blue-700">{formatBTU(load.total_cooling)}</span>
              </div>
            </div>
          </div>
          <div>
            <h5 className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-3">
              Heating Components
            </h5>
            <div className="space-y-2">
              {heatingItems.map((item) => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span className="text-[var(--steel)]">{item.label}</span>
                  <span className="font-medium text-[var(--navy)]">{formatBTU(item.value)}</span>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-bold">
                <span className="text-orange-700">Total Heating</span>
                <span className="text-orange-700">{formatBTU(load.total_heating)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
