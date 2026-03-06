'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from './AuthProvider';
import { Button, Input, Card, CardContent } from './ui';
import { formatCurrency } from '@/lib/utils';
import {
  HVAC_BRANDS,
  SYSTEM_HEALTH_COMPONENTS,
  DEFAULT_HEALTH_COMPONENTS,
  HEALTH_RATINGS,
  getAreaSuggestions,
  EQUIPMENT_TYPES,
  QUOTE_ITEM_CATEGORIES,
} from '@/lib/hvac-data';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Camera,
  Upload,
  Check,
  Save,
  X,
  CreditCard,
  DollarSign,
  FileText,
  Receipt,
  ExternalLink,
  Clock,
  Zap,
  Info,
  ShieldCheck,
  Sparkles,
  ThermometerSun,
  Wind,
  Droplets,
  BatteryCharging,
  Gauge,
  Wrench,
  CalendarCheck,
} from 'lucide-react';
import type {
  ServiceReportMedia,
  RepairOption,
  RepairLineItem,
  UpgradeItem,
  QuoteOption,
  QuoteOptionItem,
  ServiceUnit,
} from '@/types';

declare global {
  interface Window {
    Square?: {
      payments: (appId: string, locationId: string) => {
        card: () => Promise<{
          attach: (selector: string) => Promise<void>;
          tokenize: () => Promise<{ status: string; token?: string; errors?: Array<{ message: string }> }>;
        }>;
      };
    };
  }
}

interface CustomerOption {
  id: string;
  full_name: string;
  phone: string | null;
  address: string | null;
}

interface EquipmentOption {
  id: string;
  equipment_type: string;
  make: string | null;
  model: string | null;
  serial_number: string | null;
  customer_id: string;
}

interface ServiceReportBuilderProps {
  reportId?: string | null;
  initialCustomerId?: string | null;
  workOrderId?: string;
  onClose: () => void;
  onSaved: () => void;
}

const STEPS = [
  'Job Summary',
  'Equipment',
  'Uploads',
  'Upgrades',
  'Quote Options',
  'Review',
  'Payment',
];

type EquipmentSubTab = 'info' | 'problem' | 'health';

function createDefaultUnit(): ServiceUnit {
  return {
    id: crypto.randomUUID(),
    equipment_info: { ...EMPTY_EQUIPMENT_INFO },
    warranty_info: { ...EMPTY_WARRANTY_INFO },
    problem_found: '',
    secondary_problems: [],
    problem_details: { severity: 'medium', symptoms: [], areas_affected: [] },
    health_ratings: {},
    health_notes: {},
    health_extras: {},
  };
}

const UPGRADE_CATALOG: UpgradeItem[] = [
  { name: 'UV Light Air Purifier', price: 650, priority: 'medium', benefits: ['Kills mold & bacteria', 'Improves indoor air quality', 'Reduces allergens'] },
  { name: 'Smart Thermostat', price: 350, priority: 'medium', benefits: ['Energy savings up to 23%', 'Remote temperature control', 'Learning schedule'] },
  { name: 'Surge Protector', price: 250, priority: 'high', benefits: ['Protects equipment from power surges', 'Extends system lifespan', 'Prevents costly repairs'] },
  { name: 'Duct Sealing', price: 800, priority: 'medium', benefits: ['Reduces energy loss up to 30%', 'Improves airflow', 'Better temperature consistency'] },
  { name: 'Air Scrubber', price: 1200, priority: 'medium', benefits: ['Removes 99% of contaminants', 'Reduces odors', 'ActivePure technology'] },
  { name: 'Hard Start Kit', price: 175, priority: 'high', benefits: ['Reduces compressor wear', 'Lower startup amps', 'Extends compressor life'] },
  { name: 'Float Switch', price: 85, priority: 'high', benefits: ['Prevents water damage', 'Auto shutoff on overflow', 'Required by code in many areas'] },
  { name: 'Maintenance Plan', price: 199, priority: 'low', benefits: ['2 tune-ups per year', 'Priority scheduling', '15% parts discount'] },
  { name: 'Capacitor Upgrade', price: 125, priority: 'high', benefits: ['Prevents motor failure', 'Improves efficiency', 'Turbo rated for longer life'] },
  { name: 'Condensate Pump', price: 225, priority: 'medium', benefits: ['Reliable drainage', 'Quiet operation', 'Prevents water damage'] },
];

interface UpgradeFlyer {
  headline: string;
  tagline: string;
  description: string;
  keyBenefits: { title: string; detail: string }[];
  whyItMatters: string;
  icon: typeof Zap;
}

const UPGRADE_FLYERS: Record<string, UpgradeFlyer> = {
  'UV Light Air Purifier': {
    headline: 'Breathe Cleaner, Healthier Air',
    tagline: 'Hospital-grade air purification for your home',
    description: 'A UV light air purifier installs directly inside your HVAC system and uses ultraviolet germicidal irradiation (UVGI) to neutralize airborne pathogens as air circulates through your ducts. It runs silently 24/7 with virtually zero maintenance.',
    keyBenefits: [
      { title: 'Kills 99.9% of Mold & Bacteria', detail: 'UV-C light destroys the DNA of mold spores, bacteria, and viruses before they circulate through your home.' },
      { title: 'Reduces Allergens & Odors', detail: 'Breaks down volatile organic compounds (VOCs), pet dander, and musty odors at the source.' },
      { title: 'Protects Your HVAC System', detail: 'Prevents biological growth on the evaporator coil, keeping your system efficient and extending its lifespan.' },
      { title: 'Low Maintenance', detail: 'Bulb replacement only once every 1-2 years. No filters to change, no extra energy costs.' },
    ],
    whyItMatters: 'Indoor air can be 2-5x more polluted than outdoor air. A UV purifier works with your existing HVAC system to continuously clean the air your family breathes — especially important for allergy sufferers, children, and anyone with respiratory concerns.',
    icon: Sparkles,
  },
  'Smart Thermostat': {
    headline: 'Save Money While Staying Comfortable',
    tagline: 'Intelligent climate control that pays for itself',
    description: 'A smart thermostat learns your schedule, adjusts temperatures automatically, and lets you control your home\'s comfort from anywhere using your phone. It integrates with your existing HVAC system and installs in under an hour.',
    keyBenefits: [
      { title: 'Up to 23% Energy Savings', detail: 'Automatically adjusts when you\'re away or sleeping, cutting heating and cooling costs significantly.' },
      { title: 'Control From Anywhere', detail: 'Adjust temperature from your phone whether you\'re in bed or on vacation. Get alerts if something seems wrong.' },
      { title: 'Learning Schedule', detail: 'Adapts to your routine over time and makes automatic adjustments so you don\'t have to think about it.' },
      { title: 'HVAC Health Monitoring', detail: 'Tracks system runtime, efficiency trends, and sends maintenance reminders so small issues don\'t become big ones.' },
    ],
    whyItMatters: 'Most homeowners overspend on heating and cooling because their thermostat can\'t adapt. A smart thermostat eliminates wasted energy and keeps your home at the perfect temperature — it typically pays for itself within the first year.',
    icon: ThermometerSun,
  },
  'Surge Protector': {
    headline: 'Protect Your Investment',
    tagline: 'One power surge can destroy your entire HVAC system',
    description: 'An HVAC surge protector installs at your outdoor unit and shields the compressor, control board, and motors from voltage spikes caused by lightning, grid fluctuations, or power outages. It\'s your system\'s insurance policy.',
    keyBenefits: [
      { title: 'Prevents Catastrophic Damage', detail: 'A single power surge can fry a compressor ($2,000+) or control board ($500+). A surge protector stops it before it reaches your equipment.' },
      { title: 'Extends System Lifespan', detail: 'Even minor voltage fluctuations cause cumulative wear. Consistent, clean power keeps components running longer.' },
      { title: 'Always-On Protection', detail: 'Works 24/7 automatically — no action needed from you. LED indicator confirms it\'s actively protecting.' },
      { title: 'Affordable Peace of Mind', detail: 'A fraction of the cost of replacing damaged components. One of the best ROI upgrades you can make.' },
    ],
    whyItMatters: 'Power surges happen more often than you think — not just from lightning, but from your utility grid switching, large appliances cycling, and nearby construction. Your HVAC system is the most expensive appliance in your home. Protect it.',
    icon: ShieldCheck,
  },
  'Duct Sealing': {
    headline: 'Stop Paying to Heat & Cool Your Attic',
    tagline: 'Up to 30% of your conditioned air never reaches your rooms',
    description: 'Professional duct sealing closes gaps, cracks, and disconnected joints in your ductwork using mastic sealant and metal tape. This ensures the air your system produces actually reaches your living spaces instead of leaking into unconditioned areas.',
    keyBenefits: [
      { title: 'Reduces Energy Loss Up to 30%', detail: 'Leaky ducts are the #1 cause of energy waste in most homes. Sealing them means your system works less to achieve the same comfort.' },
      { title: 'Even Temperatures Throughout', detail: 'Eliminates hot and cold spots by ensuring balanced airflow to every room in your home.' },
      { title: 'Improved Indoor Air Quality', detail: 'Sealed ducts prevent dust, insulation fibers, and attic contaminants from being pulled into your air supply.' },
      { title: 'Less Wear on Your System', detail: 'When air reaches where it\'s supposed to go, your system doesn\'t have to run as long or as hard — extending its life.' },
    ],
    whyItMatters: 'Most homeowners don\'t realize their ductwork has gaps. If certain rooms are always too hot or too cold, or your energy bills seem high for your home size, leaky ducts are almost certainly part of the problem.',
    icon: Wind,
  },
  'Air Scrubber': {
    headline: 'The Ultimate Indoor Air Purification',
    tagline: 'ActivePure® technology used by NASA',
    description: 'The Air Scrubber by Aerus uses proprietary ActivePure® technology — originally developed for NASA — to actively seek out and destroy contaminants in your air AND on surfaces. Unlike passive filters, it sends purifying molecules throughout your entire home.',
    keyBenefits: [
      { title: 'Removes 99% of Airborne Contaminants', detail: 'Eliminates bacteria, viruses, mold, pollen, and VOCs from the air you breathe — not just what passes through a filter.' },
      { title: 'Cleans Surfaces Too', detail: 'ActivePure molecules travel through your home and reduce contaminants on countertops, doorknobs, and other surfaces.' },
      { title: 'Eliminates Odors at the Source', detail: 'Cooking smells, pet odors, and chemical fumes are broken down at a molecular level — not just masked.' },
      { title: 'Proven Space Technology', detail: 'ActivePure is in the Space Technology Hall of Fame. It\'s the same technology used on the International Space Station.' },
    ],
    whyItMatters: 'Traditional filters only clean air as it passes through your system. An Air Scrubber proactively cleans the air and surfaces throughout your entire home — providing a level of protection that filters alone simply can\'t match.',
    icon: Sparkles,
  },
  'Hard Start Kit': {
    headline: 'Give Your Compressor a Longer Life',
    tagline: 'Reduces startup stress by up to 75%',
    description: 'A hard start kit adds a start capacitor and relay to your compressor, giving it a powerful boost during the most stressful moment of its cycle — startup. This reduces electrical draw, heat buildup, and mechanical wear every single time your AC kicks on.',
    keyBenefits: [
      { title: 'Reduces Compressor Wear', detail: 'Startup is when 90% of compressor damage occurs. A hard start kit gets it running in milliseconds instead of struggling.' },
      { title: 'Lower Startup Amps', detail: 'Cuts inrush current significantly, reducing stress on your electrical system and preventing breaker trips.' },
      { title: 'Extends Compressor Life', detail: 'Compressors cost $1,500-$3,000+ to replace. A hard start kit can add years of life for a fraction of that cost.' },
      { title: 'Faster, Smoother Starts', detail: 'Your system reaches full cooling capacity faster, which means more consistent comfort and less energy waste.' },
    ],
    whyItMatters: 'Your compressor starts and stops thousands of times per cooling season. Each startup draws a massive spike of electricity and generates heat stress. A hard start kit is one of the most cost-effective ways to protect the most expensive component in your system.',
    icon: BatteryCharging,
  },
  'Float Switch': {
    headline: 'Prevent Costly Water Damage',
    tagline: 'Automatic shutoff before overflow causes damage',
    description: 'A float switch installs in your condensate drain pan and automatically shuts off your HVAC system if the drain line becomes clogged and water begins to back up. It\'s a simple, inexpensive device that can prevent thousands of dollars in water damage.',
    keyBenefits: [
      { title: 'Prevents Water Damage', detail: 'A clogged drain line can overflow and damage ceilings, walls, floors, and belongings — especially if your air handler is in an attic or closet.' },
      { title: 'Automatic Shutoff', detail: 'Turns off your system before water overflows. You\'ll know something needs attention before damage occurs.' },
      { title: 'Required by Code', detail: 'Many building codes require a float switch for air handlers installed above living spaces. Stay compliant and protected.' },
      { title: 'Pennies to Operate', detail: 'No moving parts, no electricity used during normal operation. It only activates when water rises to an unsafe level.' },
    ],
    whyItMatters: 'Drain line clogs are one of the most common HVAC issues, especially in humid climates. Without a float switch, a $20 clog can cause $5,000+ in water damage to your home. It\'s the cheapest insurance you can add to your system.',
    icon: Droplets,
  },
  'Maintenance Plan': {
    headline: 'Keep Your System Running Like New',
    tagline: 'Priority service, fewer breakdowns, lower bills',
    description: 'Our maintenance plan includes two professional tune-ups per year (one for cooling, one for heating), priority scheduling when you need repairs, and a 15% discount on all parts. It\'s designed to catch small problems before they become expensive emergencies.',
    keyBenefits: [
      { title: '2 Tune-Ups Per Year', detail: 'Spring and fall inspections keep your system optimized for peak performance in every season.' },
      { title: 'Priority Scheduling', detail: 'Jump to the front of the line when you need service. No more waiting days for a repair during peak season.' },
      { title: '15% Parts Discount', detail: 'Save on every repair. The discount alone can pay for the plan if you need even one part replacement.' },
      { title: 'Fewer Breakdowns', detail: 'Regular maintenance catches worn parts, low refrigerant, and electrical issues before they cause a system failure.' },
    ],
    whyItMatters: 'HVAC systems are like cars — they need regular maintenance to run efficiently and last. A well-maintained system uses less energy, breaks down less often, and lasts years longer than a neglected one. The plan pays for itself in savings.',
    icon: CalendarCheck,
  },
  'Capacitor Upgrade': {
    headline: 'Stronger Motors, Better Performance',
    tagline: 'Turbo-rated for maximum reliability',
    description: 'Upgrading to a turbo-rated capacitor replaces your standard capacitor with a higher-quality unit that handles heat and electrical stress better. Capacitors are one of the most common failure points in HVAC systems — a premium one prevents unexpected breakdowns.',
    keyBenefits: [
      { title: 'Prevents Motor Failure', detail: 'A weak or failing capacitor causes motors to overheat and burn out. A turbo-rated capacitor delivers consistent, reliable power.' },
      { title: 'Improved Efficiency', detail: 'Motors run at optimal speed with proper capacitance, using less electricity and producing better airflow or cooling.' },
      { title: 'Heat Resistant', detail: 'Turbo-rated capacitors withstand higher temperatures than standard ones — critical in hot outdoor units.' },
      { title: 'Longer Lifespan', detail: 'Standard capacitors last 5-7 years. Turbo-rated units last significantly longer, reducing future service calls.' },
    ],
    whyItMatters: 'Capacitor failure is the #1 most common HVAC repair. When a capacitor fails on a 100°F day, your system stops working completely. Upgrading now is a small investment that prevents an emergency call later.',
    icon: Gauge,
  },
  'Condensate Pump': {
    headline: 'Reliable Drainage, Zero Worries',
    tagline: 'Quiet, efficient condensate removal',
    description: 'A condensate pump actively removes water produced by your HVAC system when gravity drainage isn\'t possible or reliable. It\'s essential for systems installed in basements, interior closets, or any location where the drain line can\'t flow downhill.',
    keyBenefits: [
      { title: 'Reliable Drainage', detail: 'Actively pumps condensate water away from your system, preventing overflow even when gravity drainage isn\'t an option.' },
      { title: 'Quiet Operation', detail: 'Modern condensate pumps are whisper-quiet. You won\'t even know it\'s running.' },
      { title: 'Prevents Water Damage', detail: 'Eliminates the risk of standing water, overflow, and the mold growth that comes with poor drainage.' },
      { title: 'Built-in Safety Switch', detail: 'Automatically shuts off your HVAC system if the pump fails or the reservoir fills up — protecting your home.' },
    ],
    whyItMatters: 'If your air handler is in a location where water can\'t drain by gravity, a condensate pump is essential. Even if you have gravity drainage, a pump provides an extra layer of protection against clogs and backups.',
    icon: Wrench,
  },
};

