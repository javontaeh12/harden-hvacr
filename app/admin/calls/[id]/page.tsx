'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import {
  ArrowLeft,
  Phone,
  Clock,
  AlertTriangle,
  Bot,
  DollarSign,
  User,
  Calendar,
  FileText,
  Headphones,
  ExternalLink,
  Shield,
  Zap,
} from 'lucide-react';

interface CallSession {
  id: string;
  vapi_call_id: string | null;
  caller_phone: string | null;
  customer_id: string | null;
  transcript: string | null;
  intent: string | null;
  confidence: number | null;
  service_type: string | null;
  urgency: string | null;
  extracted_info: Record<string, unknown> | null;
  proposed_slot: Record<string, unknown> | null;
  outcome: string | null;
  escalation_reason: string | null;
  ai_model: string | null;
  ai_cost: number | null;
  duration_seconds: number | null;
  recording_url: string | null;
  created_at: string;
}

interface Customer {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
}

const INTENT_COLORS: Record<string, string> = {
  booking: 'bg-blue-100 text-blue-700',
  emergency: 'bg-red-100 text-red-700',
  inquiry: 'bg-purple-100 text-purple-700',
  complaint: 'bg-orange-100 text-orange-700',
  cancel: 'bg-gray-100 text-gray-700',
  reschedule: 'bg-amber-100 text-amber-700',
  followup: 'bg-teal-100 text-teal-700',
  estimate: 'bg-indigo-100 text-indigo-700',
  maintenance: 'bg-green-100 text-green-700',
};

const URGENCY_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const OUTCOME_COLORS: Record<string, string> = {
  booked: 'bg-green-100 text-green-700',
  escalated: 'bg-red-100 text-red-700',
  resolved: 'bg-blue-100 text-blue-700',
  voicemail: 'bg-gray-100 text-gray-700',
  dropped: 'bg-gray-100 text-gray-500',
  transferred: 'bg-amber-100 text-amber-700',
  callback_scheduled: 'bg-purple-100 text-purple-700',
  no_action: 'bg-gray-100 text-gray-500',
};

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

