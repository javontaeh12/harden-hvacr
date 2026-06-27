'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { LowStockNotification } from './LowStockNotification';
import { useAuth } from './AuthProvider';
import {
  Search,
  Plus,
  CalendarCheck,
  Receipt,
  Contact,
  HardHat,
  ChevronRight,
} from 'lucide-react';

// ─── Breadcrumb segment labels ──────────────────────────────────────────────

const segmentLabels: Record<string, string> = {
  admin: 'Dashboard',
  bookings: 'Bookings',
  service: 'Service Orders',
  customers: 'Customers',
  payments: 'Payments',
  quotes: 'Quotes',
  contracts: 'Contracts',
  memberships: 'Memberships',
  'service-report': 'Service Report',
  pricing: 'Pricing',
  manager: 'AI Manager',
  calls: 'Phone Calls',
  bots: 'Agent Bots',
  marketing: 'Marketing',
  pipeline: 'Pipeline',
  'control-boards': 'Control Boards',
  inventory: 'Inventory',
  truck: 'Truck',
  'parts-store': 'Parts Store',
  'stock-parts': 'Stock Parts',
  installs: 'HVAC Installs',
  documents: 'Documents',
  analytics: 'Analytics',
  users: 'Users',
  logs: 'Logs',
  settings: 'Settings',
  developer: 'Developer',
  tech: 'Service App',
  notifications: 'Notifications',
  rewards: 'Rewards',
  reports: 'Reports',
  leaderboard: 'Leaderboard',
  parts: 'Custom Parts',
  agents: 'AI Agents',
  'create-group': 'Create Group',
  'quote-sheet': 'Quote Sheet',
  'ai-helper': 'AI Help',
};

// Quick-create actions
const quickCreateItems = [
  { label: 'New Booking', href: '/admin/bookings?new=true', icon: CalendarCheck },
  { label: 'New Quote', href: '/admin/quotes?new=true', icon: Receipt },
  { label: 'New Customer', href: '/admin/customers?new=true', icon: Contact },
  { label: 'New Work Order', href: '/admin/service?new=true', icon: HardHat },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function humanLabel(segment: string): string {
  if (segmentLabels[segment]) return segmentLabels[segment];
  if (isUuid(segment)) return 'Details';
  // Numeric or short dynamic segment
  if (/^\d+$/.test(segment)) return 'Details';
  // Fallback: title case
  return segment
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AdminHeader() {
  const { profile } = useAuth();
  const pathname = usePathname();
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setQuickCreateOpen(false);
      }
    };
    if (quickCreateOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [quickCreateOpen]);

  // Close dropdown on navigation
  useEffect(() => {
    setQuickCreateOpen(false);
  }, [pathname]);

  // Read collapsed state for header offset
  useEffect(() => {
    try {
      const raw = localStorage.getItem('sidebar-collapsed');
      if (raw) setSidebarCollapsed(JSON.parse(raw));
    } catch {}
    const handler = (e: StorageEvent) => {
      if (e.key === 'sidebar-collapsed') {
        try {
          const raw = localStorage.getItem('sidebar-collapsed');
          setSidebarCollapsed(raw ? JSON.parse(raw) : false);
        } catch {}
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  if (!profile) return null;

  // ─── Breadcrumbs ────────────────────────────────────────────────────────
  const segments = pathname.split('/').filter(Boolean); // ["admin", "bookings", "abc-123"]
  const crumbs: { label: string; href: string | null }[] = [];

  for (let i = 0; i < segments.length; i++) {
    const href = '/' + segments.slice(0, i + 1).join('/');
    const label = humanLabel(segments[i]);
    const isLast = i === segments.length - 1;
    crumbs.push({ label, href: isLast ? null : href });
  }

  // Initials for avatar
  const initials = (profile.full_name || 'U')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header
      className={cn(
        'fixed top-0 right-0 left-0 h-14 bg-white border-b border-border z-30 flex items-center justify-between px-4 lg:px-6 transition-all duration-200',
        sidebarCollapsed ? 'lg:left-16' : 'lg:left-64'
      )}
    >
      {/* Left: Breadcrumbs */}
      <div className="flex items-center gap-1 min-w-0 overflow-hidden">
        {/* Spacer for mobile hamburger */}
        <div className="w-8 lg:hidden shrink-0" />
        <nav className="flex items-center gap-1 text-sm min-w-0 overflow-hidden" aria-label="Breadcrumb">
          {crumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1 min-w-0">
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-steel/50 shrink-0" />}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="text-steel hover:text-navy transition-colors truncate"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-navy font-semibold truncate">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Search trigger */}
        <button
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-sm text-steel hover:border-steel/50 transition-colors"
          onClick={() => {
            // Placeholder for Cmd+K search modal
          }}
        >
          <Search className="w-4 h-4" />
          <span className="hidden md:inline">Search...</span>
          <kbd className="hidden md:inline text-[10px] bg-gray-100 px-1.5 py-0.5 rounded font-mono text-steel/70">
            &#8984;K
          </kbd>
        </button>

        {/* Quick-create */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setQuickCreateOpen((prev) => !prev)}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-ember text-white hover:bg-ember-dark transition-colors"
            title="Quick create"
          >
            <Plus className="w-4 h-4" />
          </button>
          {quickCreateOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-border py-1 z-50">
              {quickCreateItems.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => setQuickCreateOpen(false)}
                >
                  <action.icon className="w-4 h-4 text-steel" />
                  {action.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <LowStockNotification />

        {/* Avatar / user info */}
        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-border">
          <div className="w-8 h-8 rounded-full bg-navy flex items-center justify-center text-white text-xs font-semibold">
            {initials}
          </div>
          <div className="hidden md:block text-right">
            <p className="text-sm font-medium text-gray-900 leading-tight">{profile.full_name}</p>
            <p className="text-[11px] text-steel capitalize leading-tight">{profile.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
