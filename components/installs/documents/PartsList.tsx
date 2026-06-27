'use client';

import type { InstallDocument } from '@/lib/installs/types';

interface PartsListProps {
  document: InstallDocument;
}

export function PartsList({ document }: PartsListProps) {
  const c = document.content as Record<string, unknown>;
  const categories = (c.categories as Record<string, { name: string; quantity: number; unit: string }[]>) || {};
  const totalItems = (c.totalItems as number) || 0;

  const CATEGORY_LABELS: Record<string, string> = {
    equipment: 'Equipment',
    ductwork: 'Ductwork',
    fittings: 'Fittings & Registers',
    electrical: 'Electrical',
    refrigerant: 'Refrigerant & Line Set',
    supports: 'Supports & Hangers',
    insulation: 'Insulation',
    misc: 'Miscellaneous',
    disposal: 'Disposal',
  };

  const categoryOrder = ['equipment', 'ductwork', 'fittings', 'electrical', 'refrigerant', 'supports', 'insulation', 'misc', 'disposal'];

  return (
    <div className="space-y-5 print:space-y-3">
      {/* Header */}
      <div className="border-b-2 border-[var(--navy)] pb-3 flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--navy)]">{document.title}</h1>
          <p className="text-sm text-[var(--steel)]">
            {c.equipmentTonnage ? `${String(c.equipmentTonnage)}T System` : null}
            {c.equipmentTier ? ` — ${(c.equipmentTier as string).charAt(0).toUpperCase() + (c.equipmentTier as string).slice(1)} Tier` : null}
          </p>
        </div>
        <span className="text-sm text-[var(--steel)]">{totalItems} items</span>
      </div>

      {/* Categories */}
      {categoryOrder.map(catKey => {
        const items = categories[catKey];
        if (!items || items.length === 0) return null;

        return (
          <div key={catKey} className="print:break-inside-avoid">
            <h2 className="text-sm font-bold text-[var(--navy)] mb-2 uppercase tracking-wide">
              {CATEGORY_LABELS[catKey] || catKey}
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1.5 font-medium text-[var(--steel)]">Item</th>
                  <th className="text-right py-1.5 w-24 font-medium text-[var(--steel)]">Qty</th>
                  <th className="text-left py-1.5 w-20 font-medium text-[var(--steel)]">Unit</th>
                  <th className="text-center py-1.5 w-16 font-medium text-[var(--steel)] print:block hidden">Loaded</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-1.5 text-[var(--navy)]">{item.name}</td>
                    <td className="py-1.5 text-right font-medium">{item.quantity}</td>
                    <td className="py-1.5 text-[var(--steel)]">{item.unit}</td>
                    <td className="py-1.5 text-center print:block hidden">
                      <span className="inline-block w-4 h-4 border border-gray-300 rounded"></span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      {/* Notes area */}
      <div className="border-t border-gray-200 pt-4 mt-4">
        <h3 className="text-xs font-semibold text-[var(--steel)] uppercase mb-2">Notes</h3>
        <div className="h-24 border border-gray-200 rounded-lg print:h-32"></div>
      </div>
    </div>
  );
}
