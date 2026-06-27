'use client';

import { useEffect, useState, useMemo, Fragment } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, Input, Select } from '@/components/ui';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/hooks/useToast';
import { CALL_INTENT, CALL_OUTCOME, URGENCY_LEVELS } from '@/lib/status';
import type { BadgeVariant } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import {
  Phone,
  Search,
  Clock,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  DollarSign,
  Filter,
  TrendingUp,
  Headphones,
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

/* ---------- Intent badge variant mapping ---------- */
function getIntentVariant(intent: string): BadgeVariant {
  // Check centralized status config first
  const config = CALL_INTENT[intent];
  if (config) return config.variant as BadgeVariant;

  // Fallback mapping for CSR pipeline names
  const map: Record<string, BadgeVariant> = {
    book_service: 'info',
    get_quote: 'premium',
    check_status: 'info',
    emergency: 'danger',
    general_question: 'default',
    complaint: 'danger',
    cancel: 'default',
    reschedule: 'warning',
    // Legacy
    booking: 'info',
    inquiry: 'default',
    followup: 'info',
    estimate: 'premium',
    maintenance: 'success',
  };
  return map[intent] || 'default';
}

function getIntentLabel(intent: string): string {
  const config = CALL_INTENT[intent];
  if (config) return config.label;
  return intent.replace(/_/g, ' ');
}

/* ---------- Urgency badge variant mapping ---------- */
function getUrgencyVariant(urgency: string): BadgeVariant {
  const config = URGENCY_LEVELS[urgency];
  if (config) return config.variant as BadgeVariant;

  const map: Record<string, BadgeVariant> = {
    routine: 'default',
    soon: 'info',
    urgent: 'warning',
    emergency: 'danger',
    low: 'default',
    medium: 'warning',
    high: 'danger',
    critical: 'danger',
  };
  return map[urgency] || 'default';
}

function getUrgencyLabel(urgency: string): string {
  const config = URGENCY_LEVELS[urgency];
  if (config) return config.label;
  return urgency.replace(/_/g, ' ');
}

/* ---------- Outcome badge variant mapping ---------- */
function getOutcomeVariant(outcome: string): BadgeVariant {
  const config = CALL_OUTCOME[outcome];
  if (config) return config.variant as BadgeVariant;

  const map: Record<string, BadgeVariant> = {
    proposed: 'success',
    booked: 'success',
    escalated: 'danger',
    answered: 'info',
    pending: 'default',
    resolved: 'success',
    voicemail: 'default',
    dropped: 'default',
    transferred: 'info',
    callback_scheduled: 'warning',
    no_action: 'default',
  };
  return map[outcome] || 'default';
}

function getOutcomeLabel(outcome: string): string {
  const config = CALL_OUTCOME[outcome];
  if (config) return config.label;
  return outcome.replace(/_/g, ' ');
}

const INTENT_OPTIONS = [
  { value: '', label: 'All Intents' },
  { value: 'book_service', label: 'Book Service' },
  { value: 'get_quote', label: 'Get Quote' },
  { value: 'check_status', label: 'Check Status' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'general_question', label: 'General Question' },
  { value: 'complaint', label: 'Complaint' },
  { value: 'cancel', label: 'Cancel' },
  { value: 'reschedule', label: 'Reschedule' },
];

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

// Vapi cost estimate: ~$0.05/min (STT + TTS + telephony + model)
function estimateVapiCost(durationSeconds: number | null): number {
  if (!durationSeconds) return 0;
  return (durationSeconds / 60) * 0.05;
}

function formatPhone(phone: string | null): string {
  if (!phone) return 'Unknown';
  // Format US phone numbers
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

export default function CallsPage() {
  const { isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [calls, setCalls] = useState<CallSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [intentFilter, setIntentFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) fetchCalls();
  }, [authLoading]);

  const fetchCalls = async () => {
    try {
      const res = await fetch('/api/call-sessions');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      if (Array.isArray(data)) {
        setCalls(data);
        if (data.length > 0) {
          toast.success('Calls loaded', `${data.length} call session${data.length === 1 ? '' : 's'} found`);
        }
      } else {
        throw new Error(data.error || 'Invalid response');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      toast.error('Failed to load calls', message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCalls = useMemo(() => {
    return calls.filter((call) => {
      const matchesSearch =
        !search ||
        (call.caller_phone && call.caller_phone.includes(search)) ||
        (call.service_type && call.service_type.toLowerCase().includes(search.toLowerCase())) ||
        (call.transcript && call.transcript.toLowerCase().includes(search.toLowerCase()));
      const matchesIntent = !intentFilter || call.intent === intentFilter;
      const matchesDateFrom = !dateFrom || call.created_at >= dateFrom;
      const matchesDateTo = !dateTo || call.created_at <= dateTo + 'T23:59:59';
      return matchesSearch && matchesIntent && matchesDateFrom && matchesDateTo;
    });
  }, [calls, search, intentFilter, dateFrom, dateTo]);

  // Summary stats
  const stats = useMemo(() => {
    const totalCalls = calls.length;
    const totalAiCost = calls.reduce((sum, c) => sum + (Number(c.ai_cost) || 0), 0);
    const totalVapiCost = calls.reduce((sum, c) => sum + estimateVapiCost(c.duration_seconds), 0);
    const totalCost = totalAiCost + totalVapiCost;
    const avgDuration = totalCalls > 0
      ? Math.round(calls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) / totalCalls)
      : 0;
    const avgConfidence = totalCalls > 0
      ? calls.reduce((sum, c) => sum + (Number(c.confidence) || 0), 0) / totalCalls
      : 0;
    const escalated = calls.filter((c) => c.outcome === 'escalated').length;
    return { totalCalls, totalAiCost, totalVapiCost, totalCost, avgDuration, avgConfidence, escalated };
  }, [calls]);

  if (isLoading || authLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800 font-medium">Failed to load call sessions</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0a1f3f] flex items-center gap-2">
            <Headphones className="w-6 h-6 text-[#e55b2b]" />
            AI Call Transcripts
          </h1>
          <p className="text-[#4a6580] mt-1">Review AI CSR call sessions, transcripts, and outcomes</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-[#c8d8ea] p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-[#e55b2b]/10 flex items-center justify-center">
              <Phone className="w-4 h-4 text-[#e55b2b]" />
            </div>
            <span className="text-xs font-bold text-[#4a6580] uppercase">Total Calls</span>
          </div>
          <p className="text-2xl font-bold text-[#0a1f3f]">{stats.totalCalls}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#c8d8ea] p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-[#dceaf8] flex items-center justify-center">
              <Clock className="w-4 h-4 text-[#4a6580]" />
            </div>
            <span className="text-xs font-bold text-[#4a6580] uppercase">Avg Duration</span>
          </div>
          <p className="text-2xl font-bold text-[#0a1f3f]">{formatDuration(stats.avgDuration)}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#c8d8ea] p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-xs font-bold text-[#4a6580] uppercase">Avg Confidence</span>
          </div>
          <p className="text-2xl font-bold text-[#0a1f3f]">{(stats.avgConfidence * 100).toFixed(0)}%</p>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <span className="text-xs font-bold text-red-500 uppercase">Escalated</span>
          </div>
          <p className="text-2xl font-bold text-red-700">{stats.escalated}</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-xs font-bold text-amber-600 uppercase">Total Cost</span>
          </div>
          <p className="text-2xl font-bold text-amber-700">{formatAiCost(stats.totalCost)}</p>
          <div className="flex gap-3 mt-1">
            <span className="text-[10px] text-[#4a6580]">AI: {formatAiCost(stats.totalAiCost)}</span>
            <span className="text-[10px] text-[#4a6580]">Vapi: {formatAiCost(stats.totalVapiCost)}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a6580]" />
          <Input
            placeholder="Search by phone, service type, or transcript..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          options={INTENT_OPTIONS}
          value={intentFilter}
          onChange={(e) => setIntentFilter(e.target.value)}
          className="w-full sm:w-44"
        />
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#4a6580] shrink-0 hidden sm:block" />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full sm:w-40"
          />
          <span className="text-[#4a6580] text-sm">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full sm:w-40"
          />
        </div>
      </div>

      {/* Calls List */}
      {filteredCalls.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={<Phone className="w-8 h-8" />}
              title="No call sessions found"
              description={
                search || intentFilter || dateFrom || dateTo
                  ? 'Try adjusting your filters'
                  : 'Call sessions will appear here as the AI CSR handles calls'
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-xl border border-[#c8d8ea] overflow-hidden">
          {/* Mobile card layout */}
          <div className="sm:hidden divide-y divide-[#c8d8ea]">
            {filteredCalls.map((call) => {
              const isExpanded = expandedId === call.id;
              return (
                <div key={call.id}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : call.id)}
                    className="w-full p-4 text-left hover:bg-[#0a1f3f]/5 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[#0a1f3f]">{formatPhone(call.caller_phone)}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {call.intent && (
                            <Badge variant={getIntentVariant(call.intent)}>
                              {getIntentLabel(call.intent)}
                            </Badge>
                          )}
                          {call.outcome && (
                            <Badge variant={getOutcomeVariant(call.outcome)}>
                              {getOutcomeLabel(call.outcome)}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-[#4a6580] mt-1">
                          {formatDate(call.created_at)} &middot; {formatDuration(call.duration_seconds)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-[#4a6580]" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-[#4a6580]" />
                        )}
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4">
                      <div className="bg-[#dceaf8]/30 rounded-lg p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          {call.service_type && (
                            <div>
                              <span className="text-xs font-bold text-[#4a6580] uppercase">Service</span>
                              <p className="text-sm text-[#0a1f3f]">{call.service_type}</p>
                            </div>
                          )}
                          {call.urgency && (
                            <div>
                              <span className="text-xs font-bold text-[#4a6580] uppercase">Urgency</span>
                              <p className="mt-0.5">
                                <Badge variant={getUrgencyVariant(call.urgency)}>
                                  {getUrgencyLabel(call.urgency)}
                                </Badge>
                              </p>
                            </div>
                          )}
                          {call.confidence !== null && (
                            <div>
                              <span className="text-xs font-bold text-[#4a6580] uppercase">Confidence</span>
                              <p className="text-sm text-[#0a1f3f] font-medium">{(Number(call.confidence) * 100).toFixed(0)}%</p>
                            </div>
                          )}
                          {(call.ai_cost !== null || call.duration_seconds) && (
                            <div>
                              <span className="text-xs font-bold text-[#4a6580] uppercase">Cost</span>
                              <p className="text-sm text-[#0a1f3f] font-mono">{formatAiCost((Number(call.ai_cost) || 0) + estimateVapiCost(call.duration_seconds))}</p>
                              <p className="text-[10px] text-[#4a6580]">AI: {formatAiCost(call.ai_cost)} + Vapi: {formatAiCost(estimateVapiCost(call.duration_seconds))}</p>
                            </div>
                          )}
                        </div>

                        {call.transcript && (
                          <div>
                            <span className="text-xs font-bold text-[#4a6580] uppercase">Transcript Preview</span>
                            <p className="text-sm text-[#0a1f3f] mt-1 line-clamp-4 whitespace-pre-wrap">{call.transcript}</p>
                          </div>
                        )}

                        {call.escalation_reason && (
                          <div className="bg-red-50 rounded-lg p-3">
                            <span className="text-xs font-bold text-red-500 uppercase">Escalation Reason</span>
                            <p className="text-sm text-red-700 mt-1">{call.escalation_reason}</p>
                          </div>
                        )}

                        <Link
                          href={`/admin/calls/${call.id}`}
                          className="inline-flex items-center text-sm font-medium text-[#e55b2b] hover:text-[#e55b2b]/80"
                        >
                          View Full Details &rarr;
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop table layout */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-[#4a6580] border-b bg-[#dceaf8]/50">
                  <th className="px-4 py-3 font-medium">Date/Time</th>
                  <th className="px-4 py-3 font-medium">Caller</th>
                  <th className="px-4 py-3 font-medium">Intent</th>
                  <th className="px-4 py-3 font-medium">Confidence</th>
                  <th className="px-4 py-3 font-medium">Urgency</th>
                  <th className="px-4 py-3 font-medium">Service</th>
                  <th className="px-4 py-3 font-medium">Outcome</th>
                  <th className="px-4 py-3 font-medium">Duration</th>
                  <th className="px-4 py-3 font-medium">Cost</th>
                  <th className="px-4 py-3 font-medium w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c8d8ea]">
                {filteredCalls.map((call) => {
                  const isExpanded = expandedId === call.id;
                  return (
                    <Fragment key={call.id}>
                      <tr
                        className="hover:bg-[#0a1f3f]/5 cursor-pointer transition-colors"
                        onClick={() => setExpandedId(isExpanded ? null : call.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="text-sm text-[#0a1f3f]">{formatDate(call.created_at)}</div>
                          <div className="text-xs text-[#4a6580]">
                            {new Date(call.created_at).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-[#0a1f3f]">{formatPhone(call.caller_phone)}</span>
                        </td>
                        <td className="px-4 py-3">
                          {call.intent ? (
                            <Badge variant={getIntentVariant(call.intent)}>
                              {getIntentLabel(call.intent)}
                            </Badge>
                          ) : (
                            <span className="text-xs text-[#4a6580]">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {call.confidence !== null ? (
                            <div className="flex items-center gap-2">
                              <div className="w-12 bg-gray-100 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${
                                    Number(call.confidence) >= 0.8
                                      ? 'bg-emerald-500'
                                      : Number(call.confidence) >= 0.5
                                        ? 'bg-amber-500'
                                        : 'bg-red-500'
                                  }`}
                                  style={{ width: `${Number(call.confidence) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs text-[#4a6580] font-medium">{(Number(call.confidence) * 100).toFixed(0)}%</span>
                            </div>
                          ) : (
                            <span className="text-xs text-[#4a6580]">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {call.urgency ? (
                            <Badge variant={getUrgencyVariant(call.urgency)}>
                              {getUrgencyLabel(call.urgency)}
                            </Badge>
                          ) : (
                            <span className="text-xs text-[#4a6580]">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-[#4a6580]">{call.service_type || '-'}</span>
                        </td>
                        <td className="px-4 py-3">
                          {call.outcome ? (
                            <Badge variant={getOutcomeVariant(call.outcome)}>
                              {getOutcomeLabel(call.outcome)}
                            </Badge>
                          ) : (
                            <span className="text-xs text-[#4a6580]">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-[#4a6580]">{formatDuration(call.duration_seconds)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-[#4a6580] font-mono">{formatAiCost((Number(call.ai_cost) || 0) + estimateVapiCost(call.duration_seconds))}</span>
                        </td>
                        <td className="px-4 py-3">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-[#4a6580]" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-[#4a6580]" />
                          )}
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td colSpan={10} className="px-4 pb-4 bg-[#dceaf8]/20">
                            <div className="bg-white rounded-lg border border-[#c8d8ea] p-5 mt-1 space-y-4">
                              {/* Call metadata */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {call.ai_model && (
                                  <div>
                                    <span className="text-xs font-bold text-[#4a6580] uppercase">AI Model</span>
                                    <p className="text-sm text-[#0a1f3f] font-mono mt-0.5">{call.ai_model}</p>
                                  </div>
                                )}
                                {call.vapi_call_id && (
                                  <div>
                                    <span className="text-xs font-bold text-[#4a6580] uppercase">Call ID</span>
                                    <p className="text-sm text-[#4a6580] font-mono mt-0.5 truncate">{call.vapi_call_id}</p>
                                  </div>
                                )}
                                {call.recording_url && (
                                  <div>
                                    <span className="text-xs font-bold text-[#4a6580] uppercase">Recording</span>
                                    <p className="mt-0.5">
                                      <a
                                        href={call.recording_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-[#e55b2b] hover:text-[#e55b2b]/80 font-medium"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        Listen &rarr;
                                      </a>
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Transcript preview */}
                              {call.transcript && (
                                <div>
                                  <span className="text-xs font-bold text-[#4a6580] uppercase">Transcript Preview</span>
                                  <p className="text-sm text-[#0a1f3f] mt-1 whitespace-pre-wrap line-clamp-6 bg-[#dceaf8]/30 rounded-lg p-3 font-mono">
                                    {call.transcript}
                                  </p>
                                </div>
                              )}

                              {/* Escalation */}
                              {call.escalation_reason && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                  <span className="text-xs font-bold text-red-500 uppercase flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    Escalation Reason
                                  </span>
                                  <p className="text-sm text-red-700 mt-1">{call.escalation_reason}</p>
                                </div>
                              )}

                              {/* Extracted info preview */}
                              {call.extracted_info && Object.keys(call.extracted_info).length > 0 && (
                                <div>
                                  <span className="text-xs font-bold text-[#4a6580] uppercase">Extracted Info</span>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                                    {Object.entries(call.extracted_info).slice(0, 6).map(([key, value]) => (
                                      <div key={key} className="bg-[#dceaf8]/30 rounded px-2 py-1.5">
                                        <span className="text-[10px] text-[#4a6580] uppercase">{key.replace(/_/g, ' ')}</span>
                                        <p className="text-xs text-[#0a1f3f] truncate">{String(value)}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <Link
                                href={`/admin/calls/${call.id}`}
                                className="inline-flex items-center text-sm font-medium text-[#e55b2b] hover:text-[#e55b2b]/80"
                                onClick={(e) => e.stopPropagation()}
                              >
                                View Full Details &rarr;
                              </Link>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
