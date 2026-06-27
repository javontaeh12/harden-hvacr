'use client';

import { useState } from 'react';
import { X, Search } from 'lucide-react';
import type { InstallEquipmentOption, Tier, EquipmentCatalogItem } from '@/lib/installs/types';
import { EquipmentPicker } from './EquipmentPicker';

interface EquipmentOptionEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<InstallEquipmentOption> & { tier: Tier }) => void;
  option?: InstallEquipmentOption;
  projectId: string;
  recommendedTonnage?: number;
}

export function EquipmentOptionEditor({
  isOpen,
  onClose,
  onSave,
  option,
  recommendedTonnage,
}: EquipmentOptionEditorProps) {
  const [tier, setTier] = useState<Tier>(option?.tier ?? 'good');
  const [label, setLabel] = useState(option?.label ?? '');

  // Equipment models + prices
  const [condenserModel, setCondenserModel] = useState(option?.condenser_model ?? '');
  const [condenserPrice, setCondenserPrice] = useState(option?.condenser_price ?? 0);
  const [condenserId, setCondenserId] = useState(option?.condenser_id ?? null);
  const [ahModel, setAhModel] = useState(option?.air_handler_model ?? '');
  const [ahPrice, setAhPrice] = useState(option?.air_handler_price ?? 0);
  const [ahId, setAhId] = useState(option?.air_handler_id ?? null);
  const [thermostatModel, setThermostatModel] = useState(option?.thermostat_model ?? '');
  const [thermostatPrice, setThermostatPrice] = useState(option?.thermostat_price ?? 0);

  // Specs
  const [tonnage, setTonnage] = useState(option?.tonnage ?? recommendedTonnage ?? 3);
  const [seer, setSeer] = useState(option?.seer ?? 14);
  const [hspf, setHspf] = useState(option?.hspf ?? 8);
  const [warrantyYears, setWarrantyYears] = useState(option?.warranty_years ?? 10);

  // Pricing
  const [laborTotal, setLaborTotal] = useState(option?.labor_total ?? 2500);
  const [materialTotal, setMaterialTotal] = useState(option?.material_total ?? 800);
  const [permitFee, setPermitFee] = useState(option?.permit_fee ?? 150);
  const [disposalFee, setDisposalFee] = useState(option?.disposal_fee ?? 200);
  const [tax, setTax] = useState(option?.tax ?? 0);

  // Picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'condenser' | 'air_handler' | null>(null);

  const equipmentTotal = condenserPrice + ahPrice + thermostatPrice;
  const subtotal = equipmentTotal + laborTotal + materialTotal + permitFee + disposalFee;
  const total = subtotal + tax;

  const openPicker = (target: 'condenser' | 'air_handler') => {
    setPickerTarget(target);
    setPickerOpen(true);
  };

  const handlePickerSelect = (item: EquipmentCatalogItem) => {
    if (pickerTarget === 'condenser') {
      setCondenserId(item.id);
      setCondenserModel(`${item.brand} ${item.model_number}`);
      setCondenserPrice(item.retail_price ?? 0);
      if (item.tonnage) setTonnage(item.tonnage);
      if (item.seer_rating) setSeer(item.seer_rating);
      if (item.hspf) setHspf(item.hspf);
    } else if (pickerTarget === 'air_handler') {
      setAhId(item.id);
      setAhModel(`${item.brand} ${item.model_number}`);
      setAhPrice(item.retail_price ?? 0);
    }
    setPickerOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: option?.id,
      tier,
      label: label || null,
      condenser_id: condenserId,
      condenser_model: condenserModel || null,
      condenser_price: condenserPrice,
      air_handler_id: ahId,
      air_handler_model: ahModel || null,
      air_handler_price: ahPrice,
      thermostat_model: thermostatModel || null,
      thermostat_price: thermostatPrice,
      tonnage,
      seer,
      hspf,
      warranty_years: warrantyYears,
      labor_total: laborTotal,
      material_total: materialTotal,
      permit_fee: permitFee,
      disposal_fee: disposalFee,
      tax,
      equipment_total: equipmentTotal,
      subtotal,
      total,
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl z-10">
              <h3 className="text-lg font-bold text-[var(--navy)]">
                {option ? 'Edit' : 'Add'} Equipment Option
              </h3>
              <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Tier + Label */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--steel)] mb-1">Tier</label>
                  <div className="flex gap-1">
                    {(['good', 'better', 'best'] as Tier[]).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTier(t)}
                        className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-colors capitalize ${
                          tier === t
                            ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                            : 'bg-white text-[var(--steel)] border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--steel)] mb-1">Label (optional)</label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g. Economy, Premium"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] outline-none"
                  />
                </div>
              </div>

              {/* Equipment selection */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-[var(--navy)]">Equipment</h4>

                {/* Condenser */}
                <div className="grid grid-cols-3 gap-3 items-end">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-[var(--steel)] mb-1">Condenser</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={condenserModel}
                        onChange={(e) => setCondenserModel(e.target.value)}
                        placeholder="Brand Model#"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => openPicker('condenser')}
                        className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                        title="Search catalog"
                      >
                        <Search className="w-4 h-4 text-[var(--steel)]" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--steel)] mb-1">Price</label>
                    <input
                      type="number"
                      value={condenserPrice}
                      onChange={(e) => setCondenserPrice(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] outline-none"
                    />
                  </div>
                </div>

                {/* Air Handler */}
                <div className="grid grid-cols-3 gap-3 items-end">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-[var(--steel)] mb-1">Air Handler</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={ahModel}
                        onChange={(e) => setAhModel(e.target.value)}
                        placeholder="Brand Model#"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => openPicker('air_handler')}
                        className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                        title="Search catalog"
                      >
                        <Search className="w-4 h-4 text-[var(--steel)]" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--steel)] mb-1">Price</label>
                    <input
                      type="number"
                      value={ahPrice}
                      onChange={(e) => setAhPrice(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] outline-none"
                    />
                  </div>
                </div>

                {/* Thermostat */}
                <div className="grid grid-cols-3 gap-3 items-end">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-[var(--steel)] mb-1">Thermostat</label>
                    <input
                      type="text"
                      value={thermostatModel}
                      onChange={(e) => setThermostatModel(e.target.value)}
                      placeholder="e.g. Honeywell T6 Pro"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--steel)] mb-1">Price</label>
                    <input
                      type="number"
                      value={thermostatPrice}
                      onChange={(e) => setThermostatPrice(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Specs */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-[var(--navy)]">Specifications</h4>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[var(--steel)] mb-1">Tonnage</label>
                    <select
                      value={tonnage}
                      onChange={(e) => setTonnage(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                    >
                      {[1.5, 2, 2.5, 3, 3.5, 4, 5].map(t => (
                        <option key={t} value={t}>{t}T</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--steel)] mb-1">SEER</label>
                    <input
                      type="number"
                      value={seer}
                      onChange={(e) => setSeer(Number(e.target.value))}
                      step="0.1"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--steel)] mb-1">HSPF</label>
                    <input
                      type="number"
                      value={hspf}
                      onChange={(e) => setHspf(Number(e.target.value))}
                      step="0.1"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--steel)] mb-1">Warranty</label>
                    <input
                      type="number"
                      value={warrantyYears}
                      onChange={(e) => setWarrantyYears(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-[var(--navy)]">Pricing</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[var(--steel)] mb-1">Labor</label>
                    <input
                      type="number"
                      value={laborTotal}
                      onChange={(e) => setLaborTotal(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--steel)] mb-1">Materials</label>
                    <input
                      type="number"
                      value={materialTotal}
                      onChange={(e) => setMaterialTotal(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--steel)] mb-1">Permit</label>
                    <input
                      type="number"
                      value={permitFee}
                      onChange={(e) => setPermitFee(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--steel)] mb-1">Disposal</label>
                    <input
                      type="number"
                      value={disposalFee}
                      onChange={(e) => setDisposalFee(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[var(--steel)] mb-1">Tax</label>
                    <input
                      type="number"
                      value={tax}
                      onChange={(e) => setTax(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] outline-none"
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="w-full px-4 py-2.5 bg-gray-50 rounded-lg">
                      <p className="text-xs text-[var(--steel)]">Total</p>
                      <p className="text-lg font-bold text-[var(--navy)]">${total.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0 bg-white rounded-b-2xl">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-[var(--steel)] border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-sm font-semibold text-white bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-dark)] transition-colors"
              >
                {option ? 'Update Option' : 'Add Option'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Equipment Catalog Picker */}
      <EquipmentPicker
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handlePickerSelect}
        filterCategory={pickerTarget === 'condenser' ? 'condenser' : pickerTarget === 'air_handler' ? 'air_handler' : undefined}
        filterTonnage={tonnage}
        title={pickerTarget === 'condenser' ? 'Select Condenser' : 'Select Air Handler'}
      />
    </>
  );
}
