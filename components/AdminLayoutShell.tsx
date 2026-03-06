'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { AdminHeader } from '@/components/AdminHeader';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { SessionRefresh } from '@/components/SessionRefresh';

export default function AdminLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isTechRoute = pathname.startsWith('/admin/tech');

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
    <>
      <SessionRefresh />
      <Sidebar />
      <AdminHeader />
      <main className="lg:pl-64 pt-14 pb-16 lg:pb-0">
        <div className="px-3 py-2 sm:p-4 lg:p-8">{children}</div>
      </main>
      <MobileBottomNav />
    </>
  );
}
