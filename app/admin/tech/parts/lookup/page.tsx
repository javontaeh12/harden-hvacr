'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { usePathname, useSearchParams } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import Link from 'next/link';
import {
  Search,
  ArrowLeft,
  Loader2,
  ExternalLink,
  Plus,
  CheckCircle2,
  Package,
  Cpu,
  Thermometer,
  Zap,
  Wind,
  Info,
  ShoppingBag,
  AlertCircle,
} from 'lucide-react';

interface LookupPart {
  name: string;
  part_number: string;
  category: string;
  estimated_cost: number | null;
  supplier_suggestions: string[];
  description: string;
  manufacturer: string;
}

interface UnitInfo {
  manufacturer: string;
  model_number: string;
  serial_number?: string;
  unit_type: string;
  tonnage?: string;
  btu_cooling?: string;
  btu_heating?: string;
  seer?: string;
  eer?: string;
  hspf?: string;
  refrigerant?: string;
  voltage?: string;
  rla?: string;
  lra?: string;
  fla_outdoor_fan?: string;
  fla_indoor_blower?: string;
  mca?: string;
  mocp?: string;
  year?: string;
  compressor_type?: string;
  metering_device?: string;
  weight?: string;
}

interface LookupResult {
  unit_info: UnitInfo;
  common_parts: LookupPart[];
  search_links: { label: string; url: string }[];
}

const HVAC_BRANDS = [
  'Carrier', 'Bryant', 'Payne', 'Trane', 'American Standard', 'Lennox',
  'Rheem', 'Ruud', 'Goodman', 'Amana', 'Daikin', 'York', 'Coleman',
  'Heil', 'Tempstar', 'Comfortmaker', 'Keeprite', 'Arcoaire',
  'Mitsubishi', 'Fujitsu', 'LG', 'Samsung', 'Bosch',
  'Copeland', 'Emerson', 'Danfoss', 'Honeywell', 'White-Rodgers',
  'Bard', 'Friedrich', 'Haier', 'Nortek', 'Midea',
  'Ice-O-Matic', 'Manitowoc', 'Scotsman', 'Hoshizaki',
  'Turbo Air', 'True Manufacturing', 'Hussmann',
];

