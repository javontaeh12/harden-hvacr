'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { CEILING_R_VALUES, FLOOR_R_VALUES } from '@/lib/installs/constants';
import type { InstallRoom, Orientation, FloorType, RoomType } from '@/lib/installs/types';

interface RoomEditorProps {
  projectId: string;
  room?: InstallRoom;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (room: InstallRoom) => void;
}

const ROOM_TYPES: { value: RoomType; label: string }[] = [
  { value: 'bedroom', label: 'Bedroom' },
  { value: 'bathroom', label: 'Bathroom' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'living', label: 'Living Room' },
  { value: 'dining', label: 'Dining Room' },
  { value: 'hallway', label: 'Hallway' },
  { value: 'closet', label: 'Closet' },
  { value: 'garage', label: 'Garage' },
  { value: 'utility', label: 'Utility' },
  { value: 'office', label: 'Office' },
  { value: 'other', label: 'Other' },
];

const ORIENTATIONS: Orientation[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

const FLOOR_TYPES: { value: FloorType; label: string }[] = [
  { value: 'slab', label: 'Slab' },
  { value: 'crawlspace', label: 'Crawlspace' },
  { value: 'basement', label: 'Basement' },
  { value: 'over_garage', label: 'Over Garage' },
  { value: 'second_floor', label: 'Second Floor' },
];

const CEILING_R_OPTIONS = Object.entries(CEILING_R_VALUES).map(([key, val]) => ({
  value: key,
  label: `${key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} (R-${val})`,
  rValue: val,
}));

interface FormState {
  name: string;
  room_type: RoomType;
  floor_level: number;
  length_ft: string;
  width_ft: string;
  ceiling_height_ft: number;
  sqft: string;
  sqft_override: boolean;
  orientation: Orientation | '';
  ceiling_r_key: string;
  ceiling_r_value: number;
  floor_type: FloorType;
  floor_r_value: number;
  occupants: number;
  has_kitchen: boolean;
  has_fireplace: boolean;
  appliance_btuh: number;
}

const DEFAULT_FORM: FormState = {
  name: '',
  room_type: 'bedroom',
  floor_level: 1,
  length_ft: '',
  width_ft: '',
  ceiling_height_ft: 8,
  sqft: '',
  sqft_override: false,
  orientation: '',
  ceiling_r_key: 'r30',
  ceiling_r_value: 30,
  floor_type: 'slab',
  floor_r_value: 0,
  occupants: 2,
  has_kitchen: false,
  has_fireplace: false,
  appliance_btuh: 0,
};

export function RoomEditor({ projectId, room, isOpen, onClose, onSaved }: RoomEditorProps) {
  const [form, setForm] = useState<FormState>({ ...DEFAULT_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!room;

  // Reset form when modal opens
  useEffect(() => {
    if (!isOpen) return;
    if (room) {
      // Find ceiling R key by matching value
      const ceilingKey =
        Object.entries(CEILING_R_VALUES).find(([, v]) => v === room.ceiling_r_value)?.[0] || 'r30';
      setForm({
        name: room.name,
        room_type: 'bedroom', // room_type not stored on InstallRoom, default
        floor_level: room.floor_level,
        length_ft: room.length_ft != null ? String(room.length_ft) : '',
        width_ft: room.width_ft != null ? String(room.width_ft) : '',
        ceiling_height_ft: room.ceiling_height_ft,
        sqft: room.sqft != null ? String(room.sqft) : '',
        sqft_override: false,
        orientation: room.orientation || '',
        ceiling_r_key: ceilingKey,
        ceiling_r_value: room.ceiling_r_value,
        floor_type: room.floor_type,
        floor_r_value: room.floor_r_value,
        occupants: room.occupants,
        has_kitchen: room.has_kitchen,
        has_fireplace: room.has_fireplace,
        appliance_btuh: room.appliance_btuh,
      });
    } else {
      setForm({ ...DEFAULT_FORM });
    }
    setError('');
  }, [isOpen, room]);

  const update = useCallback(
    (fields: Partial<FormState>) => setForm((prev) => ({ ...prev, ...fields })),
    [],
  );

  // Auto-calculate sqft when length or width change (unless overridden)
  useEffect(() => {
    if (form.sqft_override) return;
    const l = parseFloat(form.length_ft);
    const w = parseFloat(form.width_ft);
    if (l > 0 && w > 0) {
      update({ sqft: String(Math.round(l * w)) });
    }
  }, [form.length_ft, form.width_ft, form.sqft_override, update]);

  // Auto-set floor R-value when floor type changes
  useEffect(() => {
    const floorData = FLOOR_R_VALUES[form.floor_type];
    if (floorData) {
      update({ floor_r_value: floorData.rValue });
    }
  }, [form.floor_type, update]);

  // Auto-set ceiling R-value when ceiling key changes
  useEffect(() => {
    const val = CEILING_R_VALUES[form.ceiling_r_key];
    if (val !== undefined) {
      update({ ceiling_r_value: val });
    }
  }, [form.ceiling_r_key, update]);

  const canSave = form.name.trim() !== '' && form.length_ft.trim() !== '' && form.width_ft.trim() !== '';

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError('');

    const body = {
      project_id: projectId,
      name: form.name.trim(),
      floor_level: form.floor_level,
      length_ft: parseFloat(form.length_ft) || null,
      width_ft: parseFloat(form.width_ft) || null,
      ceiling_height_ft: form.ceiling_height_ft,
      sqft: form.sqft ? parseFloat(form.sqft) : null,
      orientation: form.orientation || null,
      ceiling_r_value: form.ceiling_r_value,
      floor_type: form.floor_type,
      floor_r_value: form.floor_r_value,
      occupants: form.occupants,
      has_kitchen: form.has_kitchen,
      has_fireplace: form.has_fireplace,
      appliance_btuh: form.appliance_btuh,
    };

    try {
      const url = '/api/installs/rooms';
      const method = isEdit ? 'PUT' : 'POST';
      const payload = isEdit ? { ...body, id: room!.id } : body;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save room');
      }

      const savedRoom: InstallRoom = await res.json();
      onSaved(savedRoom);
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
      title={isEdit ? 'Edit Room' : 'Add Room'}
      className="max-w-xl"
    >
      <div className="space-y-4">
        {/* Room Name */}
        <div>
          <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Room Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => update({ name: e.target.value })}
            className="form-input"
            placeholder="Master Bedroom"
          />
        </div>

        {/* Room Type + Floor Level */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Room Type</label>
            <select
              value={form.room_type}
              onChange={(e) => update({ room_type: e.target.value as RoomType })}
              className="form-input"
            >
              {ROOM_TYPES.map((rt) => (
                <option key={rt.value} value={rt.value}>{rt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Floor Level</label>
            <input
              type="number"
              min={1}
              max={10}
              value={form.floor_level}
              onChange={(e) => update({ floor_level: Number(e.target.value) || 1 })}
              className="form-input"
            />
          </div>
        </div>

        {/* Length & Width */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Length (ft) *</label>
            <input
              type="number"
              min={1}
              step={0.5}
              value={form.length_ft}
              onChange={(e) => update({ length_ft: e.target.value, sqft_override: false })}
              className="form-input"
              placeholder="14"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Width (ft) *</label>
            <input
              type="number"
              min={1}
              step={0.5}
              value={form.width_ft}
              onChange={(e) => update({ width_ft: e.target.value, sqft_override: false })}
              className="form-input"
              placeholder="12"
            />
          </div>
        </div>

        {/* Ceiling Height + Sqft */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Ceiling Height (ft)</label>
            <input
              type="number"
              min={6}
              max={30}
              step={0.5}
              value={form.ceiling_height_ft}
              onChange={(e) => update({ ceiling_height_ft: Number(e.target.value) || 8 })}
              className="form-input"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[var(--navy)] mb-1">
              Sq Ft
              <span className="text-[10px] text-[var(--steel)] font-normal ml-1">(auto-calculated)</span>
            </label>
            <input
              type="number"
              min={1}
              value={form.sqft}
              onChange={(e) => update({ sqft: e.target.value, sqft_override: true })}
              className="form-input"
              placeholder="168"
            />
          </div>
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

        {/* Divider: Insulation */}
        <div className="border-t border-gray-200 pt-3">
          <h4 className="text-sm font-bold text-[var(--navy)] mb-3">Insulation</h4>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Ceiling R-Value</label>
              <select
                value={form.ceiling_r_key}
                onChange={(e) => update({ ceiling_r_key: e.target.value })}
                className="form-input"
              >
                {CEILING_R_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Floor Type</label>
                <select
                  value={form.floor_type}
                  onChange={(e) => update({ floor_type: e.target.value as FloorType })}
                  className="form-input"
                >
                  {FLOOR_TYPES.map((ft) => (
                    <option key={ft.value} value={ft.value}>{ft.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Floor R-Value</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={form.floor_r_value}
                  onChange={(e) => update({ floor_r_value: Number(e.target.value) || 0 })}
                  className="form-input"
                />
                <p className="text-[10px] text-[var(--steel)] mt-0.5">Auto-set from floor type</p>
              </div>
            </div>
          </div>
        </div>

        {/* Divider: Internal Loads */}
        <div className="border-t border-gray-200 pt-3">
          <h4 className="text-sm font-bold text-[var(--navy)] mb-3">Internal Loads</h4>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Occupants</label>
              <input
                type="number"
                min={0}
                max={20}
                value={form.occupants}
                onChange={(e) => update({ occupants: Number(e.target.value) || 0 })}
                className="form-input"
              />
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.has_kitchen}
                  onChange={(e) => update({ has_kitchen: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-[var(--accent)] focus:ring-[var(--accent)]"
                />
                <span className="text-sm font-medium text-[var(--navy)]">Has Kitchen</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.has_fireplace}
                  onChange={(e) => update({ has_fireplace: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-[var(--accent)] focus:ring-[var(--accent)]"
                />
                <span className="text-sm font-medium text-[var(--navy)]">Has Fireplace</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Appliance BTU/h</label>
              <input
                type="number"
                min={0}
                step={100}
                value={form.appliance_btuh}
                onChange={(e) => update({ appliance_btuh: Number(e.target.value) || 0 })}
                className="form-input"
                placeholder="0"
              />
            </div>
          </div>
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
              'Update Room'
            ) : (
              'Add Room'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
