'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from './AuthProvider';
import type { Profile } from '@/types';
import {
  LayoutDashboard,
  Package,
  Users,
  LogOut,
  Snowflake,
  Menu,
  X,
  FileText,
  Code,
  Wrench,
  Building2,
  Receipt,
  CalendarCheck,
  CreditCard,
  Contact,
  DollarSign,
  Truck,
  Smartphone,
  HardHat,
  BarChart3,
  FileSignature,
  Crown,
  ShoppingBag,
  Sparkles,
  Activity,
  Phone,
  CircuitBoard,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  ClipboardList,
  type LucideIcon,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  forceReload?: boolean;
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
  /** Only render this group if the predicate returns true */
  guard?: (profile: Profile | null) => boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DEVELOPER_EMAIL = 'javontaedharden@gmail.com';
const STORAGE_KEY_GROUPS = 'sidebar-groups';
const STORAGE_KEY_COLLAPSED = 'sidebar-collapsed';

// ─── Navigation Groups ─────────────────────────────────────────────────────

const navGroups: NavGroup[] = [
  {
    id: 'operations',
    label: 'Operations',
    items: [
      { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
      { name: 'Requests', href: '/admin/requests', icon: ClipboardList },
      { name: 'Bookings', href: '/admin/bookings', icon: CalendarCheck },
      { name: 'Service Orders', href: '/admin/service', icon: HardHat },
      { name: 'Customers', href: '/admin/customers', icon: Contact },
      { name: 'Payments', href: '/admin/payments', icon: CreditCard },
    ],
  },
  {
    id: 'sales',
    label: 'Sales & Billing',
    items: [
      { name: 'Quotes', href: '/admin/quotes', icon: Receipt },
      { name: 'Contracts', href: '/admin/contracts', icon: FileSignature },
      { name: 'Memberships', href: '/admin/memberships', icon: Crown },
      { name: 'Service Report', href: '/admin/service-report', icon: FileText },
      { name: 'Pricing', href: '/admin/pricing', icon: DollarSign },
      { name: 'Packages', href: '/admin/packages', icon: Package },
    ],
  },
  {
    id: 'ai',
    label: 'AI & Communications',
    items: [
      { name: 'AI Manager', href: '/admin/manager', icon: Sparkles },
      { name: 'Phone Calls', href: '/admin/calls', icon: Phone },
      { name: 'Agent Bots', href: '/admin/bots', icon: Activity },
      { name: 'Control Boards', href: '/admin/control-boards', icon: CircuitBoard },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory & Fleet',
    items: [
      { name: 'Inventory', href: '/admin/inventory', icon: Package },
      { name: 'Truck', href: '/admin/truck', icon: Truck },
      { name: 'Parts Store', href: '/admin/parts-store', icon: ShoppingBag },
      { name: 'Stock Parts', href: '/admin/stock-parts', icon: Wrench },
    ],
  },
  {
    id: 'tools',
    label: 'Tools',
    items: [
      { name: 'HVAC Installs', href: '/admin/installs', icon: Building2 },
      { name: 'Documents', href: '/admin/documents', icon: FileText },
      { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    guard: (profile) => profile?.role === 'admin',
    items: [
      { name: 'Users', href: '/admin/users', icon: Users },
    ],
  },
  {
    id: 'developer',
    label: 'Developer',
    guard: (profile) => profile?.email === DEVELOPER_EMAIL,
    items: [
      { name: 'Integrations', href: '/admin/developer', icon: Code },
      { name: 'Service Web App', href: '/admin/tech', icon: Smartphone, forceReload: true },
    ],
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function isRouteActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(href + '/');
}

function findActiveGroupId(pathname: string, groups: NavGroup[]): string | null {
  for (const group of groups) {
    for (const item of group.items) {
      if (isRouteActive(pathname, item.href)) return group.id;
    }
  }
  return null;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Collapsed state (desktop only)
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Open group IDs
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // Initialise from localStorage
  useEffect(() => {
    setIsCollapsed(readJson<boolean>(STORAGE_KEY_COLLAPSED, false));
    const saved = readJson<Record<string, boolean>>(STORAGE_KEY_GROUPS, {});
    // Auto-open the group that contains the active route
    const activeGroupId = findActiveGroupId(pathname, navGroups);
    const merged: Record<string, boolean> = { operations: true, ...saved };
    if (activeGroupId) merged[activeGroupId] = true;
    setOpenGroups(merged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When pathname changes, make sure the active group is open
  useEffect(() => {
    const activeGroupId = findActiveGroupId(pathname, navGroups);
    if (activeGroupId) {
      setOpenGroups((prev) => {
        if (prev[activeGroupId]) return prev;
        const next = { ...prev, [activeGroupId]: true };
        localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(next));
        return next;
      });
    }
  }, [pathname]);

  // Listen for storage events from other components (AdminLayoutShell)
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_COLLAPSED) {
        setIsCollapsed(readJson<boolean>(STORAGE_KEY_COLLAPSED, false));
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY_COLLAPSED, JSON.stringify(next));
      return next;
    });
    // Dispatch after state updater completes to avoid "setState during render" warning
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY_COLLAPSED }));
  }, []);

  const toggleGroup = useCallback((groupId: string) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(next));
      return next;
    });
  }, []);

  const handleSignOut = async () => {
    try {
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

  // Expose setIsMobileOpen so MobileBottomNav can call it
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__openSidebar = () => setIsMobileOpen(true);
    return () => {
      delete (window as unknown as Record<string, unknown>).__openSidebar;
    };
  }, []);

  // ─── Filtered groups based on user role / email ─────────────────────────
  const visibleGroups = navGroups.filter(
    (g) => !g.guard || g.guard(profile)
  );

  // ─── Shared nav content ─────────────────────────────────────────────────

  const NavContent = ({ collapsed, onClose }: { collapsed: boolean; onClose?: () => void }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 border-b border-white/10 shrink-0',
        collapsed ? 'justify-center px-2 py-5' : 'px-4 py-5'
      )}>
        <div className="w-9 h-9 bg-[#e55b2b] rounded-lg flex items-center justify-center shrink-0">
          <Snowflake className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h2 className="font-bold text-white text-sm tracking-wide truncate">HARDEN HVACR</h2>
            <p className="text-[11px] text-white/40 truncate">{profile?.full_name || 'Admin Portal'}</p>
          </div>
        )}
      </div>

      {/* Scrollable navigation */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
        {visibleGroups.map((group) => {
          const isOpen = openGroups[group.id] ?? false;

          return (
            <div key={group.id} className="mb-1">
              {/* Group header */}
              {!collapsed ? (
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="flex items-center justify-between w-full px-4 py-2 text-[11px] font-semibold text-white/40 uppercase tracking-wider hover:text-white/60 transition-colors"
                >
                  <span>{group.label}</span>
                  <ChevronDown
                    className={cn(
                      'w-3.5 h-3.5 transition-transform duration-200',
                      !isOpen && '-rotate-90'
                    )}
                  />
                </button>
              ) : (
                <div className="h-px bg-white/10 mx-3 my-2" />
              )}

              {/* Group items */}
              <div
                className={cn(
                  'overflow-hidden transition-all duration-200 ease-in-out',
                  !collapsed && !isOpen ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'
                )}
              >
                <ul className={cn('space-y-0.5', collapsed ? 'px-2' : 'px-2')}>
                  {group.items.map((item) => {
                    const active = isRouteActive(pathname, item.href);
                    const linkClass = cn(
                      'flex items-center gap-3 rounded-md text-sm font-medium transition-all duration-150',
                      collapsed
                        ? 'justify-center px-2 py-2.5'
                        : 'px-3 py-2',
                      active
                        ? 'bg-white/10 text-white border-l-2 border-[#e55b2b]'
                        : 'text-white/70 hover:bg-white/5 hover:text-white border-l-2 border-transparent'
                    );

                    const inner = (
                      <>
                        <item.icon className={cn('w-[18px] h-[18px] shrink-0', active && 'text-white')} />
                        {!collapsed && <span className="truncate">{item.name}</span>}
                      </>
                    );

                    return (
                      <li key={item.href}>
                        {item.forceReload ? (
                          <a
                            href={item.href}
                            onClick={onClose}
                            className={linkClass}
                            title={collapsed ? item.name : undefined}
                          >
                            {inner}
                          </a>
                        ) : (
                          <Link
                            href={item.href}
                            onClick={onClose}
                            className={linkClass}
                            title={collapsed ? item.name : undefined}
                          >
                            {inner}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        })}
      </nav>

      {/* Bottom area: collapse toggle + sign out */}
      <div className="shrink-0 border-t border-white/10">
        {/* Collapse toggle (desktop only) */}
        <button
          onClick={toggleCollapsed}
          className={cn(
            'hidden lg:flex items-center gap-3 w-full px-4 py-2.5 text-sm text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors',
            collapsed && 'justify-center px-2'
          )}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeftOpen className="w-[18px] h-[18px]" />
          ) : (
            <>
              <PanelLeftClose className="w-[18px] h-[18px]" />
              <span>Collapse</span>
            </>
          )}
        </button>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className={cn(
            'flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-white/50 hover:text-white hover:bg-white/5 transition-colors',
            collapsed && 'justify-center px-2'
          )}
          title={collapsed ? 'Sign Out' : undefined}
        >
          <LogOut className="w-[18px] h-[18px]" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-0 left-0 z-40 h-14 w-12 flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
      >
        <Menu className="w-5 h-5 text-gray-700" />
      </button>

      {/* Mobile sidebar overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={cn(
          'lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-[#0a1f3f] flex flex-col transform transition-transform duration-250 ease-in-out shadow-2xl',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <button
          onClick={() => setIsMobileOpen(false)}
          className="absolute top-4 right-4 p-1.5 text-white/40 hover:text-white rounded-md hover:bg-white/10 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>
        <NavContent collapsed={false} onClose={() => setIsMobileOpen(false)} />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 bg-[#0a1f3f] transition-all duration-200 ease-in-out z-30',
          isCollapsed ? 'lg:w-16' : 'lg:w-64'
        )}
      >
        <NavContent collapsed={isCollapsed} />
      </aside>
    </>
  );
}
