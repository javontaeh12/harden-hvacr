'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, Button, Input, Select, Modal } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import {
  DollarSign,
  Search,
  Plus,
  Pencil,
  Trash2,
  Wrench,
  Thermometer,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface PricingItem {
  id: string;
  name: string;
  category: string;
  pricing_type: string;
  price: number;
  unit: string;
  description: string | null;
  is_active: boolean;
  service_type: string;
  trade: string;
  note: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = ['Diagnostics', 'Repairs', 'Maintenance', 'Installation', 'Emergency'];

const SERVICE_TYPES = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
];

const TRADES = [
  { value: 'hvac', label: 'HVAC' },
  { value: 'refrigeration', label: 'Refrigeration' },
];

const SERVICE_TYPE_COLORS: Record<string, string> = {
  residential: 'bg-sky-100 text-sky-700',
  commercial: 'bg-amber-100 text-amber-700',
};

const TRADE_COLORS: Record<string, string> = {
  hvac: 'bg-indigo-100 text-indigo-700',
  refrigeration: 'bg-teal-100 text-teal-700',
};

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  ...CATEGORIES.map((c) => ({ value: c, label: c })),
];

const CATEGORY_SELECT_OPTIONS = CATEGORIES.map((c) => ({ value: c, label: c }));

const CATEGORY_ICONS: Record<string, typeof Wrench> = {
  Diagnostics: Search,
  Repairs: Wrench,
  Maintenance: ShieldCheck,
  Installation: Thermometer,
  Emergency: Zap,
};

const CATEGORY_COLORS: Record<string, string> = {
  Diagnostics: 'bg-blue-100 text-blue-700',
  Repairs: 'bg-orange-100 text-orange-700',
  Maintenance: 'bg-green-100 text-green-700',
  Installation: 'bg-purple-100 text-purple-700',
  Emergency: 'bg-red-100 text-red-700',
};

