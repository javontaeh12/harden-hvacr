'use client';

import { useState, useRef, useEffect } from 'react';
import { InventoryItem, Van, CustomPart, GroupStockPart } from '@/types';
import { Button, Input, Modal, Select } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { createClient } from '@/lib/supabase';
import { Pencil, Trash2, Plus, AlertTriangle, Check, X, BellOff, Bell, Minus } from 'lucide-react';

interface ExtendedPart {
  item: string;
  description: string;
  category?: string;
  isCustom?: boolean;
}

interface InventoryTableProps {
  items: InventoryItem[];
  vans: Van[];
  onAdd: (item: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onUpdate: (id: string, item: Partial<InventoryItem>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  selectedVanId: string | null;
  isAdmin: boolean;
  groupId: string | null;
  userVanId: string | null;
}

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'refrigerant', label: 'Refrigerants' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'filters', label: 'Filters' },
  { value: 'tools', label: 'Tools' },
  { value: 'parts', label: 'Parts' },
  { value: 'other', label: 'Other' },
];

const CATEGORY_OPTIONS = CATEGORIES.filter((c) => c.value !== '');

interface BatchEdits {
  [itemId: string]: {
    quantity?: number;
    min_quantity?: number;
    cost?: string;
    vendor?: string;
  };
}

