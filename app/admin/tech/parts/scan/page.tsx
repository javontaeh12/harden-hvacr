'use client';

import { useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useToast } from '@/hooks/useToast';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';
import {
  Camera,
  Upload,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Copy,
  CheckCircle2,
  Search,
  Zap,
  Thermometer,
  Wind,
  Gauge,
  Tag,
  Info,
} from 'lucide-react';

interface TagData {
  manufacturer: string | null;
  assembled_in: string | null;
  model_number: string | null;
  serial_number: string | null;
  unit_type: string | null;
  manufacture_date: string | null;
  tonnage: string | null;
  btu_cooling: string | null;
  btu_heating: string | null;
  seer: string | null;
  eer: string | null;
  hspf: string | null;
  afue: string | null;
  temperature_range: string | null;
  defrost_type: string | null;
  refrigerant_type: string | null;
  refrigerant_charge: string | null;
  oil_type: string | null;
  oil_charge: string | null;
  design_pressure_high: string | null;
  design_pressure_low: string | null;
  voltage: string | null;
  voltage_min: string | null;
  voltage_max: string | null;
  phases: string | null;
  frequency: string | null;
  min_circuit_ampacity: string | null;
  max_overcurrent_protection: string | null;
  compressor_phase: string | null;
  compressor_rla: string | null;
  compressor_lra: string | null;
  fan_motor_phase: string | null;
  fan_motor_fla: string | null;
  fan_motor_hp: string | null;
  blower_fla: string | null;
  heater_amps: string | null;
  heater_watts: string | null;
  compressor_model: string | null;
  metering_device: string | null;
  subcooling_spec: string | null;
  line_charge_notes: string | null;
  filter_size: string | null;
  weight: string | null;
  min_outdoor_temp: string | null;
  max_ambient_temp: string | null;
  solar_secondary_power: string | null;
  short_circuit_current: string | null;
  cfm: string | null;
  part_number: string | null;
  product_number: string | null;
  drawing_number: string | null;
  fan_identification: string | null;
  outdoor_motor_voltage: string | null;
  outdoor_motor_hp: string | null;
  certifications: string[] | null;
  additional_info: string[] | null;
  raw_text: string | null;
}

