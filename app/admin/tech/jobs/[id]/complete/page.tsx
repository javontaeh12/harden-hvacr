'use client';

import { useEffect, useState, use } from 'react';
import { CheckCircle2, Mail, ArrowLeft, Copy, Check } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/useToast';

interface WorkOrder {
  id: string;
  status: string;
  description: string;
  completed_at: string | null;
  parts_used: Array<{ name: string; quantity: number; cost: number }> | null;
  payment_status?: string;
  payment_amount?: number;
  customers: { full_name: string; phone: string | null; address: string | null; email?: string | null } | null;
}

export default function JobCompletePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { toast } = useToast();
  const [job, setJob] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res = await fetch(`/api/work-orders?id=${id}`);
        if (res.ok) {
          const data = await res.json();
          const jobData = Array.isArray(data) ? data[0] : data;
          if (jobData) {
            setJob(jobData as WorkOrder);
            if (jobData.customers?.email) {
              setEmail(jobData.customers.email);
            }
          }
        }
      } catch (err) {
        console.error('fetchJob error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [id]);

  const confirmationNumber = id.substring(0, 8).toUpperCase();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(confirmationNumber);
    setCopied(true);
    toast.success('Copied', 'Confirmation number copied to clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  const [reportError, setReportError] = useState('');

  const handleSendReport = async () => {
    if (!email.trim() || !job) return;
    setSendingReport(true);
    setReportError('');
    try {
      const res = await fetch('/api/work-orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: job.id,
          report_sent: true,
          report_sent_to: email.trim(),
        }),
      });
      if (res.ok) {
        setReportSent(true);
        toast.success('Report Sent', `Service report sent to ${email}`);
        setTimeout(() => setReportSent(false), 4000);
      } else {
        const data = await res.json().catch(() => ({}));
        const errMsg = data.error || 'Failed to send report';
        setReportError(errMsg);
        toast.error('Send Failed', errMsg);
      }
    } catch (err) {
      console.error('sendReport error:', err);
      setReportError('Network error — please try again');
      toast.error('Network Error', 'Please check your connection and try again.');
    } finally {
      setSendingReport(false);
    }
  };

  const partsTotal = job?.parts_used?.reduce((sum, p) => sum + p.cost * p.quantity, 0) ?? 0;

  if (loading) {
    return (
      <div className="pt-12 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="pt-12 text-center">
        <p className="text-steel">Job not found</p>
        <Link href="/admin/tech" className="text-ember text-sm mt-2 inline-block">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-lg space-y-6">
        {/* Celebration Header */}
        <div className="flex flex-col items-center text-center space-y-3 pt-4">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center animate-[scale-in_0.4s_ease-out]">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-navy">Thank You!</h1>
          <div className="w-12 h-1 bg-gold rounded-full" />
          <p className="text-steel">Your service has been completed</p>
        </div>

        {/* Confirmation Number */}
        <div className="bg-ice border border-border rounded-xl p-5 text-center space-y-2">
          <p className="text-xs font-medium text-steel uppercase tracking-wide">Confirmation Number</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl font-bold text-navy font-mono tracking-wider">
              {confirmationNumber}
            </span>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg hover:bg-border/50 transition text-steel hover:text-navy"
              title="Copy confirmation number"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          {copied && (
            <p className="text-xs text-emerald-600 font-medium">Copied to clipboard</p>
          )}
        </div>

        {/* Job Summary */}
        <div className="bg-white rounded-xl border border-border p-5 space-y-4">
          <h2 className="text-sm font-semibold text-navy uppercase tracking-wide">Job Summary</h2>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-steel">Customer</span>
              <span className="text-sm font-medium text-navy">{job.customers?.full_name || 'N/A'}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-steel">Service</span>
              <span className="text-sm font-medium text-navy text-right max-w-[60%]">{job.description}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-steel">Date Completed</span>
              <span className="text-sm font-medium text-navy">
                {job.completed_at
                  ? new Date(job.completed_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'N/A'}
              </span>
            </div>

            {job.parts_used && job.parts_used.length > 0 && (
              <>
                <div className="border-t border-border pt-3">
                  <span className="text-sm text-steel">Parts Used</span>
                  <div className="mt-2 space-y-1.5">
                    {job.parts_used.map((part, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-steel">
                          {part.name} <span className="text-steel/60">x{part.quantity}</span>
                        </span>
                        <span className="text-navy font-medium">
                          ${(part.cost * part.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-semibold pt-1 border-t border-border">
                      <span className="text-navy">Parts Total</span>
                      <span className="text-navy">${partsTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {job.payment_status && (
              <div className="flex justify-between">
                <span className="text-sm text-steel">Payment</span>
                <span
                  className={`text-sm font-medium px-2 py-0.5 rounded-full ${
                    job.payment_status === 'paid'
                      ? 'bg-emerald-50 text-emerald-700'
                      : job.payment_status === 'pending'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-ice text-steel'
                  }`}
                >
                  {job.payment_status.charAt(0).toUpperCase() + job.payment_status.slice(1)}
                  {job.payment_amount != null && ` — $${job.payment_amount.toFixed(2)}`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Send Report */}
        <div className="bg-white rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-steel" />
            <h2 className="text-sm font-semibold text-navy">Get a copy of your Service Report</h2>
          </div>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 px-3 py-2.5 rounded-xl border border-border text-sm text-navy focus:outline-none focus:ring-2 focus:ring-ember focus:border-ember"
            />
            <button
              onClick={handleSendReport}
              disabled={!email.trim() || sendingReport}
              className="px-4 py-2.5 rounded-xl bg-ember text-white text-sm font-medium hover:bg-ember/90 active:bg-ember-dark disabled:opacity-40 transition whitespace-nowrap"
            >
              {sendingReport ? 'Sending...' : 'Send Report'}
            </button>
          </div>
          {reportSent && (
            <p className="text-sm text-emerald-600 font-medium">Report sent to {email}</p>
          )}
          {reportError && (
            <p className="text-sm text-red-600 font-medium">{reportError}</p>
          )}
        </div>

        {/* Back to Dashboard */}
        <Link
          href="/admin/tech"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-navy text-white font-medium hover:bg-navy-light active:bg-navy-light transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
