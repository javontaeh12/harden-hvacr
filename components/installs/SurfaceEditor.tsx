'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import {
  WALL_R_VALUES,
  CEILING_R_VALUES,
  FLOOR_R_VALUES,
} from '@/lib/installs/constants';
import type { InstallSurface, Orientation } from '@/lib/installs/types';

interface SurfaceEditorProps {
  roomId: string;
  surface?: InstallSurface;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

type SurfaceType = 'wall' | 'ceiling' | 'floor';

const SURFACE_TYPES: { value: SurfaceType; label: string }[] = [
  { value: 'wall', label: 'Wall' },
  { value: 'ceiling', label: 'Ceiling' },
  { value: 'floor', label: 'Floor' },
];

const ORIENTATIONS: Orientation[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

function getConstructionOptions(surfaceType: SurfaceType): { value: string; label: string; rValue: number }[] {
  let source: Record<string, number | { rValue: number }>;

  switch (surfaceType) {
    case 'wall':
      source = WALL_R_VALUES;
      break;
    case 'ceiling':
      source = CEILING_R_VALUES;
      break;
    case 'floor': {
      return Object.entries(FLOOR_R_VALUES).map(([key, val]) => ({
        value: key,
        label: `${key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} (R-${val.rValue})`,
        rValue: val.rValue,
      }));
    }
    default:
      source = WALL_R_VALUES;
  }

  return Object.entries(source).map(([key, val]) => {
    const rVal = typeof val === 'number' ? val : (val as { rValue: number }).rValue;
    return {
      value: key,
      label: `${key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} (R-${rVal})`,
      rValue: rVal,
    };
  });
}

interface FormState {
  surface_type: SurfaceType;
  orientation: Orientation | '';
  is_exterior: boolean;
  gross_area_sqft: string;
  net_area_sqft: string;
  construction: string;
  r_value: string;
}

const DEFAULT_FORM: FormState = {
  surface_type: 'wall',
  orientation: '',
  is_exterior: true,
  gross_area_sqft: '',
  net_area_sqft: '',
  construction: '2x4_r13',
  r_value: '13',
};

export function SurfaceEditor({ roomId, surface, isOpen, onClose, onSaved }: SurfaceEditorProps) {
  const [form, setForm] = useState<FormState>({ ...DEFAULT_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!surface;

  useEffect(() => {
    if (!isOpen) return;
    if (surface) {
      setForm({
        surface_type: surface.surface_type,
        orientation: surface.orientation || '',
        is_exterior: surface.is_exterior,
        gross_area_sqft: surface.gross_area_sqft != null ? String(surface.gross_area_sqft) : '',
        net_area_sqft: surface.net_area_sqft != null ? String(surface.net_area_sqft) : '',
        construction: surface.construction || '2x4_r13',
        r_value: surface.r_value != null ? String(surface.r_value) : '',
      });
    } else {
      setForm({ ...DEFAULT_FORM });
    }
    setError('');
  }, [isOpen, surface]);

  const update = useCallback(
    (fields: Partial<FormState>) => setForm((prev) => ({ ...prev, ...fields })),
    [],
  );

  // Auto-set R-value when construction type changes
  useEffect(() => {
    const options = getConstructionOptions(form.surface_type);
    const match = options.find((o) => o.value === form.construction);
    if (match) {
      update({ r_value: String(match.rValue) });
    }
  }, [form.construction, form.surface_type, update]);

  // Reset construction when surface type changes
  useEffect(() => {
    const options = getConstructionOptions(form.surface_type);
    if (options.length > 0 && !options.find((o) => o.value === form.construction)) {
      update({ construction: options[0].value });
    }
  }, [form.surface_type, form.construction, update]);

  const constructionOptions = getConstructionOptions(form.surface_type);
  const canSave = form.gross_area_sqft.trim() !== '';

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError('');

    const body = {
      room_id: roomId,
      surface_type: form.surface_type,
      orientation: form.surface_type === 'wall' && form.orientation ? form.orientation : null,
      is_exterior: form.is_exterior,
      gross_area_sqft: parseFloat(form.gross_area_sqft) || null,
      net_area_sqft: form.net_area_sqft ? parseFloat(form.net_area_sqft) : null,
      construction: form.construction,
      r_value: form.r_value ? parseFloat(form.r_value) : null,
    };

    try {
      const url = '/api/installs/surfaces';
      const method = isEdit ? 'PUT' : 'POST';
      const payload = isEdit ? { ...body, id: surface!.id } : body;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save surface');
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Surface' : 'Add Surface'}
      className="max-w-md"
    >
      <div className="space-y-4">
        {/* Surface Type */}
        <div>
          <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Surface Type *</label>
          <select
            value={form.surface_type}
            onChange={(e) => update({ surface_type: e.target.value as SurfaceType })}
            className="form-input"
          >
            {SURFACE_TYPES.map((st) => (
              <option key={st.value} value={st.value}>{st.label}</option>
            ))}
          </select>
        </div>

        {/* Orientation — walls only */}
        {form.surface_type === 'wall' && (
          <div>
            <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Orientation</label>
            <select
              value={form.orientation}
              onChange={(e) => update({ orientation: e.target.value as Orientation | '' })}
              className="form-input"
            >
              <option value="">Select orientation...</option>
              {ORIENTATIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
        )}

        {/* Is Exterior */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_exterior}
            onChange={(e) => update({ is_exterior: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 text-[var(--accent)] focus:ring-[var(--accent)]"
          />
          <span className="text-sm font-medium text-[var(--navy)]">Exterior Surface</span>
        </label>

        {/* Areas */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Gross Area (sq ft) *</label>
            <input
              type="number"
              min={0}
              step={1}
              value={form.gross_area_sqft}
              onChange={(e) => update({ gross_area_sqft: e.target.value })}
              className="form-input"
              placeholder="96"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Net Area (sq ft)</label>
            <input
              type="number"
              min={0}
              step={1}
              value={form.net_area_sqft}
              onChange={(e) => update({ net_area_sqft: e.target.value })}
              className="form-input"
              placeholder="80"
            />
            <p className="text-[10px] text-[var(--steel)] mt-0.5">Gross minus openings</p>
          </div>
        </div>

        {/* Construction Type */}
        <div>
          <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Construction Type</label>
          <select
            value={form.construction}
            onChange={(e) => update({ construction: e.target.value })}
            className="form-input"
          >
            {constructionOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* R-Value override */}
        <div>
          <label className="block text-sm font-semibold text-[var(--navy)] mb-1">
            R-Value
            <span className="text-[10px] text-[var(--steel)] font-normal ml-1">(auto-set, overridable)</span>
          </label>
          <input
            type="number"
            min={0}
            step={1}
            value={form.r_value}
            onChange={(e) => update({ r_value: e.target.value })}
            className="form-input"
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2.5">{error}</p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-[var(--navy)] border border-[var(--border)] rounded-full hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSave || saving}
            onClick={handleSave}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-[var(--accent)] rounded-full hover:bg-[var(--accent-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </span>
            ) : isEdit ? (
              'Update Surface'
            ) : (
              'Add Surface'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
