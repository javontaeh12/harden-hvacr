'use client';

import { useState } from 'react';
import { CheckSquare, Square } from 'lucide-react';
import type { InstallDocument } from '@/lib/installs/types';

interface InstallChecklistProps {
  document: InstallDocument;
  editable?: boolean;
  onUpdate?: (content: Record<string, unknown>) => void;
}

interface ChecklistItem {
  task: string;
  checked: boolean;
}

interface ChecklistSection {
  name: string;
  items: ChecklistItem[];
}

export function InstallChecklist({ document, editable = false, onUpdate }: InstallChecklistProps) {
  const content = document.content as Record<string, unknown>;
  const [sections, setSections] = useState<ChecklistSection[]>(
    (content.sections as ChecklistSection[]) || []
  );

  const toggleItem = (sectionIdx: number, itemIdx: number) => {
    if (!editable) return;
    const updated = sections.map((s, si) => {
      if (si !== sectionIdx) return s;
      return {
        ...s,
        items: s.items.map((item, ii) => {
          if (ii !== itemIdx) return item;
          return { ...item, checked: !item.checked };
        }),
      };
    });
    setSections(updated);
    onUpdate?.({ ...content, sections: updated });
  };

  const totalItems = sections.reduce((s, sec) => s + sec.items.length, 0);
  const checkedItems = sections.reduce((s, sec) => s + sec.items.filter(i => i.checked).length, 0);
  const progress = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  return (
    <div className="space-y-5 print:space-y-3">
      {/* Header */}
      <div className="border-b-2 border-[var(--navy)] pb-3">
        <h1 className="text-xl font-bold text-[var(--navy)]">{document.title}</h1>
        <p className="text-sm text-[var(--steel)]">{content.address as string}</p>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-sm font-medium text-[var(--navy)]">
          {checkedItems}/{totalItems} ({progress}%)
        </span>
      </div>

      {/* Sections */}
      {sections.map((section, si) => {
        const sectionChecked = section.items.filter(i => i.checked).length;
        const sectionComplete = sectionChecked === section.items.length;

        return (
          <div key={si} className="bg-white rounded-xl border border-gray-200 overflow-hidden print:break-inside-avoid">
            <div className={`px-4 py-2.5 border-b border-gray-100 flex items-center justify-between ${sectionComplete ? 'bg-emerald-50' : 'bg-gray-50/50'}`}>
              <h2 className="text-sm font-bold text-[var(--navy)]">{section.name}</h2>
              <span className={`text-xs font-medium ${sectionComplete ? 'text-emerald-600' : 'text-[var(--steel)]'}`}>
                {sectionChecked}/{section.items.length}
              </span>
            </div>
            <div className="divide-y divide-gray-50">
              {section.items.map((item, ii) => (
                <button
                  key={ii}
                  type="button"
                  onClick={() => toggleItem(si, ii)}
                  disabled={!editable}
                  className={`w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors ${
                    editable ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'
                  } ${item.checked ? 'bg-emerald-50/30' : ''}`}
                >
                  {item.checked ? (
                    <CheckSquare className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
                  )}
                  <span className={`text-sm ${item.checked ? 'text-[var(--steel)] line-through' : 'text-[var(--navy)]'}`}>
                    {item.task}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {/* Sign-off */}
      <div className="border-t-2 border-gray-200 pt-6 mt-4 print:mt-2">
        <div className="grid grid-cols-2 gap-8">
          <div>
            <p className="text-xs text-[var(--steel)] mb-6">Lead Installer</p>
            <div className="border-b border-gray-400 mb-1"></div>
            <p className="text-xs text-[var(--steel)]">Name / Date</p>
          </div>
          <div>
            <p className="text-xs text-[var(--steel)] mb-6">Quality Check</p>
            <div className="border-b border-gray-400 mb-1"></div>
            <p className="text-xs text-[var(--steel)]">Name / Date</p>
          </div>
        </div>
      </div>
    </div>
  );
}
