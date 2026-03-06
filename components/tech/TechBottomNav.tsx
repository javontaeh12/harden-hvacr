'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  Settings,
  Loader2,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/admin/tech', icon: LayoutDashboard, exact: true },
  { label: 'Jobs', href: '/admin/tech/jobs', icon: ClipboardList, exact: false },
  { label: 'Admin', href: '/admin', icon: Settings, exact: true },
];

export default function TechBottomNav() {
  const pathname = usePathname();
  const [loadingHref, setLoadingHref] = useState<string | null>(null);

  // Clear loading state when navigation completes (pathname changes)
  useEffect(() => {
    setLoadingHref(null);
  }, [pathname]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 lg:hidden pb-[env(safe-area-inset-bottom)]">
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
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors',
                isActive
                  ? 'text-blue-600'
                  : isLoading
                    ? 'text-blue-400'
                    : 'text-gray-400 active:text-gray-600'
              )}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <item.icon className={cn('w-5 h-5', isActive && 'stroke-[2.5]')} />
              )}
              <span className="text-[10px] font-medium leading-tight mt-0.5">
                {isLoading ? 'Loading...' : item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