export function InventoryTable({
  items,
  vans,
  onAdd,
  onUpdate,
  onDelete,
  selectedVanId,
  isAdmin,
  groupId,
  userVanId,
}: InventoryTableProps) {
  // Techs can only edit their own van's items
  const canEdit = isAdmin || !selectedVanId || selectedVanId === userVanId;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isBatchEditing, setIsBatchEditing] = useState(false);
  const [batchEdits, setBatchEdits] = useState<BatchEdits>({});
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [mutedIds, setMutedIds] = useState<Set<string>>(new Set());

  // Load muted items from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('muted_inventory_items');
    if (stored) {
      try { setMutedIds(new Set(JSON.parse(stored))); } catch {}
    }
  }, []);

  const toggleMuteItem = (itemId: string) => {
    setMutedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      localStorage.setItem('muted_inventory_items', JSON.stringify([...next]));
      return next;
    });
  };

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    part_number: '',
    quantity: '',
    min_quantity: '',
    cost: '',
    vendor: '',
    location: '',
    category: 'parts',
    van_id: selectedVanId || '',
  });

  // Autocomplete state
  const [autocompleteResults, setAutocompleteResults] = useState<ExtendedPart[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [customParts, setCustomParts] = useState<CustomPart[]>([]);
  const [stockParts, setStockParts] = useState<GroupStockPart[]>([]);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Fetch group stock parts and custom parts on mount
  useEffect(() => {
    if (!groupId) return;
    const fetchParts = async () => {
      const supabase = createClient();
      const [stockResult, customResult] = await Promise.all([
        supabase.from('group_stock_parts').select('*').eq('group_id', groupId).order('item'),
        supabase.from('custom_parts').select('*').eq('group_id', groupId).order('item'),
      ]);
      if (stockResult.data) setStockParts(stockResult.data);
      if (customResult.data) setCustomParts(customResult.data);
    };
    fetchParts();
  }, [groupId]);

  // Handle click outside to close autocomplete
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search both stock and custom parts
  const searchAllParts = (query: string): ExtendedPart[] => {
    if (!query || query.length < 1) return [];
    const lowerQuery = query.toLowerCase();

    // Search group stock parts
    const stockResults = stockParts.filter(
      (p) =>
        p.item.toLowerCase().includes(lowerQuery) ||
        (p.description?.toLowerCase().includes(lowerQuery))
    ).map((p) => ({ item: p.item, description: p.description || '', category: p.category || undefined, isCustom: false }));

    // Search custom parts
    const customResults = customParts
      .filter(
        (p) =>
          p.item.toLowerCase().includes(lowerQuery) ||
          p.description.toLowerCase().includes(lowerQuery)
      )
      .map((p) => ({
        item: p.item,
        description: p.description,
        category: p.category || undefined,
        isCustom: true,
      }));

    // Custom parts first, then stock parts
    return [...customResults, ...stockResults].slice(0, 10);
  };

  const handleNameChange = (value: string) => {
    setFormData({ ...formData, name: value });
    const results = searchAllParts(value);
    setAutocompleteResults(results);
    setShowAutocomplete(results.length > 0);
    setSelectedIndex(-1);
  };

  const handleSelectPart = (part: ExtendedPart) => {
    setFormData({
      ...formData,
      name: part.description,
      part_number: part.item,
      description: part.description,
    });
    setShowAutocomplete(false);
    setAutocompleteResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showAutocomplete || autocompleteResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, autocompleteResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelectPart(autocompleteResults[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowAutocomplete(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.part_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.vendor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !categoryFilter || item.category === categoryFilter;
    const matchesVan = !selectedVanId || item.van_id === selectedVanId;
    return matchesSearch && matchesCategory && matchesVan;
  });

  const handleOpenModal = (item?: InventoryItem) => {
    // Reset autocomplete state
    setAutocompleteResults([]);
    setShowAutocomplete(false);
    setSelectedIndex(-1);

    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        description: item.description || '',
        part_number: item.part_number || '',
        quantity: item.quantity.toString(),
        min_quantity: item.min_quantity.toString(),
        cost: item.cost?.toString() || '',
        vendor: item.vendor || '',
        location: item.location || '',
        category: item.category || 'parts',
        van_id: item.van_id,
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        description: '',
        part_number: '',
        quantity: '',
        min_quantity: '',
        cost: '',
        vendor: '',
        location: '',
        category: 'parts',
        van_id: selectedVanId || userVanId || vans[0]?.id || '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const itemData = {
      name: formData.name,
      description: formData.description || null,
      part_number: formData.part_number || null,
      quantity: formData.quantity ? parseInt(formData.quantity) : 0,
      min_quantity: formData.min_quantity ? parseInt(formData.min_quantity) : 0,
      cost: formData.cost ? parseFloat(formData.cost) : null,
      vendor: formData.vendor || null,
      location: formData.location || null,
      category: formData.category || null,
      van_id: formData.van_id,
      group_id: groupId!,
    };

    if (editingItem) {
      await onUpdate(editingItem.id, itemData);
    } else {
      await onAdd(itemData);
    }

    setIsLoading(false);
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      await onDelete(id);
    }
  };

  const handleUseItem = async (item: InventoryItem) => {
    if (item.quantity <= 0) return;
    await onUpdate(item.id, { quantity: item.quantity - 1 });
  };

  // Batch edit helpers
  const getBatchValue = (itemId: string, field: keyof BatchEdits[string], originalValue: number | string | null) => {
    const edits = batchEdits[itemId];
    if (edits && field in edits) {
      return edits[field as keyof typeof edits];
    }
    return originalValue;
  };

  const setBatchValue = (itemId: string, field: string, value: number | string) => {
    setBatchEdits((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }));
  };

  const startBatchEdit = () => {
    setIsBatchEditing(true);
    setBatchEdits({});
  };

  const cancelBatchEdit = () => {
    setIsBatchEditing(false);
    setBatchEdits({});
  };

  const saveBatchEdits = async () => {
    const changedIds = Object.keys(batchEdits);
    if (changedIds.length === 0) {
      setIsBatchEditing(false);
      return;
    }

    setIsSavingBatch(true);

    const updates = changedIds.map((id) => {
      const edits = batchEdits[id];
      const updates: Partial<InventoryItem> = {};
      if (edits.quantity !== undefined) updates.quantity = parseInt(edits.quantity as unknown as string) || 0;
      if (edits.min_quantity !== undefined) updates.min_quantity = parseInt(edits.min_quantity as unknown as string) || 0;
      if (edits.cost !== undefined) updates.cost = edits.cost ? parseFloat(edits.cost as string) : null;
      if (edits.vendor !== undefined) updates.vendor = (edits.vendor as string) || null;
      return onUpdate(id, updates);
    });

    await Promise.all(updates);
    setIsSavingBatch(false);
    setIsBatchEditing(false);
    setBatchEdits({});
  };

  const changedCount = Object.keys(batchEdits).length;

  const vanMap = new Map(vans.map((v) => [v.id, `Van ${v.van_number || v.name}`]));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64"
          />
          <Select
            options={CATEGORIES}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full sm:w-40"
          />
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            {isBatchEditing ? (
              <>
                <Button variant="ghost" onClick={cancelBatchEdit}>
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
                <Button onClick={saveBatchEdits} isLoading={isSavingBatch}>
                  <Check className="w-4 h-4 mr-1" />
                  Save{changedCount > 0 ? ` (${changedCount})` : ''}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={startBatchEdit}>
                  <Pencil className="w-4 h-4 mr-1" />
                  Edit All
                </Button>
                <Button onClick={() => handleOpenModal()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Mobile card layout */}
      <div className="md:hidden space-y-3">
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-8 text-center text-gray-500">
            No items found
          </div>
        ) : (
          filteredItems.map((item) => {
            const isMuted = mutedIds.has(item.id);
            const isLowStock = !isMuted && item.quantity < item.min_quantity;
            return (
              <div
                key={item.id}
                className={`bg-white rounded-xl shadow-sm border p-4 ${
                  isLowStock ? 'border-red-200 bg-red-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    {isLowStock && <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />}
                    <div className="min-w-0">
                      <p className="font-medium text-black truncate">{item.name}</p>
                      {item.part_number && (
                        <p className="text-xs text-black mt-0.5">{item.part_number}</p>
                      )}
                    </div>
                  </div>
                  {!isBatchEditing && (
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      <button
                        onClick={() => toggleMuteItem(item.id)}
                        className={`p-2 transition-colors rounded-lg ${isMuted ? 'text-orange-500 hover:text-orange-700' : 'text-gray-400 hover:text-gray-600'}`}
                        title={isMuted ? 'Unmute alerts' : 'Mute alerts'}
                      >
                        {isMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                      </button>
                      {canEdit && (
                        <>
                          <button
                            onClick={() => handleOpenModal(item)}
                            className="p-2 text-gray-400 hover:text-blue-600 active:text-blue-700 transition-colors rounded-lg"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-gray-400 hover:text-red-600 active:text-red-700 transition-colors rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">On Hand</p>
                    {isBatchEditing ? (
                      <input
                        type="number"
                        min={0}
                        className="w-full mt-1 px-2 py-1 border border-blue-300 rounded text-sm font-medium bg-white text-black focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        value={getBatchValue(item.id, 'quantity', item.quantity) as number}
                        onChange={(e) => setBatchValue(item.id, 'quantity', e.target.value)}
                      />
                    ) : (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            isLowStock
                              ? 'bg-red-100 text-red-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {item.quantity || ''}
                        </span>
                        {canEdit && (
                          <button
                            onClick={() => handleUseItem(item)}
                            disabled={item.quantity <= 0}
                            className="p-1 text-gray-400 hover:text-orange-600 active:text-orange-700 transition-colors rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Use 1"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Min</p>
                    {isBatchEditing ? (
                      <input
                        type="number"
                        min={0}
                        className="w-full mt-1 px-2 py-1 border border-blue-300 rounded text-sm font-medium bg-white text-black focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        value={getBatchValue(item.id, 'min_quantity', item.min_quantity) as number}
                        onChange={(e) => setBatchValue(item.id, 'min_quantity', e.target.value)}
                      />
                    ) : (
                      <p className="font-medium text-black mt-1">{item.min_quantity || ''}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Cost</p>
                    {isBatchEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        className="w-full mt-1 px-2 py-1 border border-blue-300 rounded text-sm font-medium bg-white text-black focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        value={getBatchValue(item.id, 'cost', item.cost?.toString() || '') as string}
                        onChange={(e) => setBatchValue(item.id, 'cost', e.target.value)}
                      />
                    ) : (
                      <p className="font-medium text-black mt-1">{item.cost ? formatCurrency(item.cost) : ''}</p>
                    )}
                  </div>
                </div>
                {(isAdmin && !selectedVanId || item.vendor || item.location) && (
                  <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                    {isAdmin && !selectedVanId && (
                      <span>Van: {vanMap.get(item.van_id) || 'Unknown'}</span>
                    )}
                    {item.location && <span>Location: {item.location}</span>}
                    {item.vendor && <span>Vendor: {item.vendor}</span>}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Desktop table layout */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-sm text-gray-500">
                <th className="px-4 py-3 font-medium">Item</th>
                {isAdmin && !selectedVanId && <th className="px-4 py-3 font-medium">Van</th>}
                <th className="px-4 py-3 font-medium">Part #</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">On Hand</th>
                <th className="px-4 py-3 font-medium">Min</th>
                <th className="px-4 py-3 font-medium">Cost</th>
                <th className="px-4 py-3 font-medium">Vendor</th>
                {!isBatchEditing && <th className="px-4 py-3 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin && !selectedVanId ? 9 : 8} className="px-4 py-8 text-center text-gray-500">
                    No items found
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isMuted = mutedIds.has(item.id);
                  const isLowStock = !isMuted && item.quantity < item.min_quantity;
                  return (
                    <tr key={item.id} className={isLowStock ? 'bg-red-50' : ''}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isLowStock && <AlertTriangle className="w-4 h-4 text-red-500" />}
                          <div>
                            <p className="font-medium text-black">{item.name}</p>
                            {item.description && (
                              <p className="text-sm text-black truncate max-w-xs">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      {isAdmin && !selectedVanId && (
                        <td className="px-4 py-3 text-black">
                          {vanMap.get(item.van_id) || 'Unknown'}
                        </td>
                      )}
                      <td className="px-4 py-3 text-black">{item.part_number || ''}</td>
                      <td className="px-4 py-3 text-black text-sm">{item.location || ''}</td>
                      <td className="px-4 py-3">
                        {isBatchEditing ? (
                          <input
                            type="number"
                            min={0}
                            className="w-20 px-2 py-1 border border-blue-300 rounded text-sm bg-white text-black focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            value={getBatchValue(item.id, 'quantity', item.quantity) as number}
                            onChange={(e) => setBatchValue(item.id, 'quantity', e.target.value)}
                          />
                        ) : (
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              isLowStock
                                ? 'bg-red-100 text-red-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {item.quantity || ''}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isBatchEditing ? (
                          <input
                            type="number"
                            min={0}
                            className="w-20 px-2 py-1 border border-blue-300 rounded text-sm bg-white text-black focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            value={getBatchValue(item.id, 'min_quantity', item.min_quantity) as number}
                            onChange={(e) => setBatchValue(item.id, 'min_quantity', e.target.value)}
                          />
                        ) : (
                          <span className="text-black">{item.min_quantity || ''}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isBatchEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            min={0}
                            className="w-24 px-2 py-1 border border-blue-300 rounded text-sm bg-white text-black focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            value={getBatchValue(item.id, 'cost', item.cost?.toString() || '') as string}
                            onChange={(e) => setBatchValue(item.id, 'cost', e.target.value)}
                          />
                        ) : (
                          <span className="text-black">{item.cost ? formatCurrency(item.cost) : ''}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isBatchEditing ? (
                          <input
                            type="text"
                            className="w-28 px-2 py-1 border border-blue-300 rounded text-sm bg-white text-black focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            value={(getBatchValue(item.id, 'vendor', item.vendor || '') as string)}
                            onChange={(e) => setBatchValue(item.id, 'vendor', e.target.value)}
                          />
                        ) : (
                          <span className="text-black">{item.vendor || ''}</span>
                        )}
                      </td>
                      {!isBatchEditing && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleMuteItem(item.id)}
                              className={`p-1 transition-colors ${isMuted ? 'text-orange-500 hover:text-orange-700' : 'text-gray-400 hover:text-gray-600'}`}
                              title={isMuted ? 'Unmute alerts' : 'Mute alerts'}
                            >
                              {isMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                            </button>
                            {canEdit && (
                              <>
                                <button
                                  onClick={() => handleUseItem(item)}
                                  disabled={item.quantity <= 0}
                                  className="p-1 text-gray-400 hover:text-orange-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                  title="Use 1"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleOpenModal(item)}
                                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Item' : 'Add Item'}
        className="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Item Name with Autocomplete */}
            <div className="sm:col-span-2 relative" ref={autocompleteRef}>
              <Input
                label="Item Name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (autocompleteResults.length > 0) setShowAutocomplete(true);
                }}
                placeholder="Start typing to search parts..."
                required
                autoComplete="off"
              />
              <p className="text-xs text-gray-400 mt-1">Type to search from {stockParts.length + customParts.length} parts</p>
              {showAutocomplete && autocompleteResults.length > 0 && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {autocompleteResults.map((part, index) => (
                    <div
                      key={`${part.item}-${part.isCustom ? 'custom' : 'stock'}`}
                      onClick={() => handleSelectPart(part)}
                      className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${
                        index === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-semibold text-sm text-blue-700 flex items-center gap-2">
                        {part.item}
                        {part.isCustom && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700">
                            CUSTOM
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-700">{part.description}</div>
                      {part.category && (
                        <div className="text-xs text-gray-400 mt-1">{part.category}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Input
              label="Part Number"
              value={formData.part_number}
              onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
              placeholder="Auto-fills when part selected"
            />
            <Select
              label="Category"
              options={CATEGORY_OPTIONS}
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />
            {isAdmin && (
              <Select
                label="Van"
                options={vans.map((v) => ({ value: v.id, label: `Van ${v.van_number || v.name}` }))}
                value={formData.van_id}
                onChange={(e) => setFormData({ ...formData, van_id: e.target.value })}
                className="sm:col-span-2"
              />
            )}
            <Input
              label="On Hand"
              type="number"
              min={0}
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              placeholder="Enter quantity"
            />
            <Input
              label="Minimum Quantity"
              type="number"
              min={0}
              value={formData.min_quantity}
              onChange={(e) => setFormData({ ...formData, min_quantity: e.target.value })}
              placeholder="Enter minimum"
            />
            <Input
              label="Cost"
              type="number"
              step="0.01"
              min={0}
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
            />
            <Input
              label="Vendor"
              value={formData.vendor}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
            />
            <Input
              label="Location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g. Top shelf, Drawer 3"
            />
            <Input
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="sm:col-span-2"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              {editingItem ? 'Update' : 'Add'} Item
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
