'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { usePathname } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SUPPLIERS, type SupplierConfig, type SearchResult, buildFallbackLinks } from '@/lib/supplier-search';
import Link from 'next/link';
import {
  Search,
  ArrowLeft,
  Loader2,
  ExternalLink,
  Plus,
  Package,
  CheckCircle2,
  X,
  SlidersHorizontal,
  Store,
} from 'lucide-react';

type SortMode = 'relevance' | 'supplier';

export default function PartsSearchPage() {
  const { groupId } = useAuth();
  const pathname = usePathname();
  const { toast } = useToast();
  const backHref = pathname.startsWith('/admin/tech') ? '/admin/tech/parts' : '/admin/parts-store';

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [, setTotal] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [cached, setCached] = useState(false);
  const [fallbackLinks, setFallbackLinks] = useState<{ label: string; url: string }[]>([]);
  const [error, setError] = useState('');

  // Filters
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>('relevance');

  // Add to inventory state
  const [addingPart, setAddingPart] = useState<SearchResult | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim() || query.trim().length < 2) return;

    setIsSearching(true);
    setError('');
    setHasSearched(true);

    try {
      const res = await fetch('/api/parts-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          suppliers: selectedSuppliers.length > 0 ? selectedSuppliers : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Search failed');
        setResults([]);
        setFallbackLinks(buildFallbackLinks(query.trim()));
      } else {
        setResults(data.results || []);
        setTotal(data.total || 0);
        setCached(data.cached || false);
        setFallbackLinks(data.fallback_links || []);
      }
    } catch {
      setError('Network error. Please try again.');
      setFallbackLinks(buildFallbackLinks(query.trim()));
    }

    setIsSearching(false);
  }, [query, selectedSuppliers]);

  const toggleSupplier = (key: string) => {
    setSelectedSuppliers(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // Sort results
  const sortedResults = [...results].sort((a, b) => {
    if (sortMode === 'supplier') {
      return a.supplier.localeCompare(b.supplier) || b.relevance - a.relevance;
    }
    return b.relevance - a.relevance;
  });

  // Group by supplier for supplier view
  const groupedBySupplier = sortedResults.reduce<Record<string, SearchResult[]>>((acc, r) => {
    const key = r.supplier_key;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const handleAddToInventory = async () => {
    if (!addingPart || !groupId) return;
    setAddSubmitting(true);

    try {
      const res = await fetch('/api/parts-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: groupId,
          name: addingPart.name,
          part_number: addingPart.part_number || null,
          category: 'Misc',
          supplier_name: addingPart.supplier,
          supplier_cost: addingPart.price || 0,
          markup_pct: 50,
          in_stock: addingPart.in_stock ?? true,
          notes: addingPart.url ? `Source: ${addingPart.url}` : null,
        }),
      });

      if (res.ok) {
        setAddSuccess(true);
        toast.success('Added to Inventory', `${addingPart.name} is now in your catalog`);
        setTimeout(() => {
          setAddSuccess(false);
          setAddingPart(null);
        }, 1500);
      }
    } catch {
      toast.error('Failed', 'Could not add part to inventory');
    }
    setAddSubmitting(false);
  };

  const getSupplierStyle = (key: string): SupplierConfig => {
    return SUPPLIERS.find(s => s.key === key) || { key, name: key, domain: '', color: 'bg-gray-100', textColor: 'text-gray-700' };
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={backHref} className="p-2 rounded-lg hover:bg-[#e8f0f8] transition-colors">
          <ArrowLeft className="w-5 h-5 text-[#4a6580]" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#0a1f3f]">Search Suppliers</h1>
          <p className="text-[#4a6580] text-sm mt-0.5">Find parts across 10+ HVAC distributors</p>
        </div>
      </div>

      {/* Search bar (sticky) */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm -mx-4 px-4 py-3 sm:-mx-6 sm:px-6 border-b border-[#c8d8ea]">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a6580]" />
            <input
              type="text"
              placeholder="Part number, description, or model (e.g. HN67KC024, TXV R410A 3 ton)..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 text-sm border border-[#c8d8ea] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e55b2b]/20 focus:border-[#e55b2b] bg-white text-[#0a1f3f]"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || query.trim().length < 2}
            className="px-5 py-3 text-sm font-bold text-white bg-[#e55b2b] rounded-xl hover:bg-[#d14e22] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
        </form>

        {/* Supplier filter chips */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none">
          <div className="flex items-center gap-1.5 mr-1 flex-shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#4a6580]" />
            <span className="text-xs font-semibold text-[#4a6580] uppercase">Filter</span>
          </div>
          {SUPPLIERS.map(s => (
            <button
              key={s.key}
              onClick={() => toggleSupplier(s.key)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors border ${
                selectedSuppliers.includes(s.key)
                  ? 'bg-[#e55b2b]/10 border-[#e55b2b] text-[#e55b2b]'
                  : 'bg-white border-[#c8d8ea] text-[#4a6580] hover:bg-[#e8f0f8]'
              }`}
            >
              {s.name}
            </button>
          ))}
          {selectedSuppliers.length > 0 && (
            <button
              onClick={() => setSelectedSuppliers([])}
              className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold text-red-500 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Sort toggle + result count */}
      {hasSearched && results.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#4a6580]">
            {results.length} result{results.length !== 1 ? 's' : ''} from {Object.keys(groupedBySupplier).length} supplier{Object.keys(groupedBySupplier).length !== 1 ? 's' : ''}
            {cached && <span className="ml-2 text-xs text-emerald-600 font-medium">(cached)</span>}
          </p>
          <div className="flex items-center gap-1 bg-[#e8f0f8] rounded-lg p-0.5">
            <button
              onClick={() => setSortMode('relevance')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                sortMode === 'relevance' ? 'bg-white shadow-sm text-[#0a1f3f]' : 'text-[#4a6580]'
              }`}
            >
              By Relevance
            </button>
            <button
              onClick={() => setSortMode('supplier')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                sortMode === 'supplier' ? 'bg-white shadow-sm text-[#0a1f3f]' : 'text-[#4a6580]'
              }`}
            >
              By Supplier
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isSearching && (
        <div className="text-center py-16">
          <Loader2 className="w-10 h-10 text-[#e55b2b] animate-spin mx-auto mb-3" />
          <p className="text-[#0a1f3f] font-medium">Searching 10+ suppliers...</p>
          <p className="text-xs text-[#4a6580] mt-1">This may take a few seconds</p>
        </div>
      )}

      {/* Error state */}
      {error && !isSearching && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-sm text-red-600 font-medium">{error}</p>
        </div>
      )}

      {/* Results */}
      {!isSearching && hasSearched && (
        <>
          {/* Supplier view */}
          {sortMode === 'supplier' && results.length > 0 && (
            <div className="space-y-6">
              {Object.entries(groupedBySupplier).map(([supplierKey, items]) => {
                const style = getSupplierStyle(supplierKey);
                return (
                  <div key={supplierKey}>
                    <div className="flex items-center gap-2 mb-3">
                      <Store className="w-4 h-4 text-[#4a6580]" />
                      <h2 className="text-sm font-bold text-[#0a1f3f]">{style.name}</h2>
                      <span className="text-xs text-[#4a6580]">({items.length})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {items.map((result, i) => (
                        <ResultCard
                          key={`${supplierKey}-${i}`}
                          result={result}
                          supplierStyle={style}
                          onAddToInventory={() => setAddingPart(result)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Relevance view */}
          {sortMode === 'relevance' && results.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sortedResults.map((result, i) => (
                <ResultCard
                  key={i}
                  result={result}
                  supplierStyle={getSupplierStyle(result.supplier_key)}
                  onAddToInventory={() => setAddingPart(result)}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {results.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-[#c8d8ea]">
              <EmptyState
                icon={<Package className="w-8 h-8" />}
                title="No Results Found"
                description="Try these supplier sites directly:"
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    {fallbackLinks.map(link => (
                      <a
                        key={link.label}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#e55b2b] bg-[#e55b2b]/5 border border-[#e55b2b]/20 rounded-lg hover:bg-[#e55b2b]/10 transition-colors"
                      >
                        {link.label}
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ))}
                  </div>
                }
              />
            </div>
          )}
        </>
      )}

      {/* Initial state */}
      {!hasSearched && !isSearching && (
        <EmptyState
          icon={<Search className="w-8 h-8" />}
          title="Search HVAC Parts"
          description="Enter a part number, description, or model number to search across Johnstone, URI, Amazon, SupplyHouse, and more."
          action={
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              {['HN67KC024', 'TXV R410A 3 ton', '45/5 440V capacitor', 'Carrier contactor'].map(example => (
                <button
                  key={example}
                  onClick={() => { setQuery(example); }}
                  className="px-3 py-1.5 text-xs font-medium text-[#e55b2b] bg-[#e55b2b]/5 border border-[#e55b2b]/20 rounded-full hover:bg-[#e55b2b]/10 transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          }
        />
      )}

      {/* Add to Inventory Modal */}
      {addingPart && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50" onClick={() => setAddingPart(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-sm p-6" onClick={e => e.stopPropagation()}>
            {addSuccess ? (
              <div className="text-center py-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                <p className="font-bold text-[#0a1f3f]">Added to Inventory!</p>
                <p className="text-sm text-[#4a6580] mt-1">Part is now in your catalog.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-[#0a1f3f]">Add to Inventory</h2>
                  <button onClick={() => setAddingPart(null)} className="p-1 rounded-lg hover:bg-[#e8f0f8]">
                    <X className="w-5 h-5 text-[#4a6580]" />
                  </button>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="bg-[#e8f0f8] rounded-lg p-3">
                    <p className="text-sm font-semibold text-[#0a1f3f]">{addingPart.name}</p>
                    {addingPart.part_number && (
                      <p className="text-xs text-[#4a6580] font-mono mt-0.5">{addingPart.part_number}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#e8f0f8] rounded-lg p-3">
                      <p className="text-xs text-[#4a6580]">Supplier</p>
                      <p className="text-sm font-medium text-[#0a1f3f]">{addingPart.supplier}</p>
                    </div>
                    <div className="bg-[#e8f0f8] rounded-lg p-3">
                      <p className="text-xs text-[#4a6580]">Cost</p>
                      <p className="text-sm font-medium text-[#0a1f3f]">
                        {addingPart.price ? formatCurrency(addingPart.price) : 'Unknown'}
                      </p>
                    </div>
                  </div>

                  {addingPart.price && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                      <p className="text-sm text-emerald-700">
                        With 50% markup: <strong>{formatCurrency(addingPart.price * 1.5)}</strong>
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleAddToInventory}
                  disabled={addSubmitting}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white bg-[#e55b2b] hover:bg-[#d14e22] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {addSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add to Parts Store
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Result Card component
function ResultCard({
  result,
  supplierStyle,
  onAddToInventory,
}: {
  result: SearchResult;
  supplierStyle: SupplierConfig;
  onAddToInventory: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#c8d8ea] overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-4">
        {/* Supplier badge + stock */}
        <div className="flex items-center justify-between mb-2">
          <Badge variant="default" size="sm">{supplierStyle.name}</Badge>
          {result.in_stock === true && (
            <Badge variant="success" size="sm">In Stock</Badge>
          )}
          {result.in_stock === false && (
            <Badge variant="danger" size="sm">Out of Stock</Badge>
          )}
        </div>

        {/* Product name */}
        <h3 className="text-sm font-bold text-[#0a1f3f] line-clamp-2 leading-tight mb-1">
          {result.name}
        </h3>

        {/* Part number */}
        {result.part_number && (
          <p className="text-xs text-[#4a6580] font-mono mb-2">{result.part_number}</p>
        )}

        {/* Price */}
        <div className="mb-3">
          {result.price ? (
            <p className="text-lg font-bold text-[#0a1f3f]">{formatCurrency(result.price)}</p>
          ) : result.price_text ? (
            <p className="text-sm font-medium text-[#4a6580]">{result.price_text}</p>
          ) : (
            <p className="text-sm text-[#4a6580] italic">Price not listed</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-[#e55b2b] bg-[#e55b2b]/5 border border-[#e55b2b]/20 hover:bg-[#e55b2b]/10 transition-colors"
          >
            Buy on {supplierStyle.name.split(' ')[0]}
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={onAddToInventory}
            className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-bold text-[#e55b2b] bg-[#e55b2b]/5 border border-[#e55b2b]/20 hover:bg-[#e55b2b]/10 transition-colors"
            title="Add to Inventory"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
