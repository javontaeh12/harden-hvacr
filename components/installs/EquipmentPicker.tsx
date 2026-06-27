'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Search, Package } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import type { EquipmentCatalogItem, EquipmentCategory, Tier } from '@/lib/installs/types';
import { HVAC_BRANDS } from '@/lib/installs/constants';

interface EquipmentPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: EquipmentCatalogItem) => void;
  filterCategory?: EquipmentCategory;
  filterTonnage?: number;
  title?: string;
}

const CATEGORIES: { value: EquipmentCategory; label: string }[] = [
  { value: 'condenser', label: 'Condenser' },
  { value: 'air_handler', label: 'Air Handler' },
  { value: 'furnace', label: 'Furnace' },
  { value: 'coil', label: 'Coil' },
  { value: 'heat_pump', label: 'Heat Pump' },
  { value: 'mini_split', label: 'Mini Split' },
  { value: 'thermostat', label: 'Thermostat' },
  { value: 'package_unit', label: 'Package Unit' },
];

export function EquipmentPicker({
  isOpen,
  onClose,
  onSelect,
  filterCategory,
  filterTonnage,
  title = 'Select Equipment',
}: EquipmentPickerProps) {
  const { groupId } = useAuth();
  const [catalog, setCatalog] = useState<EquipmentCatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>(filterCategory || '');
  const [brand, setBrand] = useState('');
  const [tier, setTier] = useState<string>('');
  const [tonnage, setTonnage] = useState<string>(filterTonnage ? String(filterTonnage) : '');

  useEffect(() => {
    if (!isOpen || !groupId) return;

    async function fetchCatalog() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ group_id: groupId! });
        if (category) params.set('category', category);
        if (brand) params.set('brand', brand);
        if (tier) params.set('tier', tier);
        if (search) params.set('search', search);

        const res = await fetch(`/api/installs/equipment-catalog?${params}`);
        if (res.ok) {
          setCatalog(await res.json());
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }

    const timeout = setTimeout(fetchCatalog, 300);
    return () => clearTimeout(timeout);
  }, [isOpen, groupId, category, brand, tier, search]);

  const filtered = useMemo(() => {
    let items = catalog;
    if (tonnage) {
      const t = Number(tonnage);
      items = items.filter(i => i.tonnage === t || !i.tonnage);
    }
    return items;
  }, [catalog, tonnage]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-[var(--navy)]">{title}</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-gray-100 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search model, brand, description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] outline-none"
            />
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap gap-2">
            {!filterCategory && (
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            )}
            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
            >
              <option value="">All Brands</option>
              {HVAC_BRANDS.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <select
              value={tonnage}
              onChange={(e) => setTonnage(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
            >
              <option value="">All Tonnage</option>
              {[1.5, 2, 2.5, 3, 3.5, 4, 5].map(t => (
                <option key={t} value={t}>{t}T</option>
              ))}
            </select>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
            >
              <option value="">All Tiers</option>
              <option value="good">Good</option>
              <option value="better">Better</option>
              <option value="best">Best</option>
            </select>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-[var(--accent)] rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="w-10 h-10 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-[var(--navy)]">No equipment found</p>
              <p className="text-sm text-[var(--steel)]">
                Try adjusting your filters or add items to your equipment catalog.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                  className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--navy)] truncate">
                        {item.brand} {item.model_number}
                      </p>
                      {item.description && (
                        <p className="text-xs text-[var(--steel)] truncate">{item.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        {item.tonnage && (
                          <span className="text-xs text-[var(--steel)]">{item.tonnage}T</span>
                        )}
                        {item.seer_rating && (
                          <span className="text-xs text-[var(--steel)]">{item.seer_rating} SEER</span>
                        )}
                        {item.hspf && (
                          <span className="text-xs text-[var(--steel)]">{item.hspf} HSPF</span>
                        )}
                        {item.refrigerant_type && (
                          <span className="text-xs text-[var(--steel)]">{item.refrigerant_type}</span>
                        )}
                        {item.tier && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 capitalize">
                            {item.tier}
                          </span>
                        )}
                      </div>
                    </div>
                    {item.retail_price != null && (
                      <span className="text-sm font-semibold text-[var(--navy)] whitespace-nowrap">
                        ${item.retail_price.toLocaleString()}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
