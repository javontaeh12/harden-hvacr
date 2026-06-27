'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { CheckIcon } from '@/components/icons';
import {
  HVAC_BRANDS,
  REFRIGERANT_TYPES,
  DESIGN_TEMPS_BY_REGION,
  DESIGN_TEMPS_BY_STATE,
} from '@/lib/installs/constants';
import type {
  ProjectType,
  SystemType,
  BuildingType,
  HumidityZone,
} from '@/lib/installs/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEP_LABELS = ['Address', 'Conditions', 'System', 'Existing'];

const BUILDING_TYPES: { value: BuildingType; label: string }[] = [
  { value: 'single_family', label: 'Single Family' },
  { value: 'townhome', label: 'Townhome' },
  { value: 'duplex', label: 'Duplex' },
  { value: 'condo', label: 'Condo' },
  { value: 'mobile_home', label: 'Mobile Home' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'small_commercial', label: 'Small Commercial' },
];

const PROJECT_TYPES: { value: ProjectType; label: string; desc: string }[] = [
  { value: 'replacement', label: 'Replacement', desc: 'Replacing existing HVAC system' },
  { value: 'new_construction', label: 'New Construction', desc: 'New build, no existing system' },
  { value: 'add_on', label: 'Add-On', desc: 'Adding to existing system' },
  { value: 'conversion', label: 'Conversion', desc: 'Changing system type (e.g., gas to electric)' },
];

const SYSTEM_TYPES: { value: SystemType; label: string; desc: string }[] = [
  { value: 'split', label: 'Split System', desc: 'Separate indoor/outdoor units' },
  { value: 'package', label: 'Package Unit', desc: 'All-in-one outdoor unit' },
  { value: 'mini_split', label: 'Mini-Split', desc: 'Ductless or multi-zone' },
  { value: 'dual_fuel', label: 'Dual Fuel', desc: 'Heat pump + gas furnace backup' },
  { value: 'heat_pump', label: 'Heat Pump', desc: 'Electric heating and cooling' },
  { value: 'furnace_only', label: 'Furnace Only', desc: 'Heating only' },
];

const HUMIDITY_ZONES: { value: HumidityZone; label: string }[] = [
  { value: 'dry', label: 'Dry' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'humid', label: 'Humid' },
  { value: 'very_humid', label: 'Very Humid' },
];

const EXISTING_EQUIPMENT_TYPES = ['AC', 'Heat Pump', 'Furnace', 'Package Unit', 'Mini-Split'];

// ---------------------------------------------------------------------------
// Form state interface
// ---------------------------------------------------------------------------

interface FormData {
  // Step 1
  project_name: string;
  customer_id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  building_type: BuildingType | '';
  stories: number;
  year_built: string;
  total_sqft: string;
  conditioned_sqft: string;
  // Step 2
  design_cooling_temp: string;
  design_heating_temp: string;
  indoor_cooling_temp: number;
  indoor_heating_temp: number;
  elevation_ft: string;
  humidity_zone: HumidityZone;
  climate_zone: string;
  // Step 3
  project_type: ProjectType | '';
  system_type: SystemType | '';
  notes: string;
  // Step 4
  existing_equip_type: string;
  existing_brand: string;
  existing_model: string;
  existing_tonnage: string;
  existing_age: string;
  existing_refrigerant: string;
  existing_condition_notes: string;
}

const DEFAULT_FORM: FormData = {
  project_name: '',
  customer_id: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  building_type: '',
  stories: 1,
  year_built: '',
  total_sqft: '',
  conditioned_sqft: '',
  design_cooling_temp: '',
  design_heating_temp: '',
  indoor_cooling_temp: 75,
  indoor_heating_temp: 70,
  elevation_ft: '',
  humidity_zone: 'humid',
  climate_zone: '',
  project_type: '',
  system_type: '',
  notes: '',
  existing_equip_type: '',
  existing_brand: '',
  existing_model: '',
  existing_tonnage: '',
  existing_age: '',
  existing_refrigerant: '',
  existing_condition_notes: '',
};

// ---------------------------------------------------------------------------
// Customer type (minimal for the dropdown)
// ---------------------------------------------------------------------------

