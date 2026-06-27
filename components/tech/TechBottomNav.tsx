'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  ShoppingBag,
  Truck,
  Loader2,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/admin/tech', icon: LayoutDashboard, exact: true },
  { label: 'Jobs', href: '/admin/tech/jobs', icon: ClipboardList, exact: false },
  { label: 'Parts', href: '/admin/tech/parts', icon: ShoppingBag, exact: true },
  { label: 'Van', href: '/admin/tech/van', icon: Truck, exact: true },
];

export default function TechBottomNav() {
  const pathname = usePathname();
  const [loadingHref, setLoadingHref] = useState<string | null>(null);

  // Clear loading state when navigation completes (pathname changes)
  useEffect(() => {
    setLoadingHref(null);
  }, [pathname]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a1f3f] border-t border-[#122e5c] pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const isLoading = loadingHref === item.href && !isActive;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                if (!isActive) setLoadingHref(item.href);
              }}
              className={cn(
                'relative flex flex-col items-center justify-center flex-1 h-full transition-all duration-200',
                isActive
                  ? 'text-[#e55b2b]'
                  : isLoading
                    ? 'text-[#e55b2b]/60'
                    : 'text-white/50 active:text-white/70'
              )}
            >
              {/* Ember bar indicator above active icon */}
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full bg-[#e55b2b]" />
              )}

              {/* Active pill background */}
              <span
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-full transition-colors duration-200',
                  isActive && 'bg-white/10'
                )}
              >
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <item.icon className={cn('w-6 h-6', isActive && 'stroke-[2.5]')} />
                )}
                <span className="text-[10px] font-medium leading-tight">
                  {isLoading ? 'Loading...' : item.label}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
