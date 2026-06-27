'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { WINDOW_U_FACTORS, WINDOW_SHGC } from '@/lib/installs/constants';
import type { InstallOpening, Orientation, FrameType, GlassType } from '@/lib/installs/types';

interface OpeningEditorProps {
  roomId: string;
  opening?: InstallOpening;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

type OpeningType = 'window' | 'door' | 'skylight';

const OPENING_TYPES: { value: OpeningType; label: string }[] = [
  { value: 'window', label: 'Window' },
  { value: 'door', label: 'Door' },
  { value: 'skylight', label: 'Skylight' },
];

const ORIENTATIONS: Orientation[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

const FRAME_TYPES: { value: FrameType; label: string }[] = [
  { value: 'vinyl', label: 'Vinyl' },
  { value: 'wood', label: 'Wood' },
  { value: 'aluminum', label: 'Aluminum' },
  { value: 'fiberglass', label: 'Fiberglass' },
  { value: 'steel', label: 'Steel' },
];

const GLASS_TYPES: { value: GlassType; label: string }[] = [
  { value: 'single', label: 'Single Pane' },
  { value: 'double', label: 'Double Pane' },
  { value: 'double_low_e', label: 'Double Low-E' },
  { value: 'triple', label: 'Triple Pane' },
  { value: 'triple_low_e', label: 'Triple Low-E' },
];

interface FormState {
  opening_type: OpeningType;
  quantity: number;
  width_in: string;
  height_in: string;
  area_sqft: string;
  area_override: boolean;
  orientation: Orientation | '';
  frame_type: FrameType;
  glass_type: GlassType;
  u_factor: string;
  shgc: string;
  has_overhang: boolean;
}

const DEFAULT_FORM: FormState = {
  opening_type: 'window',
  quantity: 1,
  width_in: '',
  height_in: '',
  area_sqft: '',
  area_override: false,
  orientation: '',
  frame_type: 'vinyl',
  glass_type: 'double_low_e',
  u_factor: String(WINDOW_U_FACTORS['double_low_e']),
  shgc: String(WINDOW_SHGC['double_low_e']),
  has_overhang: false,
};

export function OpeningEditor({ roomId, opening, isOpen, onClose, onSaved }: OpeningEditorProps) {
  const [form, setForm] = useState<FormState>({ ...DEFAULT_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!opening;

  useEffect(() => {
    if (!isOpen) return;
    if (opening) {
      setForm({
        opening_type: opening.opening_type,
        quantity: opening.quantity,
        width_in: opening.width_in != null ? String(opening.width_in) : '',
        height_in: opening.height_in != null ? String(opening.height_in) : '',
        area_sqft: opening.area_sqft != null ? String(opening.area_sqft) : '',
        area_override: false,
        orientation: opening.orientation || '',
        frame_type: opening.frame_type,
        glass_type: opening.glass_type,
        u_factor: String(opening.u_factor),
        shgc: String(opening.shgc),
        has_overhang: opening.has_overhang,
      });
    } else {
      setForm({ ...DEFAULT_FORM });
    }
    setError('');
  }, [isOpen, opening]);

  const update = useCallback(
    (fields: Partial<FormState>) => setForm((prev) => ({ ...prev, ...fields })),
    [],
  );

  // Auto-calculate area: qty * w * h / 144
  useEffect(() => {
    if (form.area_override) return;
    const w = parseFloat(form.width_in);
    const h = parseFloat(form.height_in);
    if (w > 0 && h > 0) {
      const area = (form.quantity * w * h) / 144;
      update({ area_sqft: String(Math.round(area * 100) / 100) });
    }
  }, [form.width_in, form.height_in, form.quantity, form.area_override, update]);

  // Auto-set U-factor and SHGC from glass type
  useEffect(() => {
    const uFactor = WINDOW_U_FACTORS[form.glass_type];
    const shgc = WINDOW_SHGC[form.glass_type];
    if (uFactor !== undefined && shgc !== undefined) {
      update({ u_factor: String(uFactor), shgc: String(shgc) });
    }
  }, [form.glass_type, update]);

  const canSave = form.width_in.trim() !== '' && form.height_in.trim() !== '';

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError('');

    const body = {
      room_id: roomId,
      surface_id: null,
      opening_type: form.opening_type,
      quantity: form.quantity,
      width_in: parseFloat(form.width_in) || null,
      height_in: parseFloat(form.height_in) || null,
      area_sqft: form.area_sqft ? parseFloat(form.area_sqft) : null,
      orientation: form.orientation || null,
      frame_type: form.frame_type,
      glass_type: form.glass_type,
      u_factor: parseFloat(form.u_factor) || 0.3,
      shgc: parseFloat(form.shgc) || 0.27,
      has_overhang: form.has_overhang,
    };

    try {
      const url = '/api/installs/openings';
      const method = isEdit ? 'PUT' : 'POST';
      const payload = isEdit ? { ...body, id: opening!.id } : body;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save opening');
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
      title={isEdit ? 'Edit Opening' : 'Add Opening'}
      className="max-w-md"
    >
      <div className="space-y-4">
        {/* Opening Type */}
        <div>
          <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Opening Type *</label>
          <select
            value={form.opening_type}
            onChange={(e) => update({ opening_type: e.target.value as OpeningType })}
            className="form-input"
          >
            {OPENING_TYPES.map((ot) => (
              <option key={ot.value} value={ot.value}>{ot.label}</option>
            ))}
          </select>
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Quantity</label>
          <input
            type="number"
            min={1}
            max={20}
            value={form.quantity}
            onChange={(e) => update({ quantity: Number(e.target.value) || 1, area_override: false })}
            className="form-input"
          />
        </div>

        {/* Width & Height */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Width (inches) *</label>
            <input
              type="number"
              min={1}
              step={0.5}
              value={form.width_in}
              onChange={(e) => update({ width_in: e.target.value, area_override: false })}
              className="form-input"
              placeholder="36"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Height (inches) *</label>
            <input
              type="number"
              min={1}
              step={0.5}
              value={form.height_in}
              onChange={(e) => update({ height_in: e.target.value, area_override: false })}
              className="form-input"
              placeholder="48"
            />
          </div>
        </div>

        {/* Area */}
        <div>
          <label className="block text-sm font-semibold text-[var(--navy)] mb-1">
            Area (sq ft)
            <span className="text-[10px] text-[var(--steel)] font-normal ml-1">(auto-calculated)</span>
          </label>
          <input
            type="number"
            min={0}
            step={0.1}
            value={form.area_sqft}
            onChange={(e) => update({ area_sqft: e.target.value, area_override: true })}
            className="form-input"
          />
        </div>

        {/* Orientation */}
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

        {/* Frame Type */}
        <div>
          <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Frame Type</label>
          <select
            value={form.frame_type}
            onChange={(e) => update({ frame_type: e.target.value as FrameType })}
            className="form-input"
          >
            {FRAME_TYPES.map((ft) => (
              <option key={ft.value} value={ft.value}>{ft.label}</option>
            ))}
          </select>
        </div>

        {/* Glass Type */}
        <div>
          <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Glass Type</label>
          <select
            value={form.glass_type}
            onChange={(e) => update({ glass_type: e.target.value as GlassType })}
            className="form-input"
          >
            {GLASS_TYPES.map((gt) => (
              <option key={gt.value} value={gt.value}>{gt.label}</option>
            ))}
          </select>
        </div>

        {/* U-Factor & SHGC */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-[var(--navy)] mb-1">
              U-Factor
              <span className="text-[10px] text-[var(--steel)] font-normal ml-1">(overridable)</span>
            </label>
            <input
              type="number"
              min={0}
              max={2}
              step={0.01}
              value={form.u_factor}
              onChange={(e) => update({ u_factor: e.target.value })}
              className="form-input"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[var(--navy)] mb-1">
              SHGC
              <span className="text-[10px] text-[var(--steel)] font-normal ml-1">(overridable)</span>
            </label>
            <input
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={form.shgc}
              onChange={(e) => update({ shgc: e.target.value })}
              className="form-input"
            />
          </div>
        </div>

        {/* Has Overhang */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.has_overhang}
            onChange={(e) => update({ has_overhang: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 text-[var(--accent)] focus:ring-[var(--accent)]"
          />
          <span className="text-sm font-medium text-[var(--navy)]">Has Overhang</span>
        </label>

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
              'Update Opening'
            ) : (
              'Add Opening'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
