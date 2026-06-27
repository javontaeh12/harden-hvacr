'use client';

import { X } from 'lucide-react';
import type { InstallProposal, InstallEquipmentOption, InstallProject } from '@/lib/installs/types';
import { formatCurrency, formatProposalDate } from '@/lib/installs/proposal-helpers';

interface ProposalPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: InstallProposal;
  project: InstallProject;
  equipmentOptions: InstallEquipmentOption[];
}

export function ProposalPreview({ isOpen, onClose, proposal, project, equipmentOptions }: ProposalPreviewProps) {
  if (!isOpen) return null;

  const customerName = project.customers?.full_name ?? 'Valued Customer';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto mx-4">
        {/* Close button */}
        <div className="sticky top-0 z-10 flex justify-end p-3 bg-white/90 backdrop-blur-sm rounded-t-2xl">
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="px-8 pb-10 -mt-4">
          {/* Cover */}
          <div className="text-center mb-8 pb-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-[var(--navy)] mb-1">{proposal.cover_title}</h1>
            {proposal.cover_subtitle && (
              <p className="text-base text-[var(--steel)]">{proposal.cover_subtitle}</p>
            )}
            <div className="mt-4 text-sm text-[var(--steel)]">
              <p>Prepared for: <span className="font-semibold text-[var(--navy)]">{customerName}</span></p>
              <p>{project.address}</p>
              {proposal.valid_until && (
                <p className="mt-1">Valid until: {formatProposalDate(proposal.valid_until)}</p>
              )}
            </div>
          </div>

          {/* Intro message */}
          {proposal.intro_message && (
            <div className="mb-6 text-sm text-[var(--steel)] whitespace-pre-wrap">
              {proposal.intro_message}
            </div>
          )}

          {/* Equipment Options */}
          <h2 className="text-lg font-bold text-[var(--navy)] mb-4">System Options</h2>
          <div className="space-y-4 mb-8">
            {equipmentOptions
              .sort((a, b) => a.sort_order - b.sort_order)
              .map(opt => (
                <OptionCard key={opt.id} option={opt} isSelected={proposal.selected_tier === opt.tier} />
              ))}
          </div>

          {/* Financing */}
          {proposal.show_financing && proposal.financing_monthly && (
            <div className="mb-8 p-5 bg-emerald-50 rounded-xl border border-emerald-200">
              <h3 className="text-sm font-bold text-emerald-800 mb-2">Financing Available</h3>
              <p className="text-sm text-emerald-700">
                {proposal.financing_provider && `Through ${proposal.financing_provider} — `}
                As low as <span className="font-bold text-lg">{formatCurrency(proposal.financing_monthly)}/mo</span>
                {proposal.financing_term_months && ` for ${proposal.financing_term_months} months`}
                {proposal.financing_apr != null && ` at ${proposal.financing_apr}% APR`}
              </p>
            </div>
          )}

          {/* Closing message */}
          {proposal.closing_message && (
            <div className="mb-6 text-sm text-[var(--steel)] whitespace-pre-wrap">
              {proposal.closing_message}
            </div>
          )}

          {/* Terms */}
          {proposal.company_terms && (
            <div className="mb-6 pt-4 border-t border-gray-200">
              <h3 className="text-xs font-semibold text-[var(--steel)] uppercase tracking-wide mb-2">Terms & Conditions</h3>
              <p className="text-xs text-gray-400 whitespace-pre-wrap">{proposal.company_terms}</p>
            </div>
          )}

          {/* Footer */}
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-400">Harden HVACR — hardenhvacr.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function OptionCard({ option, isSelected }: { option: InstallEquipmentOption; isSelected: boolean }) {
  const tierLabels: Record<string, string> = { good: 'Good', better: 'Better', best: 'Best' };
  const tierColors: Record<string, string> = {
    good: 'border-gray-200',
    better: 'border-blue-200',
    best: 'border-amber-300',
  };

  return (
    <div className={`rounded-xl border-2 ${isSelected ? 'border-emerald-400 bg-emerald-50/30' : tierColors[option.tier] || 'border-gray-200'} p-5`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-[var(--navy)] capitalize">
              {tierLabels[option.tier] || option.tier}
            </h3>
            {option.is_recommended && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                Recommended
              </span>
            )}
            {isSelected && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500 text-white">
                Selected
              </span>
            )}
          </div>
          {option.label && <p className="text-sm text-[var(--steel)]">{option.label}</p>}
        </div>
        <p className="text-xl font-bold text-[var(--navy)]">{formatCurrency(option.total)}</p>
      </div>

      {/* Specs */}
      <div className="flex items-center gap-4 mb-3 text-sm">
        {option.tonnage && <span className="text-[var(--steel)]">{option.tonnage} Ton</span>}
        {option.seer && <span className="text-[var(--steel)]">{option.seer} SEER</span>}
        {option.hspf && <span className="text-[var(--steel)]">{option.hspf} HSPF</span>}
        {option.warranty_years && <span className="text-[var(--steel)]">{option.warranty_years}-Year Warranty</span>}
      </div>

      {/* Equipment list */}
      <div className="space-y-1 text-sm">
        {option.condenser_model && <p className="text-[var(--navy)]">Condenser: {option.condenser_model}</p>}
        {option.air_handler_model && <p className="text-[var(--navy)]">Air Handler: {option.air_handler_model}</p>}
        {option.furnace_model && <p className="text-[var(--navy)]">Furnace: {option.furnace_model}</p>}
        {option.thermostat_model && <p className="text-[var(--navy)]">Thermostat: {option.thermostat_model}</p>}
      </div>

      {option.estimated_annual_savings && option.estimated_annual_savings > 0 && (
        <p className="mt-2 text-sm text-emerald-600 font-medium">
          Est. {formatCurrency(option.estimated_annual_savings)}/year in energy savings
        </p>
      )}
    </div>
  );
}