function formatAiCost(cost: number | null): string {
  if (cost === null || cost === undefined) return '-';
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

function formatPhone(phone: string | null): string {
  if (!phone) return 'Unknown';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

export default function CallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isLoading: authLoading } = useAuth();
  const [call, setCall] = useState<CallSession | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCallDetail = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('call_sessions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setCall(data);

      // Fetch linked customer if customer_id exists
      if (data?.customer_id) {
        const { data: customerData } = await supabase
          .from('customers')
          .select('id, full_name, phone, email, address')
          .eq('id', data.customer_id)
          .single();

        if (customerData) setCustomer(customerData);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!authLoading) fetchCallDetail();
  }, [authLoading, fetchCallDetail]);

  if (isLoading || authLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-32" />
        <div className="h-64 bg-gray-200 rounded-xl" />
        <div className="h-48 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (error || !call) {
    return (
      <div className="space-y-4">
        <Link href="/admin/calls" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Calls
        </Link>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-medium">Failed to load call session</p>
          <p className="text-red-600 text-sm mt-1">{error || 'Call not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back nav + header */}
      <div>
        <Link href="/admin/calls" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Calls
        </Link>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Headphones className="w-6 h-6 text-blue-600" />
              Call Detail
            </h1>
            <p className="text-gray-600 mt-1">
              {formatPhone(call.caller_phone)} &middot; {formatDate(call.created_at)} at{' '}
              {new Date(call.created_at).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {call.intent && (
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${INTENT_COLORS[call.intent] || 'bg-gray-100 text-gray-700'}`}>
                {call.intent}
              </span>
            )}
            {call.outcome && (
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${OUTCOME_COLORS[call.outcome] || 'bg-gray-100 text-gray-700'}`}>
                {call.outcome.replace(/_/g, ' ')}
              </span>
            )}
            {call.urgency && (
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${URGENCY_COLORS[call.urgency] || 'bg-gray-100 text-gray-700'}`}>
                {call.urgency} urgency
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-bold text-gray-500 uppercase">Duration</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatDuration(call.duration_seconds)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-bold text-gray-500 uppercase">Confidence</span>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {call.confidence !== null ? `${(Number(call.confidence) * 100).toFixed(0)}%` : '-'}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-bold text-amber-600 uppercase">AI Cost</span>
          </div>
          <p className="text-xl font-bold text-amber-700">{formatAiCost(call.ai_cost)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Bot className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-bold text-gray-500 uppercase">Model</span>
          </div>
          <p className="text-sm font-bold text-gray-900 font-mono truncate">{call.ai_model || '-'}</p>
        </div>
      </div>

      {/* Escalation alert */}
      {call.escalation_reason && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-bold text-red-800">Call Escalated</h3>
              <p className="text-red-700 mt-1">{call.escalation_reason}</p>
            </div>
          </div>
        </div>
      )}

      {/* Customer info */}
      {customer && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-gray-500" />
              Linked Customer
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {customer.full_name && (
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase">Name</span>
                  <p className="text-sm text-gray-900 mt-0.5">{customer.full_name}</p>
                </div>
              )}
              {customer.phone && (
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase">Phone</span>
                  <p className="text-sm text-gray-900 mt-0.5">{formatPhone(customer.phone)}</p>
                </div>
              )}
              {customer.email && (
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase">Email</span>
                  <p className="text-sm text-gray-900 mt-0.5">{customer.email}</p>
                </div>
              )}
              {customer.address && (
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase">Address</span>
                  <p className="text-sm text-gray-900 mt-0.5">{customer.address}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transcript */}
      <Card>
        <CardContent className="p-5">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-gray-500" />
            Full Transcript
          </h3>
          {call.transcript ? (
            <div className="bg-gray-50 rounded-lg p-4 max-h-[500px] overflow-y-auto">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                {call.transcript}
              </pre>
            </div>
          ) : (
            <p className="text-gray-400 text-sm italic">No transcript available</p>
          )}
        </CardContent>
      </Card>

      {/* Recording */}
      {call.recording_url && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
              <Headphones className="w-4 h-4 text-gray-500" />
              Call Recording
            </h3>
            <div className="flex items-center gap-3">
              <audio controls className="flex-1 max-w-lg">
                <source src={call.recording_url} />
                Your browser does not support the audio element.
              </audio>
              <a
                href={call.recording_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium shrink-0"
              >
                <ExternalLink className="w-4 h-4" />
                Open
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Extracted Info */}
      {call.extracted_info && Object.keys(call.extracted_info).length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-gray-500" />
              Extracted Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(call.extracted_info).map(([key, value]) => (
                <div key={key} className="bg-gray-50 rounded-lg px-4 py-3">
                  <span className="text-xs font-bold text-gray-400 uppercase">
                    {key.replace(/_/g, ' ')}
                  </span>
                  {typeof value === 'object' && value !== null ? (
                    <pre className="text-sm text-gray-700 mt-1 whitespace-pre-wrap font-mono">
                      {JSON.stringify(value, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-sm text-gray-900 mt-0.5">{String(value ?? '-')}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Proposed Slot */}
      {call.proposed_slot && Object.keys(call.proposed_slot).length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-gray-500" />
              Proposed Appointment Slot
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(call.proposed_slot).map(([key, value]) => (
                <div key={key} className="bg-blue-50 rounded-lg px-4 py-3">
                  <span className="text-xs font-bold text-blue-400 uppercase">
                    {key.replace(/_/g, ' ')}
                  </span>
                  {typeof value === 'object' && value !== null ? (
                    <pre className="text-sm text-blue-800 mt-1 whitespace-pre-wrap font-mono">
                      {JSON.stringify(value, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-sm text-blue-900 mt-0.5 font-medium">{String(value ?? '-')}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Call Metadata */}
      <Card>
        <CardContent className="p-5">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
            <Phone className="w-4 h-4 text-gray-500" />
            Call Metadata
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase">Call ID</span>
              <p className="text-sm text-gray-700 font-mono mt-0.5 break-all">{call.id}</p>
            </div>
            {call.vapi_call_id && (
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase">Vapi Call ID</span>
                <p className="text-sm text-gray-700 font-mono mt-0.5 break-all">{call.vapi_call_id}</p>
              </div>
            )}
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase">Created At</span>
              <p className="text-sm text-gray-700 mt-0.5">
                {new Date(call.created_at).toLocaleString('en-US', {
                  dateStyle: 'full',
                  timeStyle: 'medium',
                })}
              </p>
            </div>
            {call.customer_id && (
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase">Customer ID</span>
                <p className="text-sm text-gray-700 font-mono mt-0.5 break-all">{call.customer_id}</p>
              </div>
            )}
            {call.service_type && (
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase">Service Type</span>
                <p className="text-sm text-gray-700 mt-0.5">{call.service_type}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
