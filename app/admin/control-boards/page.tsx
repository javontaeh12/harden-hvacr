'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, Button, Input, Select } from '@/components/ui';
import {
  Search,
  ExternalLink,
  Cpu,
  Flame,
  Snowflake,
  Zap,
  Filter,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  Thermometer,
  CircuitBoard,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ControlBoard {
  id: string;
  name: string;
  manufacturer: string;
  partNumber: string;
  category: 'universal' | 'oem' | 'defrost' | 'mini-split';
  compatibleBrands: string[];
  description: string;
  priceRange: string;
  features: string[];
  buyLinks: { label: string; url: string }[];
  imageUrl: string | null;
}

// ---------------------------------------------------------------------------
// Data — HVAC Control Boards Reference List
// ---------------------------------------------------------------------------
const CONTROL_BOARDS: ControlBoard[] = [
  // ── Universal Replacement Boards ──────────────────────────────────────
  {
    id: 'honeywell-s9200u1000',
    name: 'Honeywell S9200U1000 Universal IFC',
    manufacturer: 'Honeywell',
    partNumber: 'S9200U1000',
    category: 'universal',
    compatibleBrands: ['Rheem', 'Nordyne', 'York', 'Lennox', 'Goodman', 'White-Rodgers', 'ICM', 'United Technologies'],
    description:
      'Universal integrated furnace control for single-stage furnaces. Keyed wire harnesses allow replacement of most furnace controls across major brands. The go-to "one board solves most" option.',
    priceRange: '$150 – $220',
    features: [
      'Replaces 8+ brand families',
      'Keyed wire harnesses included',
      'Single-stage HSI',
      'LED diagnostics',
      'Diagnostic app support',
    ],
    buyLinks: [
      { label: 'Jackson Systems', url: 'https://jacksonsystems.com/product/honeywell-universal-integrated-furnace-control/' },
      { label: 'Amazon', url: 'https://www.amazon.com/Honeywell-S9200U1000-Control/dp/B003CVV4W2' },
    ],
    imageUrl: 'https://m.media-amazon.com/images/I/71bO5R0GILL._AC_SL1500_.jpg',
  },
  {
    id: 'wr-50m56x-843',
    name: 'White-Rodgers 50M56X-843 Universal IFC',
    manufacturer: 'White-Rodgers / Copeland',
    partNumber: '50M56X-843',
    category: 'universal',
    compatibleBrands: ['Carrier', 'Lennox', 'Trane', 'Goodman', 'York', 'Rheem', 'Nordyne', 'Armstrong'],
    description:
      'Universal single-stage HSI integrated furnace control that replaces over 700 OEM and competitive model numbers. Supports both PSC and ECMx blower motors.',
    priceRange: '$130 – $200',
    features: [
      'Replaces 700+ part numbers',
      'PSC & ECMx blower support',
      'Single-stage HSI',
      'LED fault code diagnostics',
      'Adjustable fan delays',
    ],
    buyLinks: [
      { label: 'Edmondson Supply', url: 'https://edmondsonsupply.com/products/white-rodgers-50m56x-843-integrated-furnace-control-board-universal-replacement' },
      { label: 'Copeland', url: 'https://www.copeland.com/en-us/shop/1/white-rodgers-integrated-furnace-controls-universal' },
    ],
    imageUrl: 'https://m.media-amazon.com/images/I/71PN8FzE8gL._AC_SL1500_.jpg',
  },
  {
    id: 'wr-21m51u-843',
    name: 'White-Rodgers 21M51U-843 Universal Kit',
    manufacturer: 'White-Rodgers / Copeland',
    partNumber: '21M51U-843',
    category: 'universal',
    compatibleBrands: ['Carrier', 'Lennox', 'Trane', 'Goodman', 'York', 'Rheem', 'Nordyne'],
    description:
      'Universal integrated kit with 120V nitride ignitor included. Replaces both 80V and 120V controls across multiple brands with LEDs and adjustable fan delays.',
    priceRange: '$140 – $210',
    features: [
      '120V nitride ignitor included',
      'Replaces 80V & 120V controls',
      'LED diagnostics',
      'Adjustable fan delays',
      'Multi-brand compatibility',
    ],
    buyLinks: [
      { label: 'Ferguson', url: 'https://www.ferguson.com/category/heating-cooling/hvac-repair-parts-maintenance/hvac-controls/gas-heat-controls/control-boards/' },
    ],
    imageUrl: null,
  },
  {
    id: 'icm-2812-kit',
    name: 'ICM Controls ICM2812-KIT',
    manufacturer: 'ICM Controls',
    partNumber: 'ICM2812-KIT',
    category: 'universal',
    compatibleBrands: ['White-Rodgers', 'Carrier', 'Lennox', 'Goodman', 'York', 'Rheem'],
    description:
      'Universal replacement board kit with cable harnesses. Replaces White-Rodgers 50M56U-843 and more than 200 other popular part numbers. Monitors timing, trial for ignition, flame sensing, and lockout.',
    priceRange: '$110 – $170',
    features: [
      'Replaces 200+ part numbers',
      'Cable harnesses included',
      'Timing & ignition monitoring',
      'Flame sensing & lockout',
      'System switch monitoring',
    ],
    buyLinks: [
      { label: 'Skip The Warehouse', url: 'https://skipthewarehouse.com/product/icm-controls-icm2812-kit-universal-replacement-furnace-control-board-kit/' },
      { label: 'Amazon', url: 'https://www.amazon.com/s?k=ICM2812-KIT' },
    ],
    imageUrl: 'https://m.media-amazon.com/images/I/71TpBWrFWNL._AC_SL1500_.jpg',
  },
  {
    id: 'icm-282a',
    name: 'ICM Controls ICM282A',
    manufacturer: 'ICM Controls',
    partNumber: 'ICM282A',
    category: 'universal',
    compatibleBrands: ['Carrier', 'Bryant', 'Payne'],
    description:
      'Furnace control board that controls gas valve, ignitor, blower motor, inducer, humidifier, and air cleaner. Direct replacement for Carrier furnace control modules.',
    priceRange: '$80 – $130',
    features: [
      'Gas valve control',
      'Ignitor control',
      'Blower motor control',
      'Inducer motor control',
      'Humidifier & air cleaner support',
    ],
    buyLinks: [
      { label: 'Amazon', url: 'https://www.amazon.com/USonline911-ICM282A-Furnace-Controls-Humidifier/dp/B0FGTH17CN' },
    ],
    imageUrl: 'https://m.media-amazon.com/images/I/71k1DvKxWRL._AC_SL1500_.jpg',
  },
  {
    id: 'icm-280',
    name: 'ICM Controls ICM280',
    manufacturer: 'ICM Controls',
    partNumber: 'ICM280',
    category: 'universal',
    compatibleBrands: ['Goodman', 'Carrier', 'Lennox'],
    description:
      'Fan control board — OEM replacement for Goodman. Also cross-referenced as Lennox Y0570. Affordable option for basic fan timing control.',
    priceRange: '$30 – $55',
    features: [
      'Goodman OEM replacement',
      'Fan timing control',
      'Lennox Y0570 cross-reference',
      'Simple installation',
    ],
    buyLinks: [
      { label: 'LennoxPros', url: 'https://m.lennoxpros.com/ic-icm280-fan-control-carrier-goodman/p/Y0570' },
      { label: 'Amazon', url: 'https://www.amazon.com/s?k=ICM280+furnace+control+board' },
    ],
    imageUrl: 'https://m.media-amazon.com/images/I/61WVZJLuURL._AC_SL1000_.jpg',
  },
  {
    id: 'wr-50a55-743',
    name: 'White-Rodgers 50A55-743',
    manufacturer: 'White-Rodgers / Copeland',
    partNumber: '50A55-743',
    category: 'universal',
    compatibleBrands: ['Various'],
    description:
      'Integrated hot surface ignition control. Budget-friendly universal option for single-stage gas furnaces.',
    priceRange: '$55 – $70',
    features: [
      'Hot surface ignition',
      'Single-stage gas furnace',
      'LED diagnostics',
      'Budget-friendly',
    ],
    buyLinks: [
      { label: 'Ferguson', url: 'https://www.ferguson.com/category/heating-cooling/hvac-repair-parts-maintenance/hvac-controls/gas-heat-controls/control-boards/' },
      { label: 'Amazon', url: 'https://www.amazon.com/s?k=50A55-743' },
    ],
    imageUrl: null,
  },
  {
    id: 'icm-2805a',
    name: 'ICM Controls ICM2805A',
    manufacturer: 'ICM Controls',
    partNumber: 'ICM2805A',
    category: 'universal',
    compatibleBrands: ['Carrier', 'Bryant', 'Payne'],
    description:
      'Direct OEM replacement for Carrier HK42FZ series boards. Plug-and-play with no rewiring needed.',
    priceRange: '$160 – $190',
    features: [
      'Carrier HK42FZ replacement',
      'Plug-and-play install',
      'No rewiring needed',
      'LED diagnostics',
    ],
    buyLinks: [
      { label: 'Amazon', url: 'https://www.amazon.com/s?k=ICM2805A' },
      { label: 'The AC Outlet', url: 'https://www.theacoutlet.com/parts-accessories/circuit-boards.html' },
    ],
    imageUrl: 'https://m.media-amazon.com/images/I/71aFGy4pPBL._AC_SL1500_.jpg',
  },

  // ── OEM Brand-Specific Boards ─────────────────────────────────────────
  {
    id: 'trane-kit17858',
    name: 'Trane KIT17858 IFC Board',
    manufacturer: 'Trane',
    partNumber: 'KIT17858',
    category: 'oem',
    compatibleBrands: ['Trane', 'American Standard'],
    description:
      'Official OEM integrated furnace control (IFC) replacement for a wide range of Trane and American Standard gas furnaces.',
    priceRange: '$180 – $280',
    features: [
      'OEM Trane/American Standard',
      'Integrated furnace control',
      'Direct replacement',
      'Gas furnace compatible',
    ],
    buyLinks: [
      { label: 'Shortys HVAC', url: 'https://shortyshvac.com/index.php?main_page=product_info&products_id=2029' },
    ],
    imageUrl: null,
  },
  {
    id: 'trane-cnt08121',
    name: 'Trane CNT08121 Control Board',
    manufacturer: 'Trane',
    partNumber: 'CNT08121',
    category: 'oem',
    compatibleBrands: ['Trane', 'American Standard'],
    description:
      'OEM Trane furnace control board for specific Trane gas furnace models. Check model compatibility before ordering.',
    priceRange: '$150 – $250',
    features: [
      'OEM Trane part',
      'Model-specific fit',
      'Direct replacement',
    ],
    buyLinks: [
      { label: 'Shortys HVAC', url: 'https://shortyshvac.com/index.php?main_page=product_info&products_id=4358' },
    ],
    imageUrl: null,
  },
  {
    id: 'lennox-21w14',
    name: 'Lennox 21W14 Circuit Board',
    manufacturer: 'Lennox',
    partNumber: '21W14',
    category: 'oem',
    compatibleBrands: ['Lennox', 'Armstrong', 'Ducane'],
    description:
      'OEM Lennox circuit board for Lennox, Armstrong, and Ducane furnace models. Part of the Lennox furnace control board family.',
    priceRange: '$120 – $200',
    features: [
      'OEM Lennox/Armstrong/Ducane',
      'Direct circuit board replacement',
    ],
    buyLinks: [
      { label: 'Shortys HVAC', url: 'https://shortyshvac.com/index.php?main_page=index&cPath=535_192_457' },
      { label: 'Dey Parts', url: 'https://www.deyparts.com/catalog/furnace-control-boards/lennox-furnace-parts' },
    ],
    imageUrl: null,
  },
  {
    id: 'lennox-52m46',
    name: 'Lennox 52M46 Circuit Board',
    manufacturer: 'Lennox',
    partNumber: '52M46',
    category: 'oem',
    compatibleBrands: ['Lennox', 'Armstrong', 'Ducane'],
    description:
      'OEM Lennox furnace control board. Check your unit model number to verify compatibility.',
    priceRange: '$130 – $220',
    features: [
      'OEM Lennox part',
      'Furnace control replacement',
    ],
    buyLinks: [
      { label: 'Shortys HVAC', url: 'https://shortyshvac.com/index.php?main_page=index&cPath=535_192_457' },
      { label: 'eBay', url: 'https://www.ebay.com/b/Lennox-HVAC-R-Boards/53296/bn_7023284855' },
    ],
    imageUrl: null,
  },
  {
    id: 'carrier-hk42fz',
    name: 'Carrier HK42FZ Series Control Board',
    manufacturer: 'Carrier',
    partNumber: 'HK42FZ',
    category: 'oem',
    compatibleBrands: ['Carrier', 'Bryant', 'Payne'],
    description:
      'OEM Carrier integrated furnace control board series. One of the most commonly replaced boards in Carrier/Bryant/Payne furnaces. Multiple suffixes exist — match your exact part number.',
    priceRange: '$140 – $260',
    features: [
      'OEM Carrier/Bryant/Payne',
      'Multiple suffix variants',
      'Integrated furnace control',
      'Also replaceable with ICM2805A',
    ],
    buyLinks: [
      { label: 'The AC Outlet', url: 'https://www.theacoutlet.com/parts-accessories/circuit-boards.html' },
      { label: 'Amazon', url: 'https://www.amazon.com/s?k=HK42FZ+carrier+control+board' },
    ],
    imageUrl: null,
  },
  {
    id: 'goodman-pcbag123',
    name: 'Goodman PCBAG123 Control Board',
    manufacturer: 'Goodman',
    partNumber: 'PCBAG123',
    category: 'oem',
    compatibleBrands: ['Goodman', 'Amana', 'Daikin'],
    description:
      'OEM Goodman furnace control board. Used in a wide range of Goodman, Amana, and Daikin-branded gas furnaces.',
    priceRange: '$100 – $180',
    features: [
      'OEM Goodman/Amana/Daikin',
      'Direct replacement',
      'LED diagnostics',
    ],
    buyLinks: [
      { label: 'National Air Warehouse', url: 'https://nationalairwarehouse.com/product-category/deals-of-the-day/control-boards/' },
      { label: 'Amazon', url: 'https://www.amazon.com/s?k=PCBAG123+Goodman' },
    ],
    imageUrl: null,
  },
  {
    id: 'rheem-62-24084-82',
    name: 'Rheem 62-24084-82 Control Board',
    manufacturer: 'Rheem',
    partNumber: '62-24084-82',
    category: 'oem',
    compatibleBrands: ['Rheem', 'Ruud'],
    description:
      'OEM Rheem/Ruud integrated furnace control board. Common replacement for Rheem 80% and 90% AFUE gas furnaces.',
    priceRange: '$120 – $200',
    features: [
      'OEM Rheem/Ruud',
      '80% and 90% AFUE models',
      'Integrated furnace control',
    ],
    buyLinks: [
      { label: 'Amazon', url: 'https://www.amazon.com/s?k=62-24084-82+Rheem' },
      { label: 'eBay', url: 'https://www.ebay.com/b/HVAC-Refrigeration-Controls-Circuit-Boards/53296/bn_16563133' },
    ],
    imageUrl: null,
  },

  // ── Heat Pump / Defrost Control Boards ────────────────────────────────
  {
    id: 'mrcool-defrost',
    name: 'MRCOOL ProDirect Defrost Control Board',
    manufacturer: 'MRCOOL',
    partNumber: '801319900011',
    category: 'defrost',
    compatibleBrands: ['MRCOOL'],
    description:
      'Defrost control board for MRCOOL ProDirect heat pump model HHP14036. Manages defrost cycle timing and temperature-based initiation.',
    priceRange: '$80 – $120',
    features: [
      'MRCOOL ProDirect compatible',
      'Defrost cycle management',
      'Time + temperature method',
    ],
    buyLinks: [
      { label: 'MRCOOL DIY Direct', url: 'https://mrcooldiydirect.com/products/mrcool-prodirect-defrost-control-board-model-hhp14036-sku-801319900011' },
    ],
    imageUrl: null,
  },
  {
    id: 'icm-318',
    name: 'ICM Controls ICM318 Defrost Timer',
    manufacturer: 'ICM Controls',
    partNumber: 'ICM318',
    category: 'defrost',
    compatibleBrands: ['Carrier', 'Trane', 'Lennox', 'Goodman', 'Rheem', 'York'],
    description:
      'Universal heat pump defrost control board. Uses time and temperature method to initiate and terminate defrost cycles. Replaces many OEM defrost timers.',
    priceRange: '$40 – $70',
    features: [
      'Universal heat pump defrost',
      'Time + temperature initiation',
      'Multiple OEM replacements',
      'Adjustable defrost intervals',
    ],
    buyLinks: [
      { label: 'Amazon', url: 'https://www.amazon.com/s?k=ICM318+defrost+control' },
      { label: 'Johnstone Supply', url: 'https://www.johnstonesupply.com/product-view?pID=B11-806' },
    ],
    imageUrl: null,
  },
  {
    id: 'icm-319',
    name: 'ICM Controls ICM319 Defrost Timer',
    manufacturer: 'ICM Controls',
    partNumber: 'ICM319',
    category: 'defrost',
    compatibleBrands: ['Nordyne', 'Intertherm', 'Miller'],
    description:
      'Heat pump defrost control designed for Nordyne, Intertherm, and Miller heat pump systems. Time-temperature defrost initiation.',
    priceRange: '$45 – $75',
    features: [
      'Nordyne/Intertherm/Miller replacement',
      'Time-temperature defrost',
      'Solid-state control',
    ],
    buyLinks: [
      { label: 'Amazon', url: 'https://www.amazon.com/s?k=ICM319+defrost+control' },
      { label: 'AC Pro Store', url: 'https://store.acpro.com/parts/cooling-parts/defrost-controls' },
    ],
    imageUrl: null,
  },
  {
    id: 'icm-321',
    name: 'ICM Controls ICM321 Defrost Timer',
    manufacturer: 'ICM Controls',
    partNumber: 'ICM321',
    category: 'defrost',
    compatibleBrands: ['Rheem', 'Ruud'],
    description:
      'Heat pump defrost control specifically for Rheem and Ruud systems. Direct OEM replacement.',
    priceRange: '$40 – $65',
    features: [
      'Rheem/Ruud OEM replacement',
      'Defrost cycle control',
      'Direct plug-in',
    ],
    buyLinks: [
      { label: 'Amazon', url: 'https://www.amazon.com/s?k=ICM321+Rheem+defrost' },
    ],
    imageUrl: null,
  },

  // ── Mini-Split / Ductless Boards ──────────────────────────────────────
  {
    id: 'mr-cool-mini-pcb',
    name: 'MRCOOL Mini-Split Main PCB',
    manufacturer: 'MRCOOL',
    partNumber: 'Various',
    category: 'mini-split',
    compatibleBrands: ['MRCOOL'],
    description:
      'Main PCB control board for MRCOOL DIY mini-split systems. Handles compressor control, fan speed, and inverter communication.',
    priceRange: '$100 – $200',
    features: [
      'Inverter compressor control',
      'Fan speed management',
      'Wireless communication module',
    ],
    buyLinks: [
      { label: 'MRCOOL DIY Direct', url: 'https://mrcooldiydirect.com' },
      { label: 'Amazon', url: 'https://www.amazon.com/s?k=MRCOOL+mini+split+control+board' },
    ],
    imageUrl: null,
  },
  {
    id: 'pioneer-mini-pcb',
    name: 'Pioneer Mini-Split Control Board',
    manufacturer: 'Pioneer',
    partNumber: 'Various',
    category: 'mini-split',
    compatibleBrands: ['Pioneer'],
    description:
      'Replacement main control board for Pioneer ductless mini-split indoor and outdoor units.',
    priceRange: '$80 – $160',
    features: [
      'Indoor/outdoor unit boards',
      'Inverter control',
      'Multi-zone support',
    ],
    buyLinks: [
      { label: 'Amazon', url: 'https://www.amazon.com/s?k=Pioneer+mini+split+control+board' },
    ],
    imageUrl: null,
  },
  {
    id: 'senville-mini-pcb',
    name: 'Senville Mini-Split Control Board',
    manufacturer: 'Senville',
    partNumber: 'Various',
    category: 'mini-split',
    compatibleBrands: ['Senville'],
    description:
      'Replacement PCB for Senville ductless mini-split systems. Available for both indoor and outdoor units.',
    priceRange: '$70 – $150',
    features: [
      'Indoor/outdoor unit boards',
      'Inverter technology',
    ],
    buyLinks: [
      { label: 'Amazon', url: 'https://www.amazon.com/s?k=Senville+mini+split+control+board' },
    ],
    imageUrl: null,
  },
];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const CATEGORIES: { value: ControlBoard['category']; label: string }[] = [
  { value: 'universal', label: 'Universal Replacement' },
  { value: 'oem', label: 'OEM Brand-Specific' },
  { value: 'defrost', label: 'Heat Pump / Defrost' },
  { value: 'mini-split', label: 'Mini-Split / Ductless' },
];

const CATEGORY_COLORS: Record<string, string> = {
  universal: 'bg-blue-100 text-blue-700',
  oem: 'bg-purple-100 text-purple-700',
  defrost: 'bg-teal-100 text-teal-700',
  'mini-split': 'bg-amber-100 text-amber-700',
};

const CATEGORY_ICONS: Record<string, typeof Cpu> = {
  universal: CircuitBoard,
  oem: Cpu,
  defrost: Snowflake,
  'mini-split': Thermometer,
};

const MANUFACTURERS = [
  ...new Set(CONTROL_BOARDS.map((b) => b.manufacturer)),
].sort();

const ALL_BRANDS = [
  ...new Set(CONTROL_BOARDS.flatMap((b) => b.compatibleBrands)),
].sort();

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ControlBoardsPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [manufacturerFilter, setManufacturerFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filtered boards
  const filteredBoards = useMemo(() => {
    return CONTROL_BOARDS.filter((board) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        board.name.toLowerCase().includes(q) ||
        board.partNumber.toLowerCase().includes(q) ||
        board.manufacturer.toLowerCase().includes(q) ||
        board.description.toLowerCase().includes(q) ||
        board.compatibleBrands.some((b) => b.toLowerCase().includes(q));
      const matchesCategory = !categoryFilter || board.category === categoryFilter;
      const matchesMfg = !manufacturerFilter || board.manufacturer === manufacturerFilter;
      const matchesBrand =
        !brandFilter || board.compatibleBrands.includes(brandFilter);
      return matchesSearch && matchesCategory && matchesMfg && matchesBrand;
    });
  }, [search, categoryFilter, manufacturerFilter, brandFilter]);

  // Group by category
  const groupedBoards = useMemo(() => {
    const groups: Record<string, ControlBoard[]> = {};
    filteredBoards.forEach((b) => {
      const label =
        CATEGORIES.find((c) => c.value === b.category)?.label || b.category;
      if (!groups[label]) groups[label] = [];
      groups[label].push(b);
    });
    return groups;
  }, [filteredBoards]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    CONTROL_BOARDS.forEach((b) => {
      counts[b.category] = (counts[b.category] || 0) + 1;
    });
    return counts;
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            HVAC Control Boards
          </h1>
          <p className="text-gray-600 mt-1">
            Reference list of furnace, heat pump, and mini-split control boards
            with purchase links.
          </p>
        </div>
        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          {CONTROL_BOARDS.length} boards
        </span>
      </div>

      {/* Category Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.value] || Cpu;
          const count = categoryCounts[cat.value] || 0;
          const isActive = categoryFilter === cat.value;
          return (
            <button
              key={cat.value}
              onClick={() =>
                setCategoryFilter(isActive ? '' : cat.value)
              }
              className={`p-3 rounded-xl border text-left transition-all ${
                isActive
                  ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-medium text-gray-500 truncate">
                  {cat.label}
                </span>
              </div>
              <p className="text-xl font-bold text-gray-900">{count}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filters</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search boards, parts, brands..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
              />
            </div>
            <Select
              label=""
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[
                { value: '', label: 'All Categories' },
                ...CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
              ]}
            />
            <Select
              label=""
              value={manufacturerFilter}
              onChange={(e) => setManufacturerFilter(e.target.value)}
              options={[
                { value: '', label: 'All Manufacturers' },
                ...MANUFACTURERS.map((m) => ({ value: m, label: m })),
              ]}
            />
            <Select
              label=""
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              options={[
                { value: '', label: 'All Compatible Brands' },
                ...ALL_BRANDS.map((b) => ({ value: b, label: b })),
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {filteredBoards.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <CircuitBoard className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No boards match your filters</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        Object.entries(groupedBoards).map(([groupLabel, boards]) => (
          <div key={groupLabel}>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              {groupLabel}{' '}
              <span className="text-sm font-normal text-gray-400">
                ({boards.length})
              </span>
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              {boards.map((board) => {
                const isExpanded = expandedId === board.id;
                const CatIcon = CATEGORY_ICONS[board.category] || Cpu;
                return (
                  <Card
                    key={board.id}
                    className="overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-0">
                      <div className="flex">
                        {/* Image / Placeholder */}
                        <div className="w-28 sm:w-36 flex-shrink-0 bg-gray-50 border-r border-gray-100 flex items-center justify-center">
                          {board.imageUrl ? (
                            <img
                              src={board.imageUrl}
                              alt={board.name}
                              className="w-full h-full object-contain p-2"
                              loading="lazy"
                            />
                          ) : (
                            <CatIcon className="w-10 h-10 text-gray-300" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-4 min-w-0">
                          {/* Top row */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="font-semibold text-gray-900 text-sm leading-snug truncate">
                                {board.name}
                              </h3>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {board.manufacturer} &middot;{' '}
                                <span className="font-mono">
                                  {board.partNumber}
                                </span>
                              </p>
                            </div>
                            <span className="text-sm font-semibold text-green-700 whitespace-nowrap">
                              {board.priceRange}
                            </span>
                          </div>

                          {/* Badges */}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                CATEGORY_COLORS[board.category]
                              }`}
                            >
                              {
                                CATEGORIES.find(
                                  (c) => c.value === board.category
                                )?.label
                              }
                            </span>
                            {board.compatibleBrands
                              .slice(0, 4)
                              .map((brand) => (
                                <span
                                  key={brand}
                                  className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600"
                                >
                                  {brand}
                                </span>
                              ))}
                            {board.compatibleBrands.length > 4 && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                +{board.compatibleBrands.length - 4} more
                              </span>
                            )}
                          </div>

                          {/* Description */}
                          <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                            {board.description}
                          </p>

                          {/* Expand / Links */}
                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                            <button
                              onClick={() =>
                                setExpandedId(isExpanded ? null : board.id)
                              }
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="w-3 h-3" /> Less
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3 h-3" /> Details
                                </>
                              )}
                            </button>
                            <div className="flex items-center gap-2">
                              {board.buyLinks.map((link) => (
                                <a
                                  key={link.url}
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  <ShoppingCart className="w-3 h-3" />
                                  {link.label}
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ))}
                            </div>
                          </div>

                          {/* Expanded details */}
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                              <div>
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                                  Features
                                </p>
                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                  {board.features.map((f) => (
                                    <li
                                      key={f}
                                      className="text-xs text-gray-600 flex items-center gap-1.5"
                                    >
                                      <Zap className="w-3 h-3 text-amber-500 flex-shrink-0" />
                                      {f}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                                  Compatible Brands
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {board.compatibleBrands.map((b) => (
                                    <span
                                      key={b}
                                      className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700"
                                    >
                                      {b}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Supplier Quick Links */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Supplier Quick Links
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {[
              { name: 'Amazon HVAC Boards', url: 'https://www.amazon.com/hvac-control-board/s?k=hvac+control+board' },
              { name: 'Ferguson HVAC', url: 'https://www.ferguson.com/category/heating-cooling/hvac-repair-parts-maintenance/hvac-controls/gas-heat-controls/control-boards/' },
              { name: 'AC Pro Store', url: 'https://store.acpro.com/parts/heating-parts/furnace-control-boards' },
              { name: 'Shortys HVAC', url: 'https://shortyshvac.com' },
              { name: 'HVAC Parts Shop', url: 'https://www.hvacpartsshop.com/control-boards/' },
              { name: 'National Air Warehouse', url: 'https://nationalairwarehouse.com/product-category/deals-of-the-day/control-boards/' },
              { name: 'The AC Outlet', url: 'https://www.theacoutlet.com/parts-accessories/circuit-boards.html' },
              { name: 'eBay HVAC Boards', url: 'https://www.ebay.com/b/HVAC-Refrigeration-Controls-Circuit-Boards/53296/bn_16563133' },
            ].map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-sm text-gray-700 hover:text-blue-700 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{link.name}</span>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
