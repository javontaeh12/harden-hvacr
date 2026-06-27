'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, Button, Input, Select, Modal } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { Package, Plus, Pencil, Trash2, X, CheckCircle } from 'lucide-react';

const SERVICE_TYPES = [
  'AC / Cooling',
  'Heating / Furnace',
  'Refrigerator Repair',
  'Freezer Repair',
  'Commercial Refrigeration',
  'Ductless / Mini-Split',
  'System Tune-Up',
  'Full Diagnostics',
];

interface ServicePackage {
  id: string;
  service_type: string;
  name: string;
  description: string | null;
  includes: string[];
  price: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function PackagesPage() {
  const { isLoading: authLoading } = useAuth();
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterService, setFilterService] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newIncludeItem, setNewIncludeItem] = useState('');

  const [formData, setFormData] = useState({
    service_type: SERVICE_TYPES[0],
    name: '',
    description: '',
    includes: [] as string[],
    price: 0,
    sort_order: 0,
  });

  useEffect(() => {
    if (!authLoading) fetchPackages();
  }, [authLoading]);

  const fetchPackages = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('service_packages')
        .select('*')
        .order('service_type')
        .order('sort_order')
        .order('price');

      if (error) throw error;
      setPackages(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load packages');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPackages = useMemo(() => {
    if (!filterService) return packages;
    return packages.filter(p => p.service_type === filterService);
  }, [packages, filterService]);

  const groupedPackages = useMemo(() => {
    const groups: Record<string, ServicePackage[]> = {};
    filteredPackages.forEach(p => {
      if (!groups[p.service_type]) groups[p.service_type] = [];
      groups[p.service_type].push(p);
    });
    return groups;
  }, [filteredPackages]);

  const handleOpenAdd = () => {
    setEditingPackage(null);
    setFormData({
      service_type: filterService || SERVICE_TYPES[0],
      name: '',
      description: '',
      includes: [],
      price: 0,
      sort_order: 0,
    });
    setNewIncludeItem('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (pkg: ServicePackage) => {
    setEditingPackage(pkg);
    setFormData({
      service_type: pkg.service_type,
      name: pkg.name,
      description: pkg.description || '',
      includes: Array.isArray(pkg.includes) ? pkg.includes : [],
      price: pkg.price,
      sort_order: pkg.sort_order,
    });
    setNewIncludeItem('');
    setIsModalOpen(true);
  };

  const addIncludeItem = () => {
    const item = newIncludeItem.trim();
    if (!item || formData.includes.includes(item)) return;
    setFormData(prev => ({ ...prev, includes: [...prev.includes, item] }));
    setNewIncludeItem('');
  };

  const removeIncludeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      includes: prev.includes.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const supabase = createClient();
      const payload = {
        service_type: formData.service_type,
        name: formData.name,
        description: formData.description || null,
        includes: formData.includes,
        price: formData.price,
        sort_order: formData.sort_order,
      };

      if (editingPackage) {
        const { data, error } = await supabase
          .from('service_packages')
          .update(payload)
          .eq('id', editingPackage.id)
          .select()
          .single();
        if (error) throw error;
        setPackages(packages.map(p => p.id === editingPackage.id ? data : p));
      } else {
        const { data, error } = await supabase
          .from('service_packages')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setPackages([...packages, data]);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to save package:', err);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.from('service_packages').delete().eq('id', deletingId);
      if (error) throw error;
      setPackages(packages.filter(p => p.id !== deletingId));
      setIsDeleteConfirmOpen(false);
      setDeletingId(null);
    } catch (err) {
      console.error('Failed to delete package:', err);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800 font-medium">Failed to load packages</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Packages</h1>
          <p className="text-gray-600 mt-1">Create pre-made packages that customers see when booking a service.</p>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Add Package
        </Button>
      </div>

      {/* Filter */}
      <Select
        options={[{ value: '', label: 'All Services' }, ...SERVICE_TYPES.map(s => ({ value: s, label: s }))]}
        value={filterService}
        onChange={e => setFilterService(e.target.value)}
        className="w-full sm:w-64"
      />

      {/* Packages by service type */}
      {Object.keys(groupedPackages).length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No packages yet</h3>
            <p className="text-gray-600">
              Add your first service package to get started. Customers will see these when booking.
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedPackages).map(([serviceType, pkgs]) => (
          <div key={serviceType}>
            <h2 className="text-lg font-bold text-gray-900 mb-3">{serviceType}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pkgs.map(pkg => (
                <Card key={pkg.id} className="relative">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">{pkg.name}</h3>
                        <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(pkg.price)}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleOpenEdit(pkg)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setDeletingId(pkg.id); setIsDeleteConfirmOpen(true); }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {pkg.description && (
                      <p className="text-sm text-gray-600 mb-3">{pkg.description}</p>
                    )}
                    {Array.isArray(pkg.includes) && pkg.includes.length > 0 && (
                      <ul className="space-y-1.5">
                        {pkg.includes.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPackage ? 'Edit Package' : 'Add Package'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Service Type"
            options={SERVICE_TYPES.map(s => ({ value: s, label: s }))}
            value={formData.service_type}
            onChange={e => setFormData({ ...formData, service_type: e.target.value })}
          />
          <Input
            label="Package Name"
            placeholder="e.g., Basic Tune-Up, Premium Service"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-black placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              rows={2}
              placeholder="Brief description of this package..."
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Includes list */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">What&apos;s Included</label>
            {formData.includes.length > 0 && (
              <ul className="space-y-1.5 mb-3">
                {formData.includes.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    <span className="text-sm text-gray-800 flex-1">{item}</span>
                    <button
                      type="button"
                      onClick={() => removeIncludeItem(i)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="e.g., Full system inspection"
                value={newIncludeItem}
                onChange={e => setNewIncludeItem(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addIncludeItem(); } }}
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={addIncludeItem}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Price ($)"
              type="number"
              min="0"
              step="0.01"
              value={formData.price || ''}
              onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              required
            />
            <Input
              label="Sort Order"
              type="number"
              min="0"
              value={formData.sort_order || ''}
              onChange={e => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingPackage ? 'Update' : 'Add'} Package
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title="Delete Package"
      >
        <div className="space-y-4">
          <p className="text-gray-600">Are you sure you want to delete this package? This cannot be undone.</p>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
