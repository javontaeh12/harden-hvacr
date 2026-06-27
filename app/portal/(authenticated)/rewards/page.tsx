'use client';

import { useEffect, useState } from 'react';
import { usePortal } from '@/components/PortalAuthProvider';
import { createClient } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import {
  Gift,
  Crown,
  Copy,
  Check,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  Users,
  Clock,
  Info,
  ChevronRight,
} from 'lucide-react';

interface RewardTransaction {
  id: string;
  type: 'earned' | 'redeemed' | 'adjusted' | 'referral' | 'review';
  points: number;
  description: string | null;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: typeof Gift }> = {
  earned: { label: 'Earned', color: 'text-green-600 bg-green-50', icon: TrendingUp },
  referral: { label: 'Referral', color: 'text-blue-600 bg-blue-50', icon: Users },
  review: { label: 'Review', color: 'text-purple-600 bg-purple-50', icon: Star },
  redeemed: { label: 'Redeemed', color: 'text-amber-600 bg-amber-50', icon: Gift },
  adjusted: { label: 'Adjustment', color: 'text-gray-600 bg-gray-50', icon: Info },
};

export default function RewardsPage() {
  const { customer, rewards } = usePortal();
  const [transactions, setTransactions] = useState<RewardTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!customer) return;
    const fetchTransactions = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('reward_transactions')
        .select('id, type, points, description, created_at')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(50);
      setTransactions(data || []);
      setLoading(false);
    };
    fetchTransactions();
  }, [customer]);

  const copyCode = () => {
    if (customer?.referral_code) {
      navigator.clipboard.writeText(customer.referral_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const balance = rewards?.balance || 0;
  const lifetime = rewards?.lifetime_earned || 0;

  const tier = lifetime >= 50000 ? 'Gold' : lifetime >= 20000 ? 'Silver' : 'Bronze';
  const tierColor = tier === 'Gold' ? 'from-yellow-400 to-yellow-600' :
    tier === 'Silver' ? 'from-gray-300 to-gray-500' : 'from-amber-600 to-amber-800';
  const tierBg = tier === 'Gold' ? 'bg-yellow-50 border-yellow-200' :
    tier === 'Silver' ? 'bg-gray-50 border-gray-200' : 'bg-amber-50 border-amber-200';
  const nextTier = tier === 'Bronze' ? { name: 'Silver', threshold: 20000 } :
    tier === 'Silver' ? { name: 'Gold', threshold: 50000 } : null;
  const tierProgress = nextTier ? Math.min((lifetime / nextTier.threshold) * 100, 100) : 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--navy)]">Rewards</h1>
        <p className="text-sm text-[var(--navy)]/50">Track your earnings and referral rewards</p>
      </div>

      {/* Balance card */}
      <div className="bg-gradient-to-br from-[var(--navy)] to-[#0d2e5e] rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--gold)]/10 rounded-full blur-[60px]" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Gift className="w-5 h-5 text-[var(--gold)]" />
            <span className="text-xs font-semibold text-[var(--gold)] uppercase tracking-wider">
              Available Balance
            </span>
          </div>
          <p className="text-4xl sm:text-5xl font-bold mb-1">
            {formatCurrency(balance / 100)}
          </p>
          <p className="text-white/40 text-sm">
            {formatCurrency(lifetime / 100)} lifetime earned
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Tier card */}
        <div className={`rounded-xl border p-4 ${tierBg}`}>
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider opacity-60">Tier</span>
          </div>
          <p className={`text-2xl font-bold bg-gradient-to-r ${tierColor} bg-clip-text text-transparent`}>
            {tier}
          </p>
          {nextTier && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-[10px] mb-1 opacity-60">
                <span>{formatCurrency(lifetime / 100)}</span>
                <span>{formatCurrency(nextTier.threshold / 100)} for {nextTier.name}</span>
              </div>
              <div className="h-1.5 bg-black/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${tierColor}`}
                  style={{ width: `${tierProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Referral card */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-[var(--gold)]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--navy)]/40">Referral Code</span>
          </div>
          {customer?.referral_code ? (
            <>
              <div className="flex items-center gap-2">
                <p className="font-mono font-bold text-[var(--navy)] tracking-wider text-sm">
                  {customer.referral_code}
                </p>
                <button onClick={copyCode} className="p-1 rounded hover:bg-gray-100 transition-colors">
                  {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                </button>
              </div>
              <p className="text-[10px] text-[var(--navy)]/40 mt-1">$25 per referral</p>
            </>
          ) : (
            <p className="text-sm text-[var(--navy)]/40">No code assigned</p>
          )}
        </div>
      </div>

      {/* How it works */}
      <div className="bg-gradient-to-br from-[var(--gold)]/5 to-[var(--gold)]/10 rounded-xl border border-[var(--gold)]/20 p-5">
        <h2 className="font-bold text-[var(--navy)] text-sm mb-3">How It Works</h2>
        <div className="space-y-3">
          {[
            { step: '1', title: 'Share Your Code', desc: 'Give friends & family your referral code' },
            { step: '2', title: 'They Book Service', desc: 'When they use your code for the first time' },
            { step: '3', title: 'You Earn $25', desc: 'Virtual cash added to your rewards balance' },
          ].map(item => (
            <div key={item.step} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[var(--gold)] text-[var(--navy)] flex items-center justify-center text-xs font-bold flex-shrink-0">
                {item.step}
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--navy)]">{item.title}</p>
                <p className="text-xs text-[var(--navy)]/50">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction history */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-[var(--navy)]">Transaction History</h2>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-8 h-8 bg-gray-100 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-10 text-center">
            <Gift className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-[var(--navy)]/40">No transactions yet</p>
            <p className="text-xs text-[var(--navy)]/30 mt-1">
              Share your referral code to start earning!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {transactions.map(tx => {
              const config = TYPE_CONFIG[tx.type] || TYPE_CONFIG.adjusted;
              const Icon = config.icon;
              const isPositive = tx.points > 0;

              return (
                <div key={tx.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--navy)] truncate">
                      {tx.description || config.label}
                    </p>
                    <p className="text-xs text-[var(--navy)]/40 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(tx.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className={`text-right flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                    {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    <span className="font-bold text-sm">
                      {isPositive ? '+' : ''}{formatCurrency(tx.points / 100)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
