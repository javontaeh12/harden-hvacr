'use client';

import { LayerVisibility } from '@/lib/installs/types';

interface LayerTogglePanelProps {
  layers: LayerVisibility;
  onChange: (layers: LayerVisibility) => void;
}

const LAYER_OPTIONS: { key: keyof LayerVisibility; label: string }[] = [
  { key: 'walls', label: 'Walls' },
  { key: 'ceiling', label: 'Ceiling' },
  { key: 'ducts', label: 'Ducts' },
  { key: 'supplyVents', label: 'Supply Vents' },
  { key: 'returnVents', label: 'Return Vents' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'labels', label: 'Labels' },
];

/**
 * HTML overlay panel for toggling visibility of 3D scene layers.
 * Rendered as an absolutely positioned card on top of the <Canvas>.
 */
export default function LayerTogglePanel({ layers, onChange }: LayerTogglePanelProps) {
  function toggle(key: keyof LayerVisibility) {
    onChange({ ...layers, [key]: !layers[key] });
  }

  return (
    <div
      className="absolute top-3 right-3 z-10 rounded-lg border border-gray-200 bg-white/80 px-3 py-2.5 shadow-lg backdrop-blur-md"
      style={{ minWidth: 150 }}
    >
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        Layers
      </p>
      <div className="flex flex-col gap-1">
        {LAYER_OPTIONS.map(({ key, label }) => (
          <label
            key={key}
            className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs text-gray-700 hover:bg-gray-100"
          >
            <input
              type="checkbox"
              checked={layers[key]}
              onChange={() => toggle(key)}
              className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 accent-blue-600"
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}
