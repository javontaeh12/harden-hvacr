'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Minus, Package } from 'lucide-react';

interface Part {
  name: string;
  quantity: number;
  cost: number;
  inventory_item_id?: string;
}

interface InventoryItem {
  id: string;
  name: string;
  unit_cost: number;
  quantity: number;
}

interface PartsLoggerProps {
  groupId: string;
  partsUsed: Part[];
  onPartsChange: (parts: Part[]) => void;
}

export default function PartsLogger({ groupId, partsUsed, onPartsChange }: PartsLoggerProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    if (!groupId) return;
    fetch(`/api/inventory?group_id=${groupId}`)
      .then((res) => res.json())
      .then((data) => setInventory(Array.isArray(data) ? data : []));
  }, [groupId]);

  const filteredInventory = inventory.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const addPart = (item: InventoryItem) => {
    const existing = partsUsed.find((p) => p.inventory_item_id === item.id);
    if (existing) {
      onPartsChange(
        partsUsed.map((p) =>
          p.inventory_item_id === item.id ? { ...p, quantity: p.quantity + 1 } : p
        )
      );
    } else {
      onPartsChange([
        ...partsUsed,
        { name: item.name, quantity: 1, cost: item.unit_cost, inventory_item_id: item.id },
      ]);
    }
    setShowSearch(false);
    setSearch('');
  };

  const updateQuantity = (index: number, delta: number) => {
    const updated = [...partsUsed];
    updated[index] = { ...updated[index], quantity: Math.max(0, updated[index].quantity + delta) };
    onPartsChange(updated.filter((p) => p.quantity > 0));
  };

  const totalCost = partsUsed.reduce((sum, p) => sum + p.cost * p.quantity, 0);

  return (
    <div className="space-y-3">
      {/* Parts list */}
      {partsUsed.length > 0 && (
        <div className="space-y-2">
          {partsUsed.map((part, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{part.name}</p>
                <p className="text-xs text-gray-500">${part.cost.toFixed(2)} each</p>
              </div>
              <div className="flex items-center gap-2 ml-2">
                <button
                  onClick={() => updateQuantity(i, -1)}
                  className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-sm font-semibold w-6 text-center">{part.quantity}</span>
                <button
                  onClick={() => updateQuantity(i, 1)}
                  className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          <div className="flex justify-between text-sm pt-1">
            <span className="text-gray-500">Total</span>
            <span className="font-semibold">${totalCost.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Add parts */}
      {showSearch ? (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search inventory..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredInventory.map((item) => (
              <button
                key={item.id}
                onClick={() => addPart(item)}
                className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-blue-50 text-left"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.quantity} in stock · ${item.unit_cost.toFixed(2)}</p>
                </div>
                <Plus className="w-4 h-4 text-blue-500" />
              </button>
            ))}
            {filteredInventory.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No items found</p>
            )}
          </div>
          <button onClick={() => { setShowSearch(false); setSearch(''); }} className="w-full text-sm text-gray-500 py-1">
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowSearch(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-dashed border-gray-300 text-sm font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600"
        >
          <Package className="w-4 h-4" />
          Add Part from Inventory
        </button>
      )}
    </div>
  );
}