const REFRIGERANT_TYPES = ['R-410A', 'R-22', 'R-32', 'R-134a', 'R-407C', 'R-404A', 'Other'];

const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor', 'Critical'];

const SYMPTOM_OPTIONS = [
  'Not cooling',
  'Not heating',
  'Weak airflow',
  'Strange noises',
  'Water leak',
  'Refrigerant leak',
  'Short cycling',
  'High energy bills',
  'Uneven temperatures',
  'Bad odor',
  'Ice buildup',
  'Thermostat issues',
  'Electrical issues',
  'Vibration',
  'Compressor failure',
];

const SECONDARY_PROBLEMS = [
  'Weak air flow',
  'Blocked filter',
  'Weak capacitor',
  'Weak compressor',
  'Over amping compressor',
  'Over amping condenser motor',
  'Over amping blower motor',
  'Burnt electrical components and wiring',
  'Blocked drain',
  'Pitted contactor',
  'Loose wiring connections',
  'Refrigerant leak',
  'Evaporator coil leak',
  'Condenser coil leak',
  'Safety issues',
  'Overcharged',
  'Undercharged',
  'Recommend complete HVAC system cleaning and duct camera inspection',
];

const EMPTY_EQUIPMENT_INFO = {
  equipment_type: '',
  make: '',
  model: '',
  serial_number: '',
  location: '',
  age: '',
  tonnage: '',
  refrigerant_type: '',
  condition: '',
};

const EMPTY_WARRANTY_INFO = {
  has_warranty: false,
  warranty_type: '',
  provider: '',
  expiration: '',
  coverage: '',
  notes: '',
};

const EMPTY_PROBLEM_DETAILS: { severity: 'low' | 'medium' | 'high' | 'critical'; symptoms: string[]; areas_affected: string[] } = {
  severity: 'medium',
  symptoms: [],
  areas_affected: [],
};

function createEmptyQuoteOption(label: string, num: number): QuoteOption {
  return {
    label,
    name: `Option ${num}`,
    items: [{ description: '', category: 'service', quantity: 1, unit_price: 0, total: 0 }],
    subtotal: 0,
    is_recommended: false,
  };
}

function createEmptyUpgrade(): UpgradeItem {
  return { name: '', price: 0, priority: 'medium', benefits: [''] };
}

type PaymentMethod = 'card' | 'cash' | 'check' | 'invoice';

