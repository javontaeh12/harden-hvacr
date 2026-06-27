'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Button, Input, Modal, Select } from '@/components/ui';
import { GroupStockPart } from '@/types';
import { PARTS_DATABASE } from '@/lib/parts-data';
import { Plus, Trash2, Package, Search, Upload } from 'lucide-react';

const CATEGORIES = [
  { value: 'Capacitors', label: 'Capacitors' },
  { value: 'Copper Fittings', label: 'Copper Fittings' },
  { value: 'PVC Fittings', label: 'PVC Fittings' },
  { value: 'Driers', label: 'Driers' },
  { value: 'Fuses', label: 'Fuses' },
  { value: 'Contactors', label: 'Contactors' },
  { value: 'Motors', label: 'Motors' },
  { value: 'Refrigerants', label: 'Refrigerants' },
  { value: 'Relays', label: 'Relays' },
  { value: 'Pressure Controls', label: 'Pressure Controls' },
  { value: 'Thermostats', label: 'Thermostats' },
  { value: 'Electrical', label: 'Electrical' },
  { value: 'Wire', label: 'Wire' },
  { value: 'Ice Machine', label: 'Ice Machine' },
  { value: 'True Parts', label: 'True Parts' },
  { value: 'Valves', label: 'Valves' },
  { value: 'Pumps', label: 'Pumps' },
  { value: 'Chemicals', label: 'Chemicals' },
  { value: 'Hardware', label: 'Hardware' },
  { value: 'Soldering', label: 'Soldering' },
  { value: 'Tape', label: 'Tape' },
  { value: 'Misc', label: 'Misc' },
];

export default function StockPartsPage() {
  const { groupId, group } = useAuth();
  const [parts, setParts] = useState<GroupStockPart[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDefaults, setIsLoadingDefaults] = useState(false);

  const [formData, setFormData] = useState({
    item: '',
    description: '',
    category: 'Misc',
  });

  useEffect(() => {
    fetchParts();
  }, [groupId]);

  const fetchParts = async () => {
    if (!groupId) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from('group_stock_parts')
      .select('*')
      .eq('group_id', groupId)
      .order('item');

    if (!error && data) {
      setParts(data);
    }
    setIsLoading(false);
  };

  const handleAddPart = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const supabase = createClient();

    const existing = parts.find(
      (p) => p.item.toLowerCase() === formData.item.toLowerCase()
    );
    if (existing) {
      alert('A part with this item code already exists!');
      setIsSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from('group_stock_parts')
      .insert({
        group_id: groupId,
        item: formData.item.toUpperCase(),
        description: formData.description.toUpperCase(),
        category: formData.category,
      } as Record<string, unknown>)
      .select()
      .single();

    if (!error && data) {
      setParts([...parts, data].sort((a, b) => a.item.localeCompare(b.item)));
      setFormData({ item: '', description: '', category: 'Misc' });
      setIsModalOpen(false);
    } else {
      alert('Error adding part. Please try again.');
    }
    setIsSaving(false);
  };

  const handleDeletePart = async (id: string) => {
    if (!confirm('Are you sure you want to delete this stock part?')) return;

    const res = await fetch('/api/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'group_stock_parts', id }),
    });

    if (res.ok) {
      setParts(parts.filter((p) => p.id !== id));
    }
  };

  const handleLoadDefaults = async () => {
    if (!confirm(`This will load ${PARTS_DATABASE.length} default HVAC parts into your group. Continue?`)) return;

    setIsLoadingDefaults(true);
    const supabase = createClient();

    // Get existing items to avoid duplicates
    const existingItems = new Set(parts.map((p) => p.item.toUpperCase()));

    const newParts = PARTS_DATABASE.filter(
      (p) => !existingItems.has(p.item.toUpperCase())
    ).map((p) => ({
      group_id: groupId,
      item: p.item,
      description: p.description,
      category: p.category || 'Misc',
    }));

    if (newParts.length === 0) {
      alert('All default parts are already loaded!');
      setIsLoadingDefaults(false);
      return;
    }

    // Insert in batches
    const batchSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < newParts.length; i += batchSize) {
      const batch = newParts.slice(i, i + batchSize);
      const { error } = await supabase
        .from('group_stock_parts')
        .insert(batch as Record<string, unknown>[]);

      if (!error) {
        insertedCount += batch.length;
      }
    }

    alert(`Loaded ${insertedCount} new parts.`);
    await fetchParts();
    setIsLoadingDefaults(false);
  };

  const filteredParts = parts.filter((p) => {
    const matchesSearch =
      p.item.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = !categoryFilter || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories from current parts
  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...CATEGORIES,
  ];

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Parts</h1>
          <p className="text-gray-600 mt-1">
            {group ? `${group.name} — ` : ''}Manage your group&apos;s standard parts list ({parts.length} parts)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleLoadDefaults} isLoading={isLoadingDefaults}>
            <Upload className="w-4 h-4 mr-2" />
            Load Defaults
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Part
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search stock parts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          options={categoryOptions}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full sm:w-48"
        />
      </div>

      {/* Parts Table */}
      {filteredParts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {parts.length === 0 ? 'No Stock Parts Yet' : 'No Results Found'}
          </h3>
          <p className="text-gray-600 mb-4">
            {parts.length === 0
              ? 'Load the default HVAC parts or add parts manually'
              : 'Try a different search term'}
          </p>
          {parts.length === 0 && (
            <Button onClick={handleLoadDefaults} isLoading={isLoadingDefaults}>
              <Upload className="w-4 h-4 mr-2" />
              Load Default Parts
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="text-left text-sm text-gray-500">
                  <th className="px-4 py-3 font-medium">Part #</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredParts.map((part) => (
                  <tr key={part.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{part.item}</td>
                    <td className="px-4 py-3 text-gray-700">{part.description || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{part.category}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDeletePart(part.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete part"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-gray-50 border-t text-sm text-gray-500">
            Showing {filteredParts.length} of {parts.length} stock parts
          </div>
        </div>
      )}

      {/* Add Part Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Stock Part"
      >
        <form onSubmit={handleAddPart} className="space-y-4">
          <Input
            label="Part # / Item Code"
            placeholder="e.g., 10RC"
            value={formData.item}
            onChange={(e) => setFormData({ ...formData, item: e.target.value })}
            required
          />
          <Input
            label="Description"
            placeholder="Enter part description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
          />
          <Select
            label="Category"
            options={CATEGORIES}
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              Add Part
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