export default function ScanTagPage() {
  const pathname = usePathname();
  const { toast } = useToast();
  const backHref = pathname.startsWith('/admin/tech') ? '/admin/tech/parts' : '/admin/parts-store';
  const lookupHref = pathname.startsWith('/admin/tech') ? '/admin/tech/parts/lookup' : '/admin/parts-store/lookup';

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<TagData | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const updateField = (field: keyof TagData, value: string | null) => {
    if (!result) return;
    setResult({ ...result, [field]: value || null });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setResult(null);
    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!imageFile) return;
    setIsAnalyzing(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const res = await fetch('/api/parts-store/read-tag', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Analysis failed');
      } else {
        setResult(data);
        toast.success('Tag Read', 'Equipment data extracted successfully');
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setIsAnalyzing(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success('Copied', `${label} copied to clipboard`);
    setTimeout(() => setCopied(null), 1500);
  };

  const specSections = result ? [
    {
      title: 'Equipment ID',
      icon: Tag,
      items: [
        { label: 'Manufacturer', value: result.manufacturer, field: 'manufacturer' },
        { label: 'Assembled In', value: result.assembled_in, field: 'assembled_in' },
        { label: 'Model Number', value: result.model_number, field: 'model_number', copyable: true },
        { label: 'Serial Number', value: result.serial_number, field: 'serial_number', copyable: true },
        { label: 'Product Number', value: result.product_number, field: 'product_number', copyable: true },
        { label: 'Part Number', value: result.part_number, field: 'part_number', copyable: true },
        { label: 'Unit Type', value: result.unit_type, field: 'unit_type' },
        { label: 'Mfr Date', value: result.manufacture_date, field: 'manufacture_date' },
        { label: 'Tonnage', value: result.tonnage, field: 'tonnage' },
      ],
    },
    {
      title: 'Performance',
      icon: Wind,
      items: [
        { label: 'Cooling BTU', value: result.btu_cooling, field: 'btu_cooling' },
        { label: 'Heating BTU', value: result.btu_heating, field: 'btu_heating' },
        { label: 'SEER', value: result.seer, field: 'seer' },
        { label: 'EER', value: result.eer, field: 'eer' },
        { label: 'HSPF', value: result.hspf, field: 'hspf' },
        { label: 'AFUE', value: result.afue, field: 'afue' },
        { label: 'Temp Range', value: result.temperature_range, field: 'temperature_range' },
        { label: 'CFM', value: result.cfm, field: 'cfm' },
      ],
    },
    {
      title: 'Refrigerant & Pressures',
      icon: Thermometer,
      items: [
        { label: 'Refrigerant', value: result.refrigerant_type, field: 'refrigerant_type' },
        { label: 'Factory Charge', value: result.refrigerant_charge, field: 'refrigerant_charge' },
        { label: 'Oil Type', value: result.oil_type, field: 'oil_type' },
        { label: 'Oil Charge', value: result.oil_charge, field: 'oil_charge' },
        { label: 'Press. High', value: result.design_pressure_high, field: 'design_pressure_high' },
        { label: 'Press. Low', value: result.design_pressure_low, field: 'design_pressure_low' },
        { label: 'Metering', value: result.metering_device, field: 'metering_device' },
        { label: 'Subcooling', value: result.subcooling_spec, field: 'subcooling_spec' },
        { label: 'Line Charge', value: result.line_charge_notes, field: 'line_charge_notes' },
        { label: 'Defrost Type', value: result.defrost_type, field: 'defrost_type' },
      ],
    },
    {
      title: 'Electrical',
      icon: Zap,
      items: [
        { label: 'Voltage', value: result.voltage, field: 'voltage' },
        { label: 'Min Voltage', value: result.voltage_min, field: 'voltage_min' },
        { label: 'Max Voltage', value: result.voltage_max, field: 'voltage_max' },
        { label: 'Phase', value: result.phases, field: 'phases' },
        { label: 'Frequency', value: result.frequency, field: 'frequency' },
        { label: 'MCA', value: result.min_circuit_ampacity, field: 'min_circuit_ampacity' },
        { label: 'Max Fuse/Bkr', value: result.max_overcurrent_protection, field: 'max_overcurrent_protection' },
        { label: 'Comp RLA', value: result.compressor_rla, field: 'compressor_rla' },
        { label: 'Comp LRA', value: result.compressor_lra, field: 'compressor_lra' },
        { label: 'Fan FLA', value: result.fan_motor_fla, field: 'fan_motor_fla' },
        { label: 'Fan HP', value: result.fan_motor_hp, field: 'fan_motor_hp' },
        { label: 'Blower FLA', value: result.blower_fla, field: 'blower_fla' },
        { label: 'Heater Amps', value: result.heater_amps, field: 'heater_amps' },
        { label: 'Heater Watts', value: result.heater_watts, field: 'heater_watts' },
        { label: 'Short Circuit', value: result.short_circuit_current, field: 'short_circuit_current' },
        { label: '2nd Power', value: result.solar_secondary_power, field: 'solar_secondary_power' },
      ],
    },
    {
      title: 'Other',
      icon: Gauge,
      items: [
        { label: 'Comp Model', value: result.compressor_model, field: 'compressor_model' },
        { label: 'Fan ID', value: result.fan_identification, field: 'fan_identification' },
        { label: 'Drawing No.', value: result.drawing_number, field: 'drawing_number' },
        { label: 'Filter Size', value: result.filter_size, field: 'filter_size' },
        { label: 'Weight', value: result.weight, field: 'weight' },
        { label: 'Min Outdoor', value: result.min_outdoor_temp, field: 'min_outdoor_temp' },
        { label: 'Max Ambient', value: result.max_ambient_temp, field: 'max_ambient_temp' },
        { label: 'OD Motor V', value: result.outdoor_motor_voltage, field: 'outdoor_motor_voltage' },
        { label: 'OD Motor HP', value: result.outdoor_motor_hp, field: 'outdoor_motor_hp' },
      ],
    },
  ] : [];

  return (
    <div className="space-y-4 pb-20 w-full">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={backHref} className="p-2 -ml-2 rounded-lg hover:bg-[#e8f0f8] transition-colors">
          <ArrowLeft className="w-5 h-5 text-[#4a6580]" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#0a1f3f]">Scan Data Tag</h1>
          <p className="text-[#4a6580] text-sm mt-0.5">HVAC & refrigeration equipment nameplates</p>
        </div>
      </div>

      {/* Camera / Upload */}
      {!imagePreview && (
        <div className="bg-white rounded-xl border border-[#c8d8ea] p-6">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-[#e55b2b]/30 bg-[#e55b2b]/5 hover:bg-[#e55b2b]/10 hover:shadow-md transition-all"
            >
              <Camera className="w-8 h-8 text-[#e55b2b]" />
              <span className="text-sm font-bold text-[#e55b2b]">Take Photo</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-[#c8d8ea] bg-white hover:bg-[#e8f0f8] hover:shadow-md transition-all"
            >
              <Upload className="w-8 h-8 text-[#4a6580]" />
              <span className="text-sm font-bold text-[#4a6580]">Upload Image</span>
            </button>
          </div>
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
          <p className="text-xs text-[#4a6580] text-center mt-3">
            For best results, take a clear, well-lit photo of the entire data tag
          </p>
        </div>
      )}

      {/* Image Preview */}
      {imagePreview && !result && (
        <div className="bg-white rounded-xl border border-[#c8d8ea] overflow-hidden">
          <div className="relative">
            <img src={imagePreview} alt="Data tag" className="w-full max-h-80 object-contain bg-[#e8f0f8]" />
            <button
              onClick={() => { setImagePreview(null); setImageFile(null); setError(''); }}
              className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-[#e55b2b] hover:bg-[#d14e22] disabled:opacity-50 transition-colors"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Reading Data Tag...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Analyze Data Tag
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {isAnalyzing && (
        <div className="text-center py-8">
          <Loader2 className="w-10 h-10 text-[#e55b2b] animate-spin mx-auto mb-3" />
          <p className="text-[#0a1f3f] font-medium">Reading equipment data tag...</p>
          <p className="text-sm text-[#4a6580] mt-1">AI reading tag + searching web for manufacturer specs</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700">{error}</p>
            <p className="text-xs text-red-500 mt-1">Try taking a clearer photo with better lighting.</p>
          </div>
        </div>
      )}

      {/* Results -- Editable Digital Tag */}
      {result && (
        <>
          {/* Quick actions bar */}
          <div className="flex items-center gap-2">
            {result.model_number && (
              <Link
                href={`${lookupHref}?model=${encodeURIComponent(result.model_number)}&brand=${encodeURIComponent(result.manufacturer || '')}&serial=${encodeURIComponent(result.serial_number || '')}`}
                className="flex-1 flex items-center justify-center gap-2 bg-[#e55b2b] text-white rounded-xl py-3 px-4 hover:bg-[#d14e22] transition-colors text-sm font-bold"
              >
                <Search className="w-4 h-4" />
                Look Up Parts
              </Link>
            )}
            <button
              onClick={() => setEditMode(!editMode)}
              className={`px-4 py-3 rounded-xl text-sm font-bold transition-colors border ${
                editMode ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700' : 'bg-[#e55b2b]/5 text-[#e55b2b] border-[#e55b2b]/20 hover:bg-[#e55b2b]/10'
              }`}
            >
              {editMode ? 'Done' : 'Edit'}
            </button>
            <button
              onClick={() => { setImagePreview(null); setImageFile(null); setResult(null); setEditMode(false); }}
              className="px-4 py-3 rounded-xl text-sm font-bold bg-[#e8f0f8] text-[#4a6580] hover:bg-[#c8d8ea] transition-colors"
            >
              New
            </button>
          </div>

          {/* Image thumbnail */}
          {imagePreview && (
            <div className="flex items-center gap-3 bg-white rounded-xl border border-[#c8d8ea] p-3">
              <img src={imagePreview} alt="Tag" className="w-16 h-16 rounded-lg object-cover bg-[#e8f0f8]" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#0a1f3f] truncate">
                  {result.manufacturer || 'Unknown'} {result.unit_type || 'Unit'}
                </p>
                <p className="text-xs text-[#4a6580] font-mono truncate">{result.model_number || 'No model'}</p>
              </div>
            </div>
          )}

          {/* Digital Tag Sections */}
          {specSections.map((section) => {
            const items = editMode
              ? section.items
              : section.items.filter(i => i.value && i.value !== 'null' && i.value !== 'N/A');
            if (items.length === 0) return null;
            return (
              <div key={section.title} className="bg-white rounded-xl border border-[#c8d8ea] overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-[#0a1f3f] to-[#1a3a5c] border-b border-[#c8d8ea]">
                  <section.icon className="w-4 h-4 text-white/80" />
                  <h3 className="text-sm font-bold text-white">{section.title}</h3>
                </div>
                <div className="divide-y divide-[#c8d8ea]/50">
                  {items.map((item) => (
                    <div key={item.label} className="flex items-center justify-between px-4 py-2 gap-3">
                      <span className="text-xs font-medium text-[#4a6580] uppercase flex-shrink-0 w-28">{item.label}</span>
                      {editMode ? (
                        <input
                          type="text"
                          value={item.value || ''}
                          onChange={(e) => {
                            if ('field' in item && item.field) updateField(item.field as keyof TagData, e.target.value);
                          }}
                          className="flex-1 text-sm font-bold text-[#0a1f3f] text-right bg-[#e55b2b]/5 border border-[#e55b2b]/20 rounded px-2 py-1 focus:outline-none focus:border-[#e55b2b] min-w-0"
                        />
                      ) : (
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-mono font-bold text-[#0a1f3f] text-right truncate">{item.value}</span>
                          {'copyable' in item && item.copyable && item.value && (
                            <button onClick={() => copyToClipboard(item.value!, item.label)} className="p-1 rounded hover:bg-[#e8f0f8] flex-shrink-0">
                              {copied === item.label ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-[#4a6580]" />}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Certifications */}
          {result.certifications && result.certifications.length > 0 && (
            <div className="bg-white rounded-xl border border-[#c8d8ea] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-[#0a1f3f] to-[#1a3a5c] border-b border-[#c8d8ea]">
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <h3 className="text-sm font-bold text-white">Certifications</h3>
              </div>
              <div className="p-4 flex flex-wrap gap-2">
                {result.certifications.map((cert, i) => (
                  <Badge key={i} variant="success" size="md">{cert}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Additional info */}
          {result.additional_info && result.additional_info.length > 0 && (
            <div className="bg-white rounded-xl border border-[#c8d8ea] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-[#0a1f3f] to-[#1a3a5c] border-b border-[#c8d8ea]">
                <Info className="w-4 h-4 text-white/80" />
                <h3 className="text-sm font-bold text-white">Additional Info</h3>
              </div>
              <div className="p-4 space-y-1.5">
                {result.additional_info.map((info, i) => (
                  editMode ? (
                    <input
                      key={i}
                      type="text"
                      value={info}
                      onChange={(e) => {
                        const updated = [...(result.additional_info || [])];
                        updated[i] = e.target.value;
                        setResult({ ...result, additional_info: updated });
                      }}
                      className="w-full text-sm text-[#0a1f3f] bg-[#e55b2b]/5 border border-[#e55b2b]/20 rounded px-2 py-1 focus:outline-none focus:border-[#e55b2b]"
                    />
                  ) : (
                    <p key={i} className="text-sm text-[#0a1f3f]">&bull; {info}</p>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Raw text */}
          {result.raw_text && (
            <div className="bg-[#e8f0f8] rounded-xl border border-[#c8d8ea] p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-[#4a6580] uppercase">Raw Tag Text</h3>
                <button
                  onClick={() => copyToClipboard(result.raw_text!, 'raw')}
                  className="text-xs text-[#e55b2b] font-medium hover:text-[#d14e22]"
                >
                  {copied === 'raw' ? 'Copied!' : 'Copy All'}
                </button>
              </div>
              <pre className="text-xs text-[#4a6580] whitespace-pre-wrap font-mono leading-relaxed break-words">
                {result.raw_text}
              </pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}
