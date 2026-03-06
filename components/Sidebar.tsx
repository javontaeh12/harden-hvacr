'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from './AuthProvider';
import {
  LayoutDashboard,
  Package,
  MessageSquare,
  Users,
  LogOut,
  Snowflake,
  Menu,
  X,
  FileText,
  Code,
  Wrench,
  ClipboardList,
  Building2,
  Receipt,
  CalendarCheck,
  CreditCard,
  Contact,
  Megaphone,
  Bell,
  DollarSign,
  Truck,
  Smartphone,
  HardHat,
  BarChart3,
  FileSignature,
  ClipboardCheck,
  Gift,
  Trophy,
} from 'lucide-react';
import { useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Inventory', href: '/admin/inventory', icon: Package },
  { name: 'Bookings', href: '/admin/bookings', icon: CalendarCheck },
  { name: 'Service', href: '/admin/service', icon: HardHat },
  { name: 'Payments', href: '/admin/payments', icon: CreditCard },
  { name: 'Customers', href: '/admin/customers', icon: Contact },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Documents', href: '/admin/documents', icon: FileText },
  { name: 'AI Helper', href: '/admin/ai-helper', icon: MessageSquare },
  { name: 'Truck', href: '/admin/truck', icon: Truck },
  { name: 'Service Web App', href: '/admin/tech', icon: Smartphone },
];

const hvacToolsNavigation = [
  { name: 'Quote Sheet', href: '/admin/quote-sheet', icon: Snowflake },
  { name: 'Quotes', href: '/admin/quotes', icon: Receipt },
  { name: 'Contracts', href: '/admin/contracts', icon: FileSignature },
  { name: 'Reports', href: '/admin/reports', icon: ClipboardCheck },
  { name: 'Service Report', href: '/admin/service-report', icon: FileText },
  { name: 'Rewards', href: '/admin/rewards', icon: Gift },
];

const adminNavigation = [
  { name: 'Leaderboard', href: '/admin/leaderboard', icon: Trophy },
  { name: 'Stock Parts', href: '/admin/stock-parts', icon: ClipboardList },
  { name: 'Custom Parts', href: '/admin/parts', icon: Wrench },
  { name: 'Pricing', href: '/admin/pricing', icon: DollarSign },
  { name: 'Marketing', href: '/admin/marketing', icon: Megaphone },
  { name: 'Notifications', href: '/admin/notifications', icon: Bell },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Create Group', href: '/admin/create-group', icon: Building2 },
];

const developerNavigation = [
  { name: 'Integrations', href: '/admin/developer', icon: Code },
];

const DEVELOPER_EMAIL = 'javontaedharden@gmail.com';

export function Sidebar() {
  const pathname = usePathname();
  const { profile, group } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      // Clear localStorage session backup so user stays signed out
      Object.keys(localStorage).forEach((key) => {
        if (key.includes('sb-') && key.includes('auth-token')) {
          localStorage.removeItem(key);
        }
      });
      await fetch('/api/auth/signout', { method: 'POST' });
    } catch (err) {
      console.error('Sign out error:', err);
    }
    window.location.href = '/login';
  };

  const NavLinks = () => (
    <>
      <div className="flex items-center gap-3 px-4 py-6 border-b border-gray-200">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
          <Snowflake className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="font-bold text-gray-900">{group?.name || 'HVAC Portal'}</h2>
          <p className="text-xs text-gray-500">{profile?.full_name}</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* HVAC Tools section - visible to all approved users */}
        <div className="mt-6 mb-2 px-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            HVAC Tools
          </p>
        </div>
        <ul className="space-y-1">
          {hvacToolsNavigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>

        {profile?.role === 'admin' && (
          <>
            <div className="mt-6 mb-2 px-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Admin
              </p>
            </div>
            <ul className="space-y-1">
              {adminNavigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={() => setIsMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {profile?.email === DEVELOPER_EMAIL && (
          <>
            <div className="mt-6 mb-2 px-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Developer
              </p>
            </div>
            <ul className="space-y-1">
              {developerNavigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={() => setIsMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-gray-200">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-2.5 left-3 z-40 p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
      >
        <Menu className="w-5 h-5 text-gray-700" />
      </button>

      {/* Mobile sidebar overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white flex flex-col transform transition-transform duration-200 ease-in-out',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <button
          onClick={() => setIsMobileOpen(false)}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
        <NavLinks />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-gray-200">
        <NavLinks />
      </aside>
    </>
  );
}
