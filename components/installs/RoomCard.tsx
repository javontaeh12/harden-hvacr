'use client';

import { useState } from 'react';
import {
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Users,
  Layers,
  Compass,
  Plus,
  Thermometer,
  Wind,
} from 'lucide-react';
import type { InstallRoom, InstallSurface, InstallOpening, UXMode } from '@/lib/installs/types';
import { SurfaceEditor } from '@/components/installs/SurfaceEditor';
import { OpeningEditor } from '@/components/installs/OpeningEditor';

interface RoomCardProps {
  room: InstallRoom;
  mode: UXMode;
  onEdit: (room: InstallRoom) => void;
  onDelete: (roomId: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const FLOOR_TYPE_LABELS: Record<string, string> = {
  slab: 'Slab',
  crawlspace: 'Crawlspace',
  basement: 'Basement',
  over_garage: 'Over Garage',
  second_floor: '2nd Floor',
};

export function RoomCard({ room, mode, onEdit, onDelete, isExpanded, onToggleExpand }: RoomCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [surfaces, setSurfaces] = useState<InstallSurface[]>([]);
  const [openings, setOpenings] = useState<InstallOpening[]>([]);
  const [surfacesLoaded, setSurfacesLoaded] = useState(false);
  const [showSurfaceEditor, setShowSurfaceEditor] = useState(false);
  const [editingSurface, setEditingSurface] = useState<InstallSurface | undefined>(undefined);
  const [showOpeningEditor, setShowOpeningEditor] = useState(false);
  const [editingOpening, setEditingOpening] = useState<InstallOpening | undefined>(undefined);

  const isSalesMode = mode === 'sales';
  const dimensions =
    room.length_ft && room.width_ft
      ? `${room.length_ft}' x ${room.width_ft}' x ${room.ceiling_height_ft}'`
      : null;

  // Fetch surfaces & openings when expanding in design mode
  const handleToggle = async () => {
    if (!isExpanded && !surfacesLoaded && !isSalesMode) {
      try {
        const [surfRes, openRes] = await Promise.all([
          fetch(`/api/installs/surfaces?room_id=${room.id}`),
          fetch(`/api/installs/openings?room_id=${room.id}`),
        ]);
        if (surfRes.ok) {
          const data = await surfRes.json();
          setSurfaces(Array.isArray(data) ? data : []);
        }
        if (openRes.ok) {
          const data = await openRes.json();
          setOpenings(Array.isArray(data) ? data : []);
        }
        setSurfacesLoaded(true);
      } catch {
        // fail silently
      }
    }
    onToggleExpand();
  };

  const reloadSurfaces = async () => {
    try {
      const res = await fetch(`/api/installs/surfaces?room_id=${room.id}`);
      if (res.ok) setSurfaces(await res.json());
    } catch {/* */}
  };

  const reloadOpenings = async () => {
    try {
      const res = await fetch(`/api/installs/openings?room_id=${room.id}`);
      if (res.ok) setOpenings(await res.json());
    } catch {/* */}
  };

  const handleDeleteConfirm = () => {
    if (confirmDelete) {
      onDelete(room.id);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  return (
    <div className="border border-[var(--border)] rounded-xl bg-white overflow-hidden">
      {/* Card header */}
      <div className="px-4 py-3 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-bold text-[var(--navy)] truncate">{room.name}</h4>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
              Floor {room.floor_level}
            </span>
            {room.orientation && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-600">
                <Compass className="w-2.5 h-2.5" />
                {room.orientation}
              </span>
            )}
          </div>

          {/* Dimensions & sqft */}
          <div className="flex items-center gap-3 mt-1 text-xs text-[var(--steel)]">
            {dimensions && <span>{dimensions}</span>}
            {room.sqft && (
              <span className="font-medium text-[var(--navy)]">{room.sqft.toLocaleString()} sq ft</span>
            )}
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-xs text-[var(--steel)]">
              <Users className="w-3 h-3" />
              {room.occupants}
            </span>
            {!isSalesMode && openings.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-[var(--steel)]">
                <Layers className="w-3 h-3" />
                {openings.length} opening{openings.length !== 1 ? 's' : ''}
              </span>
            )}
            {room.cooling_btuh && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                <Thermometer className="w-2.5 h-2.5" />
                {Math.round(room.cooling_btuh).toLocaleString()} BTU/h
              </span>
            )}
            {room.cooling_cfm && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700">
                <Wind className="w-2.5 h-2.5" />
                {Math.round(room.cooling_cfm)} CFM
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => onEdit(room)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-[var(--accent)] hover:bg-gray-100 transition-colors"
            title="Edit room"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleDeleteConfirm}
            className={`p-1.5 rounded-lg transition-colors ${
              confirmDelete
                ? 'text-white bg-red-500 hover:bg-red-600'
                : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
            }`}
            title={confirmDelete ? 'Click again to confirm' : 'Delete room'}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {!isSalesMode && (
            <button
              type="button"
              onClick={handleToggle}
              className="p-1.5 rounded-lg text-gray-400 hover:text-[var(--navy)] hover:bg-gray-100 transition-colors"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Expandable detail section — Design mode only */}
      {!isSalesMode && isExpanded && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50 space-y-3">
          {/* Room details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-[var(--steel)]">Ceiling R</span>
              <p className="font-medium text-[var(--navy)]">R-{room.ceiling_r_value}</p>
            </div>
            <div>
              <span className="text-[var(--steel)]">Floor</span>
              <p className="font-medium text-[var(--navy)]">
                {FLOOR_TYPE_LABELS[room.floor_type] || room.floor_type} (R-{room.floor_r_value})
              </p>
            </div>
            <div>
              <span className="text-[var(--steel)]">Kitchen</span>
              <p className="font-medium text-[var(--navy)]">{room.has_kitchen ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <span className="text-[var(--steel)]">Appliance BTU</span>
              <p className="font-medium text-[var(--navy)]">{room.appliance_btuh.toLocaleString()}</p>
            </div>
          </div>

          {/* Surfaces */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-[var(--navy)]">Surfaces</span>
              <button
                type="button"
                onClick={() => { setEditingSurface(undefined); setShowSurfaceEditor(true); }}
                className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--accent)] hover:underline"
              >
                <Plus className="w-3 h-3" />
                Add Surface
              </button>
            </div>
            {surfaces.length === 0 ? (
              <p className="text-xs text-[var(--steel)] italic">No surfaces defined.</p>
            ) : (
              <div className="space-y-1">
                {surfaces.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { setEditingSurface(s); setShowSurfaceEditor(true); }}
                    className="w-full flex items-center justify-between text-left px-2.5 py-1.5 rounded-lg bg-white border border-gray-100 hover:border-[var(--accent)]/30 transition-colors text-xs"
                  >
                    <span className="text-[var(--navy)] font-medium capitalize">
                      {s.surface_type}
                      {s.orientation ? ` (${s.orientation})` : ''}
                      {!s.is_exterior && ' - Interior'}
                    </span>
                    <span className="text-[var(--steel)]">
                      {s.gross_area_sqft ? `${s.gross_area_sqft} sqft` : ''}
                      {s.r_value ? ` / R-${s.r_value}` : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Openings */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-[var(--navy)]">Openings</span>
              <button
                type="button"
                onClick={() => { setEditingOpening(undefined); setShowOpeningEditor(true); }}
                className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--accent)] hover:underline"
              >
                <Plus className="w-3 h-3" />
                Add Opening
              </button>
            </div>
            {openings.length === 0 ? (
              <p className="text-xs text-[var(--steel)] italic">No openings defined.</p>
            ) : (
              <div className="space-y-1">
                {openings.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => { setEditingOpening(o); setShowOpeningEditor(true); }}
                    className="w-full flex items-center justify-between text-left px-2.5 py-1.5 rounded-lg bg-white border border-gray-100 hover:border-[var(--accent)]/30 transition-colors text-xs"
                  >
                    <span className="text-[var(--navy)] font-medium capitalize">
                      {o.opening_type}
                      {o.quantity > 1 ? ` x${o.quantity}` : ''}
                      {o.orientation ? ` (${o.orientation})` : ''}
                    </span>
                    <span className="text-[var(--steel)]">
                      U={o.u_factor} / SHGC={o.shgc}
                      {o.area_sqft ? ` / ${o.area_sqft} sqft` : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Surface editor modal */}
      <SurfaceEditor
        roomId={room.id}
        surface={editingSurface}
        isOpen={showSurfaceEditor}
        onClose={() => { setShowSurfaceEditor(false); setEditingSurface(undefined); }}
        onSaved={() => { setShowSurfaceEditor(false); setEditingSurface(undefined); reloadSurfaces(); }}
      />

      {/* Opening editor modal */}
      <OpeningEditor
        roomId={room.id}
        opening={editingOpening}
        isOpen={showOpeningEditor}
        onClose={() => { setShowOpeningEditor(false); setEditingOpening(undefined); }}
        onSaved={() => { setShowOpeningEditor(false); setEditingOpening(undefined); reloadOpenings(); }}
      />
    </div>
  );
}
