import { createServiceClient } from '../utils';

export interface PricingItem {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  description: string;
  service_type: string;
  trade: string;
  note: string | null;
}

let _cachedPricing: PricingItem[] | null = null;
let _cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 min

export async function getPricingData(): Promise<PricingItem[]> {
  if (_cachedPricing && Date.now() - _cacheTime < CACHE_TTL) {
    return _cachedPricing;
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('pricing')
      .select('id, name, category, price, unit, description, service_type, trade, note')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    _cachedPricing = (data || []) as PricingItem[];
    _cacheTime = Date.now();
    return _cachedPricing;
  } catch (err) {
    console.error('[pricing] Failed to fetch pricing data:', err);
    return _cachedPricing || [];
  }
}

export async function getPricingSummary(): Promise<string> {
  const items = await getPricingData();
  if (!items.length) return 'Pricing information is not available at this time. Please call for a quote.';

  const grouped: Record<string, PricingItem[]> = {};
  for (const item of items) {
    const key = `${item.service_type} ${item.trade}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }

  const lines: string[] = [];
  for (const [group, groupItems] of Object.entries(grouped)) {
    lines.push(`\n${group.toUpperCase()}:`);
    for (const item of groupItems.slice(0, 10)) {
      lines.push(`  - ${item.name}: $${item.price}/${item.unit}${item.note ? ` (${item.note})` : ''}`);
    }
    if (groupItems.length > 10) lines.push(`  ... and ${groupItems.length - 10} more`);
  }

  return lines.join('\n');
}
