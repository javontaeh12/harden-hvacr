'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import {
  ArrowLeft, Phone, Mail, MapPin, AlertTriangle,
  Clock, Wrench, FileText, Send, CheckCircle2, Loader2,
  DollarSign, MessageSquare,
} from 'lucide-react';

interface ServiceRequest {
  id: string;
  created_at: string;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  zip?: string;
  service_type?: string;
  urgency?: string;
  equipment_info?: string;
  issue: string;
  started_when?: string;
  symptoms?: string[];
  file_url?: string;
  file_urls?: string[];
  membership_interest?: boolean;
  status: string;
  quote_parts_cost?: number;
  quote_labor_cost?: number;
  quote_total?: number;
  quote_notes?: string;
  quote_status?: string;
  deposit_amount?: number;
  square_customer_id?: string;
  square_invoice_id?: string;
  invoice_sent_at?: string;
}

const URGENCY_LABELS: Record<string, string> = {
  emergency: '⚠️ Emergency',
  soon: 'Soon — still running',
  routine: 'Routine / maintenance',
  question: 'Just a question',
};

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [req, setReq] = useState<ServiceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState('');

  const [parts, setParts] = useState('');
  const [labor, setLabor] = useState('');
  const [deposit, setDeposit] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('pending');

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('service_requests')
      .select('*')
      .eq('id', id)
      .single();
    if (!error && data) {
      setReq(data as ServiceRequest);
      setParts(data.quote_parts_cost?.toString() || '');
      setLabor(data.quote_labor_cost?.toString() || '');
      setDeposit(data.deposit_amount?.toString() || '');
      setNotes(data.quote_notes || '');
      setStatus(data.status || 'pending');
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const partsNum = parseFloat(parts) || 0;
  const laborNum = parseFloat(labor) || 0;
  const total = partsNum + laborNum;
  const depositNum = parseFloat(deposit) || 0;

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();
    await supabase.from('service_requests').update({
      quote_parts_cost: partsNum || null,
      quote_labor_cost: laborNum || null,
      quote_total: total || null,
      deposit_amount: depositNum || null,
      quote_notes: notes || null,
      status,
    }).eq('id', id);
    setSaving(false);
    load();
  };

  const handleSendInvoice = async () => {
    if (!total) {
      setSendError('Set quote pricing before sending.');
      return;
    }
    setSending(true);
    setSendError('');
    try {
      // Save first
      const supabase = createClient();
      await supabase.from('service_requests').update({
        quote_parts_cost: partsNum || null,
        quote_labor_cost: laborNum || null,
        quote_total: total,
        deposit_amount: depositNum || null,
        quote_notes: notes || null,
        status: 'quoted',
      }).eq('id', id);

      const res = await fetch('/api/square/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send invoice');
      setSendSuccess(true);
      load();
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Something went wrong');
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!req) {
    return (
      <div className="space-y-4">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <p className="text-red-600">Request not found.</p>
      </div>
    );
  }

  const alreadySent = req.quote_status === 'sent' || req.square_invoice_id;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      <button
        onClick={() => router.push('/admin/requests')}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> All Requests
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{req.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Submitted {new Date(req.created_at).toLocaleString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-white"
        >
          <option value="pending">Pending</option>
          <option value="reviewing">Reviewing</option>
          <option value="quoted">Quoted</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Contact Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" /> Contact
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {(req.phone || req.contact) && (
            <a
              href={`tel:${(req.phone || req.contact || '').replace(/\D/g, '')}`}
              className="flex items-center gap-2 text-[#e65100] hover:underline font-medium"
            >
              <Phone className="w-4 h-4 text-gray-400" />
              {req.phone || req.contact}
            </a>
          )}
          {req.email && (
            <a
              href={`mailto:${req.email}`}
              className="flex items-center gap-2 text-[#e65100] hover:underline font-medium"
            >
              <Mail className="w-4 h-4 text-gray-400" />
              {req.email}
            </a>
          )}
          {(req.address || req.city) && (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent([req.address, req.city, req.zip].filter(Boolean).join(', '))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[#e65100] hover:underline col-span-full"
            >
              <MapPin className="w-4 h-4 text-gray-400" />
              {[req.address, req.city, req.zip].filter(Boolean).join(', ')}
            </a>
          )}
        </div>
        {req.membership_interest && (
          <p className="text-sm text-[#e65100] font-medium">⭐ Interested in priority membership</p>
        )}
      </div>

      {/* Service Details */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <Wrench className="w-4 h-4" /> Service Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {req.service_type && (
            <div>
              <span className="text-gray-500">Type:</span>{' '}
              <span className="font-medium text-gray-900">{req.service_type}</span>
            </div>
          )}
          {req.urgency && (
            <div className="flex items-center gap-1">
              {req.urgency === 'emergency' && <AlertTriangle className="w-4 h-4 text-red-500" />}
              <span className="text-gray-500">Urgency:</span>{' '}
              <span className={`font-medium ${req.urgency === 'emergency' ? 'text-red-600' : 'text-gray-900'}`}>
                {URGENCY_LABELS[req.urgency] || req.urgency}
              </span>
            </div>
          )}
          {req.equipment_info && (
            <div className="col-span-full">
              <span className="text-gray-500">Equipment:</span>{' '}
              <span className="font-medium text-gray-900">{req.equipment_info}</span>
            </div>
          )}
          {req.started_when && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">Started:</span>{' '}
              <span className="font-medium text-gray-900">{req.started_when}</span>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 pt-3">
          <p className="text-gray-500 text-xs mb-1">Issue Description</p>
          <p className="text-gray-900 text-sm leading-relaxed">{req.issue}</p>
        </div>

        {req.symptoms && req.symptoms.length > 0 && (
          <div>
            <p className="text-gray-500 text-xs mb-1">Symptoms</p>
            <div className="flex flex-wrap gap-1.5">
              {req.symptoms.map(s => (
                <span key={s} className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">{s}</span>
              ))}
            </div>
          </div>
        )}

        {(req.file_urls?.length || req.file_url) && (
          <div>
            <p className="text-gray-500 text-xs mb-1">Attachments</p>
            <div className="flex flex-wrap gap-2">
              {(req.file_urls || (req.file_url ? [req.file_url] : [])).map((url, i) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#e65100] hover:underline text-sm"
                >
                  File {i + 1}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quote Pricing */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <DollarSign className="w-4 h-4" /> Quote & Invoice
        </h2>

        {alreadySent && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            Invoice sent via Square on{' '}
            {req.invoice_sent_at
              ? new Date(req.invoice_sent_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
              : 'unknown date'}.
            {req.square_invoice_id && (
              <a
                href={`https://squareup.com/dashboard/invoices/${req.square_invoice_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-green-700 font-medium hover:underline"
              >
                View in Square →
              </a>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parts Cost ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={parts}
              onChange={e => setParts(e.target.value)}
              placeholder="0.00"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e65100]/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Labor Cost ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={labor}
              onChange={e => setLabor(e.target.value)}
              placeholder="0.00"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e65100]/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deposit Required ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={deposit}
              onChange={e => setDeposit(e.target.value)}
              placeholder="e.g. 50.00"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e65100]/30"
            />
            <p className="text-xs text-gray-400 mt-0.5">Leave blank for full balance due</p>
          </div>
          <div className="flex items-end">
            <div className="bg-gray-50 rounded-lg px-4 py-2 w-full text-center">
              <p className="text-xs text-gray-500">Total Quote</p>
              <p className="text-2xl font-bold text-gray-900">${total.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes for Customer</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Explain what's included, any conditions, warranty info..."
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e65100]/30 resize-none"
          />
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? 'Saving…' : 'Save'}
          </button>

          <button
            onClick={handleSendInvoice}
            disabled={sending || !total || sendSuccess}
            className="flex items-center gap-2 bg-[#0a1f3f] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[#0a1f3f]/80 transition-colors disabled:opacity-50 ml-auto"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'Sending…' : sendSuccess ? 'Sent!' : alreadySent ? 'Resend Invoice' : 'Send Invoice via Square'}
          </button>
        </div>

        {sendError && (
          <p className="text-sm text-red-600 mt-1">{sendError}</p>
        )}
        {sendSuccess && (
          <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> Invoice sent! Customer will receive it via Square.
          </p>
        )}

        {!req.phone && !req.email && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
            ⚠️ No phone or email on file — Square invoice cannot be delivered without contact info.
          </p>
        )}
      </div>

      {/* Save button (bottom) */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#e65100] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#e65100]/90 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
