'use client';

import { useEffect, useState, useRef, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/hooks/useToast';
import { ArrowLeft, DollarSign, CreditCard, Banknote, FileText, ChevronRight, Loader2, Mail } from 'lucide-react';

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
  const { toast } = useToast();
  const [job, setJob] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [amountTendered, setAmountTendered] = useState('');
  const [checkNumber, setCheckNumber] = useState('');
  const [laborAmount, setLaborAmount] = useState(DEFAULT_LABOR);
  const { groupId, profile } = useAuth();
  const [squareReady, setSquareReady] = useState(false);
  const [cardProcessing, setCardProcessing] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const squareCardRef = useRef<any>(null);
  const cardContainerRef = useRef<HTMLDivElement>(null);

  const initSquareCard = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Square = (window as any).Square;
    if (!Square || !cardContainerRef.current) return;

    try {
      const appId = process.env.NEXT_PUBLIC_SQUARE_APP_ID;
      if (!appId) return;

      const payments = Square.payments(appId, 'LTDTNWDKRJWZ9');
      const card = await payments.card();
      await card.attach(cardContainerRef.current);
      squareCardRef.current = card;
      setSquareReady(true);
    } catch (err) {
      console.error('Square card init error:', err);
      setCardError('Failed to load card form');
    }
  }, []);

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
      // Process Square card payment if card method
      if (method === 'card') {
        if (!squareCardRef.current) {
          setCardError('Card form not loaded');
          toast.error('Card form not loaded', 'Please wait for the card form to initialize.');
          setSaving(false);
          return;
        }

        setCardProcessing(true);
        setCardError(null);

        const tokenResult = await squareCardRef.current.tokenize();
        if (tokenResult.status !== 'OK') {
          const errMsg = tokenResult.errors?.[0]?.message || 'Card tokenization failed';
          setCardError(errMsg);
          toast.error('Card Error', errMsg);
          setSaving(false);
          setCardProcessing(false);
          return;
        }

        // Process payment via Square API
        const squareRes = await fetch('/api/square/payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceId: tokenResult.token,
            amount: Math.round(grandTotal * 100) / 100,
            currency: 'USD',
            workOrderId: job.id,
            customerName: job.customers?.full_name || 'Customer',
            description: `Service payment — ${job.description?.split('\n')[0] || 'HVAC Service'}`,
          }),
        });

        const squareData = await squareRes.json();
        if (!squareData.success) {
          const errMsg = squareData.error || 'Payment failed';
          setCardError(errMsg);
          toast.error('Payment Failed', errMsg);
          setSaving(false);
          setCardProcessing(false);
          return;
        }

        payment.square_payment_id = squareData.paymentId;
        payment.receipt_url = squareData.receiptUrl;
        setCardProcessing(false);
      }

      const res = await fetch('/api/work-orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: job.id, payment }),
      });

      if (res.ok) {
        toast.success('Payment Collected', `$${grandTotal.toFixed(2)} via ${method}`);
        fetch(`/api/drafts?work_order_id=${id}&draft_type=payment`, { method: 'DELETE' }).catch(() => {});
        router.push(`/admin/tech/jobs/${id}/complete`);
      } else {
        toast.error('Payment Error', 'Failed to save payment. Please try again.');
      }
    } catch (err) {
      console.error('payment error:', err);
      setCardError('Payment processing error');
      toast.error('Payment Error', 'An unexpected error occurred.');
    } finally {
      setSaving(false);
      setCardProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="pt-12 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-ember border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="pt-12 text-center">
        <p className="text-steel">Job not found</p>
        <button onClick={() => router.back()} className="text-ember text-sm mt-2">
          Go Back
        </button>
      </div>
    );
  }

  const methods: { key: PaymentMethod; label: string; icon: typeof DollarSign; desc: string }[] = [
    { key: 'cash', label: 'Cash', icon: Banknote, desc: 'Pay with cash' },
    { key: 'check', label: 'Check', icon: FileText, desc: 'Pay by check' },
    { key: 'card', label: 'Card', icon: CreditCard, desc: 'Process via card reader' },
    { key: 'invoice', label: 'Invoice', icon: Mail, desc: 'Send invoice later' },
  ];

  return (
    <div className="pt-4 pb-6 space-y-4">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-steel hover:text-navy transition">
        <ArrowLeft className="w-4 h-4" />
        Back to Job
      </button>

      <div className="flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-ember" />
        <h1 className="text-lg font-semibold text-navy">Collect Payment</h1>
      </div>

      {/* Customer & Summary */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="bg-gradient-to-r from-[#0a1f3f] to-[#122e5c] px-4 py-3">
          <h2 className="font-semibold text-white">{job.customers?.full_name || 'Customer'}</h2>
          <p className="text-sm text-white/70 mt-0.5">{job.description}</p>
        </div>

        <div className="p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-steel">Parts</span>
            <span className="text-navy font-medium">${partsTotal.toFixed(2)}</span>
          </div>

          {(job.parts_used || []).length > 0 && (
            <div className="pl-3 space-y-1">
              {job.parts_used!.map((p, i) => (
                <div key={i} className="flex justify-between text-xs text-steel">
                  <span>{p.name} x{p.quantity}</span>
                  <span>${(p.cost * p.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between text-sm items-center">
            <label className="text-steel">Labor</label>
            <div className="flex items-center gap-1">
              <span className="text-steel text-xs">$</span>
              <input
                type="number"
                value={laborAmount === 0 ? '' : laborAmount}
                onChange={(e) => setLaborAmount(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                className="w-20 text-right text-sm font-medium text-navy rounded-xl border border-border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ember focus:border-ember"
              />
            </div>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-steel">Tax (7%)</span>
            <span className="text-navy font-medium">${tax.toFixed(2)}</span>
          </div>

          <div className="border-t border-border pt-2 flex justify-between">
            <span className="font-semibold text-navy">Total</span>
            <span className="font-bold text-xl text-navy">${grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Payment Method */}
      <div className="bg-white rounded-xl border border-border p-4 space-y-3">
        <h3 className="font-medium text-navy text-sm">Payment Method</h3>
        <div className="grid grid-cols-2 gap-2">
          {methods.map((m) => (
            <button
              key={m.key}
              onClick={() => setMethod(m.key)}
              className={`flex items-center gap-2.5 p-4 rounded-xl border-2 transition text-center ${
                method === m.key
                  ? 'border-ember bg-ember/5'
                  : 'border-border bg-white'
              }`}
            >
              <m.icon className={`w-5 h-5 ${method === m.key ? 'text-ember' : 'text-steel'}`} />
              <div className="text-left">
                <p className={`text-sm font-medium ${method === m.key ? 'text-ember' : 'text-navy'}`}>
                  {m.label}
                </p>
                <p className="text-[10px] text-steel">{m.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Method-specific inputs */}
      {method === 'cash' && (
        <div className="bg-white rounded-xl border border-border p-4 space-y-3">
          <h3 className="font-medium text-navy text-sm">Cash Payment</h3>
          <div>
            <label className="text-sm font-medium text-steel mb-1 block">Amount Tendered</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-steel text-sm">$</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={amountTendered}
                onChange={(e) => setAmountTendered(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-3 rounded-xl border border-border text-lg font-medium text-navy focus:outline-none focus:ring-2 focus:ring-ember focus:border-ember"
              />
            </div>
          </div>
          {amountTendered && parseFloat(amountTendered) >= grandTotal && (
            <div className="flex justify-between items-center bg-emerald-50 text-emerald-700 rounded-xl p-3">
              <span className="text-sm font-medium">Change Due</span>
              <span className="text-lg font-bold">
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
        <div className="bg-white rounded-xl border border-border p-4 space-y-3">
          <h3 className="font-medium text-navy text-sm">Check Payment</h3>
          <div>
            <label className="text-sm font-medium text-steel mb-1 block">Check Number</label>
            <input
              type="text"
              value={checkNumber}
              onChange={(e) => setCheckNumber(e.target.value)}
              placeholder="Enter check number"
              className="w-full px-3 py-3 rounded-xl border border-border text-sm text-navy focus:outline-none focus:ring-2 focus:ring-ember focus:border-ember"
            />
          </div>
        </div>
      )}

      {method === 'card' && (
        <div className="bg-white rounded-xl border border-border p-4 space-y-3">
          <Script
            src="https://web.squarecdn.com/v1/square.js"
            strategy="lazyOnload"
            onLoad={() => initSquareCard()}
          />
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-4 h-4 text-steel" />
            <span className="text-sm font-medium text-navy">Enter card details</span>
          </div>
          <div ref={cardContainerRef} className="min-h-[44px] border border-border rounded-xl p-1" />
          {!squareReady && !cardError && (
            <div className="flex items-center gap-2 text-steel text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading card form...
            </div>
          )}
          {cardError && (
            <p className="text-sm text-red-600">{cardError}</p>
          )}
          {cardProcessing && (
            <div className="flex items-center gap-2 text-ember text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing payment...
            </div>
          )}
        </div>
      )}

      {method === 'invoice' && (
        <div className="bg-white rounded-xl border border-border p-4">
          <div className="flex items-center gap-3 text-steel">
            <Mail className="w-5 h-5" />
            <p className="text-sm">Invoice will be sent to the customer after job completion.</p>
          </div>
        </div>
      )}

      {/* Collect Payment button */}
      <button
        onClick={handleCollectPayment}
        disabled={saving || !canCollect()}
        className="w-full py-4 rounded-xl bg-ember hover:bg-ember/90 active:bg-ember-dark text-white text-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition"
      >
        <DollarSign className="w-5 h-5" />
        {saving ? 'Processing...' : 'Collect Payment'}
        {!saving && <ChevronRight className="w-4 h-4" />}
      </button>
    </div>
  );
}
