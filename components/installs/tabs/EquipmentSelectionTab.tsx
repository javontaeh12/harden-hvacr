'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Cpu } from 'lucide-react';
import type { InstallEquipmentOption, Tier } from '@/lib/installs/types';
import { EquipmentOptionCard } from '@/components/installs/EquipmentOptionCard';
import { EquipmentOptionEditor } from '@/components/installs/EquipmentOptionEditor';

interface EquipmentSelectionTabProps {
  projectId: string;
  recommendedTonnage?: number;
}

export function EquipmentSelectionTab({ projectId, recommendedTonnage }: EquipmentSelectionTabProps) {
  const [options, setOptions] = useState<InstallEquipmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingOption, setEditingOption] = useState<InstallEquipmentOption | undefined>(undefined);

  const fetchOptions = useCallback(async () => {
    try {
      const res = await fetch(`/api/installs/equipment-options?project_id=${projectId}`);
      if (res.ok) {
        setOptions(await res.json());
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  const handleAdd = () => {
    setEditingOption(undefined);
    setShowEditor(true);
  };

  const handleEdit = (option: InstallEquipmentOption) => {
    setEditingOption(option);
    setShowEditor(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/installs/equipment-options?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setOptions(options.filter(o => o.id !== id));
      }
    } catch {
      // silent
    }
  };

  const handleSetRecommended = async (id: string) => {
    // Unset all, then set the chosen one
    for (const opt of options) {
      if (opt.is_recommended && opt.id !== id) {
        await fetch('/api/installs/equipment-options', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: opt.id, is_recommended: false }),
        });
      }
    }
    await fetch('/api/installs/equipment-options', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_recommended: true }),
    });
    fetchOptions();
  };

  const handleSave = async (data: Partial<InstallEquipmentOption> & { tier: Tier }) => {
    try {
      if (data.id) {
        // Update
        const res = await fetch('/api/installs/equipment-options', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          const updated = await res.json();
          setOptions(options.map(o => o.id === updated.id ? updated : o));
        }
      } else {
        // Create
        const sortOrder = options.length;
        const res = await fetch('/api/installs/equipment-options', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            project_id: projectId,
            sort_order: sortOrder,
          }),
        });
        if (res.ok) {
          const created = await res.json();
          setOptions([...options, created]);
        }
      }
    } catch {
      // silent
    }
    setShowEditor(false);
    setEditingOption(undefined);
  };

  // Group by tier for display
  const goodOptions = options.filter(o => o.tier === 'good');
  const betterOptions = options.filter(o => o.tier === 'better');
  const bestOptions = options.filter(o => o.tier === 'best');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-[var(--navy)]">Equipment Selection</h3>
          <p className="text-sm text-[var(--steel)]">
            Configure Good / Better / Best equipment options
            {recommendedTonnage ? ` — ${recommendedTonnage}T recommended` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[var(--accent)] rounded-full hover:bg-[var(--accent-dark)] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Option
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-[var(--accent)] rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && options.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-6 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
          <Cpu className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-sm font-semibold text-[var(--navy)] mb-1">No equipment options yet</p>
          <p className="text-sm text-[var(--steel)] text-center max-w-sm">
            Add equipment options to present Good, Better, and Best choices to your customer.
          </p>
          <button
            type="button"
            onClick={handleAdd}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-[var(--accent)] border border-[var(--accent)] rounded-full hover:bg-[var(--accent)]/5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add First Option
          </button>
        </div>
      )}

      {/* Options grid - three columns for Good / Better / Best */}
      {!loading && options.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Good column */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Good</h4>
            {goodOptions.length === 0 ? (
              <EmptyTierCard tier="good" onAdd={handleAdd} />
            ) : (
              goodOptions.map(o => (
                <EquipmentOptionCard
                  key={o.id}
                  option={o}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onSetRecommended={handleSetRecommended}
                />
              ))
            )}
          </div>

          {/* Better column */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-blue-600 uppercase tracking-wide">Better</h4>
            {betterOptions.length === 0 ? (
              <EmptyTierCard tier="better" onAdd={handleAdd} />
            ) : (
              betterOptions.map(o => (
                <EquipmentOptionCard
                  key={o.id}
                  option={o}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onSetRecommended={handleSetRecommended}
                />
              ))
            )}
          </div>

          {/* Best column */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-amber-600 uppercase tracking-wide">Best</h4>
            {bestOptions.length === 0 ? (
              <EmptyTierCard tier="best" onAdd={handleAdd} />
            ) : (
              bestOptions.map(o => (
                <EquipmentOptionCard
                  key={o.id}
                  option={o}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onSetRecommended={handleSetRecommended}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Editor modal */}
      <EquipmentOptionEditor
        isOpen={showEditor}
        onClose={() => {
          setShowEditor(false);
          setEditingOption(undefined);
        }}
        onSave={handleSave}
        option={editingOption}
        projectId={projectId}
        recommendedTonnage={recommendedTonnage}
      />
    </div>
  );
}

function EmptyTierCard({ tier, onAdd }: { tier: string; onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="w-full py-12 border-2 border-dashed border-gray-200 rounded-xl hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-colors flex flex-col items-center gap-2"
    >
      <Plus className="w-5 h-5 text-gray-400" />
      <span className="text-sm text-[var(--steel)] capitalize">Add {tier} option</span>
    </button>
  );
}
