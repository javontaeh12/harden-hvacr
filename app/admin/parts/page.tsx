'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Button, Input, Modal, Select } from '@/components/ui';
import { CustomPart } from '@/types';
import { Plus, Trash2, Package, Search } from 'lucide-react';

const CATEGORIES = [
  { value: 'Custom', label: 'Custom Part' },
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
  { value: 'Ice Machine', label: 'Ice Machine' },
  { value: 'True Parts', label: 'True Parts' },
  { value: 'Valves', label: 'Valves' },
  { value: 'Pumps', label: 'Pumps' },
  { value: 'Chemicals', label: 'Chemicals' },
  { value: 'Hardware', label: 'Hardware' },
  { value: 'Misc', label: 'Misc' },
];

export default function CustomPartsPage() {
  const { profile, groupId } = useAuth();
  const [parts, setParts] = useState<CustomPart[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    item: '',
    description: '',
    category: 'Custom',
  });

  useEffect(() => {
    fetchParts();
  }, []);

  const fetchParts = async () => {
    if (!groupId) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from('custom_parts')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setParts(data);
    }
    setIsLoading(false);
  };

  const handleAddPart = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const supabase = createClient();

    // Check if part already exists
    const existing = parts.find(
      (p) => p.item.toLowerCase() === formData.item.toLowerCase()
    );
    if (existing) {
      alert('A part with this item code already exists!');
      setIsSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from('custom_parts')
      .insert({
        item: formData.item.toUpperCase(),
        description: formData.description.toUpperCase(),
        category: formData.category,
        created_by: profile?.id || null,
        group_id: groupId,
      } as Record<string, unknown>)
      .select()
      .single();

    if (!error && data) {
      setParts([data, ...parts]);
      setFormData({ item: '', description: '', category: 'Custom' });
      setIsModalOpen(false);
    } else {
      alert('Error adding part. Please try again.');
    }
    setIsSaving(false);
  };

  const handleDeletePart = async (id: string) => {
    if (!confirm('Are you sure you want to delete this custom part?')) return;

    const res = await fetch('/api/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'custom_parts', id }),
    });

    if (res.ok) {
      setParts(parts.filter((p) => p.id !== id));
    }
  };

  const filteredParts = parts.filter(
    (p) =>
      p.item.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <h1 className="text-2xl font-bold text-gray-900">Custom Parts</h1>
          <p className="text-gray-600 mt-1">
            Add parts not in the stock database. All admins can see these.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Custom Part
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          placeholder="Search custom parts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Parts Grid */}
      {filteredParts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {parts.length === 0 ? 'No Custom Parts Yet' : 'No Results Found'}
          </h3>
          <p className="text-gray-600 mb-4">
            {parts.length === 0
              ? 'Add custom parts that will appear in inventory autocomplete'
              : 'Try a different search term'}
          </p>
          {parts.length === 0 && (
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Custom Part
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
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-purple-100 text-purple-700">
                          CUSTOM
                        </span>
                        <span className="font-medium text-gray-900">{part.item}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{part.description}</td>
                    <td className="px-4 py-3 text-gray-600">{part.category || '-'}</td>
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
            {filteredParts.length} custom part{filteredParts.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Add Part Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Custom Part"
      >
        <form onSubmit={handleAddPart} className="space-y-4">
          <Input
            label="Part # / Item Code"
            placeholder="e.g., CUSTOM001"
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
