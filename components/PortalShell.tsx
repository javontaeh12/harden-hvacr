'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePortal } from './PortalAuthProvider';
import { Crown, Calendar, Wrench, Gift, Zap, LogOut, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', href: '/portal', icon: Home },
  { label: 'Appointments', href: '/portal/appointments', icon: Calendar },
  { label: 'Schedule', href: '/portal/schedule', icon: Wrench },
  { label: 'Upgrades', href: '/portal/upgrades', icon: Zap },
  { label: 'Rewards', href: '/portal/rewards', icon: Gift },
];

export default function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { customer, rewards, signOut } = usePortal();

  return (
    <div className="min-h-screen bg-[#f8f7f4]">
      {/* Top header bar */}
      <header className="bg-gradient-to-r from-[var(--navy)] to-[#0d2e5e] text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <Link href="/portal" className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-[var(--gold)]" />
              <span className="font-bold text-sm">Harden HVACR</span>
              <span className="text-[10px] bg-[var(--gold)]/20 text-[var(--gold)] px-2 py-0.5 rounded-full font-semibold">
                PRIORITY
              </span>
            </Link>
            <div className="flex items-center gap-4">
              {rewards && (
                <div className="hidden sm:flex items-center gap-1.5 text-xs">
                  <Gift className="w-3.5 h-3.5 text-[var(--gold)]" />
                  <span className="text-white/70">{formatCurrency(rewards.balance / 100)}</span>
                </div>
              )}
              <div className="hidden sm:block text-xs text-white/50">
                {customer?.full_name}
              </div>
              <button
                onClick={signOut}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4 text-white/50" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Desktop nav */}
      <nav className="hidden sm:block bg-white border-b border-gray-200 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1">
            {navItems.map((item) => {
              const isActive = item.href === '/portal'
                ? pathname === '/portal'
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                    isActive
                      ? 'border-[var(--gold)] text-[var(--navy)]'
                      : 'border-transparent text-[var(--navy)]/50 hover:text-[var(--navy)] hover:border-gray-200'
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-24 sm:pb-8">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] pb-[env(safe-area-inset-bottom)]">
        <div className="flex">
          {navItems.map((item) => {
            const isActive = item.href === '/portal'
              ? pathname === '/portal'
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                  isActive
                    ? 'text-[var(--gold)]'
                    : 'text-[var(--navy)]/40'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
