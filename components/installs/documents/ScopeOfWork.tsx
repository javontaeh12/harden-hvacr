'use client';

import type { InstallDocument } from '@/lib/installs/types';

interface ScopeOfWorkProps {
  document: InstallDocument;
}

export function ScopeOfWork({ document }: ScopeOfWorkProps) {
  const c = document.content as Record<string, unknown>;
  const specs = c.specs as Record<string, unknown> | undefined;
  const equipmentList = (c.equipmentList as string[]) || [];
  const workItems = (c.workItems as string[]) || [];
  const exclusions = (c.exclusions as string[]) || [];
  const ductSummary = c.ductSummary as Record<string, number> | undefined;

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="border-b-2 border-[var(--navy)] pb-4">
        <h1 className="text-xl font-bold text-[var(--navy)]">{document.title}</h1>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-[var(--steel)]">Customer: </span>
            <span className="font-medium text-[var(--navy)]">{c.customerName as string}</span>
          </div>
          <div>
            <span className="text-[var(--steel)]">Address: </span>
            <span className="font-medium text-[var(--navy)]">{c.address as string}</span>
          </div>
          <div>
            <span className="text-[var(--steel)]">Building: </span>
            <span className="font-medium text-[var(--navy)] capitalize">
              {(c.buildingType as string)?.replace(/_/g, ' ')} — {c.stories as number} story — {(c.totalSqft as number)?.toLocaleString()} sqft
            </span>
          </div>
          <div>
            <span className="text-[var(--steel)]">Rooms: </span>
            <span className="font-medium text-[var(--navy)]">{c.roomCount as number}</span>
          </div>
        </div>
      </div>

      {/* Equipment */}
      <div>
        <h2 className="text-base font-bold text-[var(--navy)] mb-2">Equipment Being Installed</h2>
        <ul className="space-y-1">
          {equipmentList.map((item, i) => (
            <li key={i} className="text-sm text-[var(--navy)] flex items-start gap-2">
              <span className="text-[var(--accent)] mt-0.5">&#9679;</span>
              {item}
            </li>
          ))}
        </ul>
        {specs && (
          <div className="mt-2 flex gap-4 text-xs text-[var(--steel)]">
            {specs.tonnage ? <span>{String(specs.tonnage)}T</span> : null}
            {specs.seer ? <span>{String(specs.seer)} SEER</span> : null}
            {specs.hspf ? <span>{String(specs.hspf)} HSPF</span> : null}
            {specs.warranty ? <span>{String(specs.warranty)}-Year Warranty</span> : null}
          </div>
        )}
      </div>

      {/* Work to be performed */}
      <div>
        <h2 className="text-base font-bold text-[var(--navy)] mb-2">Work to be Performed</h2>
        <ol className="space-y-1.5">
          {workItems.map((item, i) => (
            <li key={i} className="text-sm text-[var(--navy)] flex items-start gap-2">
              <span className="text-xs font-bold text-[var(--accent)] bg-[var(--accent)]/10 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              {item}
            </li>
          ))}
        </ol>
      </div>

      {/* Duct summary */}
      {ductSummary && (
        <div className="bg-gray-50 rounded-lg p-4 text-sm">
          <h3 className="font-semibold text-[var(--navy)] mb-1">Ductwork Summary</h3>
          <div className="flex gap-4 text-[var(--steel)]">
            <span>{ductSummary.supplyBranches} supply runs</span>
            <span>{ductSummary.returnDrops} return drops</span>
            <span>{ductSummary.totalDuctFt} total ft of duct</span>
          </div>
        </div>
      )}

      {/* Exclusions */}
      <div>
        <h2 className="text-base font-bold text-[var(--navy)] mb-2">Exclusions</h2>
        <ul className="space-y-1">
          {exclusions.map((item, i) => (
            <li key={i} className="text-sm text-[var(--steel)] flex items-start gap-2">
              <span className="text-red-400 mt-0.5">&#10005;</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Signature area */}
      <div className="border-t-2 border-gray-200 pt-6 mt-8 grid grid-cols-2 gap-8">
        <div>
          <p className="text-xs text-[var(--steel)] mb-8">Customer Signature</p>
          <div className="border-b border-gray-400 mb-1"></div>
          <p className="text-xs text-[var(--steel)]">Date: ________________</p>
        </div>
        <div>
          <p className="text-xs text-[var(--steel)] mb-8">Contractor Signature</p>
          <div className="border-b border-gray-400 mb-1"></div>
          <p className="text-xs text-[var(--steel)]">Date: ________________</p>
        </div>
      </div>
    </div>
  );
}
