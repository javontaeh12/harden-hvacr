'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  CalendarCheck,
  Wrench,
  Contact,
  Menu,
  Loader2,
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Bookings', href: '/admin/bookings', icon: CalendarCheck },
  { name: 'Service', href: '/admin/service', icon: Wrench },
  { name: 'Customers', href: '/admin/customers', icon: Contact },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const [loadingHref, setLoadingHref] = useState<string | null>(null);

  // Clear loading state when navigation completes (pathname changes)
  useEffect(() => {
    setLoadingHref(null);
  }, [pathname]);

  const handleMoreClick = () => {
    // Open the sidebar drawer via the global function exposed by Sidebar
    const openSidebar = (window as unknown as Record<string, unknown>).__openSidebar;
    if (typeof openSidebar === 'function') {
      (openSidebar as () => void)();
    }
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const isActive = item.href === '/admin'
            ? pathname === '/admin'
            : pathname === item.href || pathname.startsWith(item.href + '/');
          const isLoading = loadingHref === item.href && !isActive;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => {
                if (!isActive) setLoadingHref(item.href);
              }}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors rounded-lg mx-0.5',
                isActive
                  ? 'text-[#e55b2b]'
                  : isLoading
                    ? 'text-[#e55b2b]/60'
                    : 'text-gray-500 active:text-gray-700'
              )}
            >
              <div className={cn(
                'flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
                isActive && 'bg-[#e55b2b]/10'
              )}>
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <item.icon className={cn('w-5 h-5', isActive && 'stroke-[2.5]')} />
                )}
              </div>
              <span className="text-[10px] font-medium leading-tight">
                {isLoading ? 'Loading...' : item.name}
              </span>
            </Link>
          );
        })}

        {/* More button — opens sidebar */}
        <button
          onClick={handleMoreClick}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-gray-500 active:text-gray-700 transition-colors"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg">
            <Menu className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium leading-tight">More</span>
        </button>
      </div>
    </nav>
  );
}
