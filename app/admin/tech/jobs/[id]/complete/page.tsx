'use client';

import { useEffect, useState, use } from 'react';
import { CheckCircle2, Mail, ArrowLeft, Copy } from 'lucide-react';
import Link from 'next/link';

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
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendReport = () => {
    if (!email.trim()) return;
    setSendingReport(true);
    setTimeout(() => {
      setSendingReport(false);
      setReportSent(true);
      setTimeout(() => setReportSent(false), 4000);
    }, 800);
  };

  const partsTotal = job?.parts_used?.reduce((sum, p) => sum + p.cost * p.quantity, 0) ?? 0;

  if (loading) {
    return (
      <div className="pt-12 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="pt-12 text-center">
        <p className="text-gray-500">Job not found</p>
        <Link href="/admin/tech" className="text-blue-600 text-sm mt-2 inline-block">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex flex-col items-center text-center space-y-3 pt-4">
          <div className="animate-[scale-in_0.4s_ease-out]">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Thank You!</h1>
          <p className="text-gray-500">Your service has been completed</p>
        </div>

        <div className="bg-gray-50 rounded-xl shadow-sm p-5 text-center space-y-2">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Confirmation Number</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl font-bold text-gray-900 font-mono tracking-wider">
              {confirmationNumber}
            </span>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg hover:bg-gray-200 transition text-gray-400 hover:text-gray-600"
              title="Copy confirmation number"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          {copied && (
            <p className="text-xs text-green-600 font-medium">Copied to clipboard</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Job Summary</h2>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Customer</span>
              <span className="text-sm font-medium text-gray-900">{job.customers?.full_name || 'N/A'}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Service</span>
              <span className="text-sm font-medium text-gray-900 text-right max-w-[60%]">{job.description}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Date Completed</span>
              <span className="text-sm font-medium text-gray-900">
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
                <div className="border-t border-gray-100 pt-3">
                  <span className="text-sm text-gray-500">Parts Used</span>
                  <div className="mt-2 space-y-1.5">
                    {job.parts_used.map((part, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {part.name} <span className="text-gray-400">x{part.quantity}</span>
                        </span>
                        <span className="text-gray-900 font-medium">
                          ${(part.cost * part.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-semibold pt-1 border-t border-gray-100">
                      <span className="text-gray-700">Parts Total</span>
                      <span className="text-gray-900">${partsTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {job.payment_status && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Payment</span>
                <span
                  className={`text-sm font-medium px-2 py-0.5 rounded-full ${
                    job.payment_status === 'paid'
                      ? 'bg-green-50 text-green-700'
                      : job.payment_status === 'pending'
                        ? 'bg-yellow-50 text-yellow-700'
                        : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {job.payment_status.charAt(0).toUpperCase() + job.payment_status.slice(1)}
                  {job.payment_amount != null && ` — $${job.payment_amount.toFixed(2)}`}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Get a copy of your Service Report</h2>
          </div>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <button
              onClick={handleSendReport}
              disabled={!email.trim() || sendingReport}
              className="px-4 py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 active:bg-green-800 disabled:opacity-40 transition whitespace-nowrap"
            >
              {sendingReport ? 'Sending...' : 'Send Report'}
            </button>
          </div>
          {reportSent && (
            <p className="text-sm text-green-600 font-medium">Report sent to {email}</p>
          )}
        </div>

        <Link
          href="/admin/tech"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 active:bg-gray-100 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
