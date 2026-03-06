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
  AREA_SUGGESTIONS,
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
} from 'lucide-react';
import type {
  ServiceReportMedia,
  RepairOption,
  RepairLineItem,
  UpgradeItem,
  QuoteOption,
  QuoteOptionItem,
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
  onClose: () => void;
  onSaved: () => void;
}

const STEPS = [
  'Equipment',
  'Warranty',
  'Problem',
  'System Health',
  'Other Uploads',
  'Upgrades',
  'Quote Options',
  'Review',
  'Payment',
];

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

function createEmptyQuoteOption(label: string): QuoteOption {
  return {
    label,
    name: '',
    items: [{ description: '', category: 'service', quantity: 1, unit_price: 0, total: 0 }],
    subtotal: 0,
    is_recommended: false,
  };
}

function createEmptyUpgrade(): UpgradeItem {
  return { name: '', price: 0, priority: 'medium', benefits: [''] };
}

type PaymentMethod = 'card' | 'cash' | 'check' | 'invoice';

export function ServiceReportBuilder({ reportId, initialCustomerId, onClose, onSaved }: ServiceReportBuilderProps) {
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
  const [equipmentId, setEquipmentId] = useState('');
  const [equipmentInfo, setEquipmentInfo] = useState(EMPTY_EQUIPMENT_INFO);
  const [warrantyInfo, setWarrantyInfo] = useState(EMPTY_WARRANTY_INFO);
  const [problemFound, setProblemFound] = useState('');
  const [problemDetails, setProblemDetails] = useState(EMPTY_PROBLEM_DETAILS);
  const [healthRatings, setHealthRatings] = useState<Record<string, number>>({});
  const [healthNotes, setHealthNotes] = useState<Record<string, string>>({});
  const [healthExtras, setHealthExtras] = useState<Record<string, Record<string, unknown>>>({});
  const [healthMedia, setHealthMedia] = useState<Record<string, { file: File; type: 'photo' | 'video' }[]>>({});
  const healthMediaInputRef = useRef<HTMLInputElement>(null);
  const [activeHealthMediaKey, setActiveHealthMediaKey] = useState<string>('');
  const [quoteOptions, setQuoteOptions] = useState<QuoteOption[]>([createEmptyQuoteOption('A')]);
  const [selectedOptionIdx, setSelectedOptionIdx] = useState<number | null>(null);
  const [expandedOption, setExpandedOption] = useState<number | null>(0);
  const [upgrades, setUpgrades] = useState<UpgradeItem[]>([]);
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
  }, [savedReportId, customerId, equipmentInfo, warrantyInfo, problemFound, problemDetails, healthRatings, healthNotes, healthExtras, quoteOptions, selectedOptionIdx, upgrades, techNotes]);

  // Square SDK loading
  useEffect(() => {
    if (step !== 9 || paymentMethod !== 'card') return;
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
    setEquipmentId(data.equipment_id || '');
    setEquipmentInfo(data.equipment_info || EMPTY_EQUIPMENT_INFO);
    setWarrantyInfo(data.warranty_info || EMPTY_WARRANTY_INFO);
    setProblemFound(data.problem_found || '');
    setProblemDetails(data.problem_details || EMPTY_PROBLEM_DETAILS);
    setHealthRatings(data.health_ratings || {});
    setHealthNotes(data.health_notes || {});
    setHealthExtras(data.health_extras || {});
    setQuoteOptions(data.quote_options?.length ? data.quote_options : [createEmptyQuoteOption('A')]);
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

  const getFormData = useCallback(() => ({
    customer_id: customerId || null,
    equipment_id: equipmentId || null,
    created_by: profile?.id || null,
    group_id: groupId!,
    equipment_info: equipmentInfo,
    warranty_info: warrantyInfo,
    problem_found: problemFound,
    problem_details: problemDetails,
    health_ratings: healthRatings,
    health_notes: healthNotes,
    health_extras: healthExtras,
    quote_options: quoteOptions,
    selected_option_idx: selectedOptionIdx,
    upgrades,
    tech_notes: techNotes || null,
    customer_name: customerName || null,
    customer_address: customerAddress || null,
    service_date: serviceDate,
  }), [customerId, equipmentId, profile, groupId, equipmentInfo, warrantyInfo, problemFound, problemDetails, healthRatings, healthNotes, healthExtras, quoteOptions, selectedOptionIdx, upgrades, techNotes, customerName, customerAddress, serviceDate]);

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

  // Equipment selection handler
  const handleEquipmentSelect = (id: string) => {
    setEquipmentId(id);
    const eq = equipmentOptions.find((e) => e.id === id);
    if (eq) {
      setEquipmentInfo((prev) => ({
        ...prev,
        equipment_type: eq.equipment_type || prev.equipment_type,
        make: eq.make || prev.make,
        model: eq.model || prev.model,
        serial_number: eq.serial_number || prev.serial_number,
      }));
      if (eq.make) setBrandSearch(eq.make);
    }
  };

  // Quote option helpers
  const addQuoteOption = () => {
    const labels = 'ABCDEFGHIJ';
    const next = labels[quoteOptions.length] || `${quoteOptions.length + 1}`;
    setQuoteOptions([...quoteOptions, createEmptyQuoteOption(next)]);
    setExpandedOption(quoteOptions.length);
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
      case 1: return !!(equipmentInfo.equipment_type && equipmentInfo.make);
      case 2: return true; // warranty is always optional
      case 3: return !!(problemFound.trim());
      case 4: return Object.keys(healthRatings).length > 0 || Object.keys(healthExtras).length > 0;
      case 5: return media.length > 0 || pendingFiles.length > 0;
      case 6: return true; // upgrades are optional
      case 7: return quoteOptions.some(o => o.items.some(i => i.description.trim()));
      default: return false;
    }
  };

  // Review/Payment availability
  const hasMedia = media.length > 0 || pendingFiles.length > 0;
  const allStepsVisited = [1, 2, 3, 4, 5, 6, 7].every(s => visitedSteps.has(s));
  const reviewAvailable = selectedOptionIdx !== null && hasMedia && allStepsVisited;
  const paymentAvailable = !!signatureDataUrl;

  // Step navigation
  const goNext = async () => {
    if (step === 1 && !savedReportId) {
      await saveDraft();
    }
    const nextStep = step + 1;
    if (nextStep === 8 && !reviewAvailable) return;
    if (nextStep === 9 && !paymentAvailable) return;
    navigateToStep(Math.min(nextStep, 9));
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

  const renderStep1 = () => {
    const filteredBrands = HVAC_BRANDS.filter(b =>
      b.toLowerCase().includes(brandSearch.toLowerCase())
    ).slice(0, 8);

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Equipment Information</h3>

        {/* Customer selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
          <select
            value={customerId}
            onChange={(e) => handleCustomerChange(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select customer...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.full_name}</option>
            ))}
          </select>
        </div>

        {/* Existing equipment selector */}
        {filteredEquipment.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Existing Equipment (optional)</label>
            <select
              value={equipmentId}
              onChange={(e) => handleEquipmentSelect(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Type</label>
            <select
              value={equipmentInfo.equipment_type}
              onChange={(e) => setEquipmentInfo({ ...equipmentInfo, equipment_type: e.target.value })}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select type...</option>
              {EQUIPMENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Make with brand autocomplete */}
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
              placeholder="Start typing brand..."
            />
            {showBrands && brandSearch.length >= 1 && filteredBrands.length > 0 && (
              <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredBrands.map((brand) => (
                  <button
                    key={brand}
                    type="button"
                    className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700"
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

          <Input label="Model" value={equipmentInfo.model} onChange={(e) => setEquipmentInfo({ ...equipmentInfo, model: e.target.value })} />
          <Input label="Serial Number" value={equipmentInfo.serial_number} onChange={(e) => setEquipmentInfo({ ...equipmentInfo, serial_number: e.target.value })} />
          <Input label="Location" placeholder="e.g. Rooftop, Attic, Garage" value={equipmentInfo.location} onChange={(e) => setEquipmentInfo({ ...equipmentInfo, location: e.target.value })} />
          <Input label="Age (years)" type="number" value={equipmentInfo.age} onChange={(e) => setEquipmentInfo({ ...equipmentInfo, age: e.target.value })} />
          <Input label="Tonnage" value={equipmentInfo.tonnage} onChange={(e) => setEquipmentInfo({ ...equipmentInfo, tonnage: e.target.value })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Refrigerant Type</label>
            <select
              value={equipmentInfo.refrigerant_type}
              onChange={(e) => setEquipmentInfo({ ...equipmentInfo, refrigerant_type: e.target.value })}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select refrigerant...</option>
              {REFRIGERANT_TYPES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
          <div className="flex flex-wrap gap-2">
            {CONDITIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setEquipmentInfo({ ...equipmentInfo, condition: c })}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  equipmentInfo.condition === c
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderStep2 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Warranty Information</h3>

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Has Warranty?</label>
        <button
          type="button"
          onClick={() => setWarrantyInfo({ ...warrantyInfo, has_warranty: !warrantyInfo.has_warranty })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            warrantyInfo.has_warranty ? 'bg-blue-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              warrantyInfo.has_warranty ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {warrantyInfo.has_warranty && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Warranty Type</label>
            <select
              value={warrantyInfo.warranty_type}
              onChange={(e) => setWarrantyInfo({ ...warrantyInfo, warranty_type: e.target.value })}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
          <Input
            label="Provider"
            value={warrantyInfo.provider}
            onChange={(e) => setWarrantyInfo({ ...warrantyInfo, provider: e.target.value })}
          />
          <Input
            label="Expiration Date"
            type="date"
            value={warrantyInfo.expiration}
            onChange={(e) => setWarrantyInfo({ ...warrantyInfo, expiration: e.target.value })}
          />
          <Input
            label="Coverage Details"
            value={warrantyInfo.coverage}
            onChange={(e) => setWarrantyInfo({ ...warrantyInfo, coverage: e.target.value })}
          />
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Warranty Notes</label>
            <textarea
              value={warrantyInfo.notes}
              onChange={(e) => setWarrantyInfo({ ...warrantyInfo, notes: e.target.value })}
              rows={3}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Warranty Lookup Quick Links */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Warranty Lookup</label>
            <div className="flex flex-wrap gap-2">
              {[
                { brand: 'Carrier', url: 'https://www.carrier.com/residential/en/us/warranty-lookup/' },
                { brand: 'Goodman', url: 'https://www.goodmanmfg.com/warranty-lookup' },
                { brand: 'Lennox', url: 'https://www.lennox.com/residential/owners/assistance/warranty/' },
                { brand: 'Rheem', url: 'https://rheem.registermyunit.com/en-US/warranty/brand?brand=rheem' },
                { brand: 'York', url: 'https://wtyprod.jci.com/jci/warranty/public/warrantyreg/index.html' },
              ].map(link => (
                <a
                  key={link.brand}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  {link.brand}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Problem Found</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={problemFound}
          onChange={(e) => setProblemFound(e.target.value)}
          rows={8}
          placeholder="Describe the problem found during inspection..."
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-black placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[200px]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Severity Level</label>
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
        <label className="block text-sm font-medium text-gray-700 mb-2">Symptoms</label>
        <div className="flex flex-wrap gap-2">
          {SYMPTOM_OPTIONS.map((symptom) => (
            <button
              key={symptom}
              type="button"
              onClick={() => toggleSymptom(symptom)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                problemDetails.symptoms.includes(symptom)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {symptom}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Areas Affected</label>
        {problemDetails.areas_affected.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {problemDetails.areas_affected.map(area => (
              <span key={area} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-600 text-white">
                {area}
                <button type="button" onClick={() => setProblemDetails({ ...problemDetails, areas_affected: problemDetails.areas_affected.filter(a => a !== area) })} className="hover:bg-blue-700 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {AREA_SUGGESTIONS
            .filter(a => !problemDetails.areas_affected.includes(a))
            .map(area => (
              <button
                key={area}
                type="button"
                onClick={() => setProblemDetails({ ...problemDetails, areas_affected: [...problemDetails.areas_affected, area] })}
                className="px-2.5 py-1 rounded-full text-xs border bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
              >
                {area}
              </button>
            ))}
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => {
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
        <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
        <p className="text-sm text-gray-500">Rate each component of the {eqType || 'system'}</p>

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
            <div key={comp.key} className="border border-gray-100 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{comp.label}</span>
                <span className="text-xs text-gray-400">
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
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
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
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
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
                  <label className="text-xs text-gray-500 whitespace-nowrap">Amp Reading:</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Amps"
                    value={(extras.amp_reading as string) || ''}
                    onChange={(e) => updateHealthExtra(comp.key, 'amp_reading', e.target.value)}
                    className="w-24 px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-black"
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
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
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
                      extras.is_low ? 'bg-red-100 text-red-700 border-red-300' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {extras.is_low ? 'Low' : 'Low'}
                  </button>
                  {!!extras.is_low && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 block mb-0.5">Current (uF)</label>
                        <input type="number" step="0.1" placeholder="0.0"
                          value={(extras.current_rating as string) || ''}
                          onChange={(e) => updateHealthExtra(comp.key, 'current_rating', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-black" />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 block mb-0.5">MFG Rating (uF)</label>
                        <input type="number" step="0.1" placeholder="0.0"
                          value={(extras.safe_rating as string) || ''}
                          onChange={(e) => updateHealthExtra(comp.key, 'safe_rating', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-black" />
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
                    extras.needs_replacement ? 'bg-red-100 text-red-700 border-red-300' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
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
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
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
                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-black placeholder-gray-400"
              />

              {/* Photo/Video upload for this component */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveHealthMediaKey(comp.key);
                    healthMediaInputRef.current?.click();
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Camera className="w-3 h-3" /> Add Photo/Video
                </button>
                {(healthMedia[comp.key] || []).length > 0 && (
                  <span className="text-xs text-gray-400">{healthMedia[comp.key].length} file(s)</span>
                )}
              </div>
              {(healthMedia[comp.key] || []).length > 0 && (
                <div className="flex gap-2 overflow-x-auto">
                  {healthMedia[comp.key].map((hm, idx) => (
                    <div key={idx} className="relative flex-shrink-0">
                      {hm.type === 'photo' ? (
                        <img src={URL.createObjectURL(hm.file)} alt="" className="w-16 h-16 object-cover rounded" />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">Video</div>
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
      <h3 className="text-lg font-semibold text-gray-900">Other Uploads</h3>

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
          <h4 className="text-sm font-medium text-gray-700">Ready to Upload ({pendingFiles.length})</h4>
          {pendingFiles.map((pf, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              {pf.type === 'photo' ? (
                <img src={URL.createObjectURL(pf.file)} alt="" className="w-16 h-16 object-cover rounded" />
              ) : (
                <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">Video</div>
              )}
              <div className="flex-1">
                <p className="text-sm text-gray-700 truncate">{pf.file.name}</p>
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
          <h4 className="text-sm font-medium text-gray-700">Uploaded ({media.length})</h4>
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
                  <p className="text-xs text-gray-600 mt-1 truncate">{m.caption}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {media.length === 0 && pendingFiles.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-8">No photos or videos yet. Use the buttons above to capture or upload.</p>
      )}
    </div>
  );

  const renderStep6 = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Upgrades & Add-ons</h3>
        <Button size="sm" variant="outline" onClick={addUpgrade}>
          <Plus className="w-4 h-4 mr-1" /> Add Upgrade
        </Button>
      </div>

      {upgrades.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-8">No upgrades added. Click &ldquo;Add Upgrade&rdquo; to suggest accessories or add-ons.</p>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={upg.priority}
                  onChange={(e) => updateUpgrade(idx, { priority: e.target.value as 'low' | 'medium' | 'high' })}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Benefits</label>
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
        <h3 className="text-lg font-semibold text-gray-900">Quote Options</h3>
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
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                  selectedOptionIdx === optIdx ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {opt.label}
                </span>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">{opt.name || 'Unnamed Option'}</span>
                    {opt.is_recommended && (
                      <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded flex-shrink-0">Recommended</span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">{formatCurrency(opt.subtotal)}</span>
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
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </button>

              {/* Option body */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-4 border-t border-gray-100">
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
                          : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {opt.is_recommended ? '✓ Recommended' : 'Set Recommended'}
                    </button>
                  </div>

                  {/* Items */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Items</label>
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
                            className="block w-full rounded-lg border border-gray-300 px-2 py-2 text-sm text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                        <span className="text-sm font-medium text-gray-700 w-20 text-right py-2">
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

                  <div className="flex justify-end text-lg font-bold text-gray-900 pt-2 border-t border-gray-100">
                    Subtotal: {formatCurrency(opt.subtotal)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Customer Selection */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Which option does the customer want?</h4>
        <div className="space-y-2">
          {quoteOptions.map((opt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedOptionIdx(idx)}
              className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
                selectedOptionIdx === idx
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                  selectedOptionIdx === idx ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  {selectedOptionIdx === idx ? <Check className="w-4 h-4" /> : opt.label}
                </span>
                <span className="text-sm font-medium text-gray-900">{opt.name || 'Unnamed Option'}</span>
                {opt.is_recommended && (
                  <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">Recommended</span>
                )}
              </div>
              <span className="text-sm font-bold text-gray-900">{formatCurrency(opt.subtotal)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep8 = () => {
    const selectedCustomer = customers.find((c) => c.id === customerId);
    const selectedOpt = selectedOptionIdx !== null ? quoteOptions[selectedOptionIdx] : null;

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Review & Submit</h3>

        {/* Equipment Summary */}
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">Equipment</h4>
              <button type="button" onClick={() => navigateToStep(1)} className="text-sm text-blue-600 hover:underline">Edit</button>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {selectedCustomer && <p className="col-span-2 text-gray-700"><span className="text-gray-500">Customer:</span> {selectedCustomer.full_name}</p>}
              {equipmentInfo.equipment_type && <p className="text-gray-700"><span className="text-gray-500">Type:</span> {equipmentInfo.equipment_type}</p>}
              {equipmentInfo.make && <p className="text-gray-700"><span className="text-gray-500">Make:</span> {equipmentInfo.make}</p>}
              {equipmentInfo.model && <p className="text-gray-700"><span className="text-gray-500">Model:</span> {equipmentInfo.model}</p>}
              {equipmentInfo.serial_number && <p className="text-gray-700"><span className="text-gray-500">Serial:</span> {equipmentInfo.serial_number}</p>}
              {equipmentInfo.condition && <p className="text-gray-700"><span className="text-gray-500">Condition:</span> {equipmentInfo.condition}</p>}
              {equipmentInfo.tonnage && <p className="text-gray-700"><span className="text-gray-500">Tonnage:</span> {equipmentInfo.tonnage}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Warranty Summary */}
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">Warranty</h4>
              <button type="button" onClick={() => navigateToStep(2)} className="text-sm text-blue-600 hover:underline">Edit</button>
            </div>
            <p className="text-sm text-gray-700">
              {warrantyInfo.has_warranty
                ? `${warrantyInfo.warranty_type || 'Yes'} - ${warrantyInfo.provider || 'Unknown provider'}${warrantyInfo.expiration ? ` (Exp: ${warrantyInfo.expiration})` : ''}`
                : 'No warranty'}
            </p>
          </CardContent>
        </Card>

        {/* Problem Summary */}
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">Problem Found</h4>
              <button type="button" onClick={() => navigateToStep(3)} className="text-sm text-blue-600 hover:underline">Edit</button>
            </div>
            <p className="text-sm text-gray-700">{problemFound || 'No description'}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                problemDetails.severity === 'critical' ? 'bg-red-100 text-red-700' :
                problemDetails.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                problemDetails.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-green-100 text-green-700'
              }`}>
                {problemDetails.severity}
              </span>
              {problemDetails.symptoms.map((s) => (
                <span key={s} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">{s}</span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Health Summary */}
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">System Health</h4>
              <button type="button" onClick={() => navigateToStep(4)} className="text-sm text-blue-600 hover:underline">Edit</button>
            </div>
            {Object.keys(healthRatings).length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(healthRatings).map(([key, val]) => {
                  const rating = HEALTH_RATINGS.find(r => r.value === val);
                  const eqType = equipmentInfo.equipment_type;
                  const comps = SYSTEM_HEALTH_COMPONENTS[eqType] || DEFAULT_HEALTH_COMPONENTS;
                  const comp = comps.find(c => c.key === key);
                  return (
                    <div key={key} className="text-sm">
                      <span className="text-gray-500">{comp?.label || key}:</span>{' '}
                      <span className="font-medium">{rating?.label || val}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No ratings recorded</p>
            )}
          </CardContent>
        </Card>

        {/* Photos Summary */}
        {media.length > 0 && (
          <Card>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">Uploads ({media.length})</h4>
                <button type="button" onClick={() => navigateToStep(5)} className="text-sm text-blue-600 hover:underline">Edit</button>
              </div>
              <div className="flex gap-2 overflow-x-auto">
                {media.slice(0, 6).map((m) => (
                  <div key={m.id} className="flex-shrink-0">
                    {m.type === 'photo' ? (
                      <img src={m.url} alt={m.caption || ''} className="w-20 h-20 object-cover rounded" />
                    ) : (
                      <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">Video</div>
                    )}
                  </div>
                ))}
                {media.length > 6 && (
                  <div className="w-20 h-20 bg-gray-100 rounded flex items-center justify-center text-sm text-gray-500">
                    +{media.length - 6}
                  </div>
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
                <h4 className="font-medium text-gray-900">Upgrades ({upgrades.length})</h4>
                <button type="button" onClick={() => navigateToStep(6)} className="text-sm text-blue-600 hover:underline">Edit</button>
              </div>
              <div className="space-y-1">
                {upgrades.map((u, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-700">{u.name || 'Unnamed'}</span>
                    <span className="font-medium text-gray-900">{formatCurrency(u.price)}</span>
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
                  <span className="w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-xs">
                    {selectedOpt.label}
                  </span>
                  <h4 className="font-medium text-gray-900">Selected: {selectedOpt.name || 'Unnamed Option'}</h4>
                </div>
                <button type="button" onClick={() => navigateToStep(7)} className="text-sm text-blue-600 hover:underline">Edit</button>
              </div>
              <div className="space-y-1.5">
                {selectedOpt.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <div className="flex-1">
                      <span className="text-gray-700">{item.description || 'No description'}</span>
                      <span className="text-gray-400 ml-2 text-xs">
                        {QUOTE_ITEM_CATEGORIES.find(c => c.key === item.category)?.label || item.category}
                      </span>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <span className="text-gray-500 text-xs">{item.quantity} x {formatCurrency(item.unit_price)}</span>
                      <span className="font-medium text-gray-900 ml-2">{formatCurrency(item.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end text-lg font-bold text-gray-900 pt-2 mt-2 border-t border-gray-100">
                Total: {formatCurrency(selectedOpt.subtotal)}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tech Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tech Notes (internal)</label>
          <textarea
            value={techNotes}
            onChange={(e) => setTechNotes(e.target.value)}
            rows={3}
            placeholder="Internal notes for your team..."
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-black placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <Input
          label="Service Date"
          type="date"
          value={serviceDate}
          onChange={(e) => setServiceDate(e.target.value)}
        />

        {/* Signature */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Customer Signature</h4>
          <p className="text-xs text-gray-500">By signing below, the customer accepts the selected quote option.</p>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-[120px] flex items-center justify-center">
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
                <p className="text-sm text-gray-400 mb-2">Draw signature below</p>
                <canvas
                  ref={sigCanvasRef}
                  width={300}
                  height={120}
                  className="border border-gray-200 rounded bg-white touch-none mx-auto"
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
            onClick={() => { if (paymentAvailable) navigateToStep(9); }}
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
          <h3 className="text-xl font-semibold text-gray-900">Payment Complete</h3>
          <p className="text-gray-500">
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
        <h3 className="text-lg font-semibold text-gray-900">Payment</h3>

        {/* Total */}
        <div className="text-center py-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500">Amount Due</p>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
          {selectedOpt && (
            <p className="text-sm text-gray-500 mt-1">Option {selectedOpt.label}: {selectedOpt.name || 'Unnamed'}</p>
          )}
        </div>

        {/* Payment Method Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
          <div className="grid grid-cols-4 gap-2">
            {paymentMethods.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setPaymentMethod(key)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-colors ${
                  paymentMethod === key
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
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
            <label className="block text-sm font-medium text-gray-700">Card Details</label>
            <div
              id="card-container"
              className="min-h-[90px] border border-gray-200 rounded-lg p-3"
            />
            {!squareCard && (
              <p className="text-xs text-gray-400">Loading card form...</p>
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
                <span className="text-sm text-gray-700">Change Due</span>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Note</label>
            <textarea
              value={invoiceNote}
              onChange={(e) => setInvoiceNote(e.target.value)}
              rows={3}
              placeholder="Add any notes for the invoice..."
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-black placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">An invoice will be generated and sent to the customer.</p>
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
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      case 6: return renderStep6();
      case 7: return renderStep7();
      case 8: return renderStep8();
      case 9: return renderStep9();
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
          <h2 className="font-semibold text-gray-900">Service Report</h2>
        </div>
        <Button size="sm" variant="ghost" onClick={() => saveDraft()} isLoading={saving}>
          <Save className="w-4 h-4 mr-1" /> Save
        </Button>
      </div>

      {/* Progress Bar */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {STEPS.map((s, i) => {
            const stepNum = i + 1;
            const isActive = step === stepNum;
            const isCompleted = step > stepNum;
            const isReview = stepNum === 8;
            const isPayment = stepNum === 9;
            const canClick = isPayment ? paymentAvailable : isReview ? reviewAvailable : true;
            return (
              <button
                key={s}
                type="button"
                onClick={() => canClick && navigateToStep(stepNum)}
                disabled={!canClick}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : (isReview && !reviewAvailable) || (isPayment && !paymentAvailable)
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'
                    : visitedSteps.has(stepNum) && isStepComplete(stepNum)
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer'
                    : visitedSteps.has(stepNum) && !isStepComplete(stepNum)
                    ? 'bg-orange-100 text-orange-700 hover:bg-orange-200 cursor-pointer'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer'
                }`}
              >
                {isCompleted ? <Check className="w-3 h-3" /> : <span>{stepNum}</span>}
                <span className="hidden sm:inline">{s}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 max-w-3xl mx-auto w-full">
        {renderCurrentStep()}
      </div>

      {/* Footer Navigation */}
      {step < 8 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white flex-shrink-0">
          <Button variant="ghost" onClick={goBack} disabled={step === 1}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <span className="text-sm text-gray-500">Step {step} of 9</span>
          {step === 7 && !reviewAvailable ? (
            <div className="text-xs text-amber-600 font-medium max-w-[140px] text-right">
              {!hasMedia ? 'Upload photos first' : selectedOptionIdx === null ? 'Select a quote option' : 'Visit all tabs to continue'}
            </div>
          ) : (
            <Button onClick={goNext}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      )}
      {step === 8 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white flex-shrink-0">
          <Button variant="ghost" onClick={goBack}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <span className="text-sm text-gray-500">Step 8 of 9</span>
          <div />
        </div>
      )}
      {step === 9 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white flex-shrink-0">
          <Button variant="ghost" onClick={goBack}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <span className="text-sm text-gray-500">Step 9 of 9</span>
          <div />
        </div>
      )}
    </div>
  );
}