export default function PartsLookupPage() {
  const { groupId } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const backHref = pathname.startsWith('/admin/tech') ? '/admin/tech/parts' : '/admin/parts-store';
  const [brand, setBrand] = useState('');
  const [modelNumber, setModelNumber] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [autoSearched, setAutoSearched] = useState(false);

  // Auto-fill from URL params (e.g. from Scan Tag page)
  useEffect(() => {
    const model = searchParams.get('model');
    const brandParam = searchParams.get('brand');
    const serial = searchParams.get('serial');
    if (model && !autoSearched) {
      setModelNumber(model);
      if (brandParam) setBrand(brandParam);
      if (serial) setSerialNumber(serial);
      setAutoSearched(true);
    }
  }, [searchParams, autoSearched]);
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState('');
  const [addedParts, setAddedParts] = useState<Set<string>>(new Set());
  const [addingPart, setAddingPart] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelNumber.trim()) return;

    setIsSearching(true);
    setError('');
    setResult(null);
    setAddedParts(new Set());

    try {
      const res = await fetch('/api/parts-store/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: brand.trim() || undefined,
          model_number: modelNumber.trim(),
          serial_number: serialNumber.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Lookup failed');
      } else {
        setResult(data);
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setIsSearching(false);
  };

  const handleAddToStore = async (part: LookupPart) => {
    if (!groupId) return;
    setAddingPart(part.part_number);

    try {
      const res = await fetch('/api/parts-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: groupId,
          name: part.name,
          part_number: part.part_number || null,
          category: part.category,
          supplier_name: part.supplier_suggestions?.[0] || 'Other',
          supplier_cost: part.estimated_cost || 0,
          markup_pct: 50,
          in_stock: true,
          notes: `${part.description}. Mfr: ${part.manufacturer}. For ${result?.unit_info?.manufacturer} ${result?.unit_info?.model_number}`,
        }),
      });

      if (res.ok) {
        setAddedParts(prev => new Set(prev).add(part.part_number));
        toast.success('Part Added', `${part.name} added to your store`);
      }
    } catch (err) {
      console.error('Add to store error:', err);
      toast.error('Failed', 'Could not add part to store');
    }
    setAddingPart(null);
  };

  const getUnitIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('furnace') || t.includes('heat')) return Thermometer;
    if (t.includes('ac') || t.includes('air') || t.includes('split')) return Wind;
    if (t.includes('electric')) return Zap;
    return Cpu;
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={backHref}
          className="p-2 -ml-2 rounded-lg hover:bg-[#e8f0f8] transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[#4a6580]" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#0a1f3f]">Parts Lookup</h1>
          <p className="text-[#4a6580] text-sm mt-0.5">Search by model or serial number</p>
        </div>
      </div>

      {/* Search form */}
      <form onSubmit={handleSearch} className="bg-white rounded-xl border border-[#c8d8ea] p-4 sm:p-6">
        <div className="mb-3">
          <label className="block text-sm font-medium text-[#4a6580] mb-1">
            Brand / Manufacturer <span className="text-[#4a6580]/50">(recommended)</span>
          </label>
          <select
            value={brand}
            onChange={e => setBrand(e.target.value)}
            className="w-full border border-[#c8d8ea] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#e55b2b]/20 focus:border-[#e55b2b] text-[#0a1f3f]"
          >
            <option value="">-- Select or type below --</option>
            {HVAC_BRANDS.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-[#4a6580] mb-1">
              Model Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={modelNumber}
              onChange={e => setModelNumber(e.target.value)}
              placeholder="e.g. 24ACC636A003"
              className="w-full border border-[#c8d8ea] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#e55b2b]/20 focus:border-[#e55b2b] font-mono text-[#0a1f3f]"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#4a6580] mb-1">
              Serial Number <span className="text-[#4a6580]/50">(optional)</span>
            </label>
            <input
              type="text"
              value={serialNumber}
              onChange={e => setSerialNumber(e.target.value)}
              placeholder="e.g. 4019E12345"
              className="w-full border border-[#c8d8ea] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#e55b2b]/20 focus:border-[#e55b2b] font-mono text-[#0a1f3f]"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSearching || !modelNumber.trim()}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-[#e55b2b] rounded-xl hover:bg-[#d14e22] disabled:opacity-50 transition-colors"
        >
          {isSearching ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Look Up Parts
            </>
          )}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700">{error}</p>
            <p className="text-xs text-red-500 mt-1">Try checking the model number and searching again.</p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isSearching && (
        <div className="text-center py-12">
          <Loader2 className="w-10 h-10 text-[#e55b2b] animate-spin mx-auto mb-3" />
          <p className="text-[#0a1f3f] font-medium">Analyzing model number...</p>
          <p className="text-sm text-[#4a6580] mt-1">Looking up equipment specs and common parts</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Unit Info Card — Navy gradient header */}
          <div className="bg-white rounded-xl border border-[#c8d8ea] overflow-hidden">
            <div className="bg-gradient-to-r from-[#0a1f3f] to-[#1a3a5c] p-4 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  {(() => {
                    const Icon = getUnitIcon(result.unit_info.unit_type);
                    return <Icon className="w-6 h-6 text-white" />;
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-white">
                    {result.unit_info.manufacturer} {result.unit_info.unit_type}
                  </h2>
                  <p className="text-sm text-white/70 font-mono mt-0.5">
                    Model: {result.unit_info.model_number}
                    {result.unit_info.serial_number && ` | Serial: ${result.unit_info.serial_number}`}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {result.unit_info.tonnage && (
                      <span className="px-2.5 py-1 bg-white/15 rounded-full text-xs font-semibold text-white border border-white/20">
                        {result.unit_info.tonnage}
                      </span>
                    )}
                    {result.unit_info.seer && (
                      <span className="px-2.5 py-1 bg-white/15 rounded-full text-xs font-semibold text-white border border-white/20">
                        {result.unit_info.seer}
                      </span>
                    )}
                    {result.unit_info.refrigerant && (
                      <span className="px-2.5 py-1 bg-emerald-500/20 rounded-full text-xs font-semibold text-emerald-200 border border-emerald-400/30">
                        {result.unit_info.refrigerant}
                      </span>
                    )}
                    {result.unit_info.year && (
                      <span className="px-2.5 py-1 bg-white/10 rounded-full text-xs font-semibold text-white/80 border border-white/15">
                        Mfg: {result.unit_info.year}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-[#c8d8ea]/50 overflow-hidden">
              {[
                { label: 'Cooling BTU', value: result.unit_info.btu_cooling },
                { label: 'Heating BTU', value: result.unit_info.btu_heating },
                { label: 'SEER', value: result.unit_info.seer },
                { label: 'EER', value: result.unit_info.eer },
                { label: 'HSPF', value: result.unit_info.hspf },
                { label: 'Voltage', value: result.unit_info.voltage },
                { label: 'Compressor RLA', value: result.unit_info.rla },
                { label: 'Compressor LRA', value: result.unit_info.lra },
                { label: 'Outdoor Fan FLA', value: result.unit_info.fla_outdoor_fan },
                { label: 'Indoor Blower FLA', value: result.unit_info.fla_indoor_blower },
                { label: 'MCA', value: result.unit_info.mca },
                { label: 'MOCP (Breaker)', value: result.unit_info.mocp },
                { label: 'Compressor', value: result.unit_info.compressor_type },
                { label: 'Metering', value: result.unit_info.metering_device },
                { label: 'Weight', value: result.unit_info.weight },
              ].filter(s => s.value && s.value !== 'null' && s.value !== 'N/A').map((spec, i) => (
                <div key={i} className="bg-white px-3 py-2.5">
                  <p className="text-[10px] font-semibold text-[#4a6580] uppercase">{spec.label}</p>
                  <p className="text-sm font-bold text-[#0a1f3f] mt-0.5">{spec.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Search Links */}
          {result.search_links?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[#4a6580] uppercase tracking-wider mb-2 px-1">
                Search Suppliers
              </h3>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
                {result.search_links.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#e55b2b] bg-[#e55b2b]/5 border border-[#e55b2b]/20 rounded-lg hover:bg-[#e55b2b]/10 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Parts List */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-sm font-semibold text-[#4a6580] uppercase tracking-wider">
                Common Parts ({result.common_parts?.length || 0})
              </h3>
              <div className="flex items-center gap-1 text-xs text-[#4a6580]">
                <Info className="w-3 h-3" />
                Prices are estimates
              </div>
            </div>

            <div className="space-y-2">
              {result.common_parts?.map((part, i) => {
                const isAdded = addedParts.has(part.part_number);
                const isAdding = addingPart === part.part_number;
                return (
                  <div
                    key={i}
                    className="bg-white rounded-xl border border-[#c8d8ea] p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="default" size="sm">{part.category}</Badge>
                          <span className="text-[10px] text-[#4a6580] font-mono">{part.part_number}</span>
                        </div>
                        <h4 className="text-sm font-bold text-[#0a1f3f]">{part.name}</h4>
                        <p className="text-xs text-[#4a6580] mt-0.5 line-clamp-2">{part.description}</p>

                        {/* Supplier suggestions */}
                        <div className="flex items-center gap-1.5 mt-2">
                          <ShoppingBag className="w-3 h-3 text-[#c8d8ea]" />
                          <div className="flex gap-1">
                            {part.supplier_suggestions?.map((s, j) => (
                              <span key={j} className="text-[10px] font-medium text-[#e55b2b] bg-[#e55b2b]/5 px-1.5 py-0.5 rounded">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        {part.estimated_cost != null ? (
                          <p className="text-lg font-bold text-[#0a1f3f]">{formatCurrency(part.estimated_cost)}</p>
                        ) : (
                          <p className="text-xs text-[#4a6580] italic">Price varies</p>
                        )}
                        <p className="text-[10px] text-[#4a6580] mt-0.5">est. cost</p>

                        <button
                          onClick={() => handleAddToStore(part)}
                          disabled={isAdded || isAdding}
                          className={`mt-2 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                            isAdded
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                              : 'bg-[#e55b2b]/5 text-[#e55b2b] border border-[#e55b2b]/20 hover:bg-[#e55b2b]/10'
                          }`}
                        >
                          {isAdding ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : isAdded ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              Added
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3" />
                              Add to Store
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-700">Pricing Disclaimer</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Estimated costs are AI-generated approximations. Always verify pricing with your supplier before quoting customers.
                Use the supplier search links above for current pricing.
              </p>
            </div>
          </div>
        </>
      )}

      {/* Empty state when no search yet */}
      {!result && !isSearching && !error && (
        <EmptyState
          icon={<Package className="w-8 h-8" />}
          title="Look Up Equipment Parts"
          description="Enter the model number from the equipment nameplate to identify the unit and find common replacement parts with estimated pricing."
        />
      )}
    </div>
  );
}
