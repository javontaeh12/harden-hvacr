'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { ArrowLeft, Plus, Trash2, FileText } from 'lucide-react';

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface LaborItem {
  description: string;
  hours: number;
  rate: number;
}

interface WorkOrder {
  id: string;
  description: string;
  customers: { full_name: string; phone: string | null; address: string | null } | null;
}

export default function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [job, setJob] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [quoteError, setQuoteError] = useState('');

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', quantity: 1, unitPrice: 0 },
  ]);
  const [laborItems, setLaborItems] = useState<LaborItem[]>([
    { description: '', hours: 1, rate: 85 },
  ]);
  const [taxRate, setTaxRate] = useState(7);
  const [taxEnabled, setTaxEnabled] = useState(true);
  const { groupId, profile } = useAuth();

  // Load draft from server on mount
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const res = await fetch(`/api/drafts?work_order_id=${id}&draft_type=quote`);
        if (res.ok) {
          const draft = await res.json();
          if (draft?.data) {
            if (draft.data.lineItems?.length) setLineItems(draft.data.lineItems);
            if (draft.data.laborItems?.length) setLaborItems(draft.data.laborItems);
            if (typeof draft.data.taxRate === 'number') setTaxRate(draft.data.taxRate);
            if (typeof draft.data.taxEnabled === 'boolean') setTaxEnabled(draft.data.taxEnabled);
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
      const data = { lineItems, laborItems, taxRate, taxEnabled };
      fetch('/api/drafts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_order_id: id,
          draft_type: 'quote',
          data,
          group_id: groupId,
          updated_by: profile?.id || null,
        }),
      }).catch(() => {});
    }, 1500);
    return () => clearTimeout(timer);
  }, [lineItems, laborItems, taxRate, taxEnabled, id, groupId, profile?.id]);

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

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const addLaborItem = () => {
    setLaborItems([...laborItems, { description: '', hours: 1, rate: 85 }]);
  };

  const removeLaborItem = (index: number) => {
    if (laborItems.length === 1) return;
    setLaborItems(laborItems.filter((_, i) => i !== index));
  };

  const updateLaborItem = (index: number, field: keyof LaborItem, value: string | number) => {
    const updated = [...laborItems];
    updated[index] = { ...updated[index], [field]: value };
    setLaborItems(updated);
  };

  const materialsSubtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  const laborSubtotal = laborItems.reduce(
    (sum, item) => sum + item.hours * item.rate,
    0
  );

  const subtotal = materialsSubtotal + laborSubtotal;
  const tax = taxEnabled ? subtotal * (taxRate / 100) : 0;
  const total = subtotal + tax;

  const handleSendQuote = async () => {
    if (!job) return;
    setQuoteError('');

    const filteredLineItems = lineItems.filter((i) => i.description.trim());
    const filteredLaborItems = laborItems.filter((i) => i.description.trim());

    if (filteredLineItems.length === 0 && filteredLaborItems.length === 0) {
      setQuoteError('Please add at least one line item or labor item with a description.');
      return;
    }

    setSending(true);
    try {
      const quoteData = {
        created_at: new Date().toISOString(),
        line_items: filteredLineItems,
        labor_items: filteredLaborItems,
        tax_rate: taxEnabled ? taxRate : 0,
        materials_subtotal: materialsSubtotal,
        labor_subtotal: laborSubtotal,
        subtotal,
        tax,
        total,
      };

      const res = await fetch('/api/work-orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: job.id, quote: quoteData }),
      });

      if (res.ok) {
        fetch(`/api/drafts?work_order_id=${id}&draft_type=quote`, { method: 'DELETE' }).catch(() => {});
        setSent(true);
      }
    } catch (err) {
      console.error('sendQuote error:', err);
    } finally {
      setSending(false);
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

  if (sent) {
    return (
      <div className="pt-4 pb-6 space-y-4">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-600">
          <ArrowLeft className="w-4 h-4" />
          Back to Job
        </button>
        <div className="bg-white rounded-xl shadow-sm p-6 text-center space-y-3">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <FileText className="w-7 h-7 text-green-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Quote Saved</h2>
          <p className="text-sm text-gray-500">
            Quote for ${total.toFixed(2)} has been saved to this work order.
          </p>
          <button
            onClick={() => router.back()}
            className="mt-2 px-6 py-2.5 rounded-xl bg-ember text-white text-sm font-medium"
          >
            Back to Job
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4 pb-6 space-y-4">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-600">
        <ArrowLeft className="w-4 h-4" />
        Back to Job
      </button>

      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-accent" />
        <h1 className="text-lg font-semibold text-navy">Create Quote</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 space-y-1">
        <h2 className="font-semibold text-gray-900">{job.customers?.full_name || 'Unknown Customer'}</h2>
        {job.customers?.address && (
          <p className="text-sm text-gray-500">{job.customers.address}</p>
        )}
        <p className="text-sm text-gray-400">{job.description}</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-navy text-sm">Materials & Parts</h3>
          <button
            onClick={addLineItem}
            className="flex items-center gap-1 text-xs font-medium text-ember"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Item
          </button>
        </div>

        {lineItems.map((item, index) => (
          <div key={index} className="space-y-2 border border-gray-100 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 font-medium">Item {index + 1}</span>
              {lineItems.length > 1 && (
                <button onClick={() => removeLineItem(index)} className="text-red-400 p-1">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <input
              type="text"
              placeholder="Description"
              value={item.description}
              onChange={(e) => updateLineItem(index, 'description', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-400 mb-1 block">Qty</label>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateLineItem(index, 'quantity', Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-400 mb-1 block">Unit Price</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitPrice || ''}
                  onChange={(e) => updateLineItem(index, 'unitPrice', Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-400 mb-1 block">Total</label>
                <div className="px-3 py-2 rounded-lg bg-gray-50 text-sm text-gray-700 font-medium">
                  ${(item.quantity * item.unitPrice).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-navy text-sm">Labor</h3>
          <button
            onClick={addLaborItem}
            className="flex items-center gap-1 text-xs font-medium text-ember"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Labor
          </button>
        </div>

        {laborItems.map((item, index) => (
          <div key={index} className="space-y-2 border border-gray-100 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 font-medium">Labor {index + 1}</span>
              {laborItems.length > 1 && (
                <button onClick={() => removeLaborItem(index)} className="text-red-400 p-1">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <input
              type="text"
              placeholder="Description (e.g. Diagnostic, Repair)"
              value={item.description}
              onChange={(e) => updateLaborItem(index, 'description', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-400 mb-1 block">Hours</label>
                <input
                  type="number"
                  min="0.25"
                  step="0.25"
                  value={item.hours}
                  onChange={(e) => updateLaborItem(index, 'hours', Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-400 mb-1 block">Rate/hr</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.rate || ''}
                  onChange={(e) => updateLaborItem(index, 'rate', Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-400 mb-1 block">Total</label>
                <div className="px-3 py-2 rounded-lg bg-gray-50 text-sm text-gray-700 font-medium">
                  ${(item.hours * item.rate).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <h3 className="font-semibold text-navy text-sm">Summary</h3>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Materials</span>
            <span>${materialsSubtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Labor</span>
            <span>${laborSubtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span className="font-medium">${subtotal.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTaxEnabled(!taxEnabled)}
                className={`relative w-9 h-5 rounded-full transition ${
                  taxEnabled ? 'bg-accent' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    taxEnabled ? 'translate-x-4' : ''
                  }`}
                />
              </button>
              <span className="text-gray-600">Tax</span>
              {taxEnabled && (
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className="w-16 px-2 py-1 rounded border border-gray-200 text-xs text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
              {taxEnabled && <span className="text-xs text-gray-400">%</span>}
            </div>
            <span>${tax.toFixed(2)}</span>
          </div>

          <div className="flex justify-between pt-2 border-t border-gray-100 text-base font-semibold text-navy">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {quoteError && (
        <p className="text-sm text-red-600 font-medium text-center">{quoteError}</p>
      )}

      <button
        onClick={handleSendQuote}
        disabled={sending || total === 0}
        className="w-full py-3 rounded-xl bg-ember text-white font-semibold hover:bg-ember-dark active:bg-ember-dark disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <FileText className="w-4 h-4" />
        {sending ? 'Saving...' : 'Save Quote'}
      </button>
    </div>
  );
}
