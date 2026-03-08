'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { ArrowLeft, DollarSign, CreditCard, Banknote, FileText, ChevronRight } from 'lucide-react';

interface WorkOrder {
  id: string;
  status: string;
  description: string;
  parts_used: Array<{ name: string; quantity: number; cost: number }> | null;
  started_at: string | null;
  completed_at: string | null;
  customers: { full_name: string; phone: string | null; address: string | null } | null;
  payment?: {
    method: string;
    parts_total: number;
    labor: number;
    tax: number;
    grand_total: number;
    amount_tendered?: number;
    change_due?: number;
    check_number?: string;
    collected_at: string;
  } | null;
}

type PaymentMethod = 'cash' | 'check' | 'card' | 'invoice';

const TAX_RATE = 0.07;
const DEFAULT_LABOR = 95;

export default function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [job, setJob] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [amountTendered, setAmountTendered] = useState('');
  const [checkNumber, setCheckNumber] = useState('');
  const [laborAmount, setLaborAmount] = useState(DEFAULT_LABOR);
  const { groupId, profile } = useAuth();

  // Load draft from server on mount
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const res = await fetch(`/api/drafts?work_order_id=${id}&draft_type=payment`);
        if (res.ok) {
          const draft = await res.json();
          if (draft?.data) {
            if (draft.data.method) setMethod(draft.data.method);
            if (draft.data.amountTendered) setAmountTendered(draft.data.amountTendered);
            if (draft.data.checkNumber) setCheckNumber(draft.data.checkNumber);
            if (typeof draft.data.laborAmount === 'number') setLaborAmount(draft.data.laborAmount);
          }
        }
      } catch {}
    };
    loadDraft();
  }, [id]);

  // Auto-save draft to server on changes (debounced)
  useEffect(() => {
    if (!groupId) return;
    const timer = setTimeout(() => {
      const data = { method, amountTendered, checkNumber, laborAmount };
      fetch('/api/drafts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_order_id: id,
          draft_type: 'payment',
          data,
          group_id: groupId,
          updated_by: profile?.id || null,
        }),
      }).catch(() => {});
    }, 1500);
    return () => clearTimeout(timer);
  }, [method, amountTendered, checkNumber, laborAmount, id, groupId, profile?.id]);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res = await fetch(`/api/work-orders?id=${id}`);
        if (res.ok) {
          const data = await res.json();
          const jobData = Array.isArray(data) ? data[0] : data;
          if (jobData) setJob(jobData as WorkOrder);
        }
      } catch (err) {
        console.error('fetchJob error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [id]);

  const partsTotal = (job?.parts_used || []).reduce(
    (sum, p) => sum + p.cost * p.quantity,
    0
  );
  const subtotal = partsTotal + laborAmount;
  const tax = subtotal * TAX_RATE;
  const grandTotal = subtotal + tax;
  const changeDue = method === 'cash' && amountTendered ? parseFloat(amountTendered) - grandTotal : 0;

  const canCollect = () => {
    if (laborAmount <= 0) return false;
    if (method === 'cash') {
      const parsed = parseFloat(amountTendered);
      return !isNaN(parsed) && isFinite(parsed) && parsed >= grandTotal;
    }
    if (method === 'check') {
      const trimmed = checkNumber.trim();
      return trimmed.length > 0 && /^\d+$/.test(trimmed);
    }
    return true;
  };

  const handleCollectPayment = async () => {
    if (!job || !canCollect()) return;
    setSaving(true);

    const payment: Record<string, unknown> = {
      method,
      parts_total: partsTotal,
      labor: laborAmount,
      tax: Math.round(tax * 100) / 100,
      grand_total: Math.round(grandTotal * 100) / 100,
      collected_at: new Date().toISOString(),
    };

    if (method === 'cash') {
      payment.amount_tendered = parseFloat(amountTendered);
      payment.change_due = Math.round(changeDue * 100) / 100;
    }
    if (method === 'check') {
      payment.check_number = checkNumber.trim();
    }

    try {
      const res = await fetch('/api/work-orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: job.id, payment }),
      });

      if (res.ok) {
        fetch(`/api/drafts?work_order_id=${id}&draft_type=payment`, { method: 'DELETE' }).catch(() => {});
        router.push(`/admin/tech/jobs/${id}/complete`);
      }
    } catch (err) {
      console.error('payment error:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="pt-12 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="pt-12 text-center">
        <p className="text-gray-500">Job not found</p>
        <button onClick={() => router.back()} className="text-blue-600 text-sm mt-2">
          Go Back
        </button>
      </div>
    );
  }

  const methods: { key: PaymentMethod; label: string; icon: typeof DollarSign; desc: string }[] = [
    { key: 'cash', label: 'Cash', icon: Banknote, desc: 'Pay with cash' },
    { key: 'check', label: 'Check', icon: FileText, desc: 'Pay by check' },
    { key: 'card', label: 'Card', icon: CreditCard, desc: 'Process via card reader' },
    { key: 'invoice', label: 'Invoice', icon: FileText, desc: 'Send invoice later' },
  ];

  return (
    <div className="pt-4 pb-6 space-y-4">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-600">
        <ArrowLeft className="w-4 h-4" />
        Back to Job
      </button>

      <div className="flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-green-600" />
        <h1 className="text-lg font-semibold text-gray-900">Collect Payment</h1>
      </div>

      {/* Customer & Summary */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <h2 className="font-medium text-gray-900">{job.customers?.full_name || 'Customer'}</h2>
        <p className="text-sm text-gray-500">{job.description}</p>

        <div className="border-t border-gray-100 pt-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Parts</span>
            <span className="text-gray-900 font-medium">${partsTotal.toFixed(2)}</span>
          </div>

          {(job.parts_used || []).length > 0 && (
            <div className="pl-3 space-y-1">
              {job.parts_used!.map((p, i) => (
                <div key={i} className="flex justify-between text-xs text-gray-400">
                  <span>{p.name} x{p.quantity}</span>
                  <span>${(p.cost * p.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between text-sm items-center">
            <span className="text-gray-500">Labor</span>
            <div className="flex items-center gap-1">
              <span className="text-gray-400 text-xs">$</span>
              <input
                type="number"
                value={laborAmount}
                onChange={(e) => setLaborAmount(parseFloat(e.target.value) || 0)}
                className="w-20 text-right text-sm font-medium text-gray-900 border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Tax (7%)</span>
            <span className="text-gray-900 font-medium">${tax.toFixed(2)}</span>
          </div>

          <div className="border-t border-gray-200 pt-2 flex justify-between">
            <span className="font-semibold text-gray-900">Total</span>
            <span className="font-bold text-lg text-gray-900">${grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Payment Method */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <h3 className="font-medium text-gray-900 text-sm">Payment Method</h3>
        <div className="grid grid-cols-2 gap-2">
          {methods.map((m) => (
            <button
              key={m.key}
              onClick={() => setMethod(m.key)}
              className={`flex items-center gap-2.5 p-3 rounded-lg border-2 transition text-left ${
                method === m.key
                  ? 'border-accent bg-accent-light'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <m.icon className={`w-4.5 h-4.5 ${method === m.key ? 'text-accent' : 'text-gray-400'}`} />
              <div>
                <p className={`text-sm font-medium ${method === m.key ? 'text-accent' : 'text-gray-700'}`}>
                  {m.label}
                </p>
                <p className="text-[10px] text-gray-400">{m.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Method-specific inputs */}
      {method === 'cash' && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          <h3 className="font-medium text-gray-900 text-sm">Cash Payment</h3>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Amount Tendered</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={amountTendered}
                onChange={(e) => setAmountTendered(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-3 rounded-lg border border-gray-200 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {amountTendered && parseFloat(amountTendered) >= grandTotal && (
            <div className="flex justify-between items-center bg-green-50 rounded-lg p-3">
              <span className="text-sm text-green-700 font-medium">Change Due</span>
              <span className="text-lg font-bold text-green-700">
                ${Math.max(0, changeDue).toFixed(2)}
              </span>
            </div>
          )}
          {amountTendered && parseFloat(amountTendered) < grandTotal && (
            <p className="text-xs text-red-500">Amount is less than total due</p>
          )}
        </div>
      )}

      {method === 'check' && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          <h3 className="font-medium text-gray-900 text-sm">Check Payment</h3>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Check Number</label>
            <input
              type="text"
              value={checkNumber}
              onChange={(e) => setCheckNumber(e.target.value)}
              placeholder="Enter check number"
              className="w-full px-3 py-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {method === 'card' && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3 text-gray-500">
            <CreditCard className="w-5 h-5" />
            <p className="text-sm">Process payment using external card reader, then confirm below.</p>
          </div>
        </div>
      )}

      {method === 'invoice' && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3 text-gray-500">
            <FileText className="w-5 h-5" />
            <p className="text-sm">Invoice will be sent to the customer after job completion.</p>
          </div>
        </div>
      )}

      {/* Collect Payment button */}
      <button
        onClick={handleCollectPayment}
        disabled={saving || !canCollect()}
        className="w-full py-3.5 rounded-xl bg-ember text-white font-semibold hover:bg-ember-dark active:bg-ember-dark disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <DollarSign className="w-5 h-5" />
        {saving ? 'Processing...' : 'Collect Payment'}
        {!saving && <ChevronRight className="w-4 h-4" />}
      </button>
    </div>
  );
}