export default function PricingPage() {
  const { isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<PricingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PricingItem | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [serviceTypeFilter, setServiceTypeFilter] = useState('');
  const [tradeFilter, setTradeFilter] = useState('');

  const [formData, setFormData] = useState({
    category: 'Diagnostics',
    name: '',
    description: '',
    price: 0,
    unit: 'flat',
    pricing_type: 'fixed',
    service_type: 'residential',
    trade: 'hvac',
    note: '',
    sort_order: 0,
  });

  useEffect(() => {
    if (!authLoading) fetchPricing();
  }, [authLoading]);

  const fetchPricing = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('pricing')
        .select('*')
        .order('sort_order')
        .order('name');

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        !search ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(search.toLowerCase()));
      const matchesCategory = !categoryFilter || item.category === categoryFilter;
      const matchesServiceType = !serviceTypeFilter || item.service_type === serviceTypeFilter;
      const matchesTrade = !tradeFilter || item.trade === tradeFilter;
      return matchesSearch && matchesCategory && matchesServiceType && matchesTrade;
    });
  }, [items, search, categoryFilter, serviceTypeFilter, tradeFilter]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, PricingItem[]> = {};
    filteredItems.forEach((item) => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [filteredItems]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      category: 'Diagnostics',
      name: '',
      description: '',
      price: 0,
      unit: 'flat',
      pricing_type: 'fixed',
      service_type: 'residential',
      trade: 'hvac',
      note: '',
      sort_order: 0,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: PricingItem) => {
    setEditingItem(item);
    setFormData({
      category: item.category,
      name: item.name,
      description: item.description || '',
      price: item.price,
      unit: item.unit || 'flat',
      pricing_type: item.pricing_type || 'flat_rate',
      service_type: item.service_type || 'residential',
      trade: item.trade || 'hvac',
      note: item.note || '',
      sort_order: item.sort_order || 0,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const supabase = createClient();

      const payload = {
        ...formData,
        note: formData.note || null,
      };

      if (editingItem) {
        const { data, error } = await supabase
          .from('pricing')
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingItem.id)
          .select()
          .single();

        if (error) throw error;
        setItems(items.map((i) => (i.id === editingItem.id ? data : i)));
      } else {
        const { data, error } = await supabase
          .from('pricing')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        setItems([...items, data]);
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to save pricing item:', err);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      const supabase = createClient();
      const { error } = await supabase.from('pricing').delete().eq('id', deletingId);

      if (error) throw error;
      setItems(items.filter((i) => i.id !== deletingId));
      setIsDeleteConfirmOpen(false);
      setDeletingId(null);
    } catch (err) {
      console.error('Failed to delete pricing item:', err);
    }
  };

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((item) => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return counts;
  }, [items]);

  if (isLoading || authLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800 font-medium">Failed to load pricing</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Flat Rate Pricing</h1>
          <p className="text-gray-600 mt-1">Manage labor pricing for all services. These prices are shown on the public pricing page.</p>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Add Service
        </Button>
      </div>

      {/* Category Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICONS[cat] || Wrench;
          const count = categoryCounts[cat] || 0;
          return (
            <button
              key={cat}
              onClick={() => setCategoryFilter(categoryFilter === cat ? '' : cat)}
              className={`p-3 rounded-lg border text-left transition-colors ${
                categoryFilter === cat ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${CATEGORY_COLORS[cat]}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-lg font-bold text-gray-900 mt-2">{count}</p>
              <p className="text-xs text-gray-500">{cat}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          options={CATEGORY_OPTIONS}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full sm:w-44"
        />
        <Select
          options={[{ value: '', label: 'All Types' }, ...SERVICE_TYPES]}
          value={serviceTypeFilter}
          onChange={(e) => setServiceTypeFilter(e.target.value)}
          className="w-full sm:w-40"
        />
        <Select
          options={[{ value: '', label: 'All Trades' }, ...TRADES]}
          value={tradeFilter}
          onChange={(e) => setTradeFilter(e.target.value)}
          className="w-full sm:w-40"
        />
      </div>

      {/* Pricing Table */}
      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No pricing items found</h3>
            <p className="text-gray-600">
              {search || categoryFilter || serviceTypeFilter || tradeFilter
                ? 'Try adjusting your filters'
                : 'Add your first service pricing to get started'}
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedItems).map(([category, categoryItems]) => (
          <Card key={category}>
            <CardContent className="p-0">
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                {(() => {
                  const Icon = CATEGORY_ICONS[category] || Wrench;
                  return (
                    <div className={`w-6 h-6 rounded flex items-center justify-center ${CATEGORY_COLORS[category]}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                  );
                })()}
                <h3 className="font-semibold text-gray-900">{category}</h3>
                <span className="text-sm text-gray-500">({categoryItems.length})</span>
              </div>

              {/* Mobile layout */}
              <div className="sm:hidden divide-y divide-gray-200">
                {categoryItems.map((item) => (
                  <div key={item.id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        {item.note && (
                          <p className="text-xs text-gray-400 mt-0.5">{item.note}</p>
                        )}
                        {item.description && (
                          <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SERVICE_TYPE_COLORS[item.service_type] || ''}`}>
                            {item.service_type === 'residential' ? 'Residential' : 'Commercial'}
                          </span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TRADE_COLORS[item.trade] || ''}`}>
                            {item.trade === 'hvac' ? 'HVAC' : 'Refrigeration'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-sm font-medium text-gray-900">{formatCurrency(item.price)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setDeletingId(item.id); setIsDeleteConfirmOpen(true); }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-500 border-b">
                      <th className="px-6 py-3 font-medium">Service Name</th>
                      <th className="px-6 py-3 font-medium">Type / Trade</th>
                      <th className="px-6 py-3 font-medium">Labor Price</th>
                      <th className="px-6 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {categoryItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <span className="font-medium text-gray-900">{item.name}</span>
                          {item.note && (
                            <span className="block text-xs text-gray-400">{item.note}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SERVICE_TYPE_COLORS[item.service_type] || ''}`}>
                              {item.service_type === 'residential' ? 'Res' : 'Com'}
                            </span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TRADE_COLORS[item.trade] || ''}`}>
                              {item.trade === 'hvac' ? 'HVAC' : 'Refrig'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {formatCurrency(item.price)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setDeletingId(item.id); setIsDeleteConfirmOpen(true); }}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Service Pricing' : 'Add Service Pricing'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Service Type"
              options={SERVICE_TYPES}
              value={formData.service_type}
              onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
            />
            <Select
              label="Trade"
              options={TRADES}
              value={formData.trade}
              onChange={(e) => setFormData({ ...formData, trade: e.target.value })}
            />
          </div>
          <Select
            label="Category"
            options={CATEGORY_SELECT_OPTIONS}
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          />
          <Input
            label="Service Name"
            placeholder="e.g., Capacitor Replacement"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="Note (shown on public pricing page)"
            placeholder="e.g., R-410A, Standard wired, etc."
            value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (shown on public pricing page)</label>
            <textarea
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-black placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              rows={2}
              placeholder="What this service includes — shown to customers..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Labor Price ($)"
              type="number"
              min="0"
              step="0.01"
              value={formData.price || ''}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              required
            />
            <Input
              label="Sort Order"
              type="number"
              min="0"
              value={formData.sort_order || ''}
              onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingItem ? 'Update' : 'Add'} Service
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title="Delete Pricing Item"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete this pricing item? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
