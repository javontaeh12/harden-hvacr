'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, Button, Input, Modal } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import {
  Plus,
  Search,
  Star,
  TrendingUp,
  Award,
  Users,
  ArrowUpCircle,
  ArrowDownCircle,
} from 'lucide-react';

interface Customer {
  id: string;
  full_name: string;
  customer_rewards?: Array<{ balance: number; lifetime_earned: number }>;
}

interface RewardTransaction {
  id: string;
  customer_id: string;
  type: string;
  points: number;
  description: string | null;
  created_at: string;
  customers?: { full_name: string } | null;
}

const TIER_CONFIG = [
  { name: 'Bronze', min: 0, color: 'text-orange-600', bg: 'bg-orange-100' },
  { name: 'Silver', min: 500, color: 'text-gray-600', bg: 'bg-gray-200' },
  { name: 'Gold', min: 1500, color: 'text-yellow-600', bg: 'bg-yellow-100' },
];

function getTier(points: number) {
  for (let i = TIER_CONFIG.length - 1; i >= 0; i--) {
    if (points >= TIER_CONFIG[i].min) return TIER_CONFIG[i];
  }
  return TIER_CONFIG[0];
}

export default function RewardsPage() {
  const { groupId, isLoading: authLoading } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<RewardTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  const [form, setForm] = useState({
    customer_id: '', type: 'earned', points: 0, description: '',
  });

  useEffect(() => {
    if (!authLoading && groupId) fetchData();
  }, [authLoading, groupId]);

  const fetchData = async () => {
    const supabase = createClient();
    const [customersRes, transRes] = await Promise.all([
      supabase.from('customers').select('id, full_name, customer_rewards(balance, lifetime_earned)').eq('group_id', groupId!).order('full_name'),
      supabase.from('reward_transactions').select('*, customers(full_name)').eq('group_id', groupId!).order('created_at', { ascending: false }).limit(100),
    ]);
    setCustomers(customersRes.data || []);
    setTransactions(transRes.data || []);
    setIsLoading(false);
  };

  const addTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !form.customer_id) return;
    const supabase = createClient();
    const { data, error } = await supabase.from('reward_transactions').insert({
      customer_id: form.customer_id,
      type: form.type,
      points: form.type === 'redeemed' ? -Math.abs(form.points) : Math.abs(form.points),
      description: form.description || null,
      group_id: groupId,
    } as Record<string, unknown>).select('*, customers(full_name)').single();
    if (!error && data) {
      setTransactions([data, ...transactions]);
      // Update local balance
      setCustomers((prev) => prev.map((c) => {
        if (c.id !== form.customer_id) return c;
        const balance = (c.customer_rewards?.[0]?.balance || 0) + data.points;
        const lifetime = (c.customer_rewards?.[0]?.lifetime_earned || 0) + (data.points > 0 ? data.points : 0);
        return { ...c, customer_rewards: [{ balance, lifetime_earned: lifetime }] };
      }));
      // Also update in Supabase
      const customer = customers.find((c) => c.id === form.customer_id);
      if (customer) {
        const newBalance = (customer.customer_rewards?.[0]?.balance || 0) + data.points;
        const newLifetime = (customer.customer_rewards?.[0]?.lifetime_earned || 0) + (data.points > 0 ? data.points : 0);
        await supabase.from('customer_rewards').update({ balance: newBalance, lifetime_earned: newLifetime }).eq('customer_id', form.customer_id);
      }
      setIsAddOpen(false);
      setForm({ customer_id: '', type: 'earned', points: 0, description: '' });
    }
  };

  const filteredCustomers = useMemo(() => {
    if (!search) return customers;
    return customers.filter((c) => c.full_name.toLowerCase().includes(search.toLowerCase()));
  }, [customers, search]);

  // Tier distribution
  const tierDist = useMemo(() => {
    const dist = { Bronze: 0, Silver: 0, Gold: 0 };
    customers.forEach((c) => {
      const lifetime = c.customer_rewards?.[0]?.lifetime_earned || 0;
      const tier = getTier(lifetime);
      dist[tier.name as keyof typeof dist]++;
    });
    return dist;
  }, [customers]);

  const totalPointsOut = customers.reduce((sum, c) => sum + (c.customer_rewards?.[0]?.balance || 0), 0);

  // Customer transactions for selected customer
  const customerTransactions = selectedCustomerId
    ? transactions.filter((t) => t.customer_id === selectedCustomerId)
    : [];

  if (isLoading || authLoading) {
    return <div className="animate-pulse space-y-4"><div className="h-8 bg-gray-200 rounded w-48" /><div className="h-64 bg-gray-200 rounded-xl" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rewards Center</h1>
          <p className="text-gray-600 mt-1">Customer loyalty points & rewards management</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Award Points
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs font-medium text-gray-500">Total Members</p><p className="text-2xl font-bold">{customers.length}</p></div>
              <div className="bg-blue-500 p-2 rounded-lg"><Users className="w-5 h-5 text-white" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs font-medium text-gray-500">Points Outstanding</p><p className="text-2xl font-bold">{totalPointsOut.toLocaleString()}</p></div>
              <div className="bg-purple-500 p-2 rounded-lg"><Star className="w-5 h-5 text-white" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Tier Distribution</p>
            <div className="flex gap-2">
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-600">{tierDist.Bronze} Bronze</span>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-600">{tierDist.Silver} Silver</span>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-600">{tierDist.Gold} Gold</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs font-medium text-gray-500">Recent Activity</p><p className="text-2xl font-bold">{transactions.length}</p></div>
              <div className="bg-green-500 p-2 rounded-lg"><TrendingUp className="w-5 h-5 text-white" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer List */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {filteredCustomers.map((customer) => {
                  const balance = customer.customer_rewards?.[0]?.balance || 0;
                  const lifetime = customer.customer_rewards?.[0]?.lifetime_earned || 0;
                  const tier = getTier(lifetime);
                  return (
                    <div
                      key={customer.id}
                      className={`p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between ${selectedCustomerId === customer.id ? 'bg-blue-50' : ''}`}
                      onClick={() => setSelectedCustomerId(selectedCustomerId === customer.id ? '' : customer.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tier.bg}`}>
                          <Award className={`w-4 h-4 ${tier.color}`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{customer.full_name}</p>
                          <span className={`text-xs font-medium ${tier.color}`}>{tier.name}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{balance.toLocaleString()} pts</p>
                        <p className="text-xs text-gray-500">Lifetime: {lifetime.toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })}
                {filteredCustomers.length === 0 && (
                  <div className="p-12 text-center text-gray-500">No customers found</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <div>
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">
                {selectedCustomerId ? 'Customer History' : 'Recent Activity'}
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {(selectedCustomerId ? customerTransactions : transactions.slice(0, 20)).map((t) => (
                  <div key={t.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                    {t.points > 0 ? (
                      <ArrowUpCircle className="w-4 h-4 text-green-500 shrink-0" />
                    ) : (
                      <ArrowDownCircle className="w-4 h-4 text-red-500 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-700 truncate">{t.description || t.type}</p>
                      <p className="text-xs text-gray-400">{t.customers?.full_name} &middot; {formatDate(t.created_at)}</p>
                    </div>
                    <span className={`font-bold shrink-0 ${t.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {t.points > 0 ? '+' : ''}{t.points}
                    </span>
                  </div>
                ))}
                {(selectedCustomerId ? customerTransactions : transactions).length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">No activity</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Award Points Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Award / Adjust Points">
        <form onSubmit={addTransaction} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" required>
              <option value="">Select customer...</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="earned">Earned (Service)</option>
              <option value="referral">Referral Bonus</option>
              <option value="review">Review Bonus</option>
              <option value="redeemed">Redeemed</option>
              <option value="adjusted">Adjustment</option>
            </select>
          </div>
          <Input label="Points" type="number" value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 })} required />
          <Input label="Description" placeholder="Reason for points..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button type="submit">{form.type === 'redeemed' ? 'Redeem Points' : 'Award Points'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
