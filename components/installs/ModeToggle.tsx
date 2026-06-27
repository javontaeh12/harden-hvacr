'use client';

import { TrendingUp, Ruler, Wrench } from 'lucide-react';
import type { UXMode } from '@/lib/installs/types';

interface ModeToggleProps {
  currentMode: UXMode;
  onChange: (mode: UXMode) => void;
}

const modes: { value: UXMode; label: string; icon: typeof TrendingUp }[] = [
  { value: 'sales', label: 'Sales', icon: TrendingUp },
  { value: 'design', label: 'Design', icon: Ruler },
  { value: 'production', label: 'Production', icon: Wrench },
];

export function ModeToggle({ currentMode, onChange }: ModeToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
      {modes.map(({ value, label, icon: Icon }) => {
        const isActive = currentMode === value;
        return (
          <button
            key={value}
            onClick={() => onChange(value)}
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
              ${isActive
                ? 'bg-ember text-white shadow-sm'
                : 'text-navy hover:bg-gray-100 active:bg-gray-200'
              }
            `}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
