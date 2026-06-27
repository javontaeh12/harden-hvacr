'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { InventoryTable } from '@/components/InventoryTable';
import { Button, Input, Modal, Select } from '@/components/ui';
import { InventoryItem, Van } from '@/types';
import { Plus, Truck } from 'lucide-react';

export default function InventoryPage() {
  const { profile, groupId, group, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [vans, setVans] = useState<Van[]>([]);
  const [selectedVanId, setSelectedVanId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVanModalOpen, setIsVanModalOpen] = useState(false);
  const [newVanNumber, setNewVanNumber] = useState('');
  const [isLoadingStock, setIsLoadingStock] = useState(false);
  const [vanError, setVanError] = useState<string | null>(null);

  const isAdmin = profile?.role === 'admin';

  // Fix auth race condition: only fetch data after auth finishes loading
  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading]);

  const fetchData = async () => {
    if (!groupId) return;
    try {
      const supabase = createClient();

      // All roles can see all vans' items, but default filter to their own van
      const [itemsResult, vansResult] = await Promise.all([
        supabase.from('inventory_items').select('*').eq('group_id', groupId).order('name'),
        supabase.from('vans').select('*').eq('group_id', groupId).order('name'),
      ]);

      setItems(itemsResult.data || []);
      setVans(vansResult.data || []);

      // Default to the user's assigned van
      if (profile?.van_id) {
        setSelectedVanId(profile.van_id);
      }
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddItem = async (item: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('inventory_items')
      .insert(item)
      .select()
      .single();

    if (!error && data) {
      setItems([...items, data]);
    }
  };

  const handleUpdateItem = async (id: string, updates: Partial<InventoryItem>) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('inventory_items')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      setItems(items.map((item) => (item.id === id ? data : item)));
    }
  };

  const handleDeleteItem = async (id: string) => {
    const res = await fetch('/api/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'inventory_items', id }),
    });

    if (res.ok) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const handleAddVan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingStock(true);
    setVanError(null);

    try {
      const res = await fetch('/api/vans/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ van_number: newVanNumber.trim(), group_id: groupId }),
      });

      const result = await res.json();

      if (!res.ok) {
        setVanError(result.error || `Failed to create van (${res.status})`);
        setIsLoadingStock(false);
        return;
      }

      // Success — reload the page to show the new van + parts
      setNewVanNumber('');
      setIsVanModalOpen(false);
      window.location.reload();
    } catch (err) {
      console.error('Error creating van:', err);
      setVanError('Network error. Please try again.');
    }

    setIsLoadingStock(false);
  };

  if (isLoading || authLoading) {
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
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-600 mt-1">
            {profile?.van_id
              ? `Van ${vans.find((v) => v.id === profile.van_id)?.van_number || ''} — Your Inventory`
              : group ? `${group.name} — Manage van inventory` : 'Manage your van inventory'}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select
            options={[
              { value: '', label: 'All Vans' },
              ...vans.map((v) => ({ value: v.id, label: `Van ${v.van_number || v.name}` })),
            ]}
            value={selectedVanId || ''}
            onChange={(e) => setSelectedVanId(e.target.value || null)}
            className="w-40"
          />
          {(isAdmin || !profile?.van_id) && (
            <Button variant="outline" onClick={() => setIsVanModalOpen(true)}>
              <Truck className="w-4 h-4 mr-2" />
              Add Van
            </Button>
          )}
        </div>
      </div>

      {!isAdmin && !profile?.van_id ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Van Assigned</h3>
          <p className="text-gray-600 mb-4">Add your van to start managing your inventory</p>
          <Button onClick={() => setIsVanModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Your Van
          </Button>
        </div>
      ) : vans.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Vans Yet</h3>
          <p className="text-gray-600 mb-4">Add a van to start tracking inventory</p>
          <Button onClick={() => setIsVanModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Van
          </Button>
        </div>
      ) : (
        <InventoryTable
          items={items}
          vans={vans}
          onAdd={handleAddItem}
          onUpdate={handleUpdateItem}
          onDelete={handleDeleteItem}
          selectedVanId={selectedVanId}
          isAdmin={isAdmin}
          groupId={groupId}
          userVanId={profile?.van_id || null}
        />
      )}

      <Modal
        isOpen={isVanModalOpen}
        onClose={() => setIsVanModalOpen(false)}
        title="Add Van"
      >
        <form onSubmit={handleAddVan} className="space-y-4">
          <Input
            label="Van Number"
            placeholder="e.g., 1, 2, 3"
            value={newVanNumber}
            onChange={(e) => setNewVanNumber(e.target.value)}
            required
          />
          {vanError && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{vanError}</p>
          )}
          <p className="text-sm text-gray-500 bg-blue-50 p-3 rounded-lg">
            Your group&apos;s stock parts will be automatically added to this van&apos;s inventory.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsVanModalOpen(false)} disabled={isLoadingStock}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoadingStock}>
              {isLoadingStock ? 'Adding Van & Parts...' : 'Add Van'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
