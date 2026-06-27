'use client';

import { type ReactNode, useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface Tab {
  value: string;
  label: string;
  icon?: ReactNode;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  value: string;
  onChange: (value: string) => void;
  variant?: 'underline' | 'pills' | 'boxed';
  className?: string;
  fullWidth?: boolean;
}

function Tabs({ tabs, value, onChange, variant = 'underline', className, fullWidth }: TabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({
    left: 0,
    width: 0,
  });

  // Compute underline indicator position
  useEffect(() => {
    if (variant !== 'underline' || !containerRef.current) return;

    const activeTab = containerRef.current.querySelector<HTMLButtonElement>(
      `[data-tab-value="${value}"]`
    );
    if (activeTab) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const tabRect = activeTab.getBoundingClientRect();
      setIndicatorStyle({
        left: tabRect.left - containerRect.left + containerRef.current.scrollLeft,
        width: tabRect.width,
      });
    }
  }, [value, variant, tabs]);

  if (variant === 'underline') {
    return (
      <div className={cn('relative', className)}>
        <div
          ref={containerRef}
          className={cn(
            'flex border-b border-border overflow-x-auto scrollbar-none',
            fullWidth && 'w-full'
          )}
          role="tablist"
        >
          {tabs.map((tab) => (
            <button
              key={tab.value}
              data-tab-value={tab.value}
              role="tab"
              aria-selected={value === tab.value}
              onClick={() => onChange(tab.value)}
              className={cn(
                'relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
                value === tab.value ? 'text-navy' : 'text-steel hover:text-navy',
                fullWidth && 'flex-1 justify-center'
              )}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    'ml-1 text-xs',
                    value === tab.value ? 'text-navy' : 'text-steel'
                  )}
                >
                  ({tab.count})
                </span>
              )}
            </button>
          ))}

          {/* Animated underline indicator */}
          <div
            className="absolute bottom-0 h-0.5 bg-ember transition-all duration-200 ease-out"
            style={{
              left: `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
            }}
          />
        </div>
      </div>
    );
  }

  if (variant === 'pills') {
    return (
      <div
        ref={containerRef}
        className={cn('flex gap-2 overflow-x-auto scrollbar-none', fullWidth && 'w-full', className)}
        role="tablist"
      >
        {tabs.map((tab) => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={value === tab.value}
            onClick={() => onChange(tab.value)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
              value === tab.value
                ? 'bg-navy text-white'
                : 'text-steel hover:bg-ice',
              fullWidth && 'flex-1 justify-center'
            )}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  'ml-1 text-xs',
                  value === tab.value ? 'text-white/70' : 'text-steel'
                )}
              >
                ({tab.count})
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  // Boxed variant
  return (
    <div
      ref={containerRef}
      className={cn(
        'inline-flex bg-ice rounded-lg p-1 gap-1 overflow-x-auto scrollbar-none',
        fullWidth && 'w-full',
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-all duration-200',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
            value === tab.value
              ? 'bg-white text-navy shadow-sm'
              : 'text-steel hover:text-navy',
            fullWidth && 'flex-1 justify-center'
          )}
        >
          {tab.icon && <span className="shrink-0">{tab.icon}</span>}
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={cn(
                'ml-1 text-xs',
                value === tab.value ? 'text-navy' : 'text-steel'
              )}
            >
              ({tab.count})
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

Tabs.displayName = 'Tabs';

export { Tabs };
export type { Tab, TabsProps };
