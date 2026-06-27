// Multi-supplier HVAC parts search types and configuration

export interface SupplierConfig {
  key: string;
  name: string;
  domain: string;
  color: string; // tailwind bg class
  textColor: string; // tailwind text class
}

export interface SearchResult {
  name: string;
  part_number: string | null;
  price: number | null;
  price_text: string | null;
  supplier: string;
  supplier_key: string;
  url: string;
  in_stock: boolean | null;
  relevance: number;
}

export const SUPPLIERS: SupplierConfig[] = [
  { key: 'johnstone', name: 'Johnstone Supply', domain: 'johnstonesupply.com', color: 'bg-red-100', textColor: 'text-red-700' },
  { key: 'uri', name: 'United Refrigeration', domain: 'uri.com', color: 'bg-blue-100', textColor: 'text-blue-700' },
  { key: 'carrier', name: 'Carrier Enterprise', domain: 'carrierenterprise.com', color: 'bg-sky-100', textColor: 'text-sky-700' },
  { key: 'lennox', name: 'LennoxPros', domain: 'lennoxpros.com', color: 'bg-purple-100', textColor: 'text-purple-700' },
  { key: 'trane', name: 'Trane Parts Store', domain: 'tranepartsstore.com', color: 'bg-emerald-100', textColor: 'text-emerald-700' },
  { key: 'gemaire', name: 'Gemaire (Brady)', domain: 'gemaire.com', color: 'bg-orange-100', textColor: 'text-orange-700' },
  { key: 'amazon', name: 'Amazon', domain: 'amazon.com', color: 'bg-amber-100', textColor: 'text-amber-700' },
  { key: 'supplyhouse', name: 'SupplyHouse', domain: 'supplyhouse.com', color: 'bg-teal-100', textColor: 'text-teal-700' },
  { key: 'repairclinic', name: 'RepairClinic', domain: 'repairclinic.com', color: 'bg-indigo-100', textColor: 'text-indigo-700' },
  { key: 'google', name: 'Google Shopping', domain: 'google.com', color: 'bg-gray-100', textColor: 'text-gray-700' },
];

export function getSupplierByKey(key: string): SupplierConfig | undefined {
  return SUPPLIERS.find(s => s.key === key);
}

// Build Google search queries scoped to supplier domains
export function buildSearchQueries(query: string): string[] {
  return [
    // HVAC distributors
    `"${query}" site:johnstonesupply.com OR site:uri.com OR site:carrierenterprise.com OR site:lennoxpros.com OR site:gemaire.com`,
    // Online retailers
    `"${query}" site:amazon.com OR site:supplyhouse.com OR site:repairclinic.com HVAC part`,
    // Broad search
    `"${query}" HVAC part price buy`,
  ];
}

// Fallback direct search links when no results found
export function buildFallbackLinks(query: string): { label: string; url: string }[] {
  const q = encodeURIComponent(query);
  return [
    { label: 'Johnstone Supply', url: `https://www.johnstonesupply.com/search#q=${q}` },
    { label: 'United Refrigeration', url: `https://www.uri.com/search?q=${q}` },
    { label: 'Carrier Enterprise', url: `https://www.carrierenterprise.com/search?q=${q}` },
    { label: 'Amazon', url: `https://www.amazon.com/s?k=${q}+HVAC+part` },
    { label: 'SupplyHouse', url: `https://www.supplyhouse.com/search?q=${q}` },
    { label: 'RepairClinic', url: `https://www.repairclinic.com/Shop-For-Parts?q=${q}` },
    { label: 'Google Shopping', url: `https://www.google.com/search?tbm=shop&q=${q}+HVAC+part` },
  ];
}
