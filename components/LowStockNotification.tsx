'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from './AuthProvider';
import { Bell, AlertTriangle, UserPlus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface LowStockItem {
  id: string;
  name: string;
  quantity: number;
  min_quantity: number;
  van_name: string;
}

interface PendingUser {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
}

export function LowStockNotification() {
  const { profile } = useAuth();
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile?.status === 'approved') {
      fetchNotifications();
    }
  }, [profile]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    const supabase = createClient();

    // Get inventory items and vans
    const [itemsResult, vansResult] = await Promise.all([
      supabase.from('inventory_items').select('*'),
      supabase.from('vans').select('*'),
    ]);

    const items = itemsResult.data || [];
    const vans = vansResult.data || [];
    const vanMap = new Map(vans.map((v) => [v.id, v.name]));

    // Filter for low stock items
    let lowStock = items.filter((item) => item.quantity < item.min_quantity);

    // If tech, only show their van's items
    if (profile?.role === 'tech' && profile?.van_id) {
      lowStock = lowStock.filter((item) => item.van_id === profile.van_id);
    }

    const formattedItems = lowStock.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      min_quantity: item.min_quantity,
      van_name: vanMap.get(item.van_id) || 'Unknown',
    }));

    setLowStockItems(formattedItems);

    // Fetch pending users for admins
    let pendingCount = 0;
    const isAdmin = profile?.role === 'admin' || profile?.email === 'javontaedharden@gmail.com';
    if (isAdmin) {
      const { data: pending } = await supabase
        .from('profiles')
        .select('id, full_name, email, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      const pendingData = (pending || []) as PendingUser[];
      setPendingUsers(pendingData);
      pendingCount = pendingData.length;
    }

    // Check if there are new notifications
    const totalCount = formattedItems.length + pendingCount;
    const previousCount = parseInt(localStorage.getItem('notificationCount') || '0');
    if (totalCount > previousCount) {
      setHasNew(true);
    }
    localStorage.setItem('notificationCount', totalCount.toString());
  };

  const handleOpen = () => {
    setIsOpen(!isOpen);
    setHasNew(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className={cn(
          'relative p-2 rounded-lg transition-colors',
          isOpen ? 'bg-gray-100' : 'hover:bg-gray-100'
        )}
      >
        <Bell className="w-5 h-5 text-gray-600" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-gray-600" />
              <span className="font-semibold text-gray-900">Notifications</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {/* Pending Account Requests */}
            {pendingUsers.length > 0 && (
              <div>
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border-b border-blue-100">
                  <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                    New Account Requests ({pendingUsers.length})
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {pendingUsers.map((user) => (
                    <Link
                      key={user.id}
                      href="/admin/users"
                      onClick={() => setIsOpen(false)}
                      className="block px-4 py-3 hover:bg-blue-50"
                    >
                      <p className="font-medium text-gray-900 text-sm">
                        {user.full_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Low Stock Alerts */}
            {lowStockItems.length > 0 && (
              <div>
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-100">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                    Low Stock ({lowStockItems.length})
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {lowStockItems.map((item) => (
                    <div key={item.id} className="px-4 py-3 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                          <p className="text-xs text-gray-500">{item.van_name}</p>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            {item.quantity} left
                          </span>
                          <p className="text-xs text-gray-400 mt-1">
                            Min: {item.min_quantity}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {lowStockItems.length === 0 && pendingUsers.length === 0 && (
              <div className="px-4 py-8 text-center text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No notifications</p>
              </div>
            )}
          </div>

          {(lowStockItems.length > 0 || pendingUsers.length > 0) && (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <Link
                href={pendingUsers.length > 0 ? '/admin/users' : '/admin/orders'}
                onClick={() => setIsOpen(false)}
                className="block w-full text-center text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                {pendingUsers.length > 0 ? 'Manage Users →' : 'View All & Create Order →'}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
