'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { AdminHeader } from '@/components/AdminHeader';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { SessionRefresh } from '@/components/SessionRefresh';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { cn } from '@/lib/utils';

const STORAGE_KEY_COLLAPSED = 'sidebar-collapsed';

export default function AdminLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isTechRoute = pathname.startsWith('/admin/tech');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Read initial collapsed state from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_COLLAPSED);
      if (raw) setSidebarCollapsed(JSON.parse(raw));
    } catch {}
  }, []);

  // Listen for storage events dispatched by the Sidebar toggle
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_COLLAPSED) {
        try {
          const raw = localStorage.getItem(STORAGE_KEY_COLLAPSED);
          setSidebarCollapsed(raw ? JSON.parse(raw) : false);
        } catch {}
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  if (isTechRoute) {
    return (
      <>
        <SessionRefresh />
        <main className="min-h-screen bg-gray-50">
          {children}
        </main>
      </>
    );
  }

  return (
    <ToastProvider>
      <SessionRefresh />
      <Sidebar />
      <AdminHeader />
      <main
        className={cn(
          'pt-14 pb-16 lg:pb-0 transition-all duration-200',
          sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'
        )}
      >
        <div className="px-3 py-2 sm:p-4 lg:p-8">{children}</div>
      </main>
      <MobileBottomNav />
    </ToastProvider>
  );
}
