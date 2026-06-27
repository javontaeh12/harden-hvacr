'use client';

import { Trash2, Star, Edit3 } from 'lucide-react';
import type { InstallEquipmentOption, Tier } from '@/lib/installs/types';

const TIER_STYLES: Record<Tier, { bg: string; border: string; badge: string; label: string }> = {
  good: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    badge: 'bg-gray-100 text-gray-700',
    label: 'Good',
  },
  better: {
    bg: 'bg-blue-50/50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
    label: 'Better',
  },
  best: {
    bg: 'bg-amber-50/50',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-700',
    label: 'Best',
  },
};

interface EquipmentOptionCardProps {
  option: InstallEquipmentOption;
  onEdit: (option: InstallEquipmentOption) => void;
  onDelete: (id: string) => void;
  onSetRecommended: (id: string) => void;
}

export function EquipmentOptionCard({ option, onEdit, onDelete, onSetRecommended }: EquipmentOptionCardProps) {
  const style = TIER_STYLES[option.tier] || TIER_STYLES.good;

  return (
    <div className={`${style.bg} rounded-xl border ${style.border} shadow-sm overflow-hidden flex flex-col`}>
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-200/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${style.badge}`}>
            {style.label}
          </span>
          {option.label && (
            <span className="text-sm text-[var(--steel)]">{option.label}</span>
          )}
          {option.is_recommended && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
              <Star className="w-3 h-3 fill-current" /> Recommended
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!option.is_recommended && (
            <button
              type="button"
              onClick={() => onSetRecommended(option.id)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition-colors"
              title="Set as recommended"
            >
              <Star className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onEdit(option)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(option.id)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Equipment specs */}
      <div className="px-5 py-4 space-y-3 flex-1">
        {/* Key specs row */}
        <div className="flex items-center gap-4">
          {option.tonnage && (
            <div>
              <p className="text-xs text-[var(--steel)]">Tonnage</p>
              <p className="text-sm font-bold text-[var(--navy)]">{option.tonnage}T</p>
            </div>
          )}
          {option.seer && (
            <div>
              <p className="text-xs text-[var(--steel)]">SEER</p>
              <p className="text-sm font-bold text-[var(--navy)]">{option.seer}</p>
            </div>
          )}
          {option.hspf && (
            <div>
              <p className="text-xs text-[var(--steel)]">HSPF</p>
              <p className="text-sm font-bold text-[var(--navy)]">{option.hspf}</p>
            </div>
          )}
          {option.warranty_years && (
            <div>
              <p className="text-xs text-[var(--steel)]">Warranty</p>
              <p className="text-sm font-bold text-[var(--navy)]">{option.warranty_years}yr</p>
            </div>
          )}
        </div>

        {/* Equipment lines */}
        <div className="space-y-1.5">
          {option.condenser_model && (
            <EquipmentLine label="Condenser" model={option.condenser_model} price={option.condenser_price} />
          )}
          {option.air_handler_model && (
            <EquipmentLine label="Air Handler" model={option.air_handler_model} price={option.air_handler_price} />
          )}
          {option.furnace_model && (
            <EquipmentLine label="Furnace" model={option.furnace_model} price={option.furnace_price} />
          )}
          {option.coil_model && (
            <EquipmentLine label="Coil" model={option.coil_model} price={option.coil_price} />
          )}
          {option.thermostat_model && (
            <EquipmentLine label="Thermostat" model={option.thermostat_model} price={option.thermostat_price} />
          )}
        </div>

        {/* Accessories */}
        {option.accessories && option.accessories.length > 0 && (
          <div className="pt-2 border-t border-gray-200/50">
            <p className="text-xs font-medium text-[var(--steel)] mb-1">Accessories</p>
            {option.accessories.map((acc, i) => (
              <div key={i} className="flex justify-between text-xs text-[var(--steel)]">
                <span>{acc.name} x{acc.qty}</span>
                <span>${acc.total.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pricing footer */}
      <div className="px-5 py-3 bg-white/60 border-t border-gray-200/50 space-y-1">
        <PricingLine label="Equipment" value={option.equipment_total} />
        <PricingLine label="Labor" value={option.labor_total} />
        <PricingLine label="Materials" value={option.material_total} />
        {option.permit_fee > 0 && <PricingLine label="Permit" value={option.permit_fee} />}
        {option.disposal_fee > 0 && <PricingLine label="Disposal" value={option.disposal_fee} />}
        {option.tax > 0 && <PricingLine label="Tax" value={option.tax} />}
        <div className="flex justify-between text-sm font-bold pt-1 border-t border-gray-200">
          <span className="text-[var(--navy)]">Total</span>
          <span className="text-[var(--navy)]">${option.total.toLocaleString()}</span>
        </div>
        {option.estimated_annual_savings && option.estimated_annual_savings > 0 && (
          <p className="text-xs text-emerald-600 text-right">
            Est. ${option.estimated_annual_savings}/yr savings
          </p>
        )}
      </div>
    </div>
  );
}

function EquipmentLine({ label, model, price }: { label: string; model: string; price: number | null }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <div className="min-w-0">
        <p className="text-xs text-[var(--steel)]">{label}</p>
        <p className="text-sm font-medium text-[var(--navy)] truncate">{model}</p>
      </div>
      {price != null && (
        <span className="text-sm text-[var(--steel)] flex-shrink-0">${price.toLocaleString()}</span>
      )}
    </div>
  );
}

function PricingLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-[var(--steel)]">{label}</span>
      <span className="text-[var(--navy)]">${value.toLocaleString()}</span>
    </div>
  );
}
