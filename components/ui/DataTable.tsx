'use client';

import { useState, useMemo, useCallback, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  ChevronUp,
  ChevronDown,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Column<T> {
  header: string;
  accessor: keyof T | string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyIcon?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
  keyExtractor: (row: T) => string;
  pageSize?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKeys?: string[];
  mobileCard?: (row: T) => ReactNode;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type SortDirection = 'asc' | 'desc';

/**
 * Resolve a possibly-nested accessor string ("address.city") against a row
 * object. Returns the leaf value or undefined.
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc !== null && acc !== undefined && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Generic comparator that handles strings, numbers, dates, booleans, and
 * null/undefined values gracefully.
 */
function compareValues(a: unknown, b: unknown, dir: SortDirection): number {
  // Nullish values always sort last regardless of direction
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;

  const multiplier = dir === 'asc' ? 1 : -1;

  if (typeof a === 'number' && typeof b === 'number') {
    return (a - b) * multiplier;
  }

  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return (Number(a) - Number(b)) * multiplier;
  }

  // Fall back to locale-aware string comparison
  const strA = String(a);
  const strB = String(b);
  return strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' }) * multiplier;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SkeletonRows({ columns, rows = 6 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <tr key={rowIdx} className="border-b border-border/50 last:border-0">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <td key={colIdx} className="px-4 py-3">
              <div
                className="h-4 rounded bg-ice animate-pulse"
                style={{ width: `${55 + ((colIdx * 17 + rowIdx * 7) % 35)}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  /**
   * Build a compact page-number list:
   *   [1] ... [4] [5] [6] ... [20]
   * Always show first page, last page, and up to 2 neighbours of the current page.
   */
  const pageNumbers = useMemo(() => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    pages.push(1);

    const rangeStart = Math.max(2, currentPage - 1);
    const rangeEnd = Math.min(totalPages - 1, currentPage + 1);

    if (rangeStart > 2) pages.push('ellipsis');
    for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
    if (rangeEnd < totalPages - 1) pages.push('ellipsis');

    pages.push(totalPages);
    return pages;
  }, [currentPage, totalPages]);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border">
      <p className="text-sm text-steel">
        Showing <span className="font-medium text-navy">{startItem}</span> to{' '}
        <span className="font-medium text-navy">{endItem}</span> of{' '}
        <span className="font-medium text-navy">{totalItems}</span> results
      </p>

      <div className="flex items-center gap-1">
        {/* Previous */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={cn(
            'inline-flex items-center justify-center rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors',
            currentPage === 1
              ? 'opacity-50 cursor-not-allowed text-steel'
              : 'text-navy hover:bg-ice'
          )}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </button>

        {/* Page numbers */}
        {pageNumbers.map((page, idx) =>
          page === 'ellipsis' ? (
            <span key={`ellipsis-${idx}`} className="px-1.5 text-steel select-none">
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={cn(
                'inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                page === currentPage
                  ? 'bg-ember text-white'
                  : 'text-navy hover:bg-ice'
              )}
              aria-label={`Page ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={cn(
            'inline-flex items-center justify-center rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors',
            currentPage === totalPages
              ? 'opacity-50 cursor-not-allowed text-steel'
              : 'text-navy hover:bg-ice'
          )}
          aria-label="Next page"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DataTable
// ---------------------------------------------------------------------------

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  isLoading = false,
  emptyIcon,
  emptyTitle = 'No data found',
  emptyDescription = 'There are no records to display.',
  onRowClick,
  keyExtractor,
  pageSize = 10,
  searchable = false,
  searchPlaceholder = 'Search...',
  searchKeys = [],
  mobileCard,
}: DataTableProps<T>) {
  // ---- local state --------------------------------------------------------
  const [search, setSearch] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  // ---- search / filter ----------------------------------------------------
  const filteredData = useMemo(() => {
    if (!search.trim()) return data;

    const lowerSearch = search.toLowerCase();
    const keys = searchKeys.length > 0 ? searchKeys : columns.map((c) => String(c.accessor));

    return data.filter((row) =>
      keys.some((key) => {
        const val = getNestedValue(row, key);
        if (val == null) return false;
        return String(val).toLowerCase().includes(lowerSearch);
      })
    );
  }, [data, search, searchKeys, columns]);

  // ---- sort ---------------------------------------------------------------
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;

    return [...filteredData].sort((a, b) => {
      const valA = getNestedValue(a, sortColumn);
      const valB = getNestedValue(b, sortColumn);
      return compareValues(valA, valB, sortDirection);
    });
  }, [filteredData, sortColumn, sortDirection]);

  // ---- pagination ---------------------------------------------------------
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const showPagination = sortedData.length > pageSize;

  // Reset to page 1 when data or search changes would make current page invalid
  const safePage = currentPage > totalPages ? 1 : currentPage;
  if (safePage !== currentPage) {
    // Sync on next tick to avoid setState during render
    setTimeout(() => setCurrentPage(safePage), 0);
  }

  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, safePage, pageSize]);

  // ---- handlers -----------------------------------------------------------
  const handleSort = useCallback(
    (accessor: string) => {
      if (sortColumn === accessor) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortColumn(accessor);
        setSortDirection('asc');
      }
      setCurrentPage(1);
    },
    [sortColumn]
  );

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  }, []);

  // ---- visible columns for desktop / mobile --------------------------------
  const visibleColumns = columns;
  const visibleDesktopColumns = columns;
  const visibleMobileColumns = columns.filter((c) => !c.hideOnMobile);

  // ---- render: sort icon ---------------------------------------------------
  const renderSortIcon = (col: Column<T>) => {
    if (!col.sortable) return null;
    const accessor = String(col.accessor);
    const isActive = sortColumn === accessor;

    if (!isActive) {
      return <ChevronsUpDown className="w-3.5 h-3.5 ml-1 opacity-40" />;
    }

    return sortDirection === 'asc' ? (
      <ChevronUp className="w-3.5 h-3.5 ml-1" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 ml-1" />
    );
  };

  // ---- render: empty state -------------------------------------------------
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {emptyIcon && <div className="text-steel mb-4">{emptyIcon}</div>}
      <h3 className="text-lg font-semibold text-navy mb-1">{emptyTitle}</h3>
      <p className="text-sm text-steel max-w-sm text-center">{emptyDescription}</p>
    </div>
  );

  // ---- render: mobile cards ------------------------------------------------
  const renderMobileCards = () => {
    if (paginatedData.length === 0 && !isLoading) return renderEmptyState();

    if (isLoading) {
      return (
        <div className="divide-y divide-border/50">
          {Array.from({ length: Math.min(6, pageSize) }).map((_, i) => (
            <div key={i} className="p-4 space-y-2">
              <div className="h-4 w-3/4 rounded bg-ice animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-ice animate-pulse" />
              <div className="h-3 w-2/3 rounded bg-ice animate-pulse" />
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="divide-y divide-border/50">
        {paginatedData.map((row) => {
          const key = keyExtractor(row);

          if (mobileCard) {
            return (
              <div
                key={key}
                className={cn(
                  'transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-navy/5'
                )}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {mobileCard(row)}
              </div>
            );
          }

          // Fallback: render visible mobile columns as a simple key-value card
          return (
            <div
              key={key}
              className={cn(
                'p-4 space-y-1.5 transition-colors',
                onRowClick && 'cursor-pointer hover:bg-navy/5'
              )}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {visibleMobileColumns.map((col) => {
                const accessor = String(col.accessor);
                const value = getNestedValue(row, accessor);
                return (
                  <div key={accessor} className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-medium text-steel shrink-0">{col.header}</span>
                    <span className="text-sm text-navy text-right truncate">
                      {col.render ? col.render(value, row) : (value != null ? String(value) : '-')}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  // ---- render: main --------------------------------------------------------
  return (
    <div className="space-y-0">
      {/* Search bar */}
      {searchable && (
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel" />
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder={searchPlaceholder}
              className={cn(
                'w-full rounded-lg border border-border bg-white px-4 py-2 pl-10 text-sm text-navy',
                'placeholder:text-steel/60',
                'focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent',
                'transition-colors'
              )}
            />
          </div>
        </div>
      )}

      {/* Table wrapper */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-ice/50 border-b border-border">
                {visibleDesktopColumns.map((col) => {
                  const accessor = String(col.accessor);
                  const isActive = sortColumn === accessor;
                  const isSortable = col.sortable;

                  return (
                    <th
                      key={accessor}
                      className={cn(
                        'px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold',
                        isSortable ? 'cursor-pointer select-none' : '',
                        isActive ? 'text-navy' : 'text-steel',
                        col.className
                      )}
                      onClick={isSortable ? () => handleSort(accessor) : undefined}
                    >
                      <span className="inline-flex items-center">
                        {col.header}
                        {renderSortIcon(col)}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <SkeletonRows columns={visibleDesktopColumns.length} />
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={visibleDesktopColumns.length}>{renderEmptyState()}</td>
                </tr>
              ) : (
                paginatedData.map((row) => {
                  const key = keyExtractor(row);
                  return (
                    <tr
                      key={key}
                      className={cn(
                        'border-b border-border/50 last:border-0 transition-colors',
                        onRowClick && 'cursor-pointer',
                        'hover:bg-navy/5'
                      )}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                    >
                      {visibleDesktopColumns.map((col) => {
                        const accessor = String(col.accessor);
                        const value = getNestedValue(row, accessor);
                        return (
                          <td
                            key={accessor}
                            className={cn('px-4 py-3 text-sm text-navy', col.className)}
                          >
                            {col.render ? col.render(value, row) : (value != null ? String(value) : '-')}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile layout */}
        <div className="md:hidden">{renderMobileCards()}</div>

        {/* Pagination */}
        {showPagination && !isLoading && (
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={sortedData.length}
            pageSize={pageSize}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </div>
  );
}