interface Customer {
  id: string;
  full_name: string;
  phone: string | null;
  address: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewInstallProjectPage() {
  const router = useRouter();
  const { profile, groupId } = useAuth();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>({ ...DEFAULT_FORM });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [autoDetectNote, setAutoDetectNote] = useState('');

  const addressRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const update = useCallback(
    (fields: Partial<FormData>) => setForm((prev) => ({ ...prev, ...fields })),
    [],
  );

  // ------------------------------------------
  // Fetch customers for dropdown
  // ------------------------------------------
  useEffect(() => {
    if (!groupId) return;
    setCustomersLoading(true);
    fetch(`/api/customers?group_id=${groupId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCustomers(data);
      })
      .catch(() => {})
      .finally(() => setCustomersLoading(false));
  }, [groupId]);

  // ------------------------------------------
  // Google Places autocomplete (same pattern as BookingForm)
  // ------------------------------------------
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !addressRef.current) return;

    const initAutocomplete = () => {
      if (!addressRef.current || autocompleteRef.current) return;
      const ac = new google.maps.places.Autocomplete(addressRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'us' },
        fields: ['address_components', 'formatted_address'],
      });
      ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        if (!place.address_components) return;
        let street = '';
        let city = '';
        let state = '';
        let zip = '';
        for (const comp of place.address_components) {
          const t = comp.types[0];
          if (t === 'street_number') street = comp.long_name + ' ';
          if (t === 'route') street += comp.long_name;
          if (t === 'locality') city = comp.long_name;
          if (t === 'administrative_area_level_1') state = comp.short_name;
          if (t === 'postal_code') zip = comp.short_name;
        }
        update({ address: street.trim(), city, state, zip });
      });
      autocompleteRef.current = ac;
    };

    if (window.google?.maps?.places) {
      initAutocomplete();
      return;
    }

    if (!document.querySelector('script[src*="maps.googleapis.com"]')) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.onload = initAutocomplete;
      document.head.appendChild(script);
    } else {
      const check = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(check);
          initAutocomplete();
        }
      }, 100);
      return () => clearInterval(check);
    }
  }, [step, update]);

  // ------------------------------------------
  // Auto-detect design temps from city
  // ------------------------------------------
  const autoDetectDesignTemps = () => {
    const cityRaw = form.city.toLowerCase().trim().replace(/\s+/g, '_');
    const stateRaw = form.state.toUpperCase().trim();

    // 1. Exact city match
    const match = DESIGN_TEMPS_BY_REGION[cityRaw];
    if (match) {
      update({
        design_cooling_temp: String(match.cooling),
        design_heating_temp: String(match.heating),
      });
      setAutoDetectNote(`Auto-detected for ${form.city}: ${match.cooling}\u00B0F cooling / ${match.heating}\u00B0F heating`);
      return;
    }

    // 2. Fuzzy match on city name
    const keys = Object.keys(DESIGN_TEMPS_BY_REGION);
    const fuzzy = keys.find((k) => cityRaw.includes(k) || k.includes(cityRaw));
    if (fuzzy) {
      const temps = DESIGN_TEMPS_BY_REGION[fuzzy];
      update({
        design_cooling_temp: String(temps.cooling),
        design_heating_temp: String(temps.heating),
      });
      const displayName = fuzzy.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      setAutoDetectNote(`Matched closest city "${displayName}": ${temps.cooling}\u00B0F cooling / ${temps.heating}\u00B0F heating`);
      return;
    }

    // 3. State-level fallback
    if (stateRaw && DESIGN_TEMPS_BY_STATE[stateRaw]) {
      const stateTemps = DESIGN_TEMPS_BY_STATE[stateRaw];
      update({
        design_cooling_temp: String(stateTemps.cooling),
        design_heating_temp: String(stateTemps.heating),
      });
      setAutoDetectNote(`Using ${stateRaw} state average: ${stateTemps.cooling}\u00B0F cooling / ${stateTemps.heating}\u00B0F heating. Adjust if needed.`);
      return;
    }

    setAutoDetectNote('Could not find design temps for this location. Please enter manually.');
  };

  // ------------------------------------------
  // Validation per step
  // ------------------------------------------
  const canNext = () => {
    if (step === 1) {
      return (
        form.project_name.trim() !== '' &&
        form.address.trim() !== '' &&
        form.city.trim() !== '' &&
        form.state.trim() !== '' &&
        form.zip.trim() !== '' &&
        form.building_type !== '' &&
        form.total_sqft.trim() !== ''
      );
    }
    if (step === 2) {
      return (
        form.design_cooling_temp.trim() !== '' &&
        form.design_heating_temp.trim() !== ''
      );
    }
    if (step === 3) {
      return form.project_type !== '' && form.system_type !== '';
    }
    return true; // Step 4 is always valid (optional fields or skip)
  };

  // ------------------------------------------
  // Submit
  // ------------------------------------------
  const handleSubmit = async () => {
    setStatus('loading');
    setErrorMsg('');
    try {
      const existingEquipment: Record<string, unknown> =
        form.project_type !== 'new_construction'
          ? {
              equipment_type: form.existing_equip_type || null,
              brand: form.existing_brand || null,
              model_number: form.existing_model || null,
              tonnage: form.existing_tonnage ? Number(form.existing_tonnage) : null,
              age_years: form.existing_age ? Number(form.existing_age) : null,
              refrigerant_type: form.existing_refrigerant || null,
              condition_notes: form.existing_condition_notes || null,
            }
          : {};

      const body = {
        project_name: form.project_name.trim(),
        customer_id: form.customer_id || null,
        project_type: form.project_type,
        system_type: form.system_type,
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        zip: form.zip.trim(),
        building_type: form.building_type,
        stories: form.stories,
        year_built: form.year_built ? Number(form.year_built) : null,
        total_sqft: Number(form.total_sqft),
        conditioned_sqft: form.conditioned_sqft ? Number(form.conditioned_sqft) : null,
        design_cooling_temp: Number(form.design_cooling_temp),
        design_heating_temp: Number(form.design_heating_temp),
        indoor_cooling_temp: form.indoor_cooling_temp,
        indoor_heating_temp: form.indoor_heating_temp,
        elevation_ft: form.elevation_ft ? Number(form.elevation_ft) : null,
        humidity_zone: form.humidity_zone,
        climate_zone: form.climate_zone || null,
        existing_equipment: existingEquipment,
        notes: form.notes || null,
        group_id: groupId,
        created_by: profile?.id,
      };

      const res = await fetch('/api/installs/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create project');
      }

      const newProject = await res.json();
      router.push(`/admin/installs/${newProject.id}`);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  // ------------------------------------------
  // Render
  // ------------------------------------------
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
      <h1 className="text-2xl sm:text-3xl font-bold text-[var(--navy)] mb-1">New Install Project</h1>
      <p className="text-sm text-[var(--steel)] mb-6 sm:mb-8">
        Fill out the project details step by step.
      </p>

      {/* ---- Progress bar ---- */}
      <div className="mb-5 sm:mb-8">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          {STEP_LABELS.map((label, i) => {
            const num = i + 1;
            const isActive = num === step;
            const isDone = num < step;
            return (
              <button
                key={label}
                type="button"
                onClick={() => { if (isDone) setStep(num); }}
                className={`flex flex-col items-center gap-1 flex-1 ${isDone ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <div
                  className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-colors ${
                    isDone
                      ? 'bg-green-500 text-white'
                      : isActive
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isDone ? <CheckIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : num}
                </div>
                <span
                  className={`text-[10px] sm:text-xs font-medium ${
                    isActive ? 'text-[var(--navy)]' : 'text-[var(--steel)]'
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-[var(--accent)] h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${((step - 1) / (STEP_LABELS.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* ---- Step content ---- */}
      <div className="min-h-[400px]">
        {/* ================================================
            STEP 1: Address & Building
            ================================================ */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[var(--navy)]">Address &amp; Building</h3>
              <p className="text-sm text-[var(--steel)]">Where is the project located?</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Project Name *</label>
              <input
                type="text"
                value={form.project_name}
                onChange={(e) => update({ project_name: e.target.value })}
                className="form-input"
                placeholder="Smith Residence AC Replacement"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Customer</label>
              <select
                value={form.customer_id}
                onChange={(e) => update({ customer_id: e.target.value })}
                className="form-input"
              >
                <option value="">Select existing customer...</option>
                {customersLoading && <option disabled>Loading...</option>}
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}{c.phone ? ` - ${c.phone}` : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[var(--steel)] mt-1">Optional — you can link a customer later.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Street Address *</label>
              <input
                ref={addressRef}
                type="text"
                value={form.address}
                onChange={(e) => update({ address: e.target.value })}
                className="form-input"
                placeholder="Start typing your address..."
                autoComplete="off"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-semibold text-[var(--navy)] mb-1">City *</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => update({ city: e.target.value })}
                  className="form-input"
                  placeholder="Tallahassee"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--navy)] mb-1">State *</label>
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => update({ state: e.target.value })}
                  className="form-input"
                  placeholder="FL"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Zip *</label>
                <input
                  type="text"
                  value={form.zip}
                  onChange={(e) => update({ zip: e.target.value })}
                  className="form-input"
                  placeholder="32301"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Building Type *</label>
                <select
                  value={form.building_type}
                  onChange={(e) => update({ building_type: e.target.value as BuildingType })}
                  className="form-input"
                >
                  <option value="">Select building type...</option>
                  {BUILDING_TYPES.map((bt) => (
                    <option key={bt.value} value={bt.value}>{bt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Stories</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={form.stories}
                  onChange={(e) => update({ stories: Number(e.target.value) || 1 })}
                  className="form-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Year Built</label>
                <input
                  type="number"
                  min={1900}
                  max={2030}
                  value={form.year_built}
                  onChange={(e) => update({ year_built: e.target.value })}
                  className="form-input"
                  placeholder="2005"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Total Sq Ft *</label>
                <input
                  type="number"
                  min={1}
                  value={form.total_sqft}
                  onChange={(e) => update({ total_sqft: e.target.value })}
                  className="form-input"
                  placeholder="1800"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Conditioned Sq Ft</label>
                <input
                  type="number"
                  min={1}
                  value={form.conditioned_sqft}
                  onChange={(e) => update({ conditioned_sqft: e.target.value })}
                  className="form-input"
                  placeholder="1600"
                />
              </div>
            </div>
          </div>
        )}

        {/* ================================================
            STEP 2: Design Conditions
            ================================================ */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[var(--navy)]">Design Conditions</h3>
              <p className="text-sm text-[var(--steel)]">These determine heating and cooling load calculations.</p>
            </div>

            <button
              type="button"
              onClick={autoDetectDesignTemps}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[var(--accent)] border border-[var(--accent)] rounded-full hover:bg-[var(--accent)]/5 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              Auto-detect from location
            </button>

            {autoDetectNote && (
              <p className={`text-sm px-3 py-2 rounded-lg ${
                autoDetectNote.includes('Could not')
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-green-50 text-green-700'
              }`}>
                {autoDetectNote}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-[var(--navy)] mb-1">
                  Outdoor Cooling Design Temp (&deg;F) *
                </label>
                <input
                  type="number"
                  value={form.design_cooling_temp}
                  onChange={(e) => update({ design_cooling_temp: e.target.value })}
                  className="form-input"
                  placeholder="95"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--navy)] mb-1">
                  Outdoor Heating Design Temp (&deg;F) *
                </label>
                <input
                  type="number"
                  value={form.design_heating_temp}
                  onChange={(e) => update({ design_heating_temp: e.target.value })}
                  className="form-input"
                  placeholder="27"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-[var(--navy)] mb-1">
                  Indoor Cooling Temp (&deg;F)
                </label>
                <input
                  type="number"
                  value={form.indoor_cooling_temp}
                  onChange={(e) => update({ indoor_cooling_temp: Number(e.target.value) || 75 })}
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--navy)] mb-1">
                  Indoor Heating Temp (&deg;F)
                </label>
                <input
                  type="number"
                  value={form.indoor_heating_temp}
                  onChange={(e) => update({ indoor_heating_temp: Number(e.target.value) || 70 })}
                  className="form-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Elevation (ft)</label>
                <input
                  type="number"
                  value={form.elevation_ft}
                  onChange={(e) => update({ elevation_ft: e.target.value })}
                  className="form-input"
                  placeholder="200"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Humidity Zone</label>
                <select
                  value={form.humidity_zone}
                  onChange={(e) => update({ humidity_zone: e.target.value as HumidityZone })}
                  className="form-input"
                >
                  {HUMIDITY_ZONES.map((hz) => (
                    <option key={hz.value} value={hz.value}>{hz.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Climate Zone</label>
                <input
                  type="text"
                  value={form.climate_zone}
                  onChange={(e) => update({ climate_zone: e.target.value })}
                  className="form-input"
                  placeholder="2A"
                />
              </div>
            </div>
          </div>
        )}

        {/* ================================================
            STEP 3: Project & System Type
            ================================================ */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[var(--navy)]">Project &amp; System Type</h3>
              <p className="text-sm text-[var(--steel)]">What kind of installation is this?</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--navy)] mb-1.5">Project Type *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PROJECT_TYPES.map((pt) => (
                  <label
                    key={pt.value}
                    className={`flex items-start gap-3 p-3 sm:p-4 rounded-xl border cursor-pointer transition-colors ${
                      form.project_type === pt.value
                        ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                        : 'border-[var(--border)] hover:border-[var(--accent)]/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="project_type"
                      value={pt.value}
                      checked={form.project_type === pt.value}
                      onChange={(e) => update({ project_type: e.target.value as ProjectType })}
                      className="w-4 h-4 mt-0.5 text-[var(--accent)] focus:ring-[var(--accent)]"
                    />
                    <div>
                      <span className="text-sm font-semibold text-[var(--navy)]">{pt.label}</span>
                      <p className="text-xs text-[var(--steel)] mt-0.5">{pt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--navy)] mb-1.5">System Type *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SYSTEM_TYPES.map((st) => (
                  <label
                    key={st.value}
                    className={`flex items-start gap-3 p-3 sm:p-4 rounded-xl border cursor-pointer transition-colors ${
                      form.system_type === st.value
                        ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                        : 'border-[var(--border)] hover:border-[var(--accent)]/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="system_type"
                      value={st.value}
                      checked={form.system_type === st.value}
                      onChange={(e) => update({ system_type: e.target.value as SystemType })}
                      className="w-4 h-4 mt-0.5 text-[var(--accent)] focus:ring-[var(--accent)]"
                    />
                    <div>
                      <span className="text-sm font-semibold text-[var(--navy)]">{st.label}</span>
                      <p className="text-xs text-[var(--steel)] mt-0.5">{st.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Notes</label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => update({ notes: e.target.value })}
                className="form-input resize-none"
                placeholder="Any additional details about the project..."
              />
            </div>
          </div>
        )}

        {/* ================================================
            STEP 4: Existing System
            ================================================ */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[var(--navy)]">Existing System</h3>
              <p className="text-sm text-[var(--steel)]">
                {form.project_type === 'new_construction'
                  ? 'No existing system for new construction.'
                  : 'Describe the current system being replaced or modified.'}
              </p>
            </div>

            {form.project_type === 'new_construction' ? (
              <div className="p-6 rounded-xl border border-[var(--border)] bg-gray-50/50 text-center">
                <p className="text-sm text-[var(--steel)]">
                  No existing system &mdash; this is a new construction project.
                </p>
                <p className="text-sm text-[var(--steel)] mt-1">
                  You can submit the project now.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Equipment Type</label>
                    <select
                      value={form.existing_equip_type}
                      onChange={(e) => update({ existing_equip_type: e.target.value })}
                      className="form-input"
                    >
                      <option value="">Select type...</option>
                      {EXISTING_EQUIPMENT_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Brand</label>
                    <select
                      value={form.existing_brand}
                      onChange={(e) => update({ existing_brand: e.target.value })}
                      className="form-input"
                    >
                      <option value="">Select brand...</option>
                      {HVAC_BRANDS.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Model Number</label>
                    <input
                      type="text"
                      value={form.existing_model}
                      onChange={(e) => update({ existing_model: e.target.value })}
                      className="form-input"
                      placeholder="24ACC636A003"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Tonnage</label>
                    <input
                      type="number"
                      min={0.5}
                      step={0.5}
                      value={form.existing_tonnage}
                      onChange={(e) => update({ existing_tonnage: e.target.value })}
                      className="form-input"
                      placeholder="3"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Age (years)</label>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={form.existing_age}
                      onChange={(e) => update({ existing_age: e.target.value })}
                      className="form-input"
                      placeholder="15"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Refrigerant Type</label>
                  <select
                    value={form.existing_refrigerant}
                    onChange={(e) => update({ existing_refrigerant: e.target.value })}
                    className="form-input"
                  >
                    <option value="">Select refrigerant...</option>
                    {REFRIGERANT_TYPES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[var(--navy)] mb-1">Condition Notes</label>
                  <textarea
                    rows={3}
                    value={form.existing_condition_notes}
                    onChange={(e) => update({ existing_condition_notes: e.target.value })}
                    className="form-input resize-none"
                    placeholder="Describe current system condition..."
                  />
                </div>
              </>
            )}

            {status === 'error' && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2.5">
                {errorMsg}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ---- Navigation ---- */}
      <div className="flex items-center justify-between mt-6 sm:mt-8 pt-4 sm:pt-5 border-t border-[var(--border)]">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="px-5 py-2.5 text-sm font-semibold text-[var(--navy)] border border-[var(--border)] rounded-full hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
        ) : (
          <button
            type="button"
            onClick={() => router.push('/admin/installs')}
            className="px-5 py-2.5 text-sm font-semibold text-[var(--navy)] border border-[var(--border)] rounded-full hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        )}

        {step < STEP_LABELS.length ? (
          <button
            type="button"
            disabled={!canNext()}
            onClick={() => setStep(step + 1)}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-[var(--accent)] rounded-full hover:bg-[var(--accent-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            disabled={status === 'loading'}
            onClick={handleSubmit}
            className="px-8 py-3 text-base font-semibold text-white bg-[var(--accent)] rounded-full hover:bg-[var(--accent-dark)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {status === 'loading' ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating...
              </span>
            ) : (
              'Create Project'
            )}
          </button>
        )}
      </div>
    </div>
  );
}