export function ServiceReportBuilder({ reportId, initialCustomerId, workOrderId, onClose, onSaved }: ServiceReportBuilderProps) {
  const { groupId, profile } = useAuth();
  const [step, setStep] = useState(1);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([1]));
  const [saving, setSaving] = useState(false);
  const [savedReportId, setSavedReportId] = useState<string | null>(reportId || null);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [equipmentOptions, setEquipmentOptions] = useState<EquipmentOption[]>([]);
  const lastSavedRef = useRef<string>('');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Form state
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  // Multi-unit state
  const [units, setUnits] = useState<ServiceUnit[]>([createDefaultUnit()]);
  const [activeUnitIdx, setActiveUnitIdx] = useState(0);
  const [equipmentSubTab, setEquipmentSubTab] = useState<EquipmentSubTab>('info');

  // Convenience accessors for active unit
  const activeUnit = units[activeUnitIdx] || units[0];
  const equipmentInfo = activeUnit.equipment_info;
  const warrantyInfo = activeUnit.warranty_info;
  const problemFound = activeUnit.problem_found;
  const secondaryProblems = activeUnit.secondary_problems || [];
  const problemDetails = activeUnit.problem_details;
  const healthRatings = activeUnit.health_ratings;
  const healthNotes = activeUnit.health_notes;
  const healthExtras = activeUnit.health_extras;

  const updateUnit = (idx: number, updates: Partial<ServiceUnit>) => {
    setUnits(prev => prev.map((u, i) => i === idx ? { ...u, ...updates } : u));
  };
  const setEquipmentInfo = (info: typeof EMPTY_EQUIPMENT_INFO) => updateUnit(activeUnitIdx, { equipment_info: info });
  const setWarrantyInfo = (info: typeof EMPTY_WARRANTY_INFO) => updateUnit(activeUnitIdx, { warranty_info: info });
  const setProblemFound = (val: string) => updateUnit(activeUnitIdx, { problem_found: val });
  const setSecondaryProblems = (val: string[]) => updateUnit(activeUnitIdx, { secondary_problems: val });
  const toggleSecondaryProblem = (problem: string) => {
    const current = secondaryProblems;
    if (current.includes(problem)) {
      setSecondaryProblems(current.filter(p => p !== problem));
    } else {
      setSecondaryProblems([...current, problem]);
    }
  };
  const setProblemDetails = (val: typeof EMPTY_PROBLEM_DETAILS | ((prev: typeof EMPTY_PROBLEM_DETAILS) => typeof EMPTY_PROBLEM_DETAILS)) => {
    if (typeof val === 'function') {
      setUnits(prev => prev.map((u, i) => i === activeUnitIdx ? { ...u, problem_details: val(u.problem_details) } : u));
    } else {
      updateUnit(activeUnitIdx, { problem_details: val });
    }
  };
  const setHealthRatings = (val: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => {
    if (typeof val === 'function') {
      setUnits(prev => prev.map((u, i) => i === activeUnitIdx ? { ...u, health_ratings: val(u.health_ratings) } : u));
    } else {
      updateUnit(activeUnitIdx, { health_ratings: val });
    }
  };
  const setHealthNotes = (val: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => {
    if (typeof val === 'function') {
      setUnits(prev => prev.map((u, i) => i === activeUnitIdx ? { ...u, health_notes: val(u.health_notes) } : u));
    } else {
      updateUnit(activeUnitIdx, { health_notes: val });
    }
  };
  const setHealthExtras = (val: Record<string, Record<string, unknown>> | ((prev: Record<string, Record<string, unknown>>) => Record<string, Record<string, unknown>>)) => {
    if (typeof val === 'function') {
      setUnits(prev => prev.map((u, i) => i === activeUnitIdx ? { ...u, health_extras: val(u.health_extras) } : u));
    } else {
      updateUnit(activeUnitIdx, { health_extras: val });
    }
  };

  // Legacy single-unit compat
  const equipmentId = activeUnit.equipment_id || '';
  const setEquipmentId = (id: string) => updateUnit(activeUnitIdx, { equipment_id: id });

  const [healthMedia, setHealthMedia] = useState<Record<string, { file: File; type: 'photo' | 'video' }[]>>({});
  const healthMediaInputRef = useRef<HTMLInputElement>(null);
  const [activeHealthMediaKey, setActiveHealthMediaKey] = useState<string>('');
  const [quoteOptions, setQuoteOptions] = useState<QuoteOption[]>([createEmptyQuoteOption('A', 1)]);
  const [selectedOptionIdx, setSelectedOptionIdx] = useState<number | null>(null);
  const [expandedOption, setExpandedOption] = useState<number | null>(0);
  const [upgrades, setUpgrades] = useState<UpgradeItem[]>([]);
  const [flyerProduct, setFlyerProduct] = useState<string | null>(null);
  const [techNotes, setTechNotes] = useState('');
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);

  // Brand autocomplete state
  const [brandSearch, setBrandSearch] = useState('');
  const [showBrands, setShowBrands] = useState(false);

  // Signature state
  const [signatureDataUrl, setSignatureDataUrl] = useState('');
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [squareCard, setSquareCard] = useState<{ attach: (s: string) => Promise<void>; tokenize: () => Promise<{ status: string; token?: string; errors?: Array<{ message: string }> }> } | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [cashTendered, setCashTendered] = useState('');
  const [checkNumber, setCheckNumber] = useState('');
  const [invoiceNote, setInvoiceNote] = useState('');

  // Warranty lookup state
  const [warrantyLookupBrand, setWarrantyLookupBrand] = useState<string | null>(null);
  const [warrantyScreenshot, setWarrantyScreenshot] = useState<File | null>(null);
  const [warrantyScreenshotUrl, setWarrantyScreenshotUrl] = useState<string | null>(null);
  const [savingScreenshot, setSavingScreenshot] = useState(false);
  const warrantyScreenshotRef = useRef<HTMLInputElement>(null);

  // Media state
  const [media, setMedia] = useState<ServiceReportMedia[]>([]);
  const [pendingFiles, setPendingFiles] = useState<{ file: File; caption: string; type: 'photo' | 'video' }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (groupId) {
      fetchCustomersAndEquipment();
      if (reportId) loadExistingReport(reportId);
    }
  }, [groupId, reportId]);

  // Auto-select initial customer when customers list loads
  useEffect(() => {
    if (initialCustomerId && customers.length > 0 && !customerId && !reportId) {
      const c = customers.find((c) => c.id === initialCustomerId);
      if (c) {
        setCustomerId(c.id);
        setCustomerName(c.full_name);
        setCustomerAddress(c.address || '');
      }
    }
  }, [initialCustomerId, customers, customerId, reportId]);

  // Auto-save every 30s
  useEffect(() => {
    if (!savedReportId) return;
    autoSaveTimerRef.current = setInterval(() => {
      const snapshot = JSON.stringify(getFormData());
      if (snapshot !== lastSavedRef.current) {
        saveDraft(true);
      }
    }, 30000);
    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, [savedReportId, customerId, units, quoteOptions, selectedOptionIdx, upgrades, techNotes]);

  // Cleanup warranty lookup on unmount
  useEffect(() => {
    return () => {
      setWarrantyLookupBrand(null);
    };
  }, []);

  // Square SDK loading
  useEffect(() => {
    if (step !== 7 || paymentMethod !== 'card') return;
    const existingScript = document.querySelector('script[src*="squarecdn"]');
    if (existingScript) {
      initSquare();
      return;
    }
    const script = document.createElement('script');
    script.src = process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT === 'production'
      ? 'https://web.squarecdn.com/v1/square.js'
      : 'https://sandbox.web.squarecdn.com/v1/square.js';
    script.onload = () => initSquare();
    document.head.appendChild(script);
    return () => {
      // Don't remove script, Square doesn't like re-init
    };
  }, [step, paymentMethod]);

  const initSquare = async () => {
    if (!window.Square) return;
    try {
      const payments = window.Square.payments(
        process.env.NEXT_PUBLIC_SQUARE_APP_ID!,
        process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID!
      );
      const card = await payments.card();
      await card.attach('#card-container');
      setSquareCard(card);
    } catch {
      // Square init can fail if container not ready yet
    }
  };

  const fetchCustomersAndEquipment = async () => {
    const supabase = createClient();
    const [custRes, eqRes] = await Promise.all([
      supabase.from('customers').select('id, full_name, phone, address').eq('group_id', groupId!).order('full_name'),
      supabase.from('customer_equipment').select('id, equipment_type, make, model, serial_number, customer_id').eq('group_id', groupId!),
    ]);
    setCustomers(custRes.data || []);
    setEquipmentOptions(eqRes.data || []);
  };

  const loadExistingReport = async (id: string) => {
    const supabase = createClient();
    const { data } = await supabase.from('service_reports').select('*').eq('id', id).single();
    if (!data) return;

    setCustomerId(data.customer_id || '');
    setCustomerName(data.customer_name || '');
    setCustomerAddress(data.customer_address || '');

    // Load units (multi-unit or backwards-compat single unit)
    const savedUnits = data.equipment_info?._units;
    if (savedUnits && Array.isArray(savedUnits) && savedUnits.length > 0) {
      setUnits(savedUnits);
    } else {
      const unit = createDefaultUnit();
      unit.equipment_info = data.equipment_info || { ...EMPTY_EQUIPMENT_INFO };
      unit.warranty_info = data.warranty_info || { ...EMPTY_WARRANTY_INFO };
      unit.problem_found = data.problem_found || '';
      unit.secondary_problems = data.secondary_problems || [];
      unit.problem_details = data.problem_details || { ...EMPTY_PROBLEM_DETAILS };
      unit.health_ratings = data.health_ratings || {};
      unit.health_notes = data.health_notes || {};
      unit.health_extras = data.health_extras || {};
      unit.equipment_id = data.equipment_id || undefined;
      setUnits([unit]);
    }
    setActiveUnitIdx(0);

    setQuoteOptions(data.quote_options?.length ? data.quote_options : [createEmptyQuoteOption('A', 1)]);
    setSelectedOptionIdx(data.selected_option_idx ?? null);
    setUpgrades(data.upgrades || []);
    setTechNotes(data.tech_notes || '');
    setServiceDate(data.service_date || new Date().toISOString().split('T')[0]);
    setSavedReportId(id);

    // Load media
    const { data: mediaData } = await supabase
      .from('service_report_media')
      .select('*')
      .eq('service_report_id', id)
      .order('sort_order');
    if (mediaData) setMedia(mediaData);
  };

  const getFormData = useCallback(() => {
    const primaryUnit = units[0];
    return {
      customer_id: customerId || null,
      equipment_id: primaryUnit?.equipment_id || null,
      created_by: profile?.id || null,
      group_id: groupId!,
      equipment_info: { ...primaryUnit.equipment_info, _units: units },
      warranty_info: primaryUnit.warranty_info,
      problem_found: primaryUnit.problem_found,
      problem_details: primaryUnit.problem_details,
      health_ratings: primaryUnit.health_ratings,
      health_notes: primaryUnit.health_notes,
      health_extras: primaryUnit.health_extras,
      quote_options: quoteOptions,
      selected_option_idx: selectedOptionIdx,
      upgrades,
      tech_notes: techNotes || null,
      customer_name: customerName || null,
      customer_address: customerAddress || null,
      service_date: serviceDate,
    };
  }, [customerId, units, profile, groupId, quoteOptions, selectedOptionIdx, upgrades, techNotes, customerName, customerAddress, serviceDate]);

  const saveDraft = async (silent = false) => {
    if (!groupId) return;
    if (!silent) setSaving(true);
    const supabase = createClient();
    const formData = getFormData();
    const snapshot = JSON.stringify(formData);

    if (savedReportId) {
      await supabase
        .from('service_reports')
        .update({ ...formData, status: 'draft', updated_at: new Date().toISOString() } as Record<string, unknown>)
        .eq('id', savedReportId);
    } else {
      const { data } = await supabase
        .from('service_reports')
        .insert({ ...formData, status: 'draft' } as Record<string, unknown>)
        .select('id')
        .single();
      if (data) setSavedReportId(data.id);
    }
    lastSavedRef.current = snapshot;
    if (!silent) {
      setSaving(false);
      onSaved();
    }
  };

  const generateReport = async () => {
    if (!groupId) return;
    setSaving(true);
    const supabase = createClient();
    const formData = getFormData();
    const shareToken = crypto.randomUUID().replace(/-/g, '').substring(0, 16);

    if (savedReportId) {
      await supabase
        .from('service_reports')
        .update({ ...formData, status: 'completed', share_token: shareToken, report_url: `/report/${shareToken}`, updated_at: new Date().toISOString() } as Record<string, unknown>)
        .eq('id', savedReportId);
    } else {
      const { data } = await supabase
        .from('service_reports')
        .insert({ ...formData, status: 'completed', share_token: shareToken, report_url: `/report/${shareToken}` } as Record<string, unknown>)
        .select('id')
        .single();
      if (data) setSavedReportId(data.id);
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  // Customer selection handler
  const handleCustomerChange = (id: string) => {
    setCustomerId(id);
    const c = customers.find((c) => c.id === id);
    if (c) {
      setCustomerName(c.full_name);
      setCustomerAddress(c.address || '');
    }
    setEquipmentId('');
  };

  const updateHealthExtra = (compKey: string, field: string, value: unknown) => {
    setHealthExtras(prev => ({
      ...prev,
      [compKey]: { ...(prev[compKey] || {}), [field]: value },
    }));
  };

  // Warranty screenshot save
  const saveWarrantyScreenshot = async () => {
    if (!warrantyScreenshot || !groupId) return;
    setSavingScreenshot(true);
    try {
      const supabase = createClient();
      const ext = warrantyScreenshot.name.split('.').pop();
      const fileName = `warranty-${Date.now()}.${ext}`;
      const filePath = `warranty-proofs/${customerId || 'unknown'}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('service-reports').upload(filePath, warrantyScreenshot);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('service-reports').getPublicUrl(filePath);
      setWarrantyScreenshotUrl(urlData.publicUrl);

      // Save to customer equipment if we have IDs
      if (customerId && equipmentId) {
        await supabase
          .from('customer_equipment')
          .update({ warranty_proof_url: urlData.publicUrl } as Record<string, unknown>)
          .eq('id', equipmentId);
      }
    } catch (err) {
      console.error('warranty screenshot save error:', err);
    } finally {
      setSavingScreenshot(false);
    }
  };

  // Warranty lookup links
  const WARRANTY_LINKS = [
    { brand: 'Carrier', url: 'https://www.carrier.com/residential/en/us/warranty-lookup/' },
    { brand: 'Goodman', url: 'https://www.goodmanmfg.com/warranty-lookup' },
    { brand: 'Lennox', url: 'https://www.lennox.com/residential/owners/assistance/warranty/' },
    { brand: 'Rheem', url: 'https://rheem.registermyunit.com/en-US/warranty/brand?brand=rheem' },
    { brand: 'York', url: 'https://wtyprod.jci.com/jci/warranty/public/warrantyreg/index.html' },
  ];

  // Equipment selection handler
  const handleEquipmentSelect = (id: string) => {
    setEquipmentId(id);
    const eq = equipmentOptions.find((e) => e.id === id);
    if (eq) {
      const prev = units[activeUnitIdx].equipment_info;
      setEquipmentInfo({
        ...prev,
        equipment_type: eq.equipment_type || prev.equipment_type,
        make: eq.make || prev.make,
        model: eq.model || prev.model,
        serial_number: eq.serial_number || prev.serial_number,
      });
      if (eq.make) setBrandSearch(eq.make);
    }
  };

  // Quote option helpers
  const addQuoteOption = () => {
    const labels = 'ABCDEFGHIJ';
    const nextIdx = quoteOptions.length;
    const next = labels[nextIdx] || `${nextIdx + 1}`;
    setQuoteOptions([...quoteOptions, createEmptyQuoteOption(next, nextIdx + 1)]);
    setExpandedOption(nextIdx);
  };

  const removeQuoteOption = (idx: number) => {
    const updated = quoteOptions.filter((_, i) => i !== idx);
    setQuoteOptions(updated);
    if (selectedOptionIdx === idx) setSelectedOptionIdx(null);
    else if (selectedOptionIdx !== null && selectedOptionIdx > idx) setSelectedOptionIdx(selectedOptionIdx - 1);
    if (expandedOption === idx) setExpandedOption(updated.length > 0 ? 0 : null);
    else if (expandedOption !== null && expandedOption > idx) setExpandedOption(expandedOption - 1);
  };

  const updateQuoteOption = (idx: number, updates: Partial<QuoteOption>) => {
    setQuoteOptions(quoteOptions.map((opt, i) => (i === idx ? { ...opt, ...updates } : opt)));
  };

  const addQuoteItem = (optIdx: number) => {
    const updated = [...quoteOptions];
    updated[optIdx] = {
      ...updated[optIdx],
      items: [...updated[optIdx].items, { description: '', category: 'service', quantity: 1, unit_price: 0, total: 0 }],
    };
    setQuoteOptions(updated);
  };

  const removeQuoteItem = (optIdx: number, itemIdx: number) => {
    const updated = [...quoteOptions];
    const newItems = updated[optIdx].items.filter((_, i) => i !== itemIdx);
    const subtotal = newItems.reduce((sum, li) => sum + li.total, 0);
    updated[optIdx] = { ...updated[optIdx], items: newItems, subtotal };
    setQuoteOptions(updated);
  };

  const updateQuoteItem = (optIdx: number, itemIdx: number, field: keyof QuoteOptionItem, value: string | number) => {
    const updated = [...quoteOptions];
    const item = { ...updated[optIdx].items[itemIdx], [field]: value };
    if (field === 'quantity' || field === 'unit_price') {
      item.total = Number(item.quantity) * Number(item.unit_price);
    }
    const newItems = [...updated[optIdx].items];
    newItems[itemIdx] = item;
    const subtotal = newItems.reduce((sum, li) => sum + li.total, 0);
    updated[optIdx] = { ...updated[optIdx], items: newItems, subtotal };
    setQuoteOptions(updated);
  };

  // Upgrade helpers
  const addUpgrade = () => setUpgrades([...upgrades, createEmptyUpgrade()]);
  const removeUpgrade = (idx: number) => setUpgrades(upgrades.filter((_, i) => i !== idx));
  const updateUpgrade = (idx: number, updates: Partial<UpgradeItem>) => {
    setUpgrades(upgrades.map((u, i) => (i === idx ? { ...u, ...updates } : u)));
  };

  // Photo/video upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'video') => {
    const files = Array.from(e.target.files || []);
    const newPending = files.map((file) => ({ file, caption: '', type }));
    setPendingFiles([...pendingFiles, ...newPending]);
    e.target.value = '';
  };

  const uploadPendingFiles = async () => {
    if (!savedReportId) {
      await saveDraft();
    }
    const reportIdToUse = savedReportId;
    if (!reportIdToUse || pendingFiles.length === 0) return;

    setUploading(true);
    const supabase = createClient();

    for (const pending of pendingFiles) {
      const ext = pending.file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const filePath = `service-reports/${reportIdToUse}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('service-reports').upload(filePath, pending.file);
      if (uploadError) continue;

      const { data: urlData } = supabase.storage.from('service-reports').getPublicUrl(filePath);

      const { data: mediaRow } = await supabase
        .from('service_report_media')
        .insert({
          service_report_id: reportIdToUse,
          type: pending.type,
          url: urlData.publicUrl,
          caption: pending.caption || null,
          sort_order: media.length,
        } as Record<string, unknown>)
        .select()
        .single();
      if (mediaRow) setMedia((prev) => [...prev, mediaRow]);
    }
    setPendingFiles([]);
    setUploading(false);
  };

  const deleteMedia = async (id: string, url: string) => {
    const supabase = createClient();
    await supabase.from('service_report_media').delete().eq('id', id);
    const pathMatch = url.match(/service-reports\/.+/);
    if (pathMatch) await supabase.storage.from('service-reports').remove([pathMatch[0]]);
    setMedia((prev) => prev.filter((m) => m.id !== id));
  };

  // Signature canvas handlers
  const startSign = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
  };

  const drawSign = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endSign = () => {
    isDrawingRef.current = false;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    setSignatureDataUrl(canvas.toDataURL());
  };

  const clearSignature = () => {
    setSignatureDataUrl('');
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Payment processing
  const processPayment = async () => {
    if (!savedReportId) return;
    setProcessingPayment(true);
    setPaymentError('');

    try {
      if (paymentMethod === 'card') {
        if (!squareCard) {
          setPaymentError('Card form not loaded. Please wait and try again.');
          setProcessingPayment(false);
          return;
        }
        const result = await squareCard.tokenize();
        if (result.status !== 'OK' || !result.token) {
          setPaymentError(result.errors?.[0]?.message || 'Card tokenization failed.');
          setProcessingPayment(false);
          return;
        }
        const selectedOpt = selectedOptionIdx !== null ? quoteOptions[selectedOptionIdx] : null;
        const amount = selectedOpt ? Math.round(selectedOpt.subtotal * 100) : 0;

        const res = await fetch('/api/square/payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceId: result.token,
            amount,
            currency: 'USD',
            reportId: savedReportId,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setPaymentError(data.error || 'Payment failed.');
          setProcessingPayment(false);
          return;
        }
      }

      // Save payment info to report
      const supabase = createClient();
      const paymentInfo: Record<string, unknown> = {
        method: paymentMethod,
        status: 'completed',
        amount: selectedOptionIdx !== null ? quoteOptions[selectedOptionIdx].subtotal : 0,
      };
      if (paymentMethod === 'cash') paymentInfo.cash_tendered = Number(cashTendered);
      if (paymentMethod === 'check') paymentInfo.check_number = checkNumber;
      if (paymentMethod === 'invoice') paymentInfo.invoice_note = invoiceNote;

      await supabase
        .from('service_reports')
        .update({
          ...getFormData(),
          status: 'completed',
          payment_info: paymentInfo,
          updated_at: new Date().toISOString(),
        } as Record<string, unknown>)
        .eq('id', savedReportId);

      setPaymentComplete(true);
      onSaved();
    } catch (err: unknown) {
      setPaymentError(err instanceof Error ? err.message : 'Payment processing failed.');
    }
    setProcessingPayment(false);
  };

  // Navigation helper
  const navigateToStep = (stepNum: number) => {
    setStep(stepNum);
    setVisitedSteps(prev => new Set(prev).add(stepNum));
  };

  // Step completion checks
  const isStepComplete = (s: number): boolean => {
    switch (s) {
      case 1: return !!(customerId); // Job Summary: customer selected
      case 2: return units.some(u => !!(u.equipment_info.equipment_type && u.equipment_info.make)); // Equipment
      case 3: return media.length > 0 || pendingFiles.length > 0; // Uploads
      case 4: return true; // Upgrades are optional
      case 5: return quoteOptions.some(o => o.items.some(i => i.description.trim())); // Quote Options
      default: return false;
    }
  };

  // Review/Payment availability
  const hasMedia = media.length > 0 || pendingFiles.length > 0;
  const allStepsVisited = [1, 2, 3, 4, 5].every(s => visitedSteps.has(s));
  const reviewAvailable = selectedOptionIdx !== null && allStepsVisited;
  const paymentAvailable = !!signatureDataUrl;

  // Step navigation
  const goNext = async () => {
    if (step === 1 && !savedReportId) {
      await saveDraft();
    }
    const nextStep = step + 1;
    if (nextStep === 6 && !reviewAvailable) return;
    if (nextStep === 7 && !paymentAvailable) return;
    navigateToStep(Math.min(nextStep, 7));
  };

  const goBack = () => navigateToStep(Math.max(step - 1, 1));

  // Symptom toggle
  const toggleSymptom = (symptom: string) => {
    setProblemDetails((prev) => ({
      ...prev,
      symptoms: prev.symptoms.includes(symptom)
        ? prev.symptoms.filter((s) => s !== symptom)
        : [...prev.symptoms, symptom],
    }));
  };

  // Filter equipment by customer
  const filteredEquipment = customerId
    ? equipmentOptions.filter((e) => e.customer_id === customerId)
    : equipmentOptions;

  // === STEP RENDERERS ===

  // Step 1: Job Summary
  const renderJobSummary = () => {
    const selectedCustomer = customers.find(c => c.id === customerId);
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-navy">Job Summary</h3>

        <div>
          <label className="block text-sm font-medium text-navy mb-1">Customer</label>
          <select
            value={customerId}
            onChange={(e) => handleCustomerChange(e.target.value)}
            className="block w-full rounded-lg border border-border px-3 py-2 text-black focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="">Select customer...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.full_name}</option>
            ))}
          </select>
        </div>

        {selectedCustomer && (
          <div className="bg-accent-light border border-accent/20 rounded-lg p-3 text-sm space-y-1">
            <p className="text-navy"><span className="text-accent font-medium">Customer:</span> {selectedCustomer.full_name}</p>
            {selectedCustomer.phone && <p className="text-navy/80"><span className="text-accent font-medium">Phone:</span> {selectedCustomer.phone}</p>}
            {selectedCustomer.address && <p className="text-navy/80"><span className="text-accent font-medium">Address:</span> {selectedCustomer.address}</p>}
          </div>
        )}

        <Input
          label="Service Date"
          type="date"
          value={serviceDate}
          onChange={(e) => setServiceDate(e.target.value)}
        />

        <div>
          <label className="block text-sm font-medium text-navy mb-1">Tech Notes (internal)</label>
          <textarea
            value={techNotes}
            onChange={(e) => setTechNotes(e.target.value)}
            rows={4}
            placeholder="Internal notes for your team..."
            className="block w-full rounded-lg border border-border px-3 py-2 text-black placeholder-gray-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        {/* Units overview */}
        <div className="border-t border-border pt-4">
          <h4 className="text-sm font-medium text-navy mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-accent" /> Units on this Job
          </h4>
          <div className="space-y-2">
            {units.map((u, idx) => (
              <div key={u.id} className="flex items-center justify-between p-3 bg-ice rounded-lg">
                <div>
                  <p className="text-sm font-medium text-navy">Unit {idx + 1}</p>
                  <p className="text-xs text-steel">
                    {u.equipment_info.equipment_type || 'No type'} {u.equipment_info.make ? `- ${u.equipment_info.make}` : ''} {u.equipment_info.model || ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setActiveUnitIdx(idx); navigateToStep(2); }}
                  className="text-xs text-accent font-medium hover:underline"
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Step 2: Equipment (with sub-tabs and multi-unit)
  const renderEquipmentUnitInfo = () => {
    const filteredBrands = HVAC_BRANDS.filter(b =>
      b.toLowerCase().includes(brandSearch.toLowerCase())
    ).slice(0, 8);

    return (
      <div className="space-y-4">
        {/* Existing equipment selector */}
        {filteredEquipment.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Load from Profile (optional)</label>
            <select
              value={equipmentId}
              onChange={(e) => handleEquipmentSelect(e.target.value)}
              className="block w-full rounded-lg border border-border px-3 py-2 text-black focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">Select or enter manually...</option>
              {filteredEquipment.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.equipment_type} - {eq.make} {eq.model}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-navy mb-1">Equipment Type</label>
              <select
                value={equipmentInfo.equipment_type}
                onChange={(e) => setEquipmentInfo({ ...equipmentInfo, equipment_type: e.target.value })}
                className="block w-full rounded-lg border border-border px-3 py-2.5 text-sm text-black focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">Select type...</option>
                {EQUIPMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Input
                label="Make"
                value={equipmentInfo.make}
                onChange={(e) => {
                  const val = e.target.value;
                  setBrandSearch(val);
                  setEquipmentInfo({ ...equipmentInfo, make: val });
                  setShowBrands(true);
                }}
                onFocus={() => { if (brandSearch.length >= 1) setShowBrands(true); }}
                onBlur={() => { setTimeout(() => setShowBrands(false), 300); }}
                placeholder="Brand..."
              />
              {showBrands && brandSearch.length >= 1 && filteredBrands.length > 0 && (
                <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredBrands.map((brand) => (
                    <button
                      key={brand}
                      type="button"
                      className="block w-full text-left px-3 py-2 text-sm text-navy/80 hover:bg-accent-light hover:text-accent"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setEquipmentInfo({ ...equipmentInfo, make: brand });
                        setBrandSearch(brand);
                        setShowBrands(false);
                      }}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Model" value={equipmentInfo.model} onChange={(e) => setEquipmentInfo({ ...equipmentInfo, model: e.target.value })} />
            <Input label="Serial Number" value={equipmentInfo.serial_number} onChange={(e) => setEquipmentInfo({ ...equipmentInfo, serial_number: e.target.value })} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input label="Location" placeholder="Rooftop..." value={equipmentInfo.location} onChange={(e) => setEquipmentInfo({ ...equipmentInfo, location: e.target.value })} />
            <Input label="Age (yrs)" type="number" value={equipmentInfo.age} onChange={(e) => setEquipmentInfo({ ...equipmentInfo, age: e.target.value })} />
            <Input label="Tonnage" value={equipmentInfo.tonnage} onChange={(e) => setEquipmentInfo({ ...equipmentInfo, tonnage: e.target.value })} />
          </div>

          <div>
            <label className="block text-xs font-medium text-navy mb-1">Refrigerant Type</label>
            <select
              value={equipmentInfo.refrigerant_type}
              onChange={(e) => setEquipmentInfo({ ...equipmentInfo, refrigerant_type: e.target.value })}
              className="block w-full rounded-lg border border-border px-3 py-2.5 text-sm text-black focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">Select refrigerant...</option>
              {REFRIGERANT_TYPES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-navy mb-1">Condition</label>
          <div className="flex flex-wrap gap-2">
            {CONDITIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setEquipmentInfo({ ...equipmentInfo, condition: c })}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  equipmentInfo.condition === c
                    ? 'bg-ember text-white border-ember'
                    : 'bg-white text-navy/80 border-border hover:bg-ice'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Warranty section inline */}
        <div className="border-t border-border pt-4 space-y-4">
          <h4 className="text-base font-semibold text-navy">Warranty</h4>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-navy">Has Warranty?</label>
            <button
              type="button"
              onClick={() => setWarrantyInfo({ ...warrantyInfo, has_warranty: !warrantyInfo.has_warranty })}
              className={`relative inline-flex h-6 w-11 items-center rounded transition-colors ${
                warrantyInfo.has_warranty ? 'bg-ember' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-sm bg-white transition-transform ${
                warrantyInfo.has_warranty ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {warrantyInfo.has_warranty && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-navy mb-1">Warranty Type</label>
                  <select
                    value={warrantyInfo.warranty_type}
                    onChange={(e) => setWarrantyInfo({ ...warrantyInfo, warranty_type: e.target.value })}
                    className="block w-full rounded-lg border border-border px-3 py-2 text-black focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="">Select type...</option>
                    <option value="manufacturer">Manufacturer</option>
                    <option value="extended">Extended</option>
                    <option value="home_warranty">Home Warranty</option>
                    <option value="labor">Labor Only</option>
                    <option value="parts">Parts Only</option>
                    <option value="full">Full Coverage</option>
                  </select>
                </div>
                <Input label="Provider" value={warrantyInfo.provider} onChange={(e) => setWarrantyInfo({ ...warrantyInfo, provider: e.target.value })} />
                <Input label="Expiration Date" type="date" value={warrantyInfo.expiration} onChange={(e) => setWarrantyInfo({ ...warrantyInfo, expiration: e.target.value })} />
                <Input label="Coverage Details" value={warrantyInfo.coverage} onChange={(e) => setWarrantyInfo({ ...warrantyInfo, coverage: e.target.value })} />
              </div>

              {/* Warranty Lookup Links */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-navy">Warranty Lookup</label>
                <div className="flex flex-wrap gap-2">
                  {WARRANTY_LINKS.map(link => (
                    <a key={link.brand} href={link.url} target="_blank" rel="noopener noreferrer"
                      onClick={() => setWarrantyLookupBrand(link.brand)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                        warrantyLookupBrand === link.brand
                          ? 'border-green-600 bg-green-600 text-white'
                          : 'border-border bg-white text-accent hover:bg-accent-light'
                      }`}
                    >
                      {link.brand}
                      {warrantyLookupBrand === link.brand ? <Check className="w-3 h-3" /> : <ExternalLink className="w-3 h-3" />}
                    </a>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // Equipment step wrapper with unit selector + sub-tabs
  const renderEquipmentStep = () => {
    const subTabs: { id: EquipmentSubTab; label: string }[] = [
      { id: 'info', label: 'Unit Info' },
      { id: 'problem', label: 'Problem Found' },
      { id: 'health', label: 'System Health' },
    ];

    return (
      <div className="space-y-4">
        {/* Unit selector bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {units.map((u, idx) => (
            <button
              key={u.id}
              type="button"
              onClick={() => { setActiveUnitIdx(idx); setBrandSearch(u.equipment_info.make || ''); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap border transition-colors ${
                activeUnitIdx === idx
                  ? 'bg-ember text-white border-ember'
                  : 'bg-white text-navy/80 border-border hover:bg-ice'
              }`}
            >
              Unit {idx + 1}
              {u.equipment_info.make ? ` - ${u.equipment_info.make}` : ''}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              const newUnit = createDefaultUnit();
              setUnits(prev => [...prev, newUnit]);
              setActiveUnitIdx(units.length);
              setEquipmentSubTab('info');
              setBrandSearch('');
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-accent border border-dashed border-accent/40 hover:bg-accent-light whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" /> Add Unit
          </button>
          {units.length > 1 && (
            <button
              type="button"
              onClick={() => {
                if (units.length <= 1) return;
                setUnits(prev => prev.filter((_, i) => i !== activeUnitIdx));
                setActiveUnitIdx(Math.max(0, activeUnitIdx - 1));
              }}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-red-500 border border-red-200 hover:bg-red-50 whitespace-nowrap"
            >
              <Trash2 className="w-3 h-3" /> Remove
            </button>
          )}
        </div>

        {/* Sub-tab bar */}
        <div className="flex gap-1 bg-ice p-1 rounded-lg">
          {subTabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setEquipmentSubTab(tab.id)}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                equipmentSubTab === tab.id
                  ? 'bg-white text-accent shadow-sm'
                  : 'text-steel hover:text-navy'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sub-tab content */}
        {equipmentSubTab === 'info' && renderEquipmentUnitInfo()}
        {equipmentSubTab === 'problem' && renderProblemFound()}
        {equipmentSubTab === 'health' && renderSystemHealth()}
      </div>
    );
  };

  const renderProblemFound = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-navy">Problem Found</h3>

      <div>
        <label className="block text-sm font-medium text-navy mb-1">Description</label>
        <textarea
          value={problemFound}
          onChange={(e) => setProblemFound(e.target.value)}
          rows={8}
          placeholder="Describe the problem found during inspection..."
          className="block w-full rounded-lg border border-border px-3 py-2 text-black placeholder-gray-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent min-h-[200px]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-navy mb-2">Secondary Problems</label>
        <div className="flex flex-wrap gap-2">
          {SECONDARY_PROBLEMS.map((problem) => (
            <button
              key={problem}
              type="button"
              onClick={() => toggleSecondaryProblem(problem)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                secondaryProblems.includes(problem)
                  ? 'bg-accent text-white border-accent'
                  : 'bg-white text-navy/80 border-border hover:bg-ice'
              }`}
            >
              {problem}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-navy mb-2">Severity Level</label>
        <div className="flex flex-wrap gap-2">
          {(['low', 'medium', 'high', 'critical'] as const).map((sev) => {
            const colors: Record<string, string> = {
              low: 'bg-green-100 text-green-700 border-green-300',
              medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
              high: 'bg-orange-100 text-orange-700 border-orange-300',
              critical: 'bg-red-100 text-red-700 border-red-300',
            };
            const activeColors: Record<string, string> = {
              low: 'bg-green-600 text-white border-green-600',
              medium: 'bg-yellow-500 text-white border-yellow-500',
              high: 'bg-orange-600 text-white border-orange-600',
              critical: 'bg-red-600 text-white border-red-600',
            };
            return (
              <button
                key={sev}
                type="button"
                onClick={() => setProblemDetails({ ...problemDetails, severity: sev })}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors capitalize ${
                  problemDetails.severity === sev ? activeColors[sev] : colors[sev]
                }`}
              >
                {sev}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-navy mb-2">Symptoms</label>
        <div className="flex flex-wrap gap-2">
          {SYMPTOM_OPTIONS.map((symptom) => (
            <button
              key={symptom}
              type="button"
              onClick={() => toggleSymptom(symptom)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                problemDetails.symptoms.includes(symptom)
                  ? 'bg-ember text-white border-ember'
                  : 'bg-white text-navy/80 border-border hover:bg-ice'
              }`}
            >
              {symptom}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-navy mb-2">Areas Affected</label>
        {problemDetails.areas_affected.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {problemDetails.areas_affected.map(area => (
              <span key={area} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-ember text-white">
                {area}
                <button type="button" onClick={() => setProblemDetails({ ...problemDetails, areas_affected: problemDetails.areas_affected.filter(a => a !== area) })} className="hover:bg-ember-dark rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {getAreaSuggestions(equipmentInfo.equipment_type)
            .filter(a => !problemDetails.areas_affected.includes(a))
            .map(area => (
              <button
                key={area}
                type="button"
                onClick={() => setProblemDetails({ ...problemDetails, areas_affected: [...problemDetails.areas_affected, area] })}
                className="px-2.5 py-1 rounded-full text-xs border bg-white text-steel border-border hover:bg-ice"
              >
                {area}
              </button>
            ))}
        </div>
      </div>
    </div>
  );

  const renderSystemHealth = () => {
    const eqType = equipmentInfo.equipment_type;
    const components = SYSTEM_HEALTH_COMPONENTS[eqType] || DEFAULT_HEALTH_COMPONENTS;

    const isMotorType = (key: string) => ['compressor', 'blower_motor', 'fan_motor', 'inducer_motor', 'circulator_pump', 'water_pump'].includes(key) || key.includes('motor') || key.includes('pump') || key.includes('compressor');
    const isCoilType = (key: string) => key.includes('coil');
    const isRefrigerantCharge = (key: string) => key === 'refrigerant_charge' || key === 'refrigerant';
    const isCapacitor = (key: string) => key === 'capacitor';
    const isAirFilter = (key: string) => key === 'air_filter';
    const isDrainLine = (key: string) => key === 'drain_line' || key === 'drain';

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-navy">System Health</h3>
        <p className="text-sm text-steel">Rate each component of the {eqType || 'system'}</p>

        <input
          ref={healthMediaInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && activeHealthMediaKey) {
              const type = file.type.startsWith('video') ? 'video' as const : 'photo' as const;
              setHealthMedia(prev => ({
                ...prev,
                [activeHealthMediaKey]: [...(prev[activeHealthMediaKey] || []), { file, type }],
              }));
            }
            e.target.value = '';
          }}
        />

        {components.map(comp => {
          const extras = healthExtras[comp.key] || {};

          return (
            <div key={comp.key} className="border border-border/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-navy">{comp.label}</span>
                <span className="text-xs text-steel/60">
                  {isRefrigerantCharge(comp.key)
                    ? (extras.charge_status as string || 'Not rated')
                    : healthRatings[comp.key]
                    ? HEALTH_RATINGS.find(r => r.value === healthRatings[comp.key])?.label
                    : 'Not rated'}
                </span>
              </div>

              {/* Rating buttons -- skip for refrigerant charge (has its own UI) */}
              {!isRefrigerantCharge(comp.key) && (
                <div className="flex gap-1">
                  {HEALTH_RATINGS.slice().reverse().map(rating => (
                    <button
                      key={rating.value}
                      type="button"
                      onClick={() => setHealthRatings(prev => ({ ...prev, [comp.key]: rating.value }))}
                      className={`flex-1 py-2 rounded text-xs font-medium transition-colors ${
                        healthRatings[comp.key] === rating.value
                          ? `${rating.color} text-white`
                          : 'bg-ice text-steel hover:bg-ice/80'
                      }`}
                    >
                      {rating.value}
                    </button>
                  ))}
                </div>
              )}

              {/* Refrigerant Charge: Undercharged / Correct / Overcharged */}
              {isRefrigerantCharge(comp.key) && (
                <div className="flex gap-1">
                  {['Undercharged', 'Correct Charge', 'Overcharged'].map(status => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => updateHealthExtra(comp.key, 'charge_status', status)}
                      className={`flex-1 py-2 rounded text-xs font-medium transition-colors ${
                        extras.charge_status === status
                          ? status === 'Correct Charge' ? 'bg-green-500 text-white' : status === 'Undercharged' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'
                          : 'bg-ice text-steel hover:bg-ice/80'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              )}

              {/* Amp Rating for compressors/motors */}
              {isMotorType(comp.key) && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-steel whitespace-nowrap">Amp Reading:</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Amps"
                    value={(extras.amp_reading as string) || ''}
                    onChange={(e) => updateHealthExtra(comp.key, 'amp_reading', e.target.value)}
                    className="w-24 px-2 py-1.5 text-xs border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent text-black"
                  />
                </div>
              )}

              {/* Coil toggles: Heavy Rust, Corrosion, Refrigerant Leak */}
              {isCoilType(comp.key) && (
                <div className="flex flex-wrap gap-2">
                  {['Heavy Rust', 'Corrosion', 'Refrigerant Leak'].map(issue => (
                    <button
                      key={issue}
                      type="button"
                      onClick={() => {
                        const current = (extras.issues as string[]) || [];
                        const updated = current.includes(issue) ? current.filter(i => i !== issue) : [...current, issue];
                        updateHealthExtra(comp.key, 'issues', updated);
                      }}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                        ((extras.issues as string[]) || []).includes(issue)
                          ? 'bg-red-100 text-red-700 border-red-300'
                          : 'bg-white text-steel border-border hover:bg-ice'
                      }`}
                    >
                      {issue}
                    </button>
                  ))}
                </div>
              )}

              {/* Capacitor: Low toggle + current/safe rating */}
              {isCapacitor(comp.key) && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => updateHealthExtra(comp.key, 'is_low', !extras.is_low)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      extras.is_low ? 'bg-red-100 text-red-700 border-red-300' : 'bg-white text-steel border-border hover:bg-ice'
                    }`}
                  >
                    {extras.is_low ? 'Low' : 'Low'}
                  </button>
                  {!!extras.is_low && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-steel block mb-0.5">Current (uF)</label>
                        <input type="number" step="0.1" placeholder="0.0"
                          value={(extras.current_rating as string) || ''}
                          onChange={(e) => updateHealthExtra(comp.key, 'current_rating', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent text-black" />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-steel block mb-0.5">MFG Rating (uF)</label>
                        <input type="number" step="0.1" placeholder="0.0"
                          value={(extras.safe_rating as string) || ''}
                          onChange={(e) => updateHealthExtra(comp.key, 'safe_rating', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent text-black" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Air Filter: Needs Replacement toggle */}
              {isAirFilter(comp.key) && (
                <button
                  type="button"
                  onClick={() => updateHealthExtra(comp.key, 'needs_replacement', !extras.needs_replacement)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    extras.needs_replacement ? 'bg-red-100 text-red-700 border-red-300' : 'bg-white text-steel border-border hover:bg-ice'
                  }`}
                >
                  {extras.needs_replacement ? 'Needs Replacement' : 'Needs Replacement'}
                </button>
              )}

              {/* Drain Line: Clogged, Broken, Missing toggles */}
              {isDrainLine(comp.key) && (
                <div className="flex flex-wrap gap-2">
                  {['Clogged', 'Broken', 'Missing'].map(issue => (
                    <button
                      key={issue}
                      type="button"
                      onClick={() => {
                        const current = (extras.issues as string[]) || [];
                        const updated = current.includes(issue) ? current.filter(i => i !== issue) : [...current, issue];
                        updateHealthExtra(comp.key, 'issues', updated);
                      }}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                        ((extras.issues as string[]) || []).includes(issue)
                          ? 'bg-red-100 text-red-700 border-red-300'
                          : 'bg-white text-steel border-border hover:bg-ice'
                      }`}
                    >
                      {issue}
                    </button>
                  ))}
                </div>
              )}

              {/* Notes field */}
              <input
                placeholder="Notes (optional)..."
                value={healthNotes[comp.key] || ''}
                onChange={(e) => setHealthNotes(prev => ({ ...prev, [comp.key]: e.target.value }))}
                className="w-full px-2.5 py-1.5 text-xs border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent text-black placeholder-gray-400"
              />

              {/* Photo/Video upload for this component */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveHealthMediaKey(comp.key);
                    healthMediaInputRef.current?.click();
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-accent hover:bg-accent-light rounded"
                >
                  <Camera className="w-3 h-3" /> Add Photo/Video
                </button>
                {(healthMedia[comp.key] || []).length > 0 && (
                  <span className="text-xs text-steel/60">{healthMedia[comp.key].length} file(s)</span>
                )}
              </div>
              {(healthMedia[comp.key] || []).length > 0 && (
                <div className="flex gap-2 overflow-x-auto">
                  {healthMedia[comp.key].map((hm, idx) => (
                    <div key={idx} className="relative flex-shrink-0">
                      {hm.type === 'photo' ? (
                        <img src={URL.createObjectURL(hm.file)} alt="" className="w-16 h-16 object-cover rounded" />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-xs text-steel">Video</div>
                      )}
                      <button
                        type="button"
                        onClick={() => setHealthMedia(prev => ({
                          ...prev,
                          [comp.key]: prev[comp.key].filter((_, i) => i !== idx),
                        }))}
                        className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderStep5 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-navy">Other Uploads</h3>

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => cameraInputRef.current?.click()}>
          <Camera className="w-4 h-4 mr-2" /> Take Photo
        </Button>
        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
          <Upload className="w-4 h-4 mr-2" /> Upload Files
        </Button>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFileSelect(e, 'photo')}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            files.forEach((f) => {
              const type = f.type.startsWith('video') ? 'video' : 'photo';
              setPendingFiles((prev) => [...prev, { file: f, caption: '', type }]);
            });
            e.target.value = '';
          }}
        />
      </div>

      {/* Pending uploads */}
      {pendingFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-navy">Ready to Upload ({pendingFiles.length})</h4>
          {pendingFiles.map((pf, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-ice rounded-lg">
              {pf.type === 'photo' ? (
                <img src={URL.createObjectURL(pf.file)} alt="" className="w-16 h-16 object-cover rounded" />
              ) : (
                <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-xs text-steel">Video</div>
              )}
              <div className="flex-1">
                <p className="text-sm text-navy/80 truncate">{pf.file.name}</p>
                <Input
                  placeholder="Add caption..."
                  value={pf.caption}
                  onChange={(e) => {
                    const updated = [...pendingFiles];
                    updated[idx].caption = e.target.value;
                    setPendingFiles(updated);
                  }}
                  className="mt-1"
                />
              </div>
              <button
                type="button"
                onClick={() => setPendingFiles(pendingFiles.filter((_, i) => i !== idx))}
                className="p-1 text-red-500 hover:bg-red-50 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <Button onClick={uploadPendingFiles} isLoading={uploading}>
            <Upload className="w-4 h-4 mr-2" /> Upload All
          </Button>
        </div>
      )}

      {/* Uploaded media */}
      {media.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-navy">Uploaded ({media.length})</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {media.map((m) => (
              <div key={m.id} className="relative group">
                {m.type === 'photo' ? (
                  <img src={m.url} alt={m.caption || ''} className="w-full h-32 object-cover rounded-lg" />
                ) : (
                  <video src={m.url} className="w-full h-32 object-cover rounded-lg" />
                )}
                <button
                  type="button"
                  onClick={() => deleteMedia(m.id, m.url)}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
                {m.caption && (
                  <p className="text-xs text-steel mt-1 truncate">{m.caption}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {media.length === 0 && pendingFiles.length === 0 && (
        <p className="text-sm text-steel text-center py-8">No photos or videos yet. Use the buttons above to capture or upload.</p>
      )}
    </div>
  );

  const renderUpgradeFlyer = () => {
    if (!flyerProduct) return null;
    const flyer = UPGRADE_FLYERS[flyerProduct];
    const catalogItem = UPGRADE_CATALOG.find(c => c.name === flyerProduct);
    if (!flyer || !catalogItem) return null;
    const IconComp = flyer.icon;
    const isAdded = upgrades.some(u => u.name === flyerProduct);

    return (
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={() => setFlyerProduct(null)} />
        <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] flex flex-col shadow-2xl animate-[slideUp_0.25s_ease-out]">
          {/* Header */}
          <div className="relative bg-gradient-to-br from-navy to-navy/90 text-white px-6 pt-8 pb-6 rounded-t-2xl">
            <button
              type="button"
              onClick={() => setFlyerProduct(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
                <IconComp className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold leading-tight">{catalogItem.name}</h2>
                <p className="text-white/70 text-sm font-medium">{formatCurrency(catalogItem.price)}</p>
              </div>
            </div>
            <p className="text-2xl font-bold leading-snug">{flyer.headline}</p>
            <p className="text-white/80 text-sm mt-1">{flyer.tagline}</p>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <p className="text-sm text-navy/80 leading-relaxed">{flyer.description}</p>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-navy uppercase tracking-wider">Key Benefits</h3>
              {flyer.keyBenefits.map((b, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-navy">{b.title}</p>
                    <p className="text-xs text-steel leading-relaxed">{b.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
              <h3 className="text-sm font-bold text-accent mb-1.5">Why It Matters</h3>
              <p className="text-sm text-navy/80 leading-relaxed">{flyer.whyItMatters}</p>
            </div>
          </div>

          {/* Sticky footer */}
          <div className="flex-shrink-0 px-6 py-4 border-t border-border bg-white rounded-b-2xl">
            {isAdded ? (
              <div className="flex items-center justify-center gap-2 py-3 text-green-600 font-semibold">
                <Check className="w-5 h-5" />
                Added to Service
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setUpgrades([...upgrades, { ...catalogItem, benefits: [...catalogItem.benefits] }]);
                  setFlyerProduct(null);
                }}
                className="w-full py-3 rounded-xl bg-accent text-white font-semibold text-base active:bg-accent/90 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add to Service — {formatCurrency(catalogItem.price)}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderUpgrades = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-navy">Upgrades & Add-ons</h3>

      {/* Upgrade Catalog */}
      <div className="space-y-2">
        <p className="text-sm text-steel">Recommended upgrades for this service:</p>
        <div className="space-y-2">
          {UPGRADE_CATALOG.filter(cat => !upgrades.some(u => u.name === cat.name)).map(cat => {
            const priorityColors: Record<string, string> = {
              low: 'border-l-green-400',
              medium: 'border-l-yellow-400',
              high: 'border-l-red-400',
            };
            const hasFlyer = !!UPGRADE_FLYERS[cat.name];
            return (
              <div
                key={cat.name}
                className={`p-3 rounded-lg border border-border ${priorityColors[cat.priority]} border-l-4`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-navy">{cat.name}</span>
                  <span className="text-sm font-bold text-accent ml-2">{formatCurrency(cat.price)}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {cat.benefits.slice(0, 2).map(b => (
                    <span key={b} className="text-[10px] px-1.5 py-0.5 bg-ice text-steel rounded">{b}</span>
                  ))}
                </div>
                <div className="flex gap-2 mt-2.5">
                  {hasFlyer && (
                    <button
                      type="button"
                      onClick={() => setFlyerProduct(cat.name)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-accent/30 text-accent text-xs font-semibold hover:bg-accent/5 active:bg-accent/10 transition-colors"
                    >
                      <Info className="w-3.5 h-3.5" />
                      Learn More
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setUpgrades([...upgrades, { ...cat, benefits: [...cat.benefits] }])}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-accent text-white text-xs font-semibold active:bg-accent/90 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add to Service
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-border pt-4 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-navy">Added Upgrades ({upgrades.length})</h4>
        <Button size="sm" variant="outline" onClick={addUpgrade}>
          <Plus className="w-4 h-4 mr-1" /> Custom
        </Button>
      </div>

      {upgrades.length === 0 && (
        <p className="text-sm text-steel text-center py-4">No upgrades added yet. Tap a suggestion above or add a custom one.</p>
      )}

      {upgrades.map((upg, idx) => (
        <Card key={idx}>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Input
                label="Name"
                placeholder="e.g. UV Light, Smart Thermostat"
                value={upg.name}
                onChange={(e) => updateUpgrade(idx, { name: e.target.value })}
              />
              <button type="button" onClick={() => removeUpgrade(idx)} className="p-1 text-red-500 hover:bg-red-50 rounded ml-2 mt-5">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Price"
                type="number"
                value={upg.price}
                onChange={(e) => updateUpgrade(idx, { price: Number(e.target.value) })}
              />
              <div>
                <label className="block text-sm font-medium text-navy mb-1">Priority</label>
                <select
                  value={upg.priority}
                  onChange={(e) => updateUpgrade(idx, { priority: e.target.value as 'low' | 'medium' | 'high' })}
                  className="block w-full rounded-lg border border-border px-3 py-2 text-black focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-navy">Benefits</label>
              {upg.benefits.map((b, bIdx) => (
                <div key={bIdx} className="flex gap-2">
                  <Input
                    placeholder="Benefit"
                    value={b}
                    onChange={(e) => {
                      const updated = [...upg.benefits];
                      updated[bIdx] = e.target.value;
                      updateUpgrade(idx, { benefits: updated });
                    }}
                  />
                  {upg.benefits.length > 1 && (
                    <button
                      type="button"
                      onClick={() => updateUpgrade(idx, { benefits: upg.benefits.filter((_, i) => i !== bIdx) })}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <Button size="sm" variant="ghost" onClick={() => updateUpgrade(idx, { benefits: [...upg.benefits, ''] })}>
                <Plus className="w-4 h-4 mr-1" /> Add Benefit
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderStep7 = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-navy">Quote Options</h3>
        <Button size="sm" variant="outline" onClick={addQuoteOption}>
          <Plus className="w-4 h-4 mr-1" /> Add Option
        </Button>
      </div>

      {quoteOptions.map((opt, optIdx) => {
        const isExpanded = expandedOption === optIdx;
        return (
          <Card key={optIdx}>
            <CardContent className="p-0">
              {/* Option header */}
              <button
                type="button"
                onClick={() => setExpandedOption(isExpanded ? null : optIdx)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-ice transition-colors"
              >
                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                  selectedOptionIdx === optIdx ? 'bg-green-100 text-green-700' : 'bg-accent-light text-accent'
                }`}>
                  {opt.label}
                </span>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-navy truncate">{opt.name || 'Unnamed Option'}</span>
                    {opt.is_recommended && (
                      <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded flex-shrink-0">Recommended</span>
                    )}
                  </div>
                  <span className="text-sm text-steel">{formatCurrency(opt.subtotal)}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {quoteOptions.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeQuoteOption(optIdx); }}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-steel/60" /> : <ChevronDown className="w-4 h-4 text-steel/60" />}
                </div>
              </button>

              {/* Option body */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-4 border-t border-border/50">
                  <div className="pt-3 flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <Input
                        placeholder="Option name (e.g. Basic Repair)"
                        value={opt.name}
                        onChange={(e) => updateQuoteOption(optIdx, { name: e.target.value })}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (opt.is_recommended) {
                          const updated = quoteOptions.map((o, i) => (i === optIdx ? { ...o, is_recommended: false } : o));
                          setQuoteOptions(updated);
                        } else {
                          const updated = quoteOptions.map((o, i) => ({ ...o, is_recommended: i === optIdx }));
                          setQuoteOptions(updated);
                        }
                      }}
                      className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                        opt.is_recommended
                          ? 'bg-green-100 text-green-700 border-green-300'
                          : 'bg-white text-steel border-border hover:bg-ice'
                      }`}
                    >
                      {opt.is_recommended ? '✓ Recommended' : 'Set Recommended'}
                    </button>
                  </div>

                  {/* Items */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-navy">Items</label>
                    {opt.items.map((item, itemIdx) => (
                      <div key={itemIdx} className="flex flex-wrap gap-2 items-end">
                        <div className="flex-1 min-w-[150px]">
                          <Input
                            placeholder="Description"
                            value={item.description}
                            onChange={(e) => updateQuoteItem(optIdx, itemIdx, 'description', e.target.value)}
                          />
                        </div>
                        <div className="w-28">
                          <select
                            value={item.category}
                            onChange={(e) => updateQuoteItem(optIdx, itemIdx, 'category', e.target.value)}
                            className="block w-full rounded-lg border border-border px-2 py-2 text-sm text-black focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                          >
                            {QUOTE_ITEM_CATEGORIES.map(cat => (
                              <option key={cat.key} value={cat.key}>{cat.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="w-16">
                          <Input
                            type="number"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => updateQuoteItem(optIdx, itemIdx, 'quantity', Number(e.target.value))}
                          />
                        </div>
                        <div className="w-24">
                          <Input
                            type="number"
                            placeholder="Price"
                            value={item.unit_price}
                            onChange={(e) => updateQuoteItem(optIdx, itemIdx, 'unit_price', Number(e.target.value))}
                          />
                        </div>
                        <span className="text-sm font-medium text-navy w-20 text-right py-2">
                          {formatCurrency(item.total)}
                        </span>
                        {opt.items.length > 1 && (
                          <button type="button" onClick={() => removeQuoteItem(optIdx, itemIdx)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <Button size="sm" variant="ghost" onClick={() => addQuoteItem(optIdx)}>
                      <Plus className="w-4 h-4 mr-1" /> Add Item
                    </Button>
                  </div>

                  <div className="flex justify-end text-lg font-bold text-navy pt-2 border-t border-border/50">
                    Subtotal: {formatCurrency(opt.subtotal)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Customer Selection */}
      <div className="border-t border-border pt-4">
        <h4 className="text-sm font-medium text-navy mb-3">Which option does the customer want?</h4>
        <div className="space-y-2">
          {quoteOptions.map((opt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedOptionIdx(idx)}
              className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
                selectedOptionIdx === idx
                  ? 'border-green-500 bg-green-50'
                  : 'border-border hover:border-border bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                  selectedOptionIdx === idx ? 'bg-green-500 text-white' : 'bg-ice text-steel'
                }`}>
                  {selectedOptionIdx === idx ? <Check className="w-4 h-4" /> : opt.label}
                </span>
                <span className="text-sm font-medium text-navy">{opt.name || 'Unnamed Option'}</span>
                {opt.is_recommended && (
                  <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">Recommended</span>
                )}
              </div>
              <span className="text-sm font-bold text-navy">{formatCurrency(opt.subtotal)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderReview = () => {
    const selectedCustomer = customers.find((c) => c.id === customerId);
    const selectedOpt = selectedOptionIdx !== null ? quoteOptions[selectedOptionIdx] : null;

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-navy">Review & Submit</h3>

        {/* Customer Summary */}
        {selectedCustomer && (
          <Card>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-navy">Customer</h4>
                <button type="button" onClick={() => navigateToStep(1)} className="text-sm text-accent hover:underline">Edit</button>
              </div>
              <p className="text-sm text-navy/80">{selectedCustomer.full_name}</p>
              {selectedCustomer.address && <p className="text-xs text-steel">{selectedCustomer.address}</p>}
            </CardContent>
          </Card>
        )}

        {/* Units Summary */}
        {units.map((u, idx) => (
          <Card key={u.id}>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-navy">Unit {idx + 1}: {u.equipment_info.equipment_type || 'Unknown'}</h4>
                <button type="button" onClick={() => { setActiveUnitIdx(idx); navigateToStep(2); }} className="text-sm text-accent hover:underline">Edit</button>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {u.equipment_info.make && <p className="text-navy/80"><span className="text-steel">Make:</span> {u.equipment_info.make}</p>}
                {u.equipment_info.model && <p className="text-navy/80"><span className="text-steel">Model:</span> {u.equipment_info.model}</p>}
                {u.equipment_info.condition && <p className="text-navy/80"><span className="text-steel">Condition:</span> {u.equipment_info.condition}</p>}
                {u.warranty_info.has_warranty && <p className="text-navy/80"><span className="text-steel">Warranty:</span> {u.warranty_info.warranty_type || 'Yes'}</p>}
              </div>
              {u.problem_found && (
                <div className="mt-2 pt-2 border-t border-border/30">
                  <p className="text-xs text-steel font-medium">Problem:</p>
                  <p className="text-sm text-navy/80 line-clamp-2">{u.problem_found}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                    u.problem_details.severity === 'critical' ? 'bg-red-100 text-red-700' :
                    u.problem_details.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                    u.problem_details.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>{u.problem_details.severity}</span>
                </div>
              )}
              {u.secondary_problems && u.secondary_problems.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border/30">
                  <p className="text-xs text-steel font-medium mb-1">Secondary Problems:</p>
                  <div className="flex flex-wrap gap-1">
                    {u.secondary_problems.map(p => (
                      <span key={p} className="px-2 py-0.5 rounded-full text-xs bg-accent/10 text-accent font-medium">{p}</span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Photos Summary */}
        {media.length > 0 && (
          <Card>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-navy">Uploads ({media.length})</h4>
                <button type="button" onClick={() => navigateToStep(3)} className="text-sm text-accent hover:underline">Edit</button>
              </div>
              <div className="flex gap-2 overflow-x-auto">
                {media.slice(0, 6).map((m) => (
                  <div key={m.id} className="flex-shrink-0">
                    {m.type === 'photo' ? (
                      <img src={m.url} alt={m.caption || ''} className="w-20 h-20 object-cover rounded" />
                    ) : (
                      <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center text-xs text-steel">Video</div>
                    )}
                  </div>
                ))}
                {media.length > 6 && (
                  <div className="w-20 h-20 bg-ice rounded flex items-center justify-center text-sm text-steel">+{media.length - 6}</div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upgrades Summary */}
        {upgrades.length > 0 && (
          <Card>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-navy">Upgrades ({upgrades.length})</h4>
                <button type="button" onClick={() => navigateToStep(4)} className="text-sm text-accent hover:underline">Edit</button>
              </div>
              <div className="space-y-1">
                {upgrades.map((u, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-navy/80">{u.name || 'Unnamed'}</span>
                    <span className="font-medium text-navy">{formatCurrency(u.price)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Selected Quote Option */}
        {selectedOpt && (
          <Card>
            <CardContent>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-xs">{selectedOpt.label}</span>
                  <h4 className="font-medium text-navy">Selected: {selectedOpt.name || 'Unnamed Option'}</h4>
                </div>
                <button type="button" onClick={() => navigateToStep(5)} className="text-sm text-accent hover:underline">Edit</button>
              </div>
              <div className="space-y-1.5">
                {selectedOpt.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <div className="flex-1">
                      <span className="text-navy/80">{item.description || 'No description'}</span>
                      <span className="text-steel/60 ml-2 text-xs">{QUOTE_ITEM_CATEGORIES.find(c => c.key === item.category)?.label || item.category}</span>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <span className="text-steel text-xs">{item.quantity} x {formatCurrency(item.unit_price)}</span>
                      <span className="font-medium text-navy ml-2">{formatCurrency(item.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end text-lg font-bold text-navy pt-2 mt-2 border-t border-border/50">
                Total: {formatCurrency(selectedOpt.subtotal)}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Signature */}
        <div className="space-y-3">
          <h4 className="font-medium text-navy">Customer Signature</h4>
          <p className="text-xs text-steel">By signing below, the customer accepts the selected quote option.</p>
          <div className="border-2 border-dashed border-border rounded-lg p-4 min-h-[120px] flex items-center justify-center">
            {signatureDataUrl ? (
              <div className="relative w-full">
                <img src={signatureDataUrl} alt="Signature" className="w-full h-auto" />
                <button
                  type="button"
                  onClick={clearSignature}
                  className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-full"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="text-center w-full">
                <p className="text-sm text-steel/60 mb-2">Draw signature below</p>
                <canvas
                  ref={sigCanvasRef}
                  width={300}
                  height={120}
                  className="border border-border rounded bg-white touch-none mx-auto"
                  style={{ maxWidth: '100%' }}
                  onPointerDown={startSign}
                  onPointerMove={drawSign}
                  onPointerUp={endSign}
                />
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => saveDraft()} isLoading={saving}>
            <Save className="w-4 h-4 mr-2" /> Save Draft
          </Button>
          <Button variant="secondary" onClick={generateReport} isLoading={saving}>
            <Check className="w-4 h-4 mr-2" /> Generate Report
          </Button>
          <Button
            onClick={() => { if (paymentAvailable) navigateToStep(7); }}
            disabled={!paymentAvailable}
          >
            <CreditCard className="w-4 h-4 mr-2" /> Move to Payment
          </Button>
        </div>
      </div>
    );
  };

  const renderStep9 = () => {
    const selectedOpt = selectedOptionIdx !== null ? quoteOptions[selectedOptionIdx] : null;
    const totalAmount = selectedOpt?.subtotal || 0;
    const cashChange = cashTendered ? Math.max(0, Number(cashTendered) - totalAmount) : 0;

    if (paymentComplete) {
      return (
        <div className="space-y-6 text-center py-12">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-navy">Payment Complete</h3>
          <p className="text-steel">
            {formatCurrency(totalAmount)} received via {paymentMethod === 'card' ? 'credit card' : paymentMethod}
          </p>
          <div className="flex justify-center gap-3 pt-4">
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button onClick={generateReport} isLoading={saving}>
              <FileText className="w-4 h-4 mr-2" /> Generate Report
            </Button>
          </div>
        </div>
      );
    }

    const paymentMethods: { key: PaymentMethod; label: string; icon: typeof CreditCard }[] = [
      { key: 'card', label: 'Card', icon: CreditCard },
      { key: 'cash', label: 'Cash', icon: DollarSign },
      { key: 'check', label: 'Check', icon: FileText },
      { key: 'invoice', label: 'Invoice', icon: Receipt },
    ];

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-navy">Payment</h3>

        {/* Total */}
        <div className="text-center py-4 bg-ice rounded-lg">
          <p className="text-sm text-steel">Amount Due</p>
          <p className="text-3xl font-bold text-navy">{formatCurrency(totalAmount)}</p>
          {selectedOpt && (
            <p className="text-sm text-steel mt-1">Option {selectedOpt.label}: {selectedOpt.name || 'Unnamed'}</p>
          )}
        </div>

        {/* Payment Method Selector */}
        <div>
          <label className="block text-sm font-medium text-navy mb-2">Payment Method</label>
          <div className="grid grid-cols-4 gap-2">
            {paymentMethods.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setPaymentMethod(key)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-colors ${
                  paymentMethod === key
                    ? 'border-accent bg-accent-light text-accent'
                    : 'border-border text-steel hover:border-border'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Payment Form */}
        {paymentMethod === 'card' && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-navy">Card Details</label>
            <div
              id="card-container"
              className="min-h-[90px] border border-border rounded-lg p-3"
            />
            {!squareCard && (
              <p className="text-xs text-steel/60">Loading card form...</p>
            )}
          </div>
        )}

        {paymentMethod === 'cash' && (
          <div className="space-y-3">
            <Input
              label="Amount Tendered"
              type="number"
              value={cashTendered}
              onChange={(e) => setCashTendered(e.target.value)}
              placeholder="0.00"
            />
            {Number(cashTendered) > 0 && (
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm text-navy/80">Change Due</span>
                <span className="text-lg font-bold text-green-700">{formatCurrency(cashChange)}</span>
              </div>
            )}
          </div>
        )}

        {paymentMethod === 'check' && (
          <Input
            label="Check Number"
            value={checkNumber}
            onChange={(e) => setCheckNumber(e.target.value)}
            placeholder="Enter check number"
          />
        )}

        {paymentMethod === 'invoice' && (
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Invoice Note</label>
            <textarea
              value={invoiceNote}
              onChange={(e) => setInvoiceNote(e.target.value)}
              rows={3}
              placeholder="Add any notes for the invoice..."
              className="block w-full rounded-lg border border-border px-3 py-2 text-black placeholder-gray-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <p className="text-xs text-steel/60 mt-1">An invoice will be generated and sent to the customer.</p>
          </div>
        )}

        {paymentError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{paymentError}</p>
          </div>
        )}

        {/* Process Payment Button */}
        <Button
          onClick={processPayment}
          isLoading={processingPayment}
          disabled={
            processingPayment ||
            (paymentMethod === 'card' && !squareCard) ||
            (paymentMethod === 'cash' && Number(cashTendered) < totalAmount) ||
            (paymentMethod === 'check' && !checkNumber.trim())
          }
          className="w-full"
          size="lg"
        >
          <CreditCard className="w-5 h-5 mr-2" />
          {paymentMethod === 'invoice' ? 'Send Invoice' : `Process ${formatCurrency(totalAmount)}`}
        </Button>
      </div>
    );
  };

  const renderCurrentStep = () => {
    switch (step) {
      case 1: return renderJobSummary();
      case 2: return renderEquipmentStep();
      case 3: return renderStep5(); // Uploads
      case 4: return renderUpgrades();
      case 5: return renderStep7(); // Quote Options
      case 6: return renderReview();
      case 7: return renderStep9(); // Payment
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col pt-[env(safe-area-inset-top)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-navy-light/20 bg-navy flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1 text-white/70 hover:text-white">
            <X className="w-5 h-5" />
          </button>
          <img src="/logo-transparent.png" alt="Harden HVAC" className="h-7 w-auto" />
          <span className="text-xs font-medium text-white/50 hidden sm:inline">Service Report</span>
        </div>
        <Button size="sm" variant="ghost" onClick={() => saveDraft()} isLoading={saving} className="text-white/80 hover:text-white hover:bg-white/10">
          <Save className="w-4 h-4 mr-1" /> Save
        </Button>
      </div>

      {/* Step Navigation Bar */}
      <div className="px-4 py-2.5 border-b border-border bg-navy/5 flex-shrink-0 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {STEPS.map((s, i) => {
            const stepNum = i + 1;
            const isActive = step === stepNum;
            const isReview = stepNum === 6;
            const isPayment = stepNum === 7;
            const canClick = isPayment ? paymentAvailable : isReview ? reviewAvailable : true;
            return (
              <button
                key={s}
                type="button"
                onClick={() => canClick && navigateToStep(stepNum)}
                disabled={!canClick}
                className={`flex items-center gap-1 px-2 py-1.5 rounded text-[11px] font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-ember text-white'
                    : (isReview && !reviewAvailable) || (isPayment && !paymentAvailable)
                    ? 'bg-gray-200 text-steel/60 cursor-not-allowed opacity-50'
                    : visitedSteps.has(stepNum) && isStepComplete(stepNum)
                    ? 'bg-accent-light text-accent hover:bg-accent-light/80 cursor-pointer'
                    : visitedSteps.has(stepNum) && !isStepComplete(stepNum)
                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 cursor-pointer'
                    : 'bg-ice text-steel hover:bg-ice/80 cursor-pointer'
                }`}
              >
                {visitedSteps.has(stepNum) && isStepComplete(stepNum) && !isActive && <Check className="w-3 h-3" />}
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 max-w-2xl mx-auto w-full pb-8">
        {renderCurrentStep()}
        {/* Extra padding so inputs aren't hidden behind keyboard + footer */}
        <div className="h-32" />
      </div>

      {/* Footer Navigation */}
      {step < 6 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-white flex-shrink-0 pb-[env(safe-area-inset-bottom)]">
          <Button variant="ghost" onClick={goBack} disabled={step === 1}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <span className="text-sm text-steel">Step {step} of 7</span>
          {step === 5 && !reviewAvailable ? (
            <div className="text-xs text-amber-600 font-medium max-w-[140px] text-right">
              {selectedOptionIdx === null ? 'Select a quote option' : 'Visit all tabs to continue'}
            </div>
          ) : (
            <Button onClick={goNext}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      )}
      {step === 6 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-white flex-shrink-0 pb-[env(safe-area-inset-bottom)]">
          <Button variant="ghost" onClick={goBack}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <span className="text-sm text-steel">Step 6 of 7</span>
          <div />
        </div>
      )}
      {step === 7 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-white flex-shrink-0 pb-[env(safe-area-inset-bottom)]">
          <Button variant="ghost" onClick={goBack}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <span className="text-sm text-steel">Step 7 of 7</span>
          <div />
        </div>
      )}

      {/* Upgrade Flyer Modal */}
      {renderUpgradeFlyer()}
    </div>
  );
}
