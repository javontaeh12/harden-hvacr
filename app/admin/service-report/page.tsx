'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Button, Input } from '@/components/ui';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/hooks/useToast';
import type { BadgeVariant } from '@/components/ui/Badge';
import { formatDate, formatCurrency } from '@/lib/utils';
import { ServiceReportBuilder } from '@/components/ServiceReportBuilder';
import {
  FileText,
  Plus,
  Search,
  Send,
  CheckCircle2,
  Clock,
  Eye,
  Trash2,
  Edit3,
  Link2,
  Loader2,
} from 'lucide-react';

interface ServiceReportRow {
  id: string;
  customer_id: string | null;
  status: string;
  customer_name: string | null;
  equipment_info: { equipment_type: string; make: string; model: string } | null;
  repair_options: Array<{ subtotal: number; is_recommended: boolean; name: string }> | null;
  service_date: string;
  share_token: string | null;
  created_at: string;
  customers?: { full_name: string } | null;
}

/* ---------- Status config using Badge variants ---------- */

interface ReportStatusConfig {
  label: string;
  variant: BadgeVariant;
  icon: typeof Clock;
  cardBg: string;
  cardBorder: string;
  iconColor: string;
  activeBg: string;
}

const STATUS_CONFIG: Record<string, ReportStatusConfig> = {
  draft: { label: 'Draft', variant: 'default', icon: Edit3, cardBg: 'bg-[#0a1f3f]/5', cardBorder: 'border-[#4a6580]/20', iconColor: 'text-[#4a6580]', activeBg: 'bg-[#0a1f3f]/10' },
  in_progress: { label: 'In Progress', variant: 'info', icon: Clock, cardBg: 'bg-[#42a5f5]/5', cardBorder: 'border-[#42a5f5]/20', iconColor: 'text-[#42a5f5]', activeBg: 'bg-[#42a5f5]/10' },
  completed: { label: 'Completed', variant: 'success', icon: CheckCircle2, cardBg: 'bg-emerald-50', cardBorder: 'border-emerald-200', iconColor: 'text-emerald-600', activeBg: 'bg-emerald-100' },
  sent: { label: 'Sent', variant: 'premium', icon: Send, cardBg: 'bg-[#f5a623]/5', cardBorder: 'border-[#f5a623]/20', iconColor: 'text-[#f5a623]', activeBg: 'bg-[#f5a623]/10' },
};

export default function ServiceReportPage() {
  const { groupId, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<ServiceReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && groupId) fetchReports();
  }, [authLoading, groupId]);

  const fetchReports = async () => {
    setIsLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('service_reports')
      .select('id, customer_id, status, customer_name, equipment_info, repair_options, service_date, share_token, created_at, customers(full_name)')
      .eq('group_id', groupId!)
      .order('created_at', { ascending: false });
    // Supabase returns joined table as array; normalize to single object
    const normalized = (data || []).map((r: Record<string, unknown>) => ({
      ...r,
      customers: Array.isArray(r.customers) ? r.customers[0] || null : r.customers,
    })) as ServiceReportRow[];
    setReports(normalized);
    setIsLoading(false);
  };

  const deleteReport = async (id: string) => {
    if (!confirm('Delete this service report?')) return;
    const supabase = createClient();
    await supabase.from('service_report_media').delete().eq('service_report_id', id);
    await supabase.from('service_reports').delete().eq('id', id);
    setReports(reports.filter((r) => r.id !== id));
    toast.success('Report deleted', 'The service report has been removed');
  };

  const copyShareLink = (token: string, id: string) => {
    const url = `${window.location.origin}/report/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success('Link copied', 'Share link copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const markAsSent = async (id: string) => {
    const supabase = createClient();
    await supabase.from('service_reports').update({ status: 'sent', updated_at: new Date().toISOString() } as Record<string, unknown>).eq('id', id);
    setReports(reports.map((r) => (r.id === id ? { ...r, status: 'sent' } : r)));
    toast.success('Report sent', 'Status updated to Sent');
  };

  const filtered = reports.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      const name = (r.customers?.full_name || r.customer_name || '').toLowerCase();
      const equip = (r.equipment_info?.equipment_type || '').toLowerCase();
      return name.includes(s) || equip.includes(s);
    }
    return true;
  });

  const statusCounts = reports.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  const getRecommendedTotal = (opts: ServiceReportRow['repair_options']) => {
    if (!opts) return null;
    const rec = opts.find((o) => o.is_recommended);
    return rec ? rec.subtotal : opts[0]?.subtotal || null;
  };

  if (isBuilderOpen || editingReportId !== null) {
    return (
      <ServiceReportBuilder
        reportId={editingReportId}
        onClose={() => {
          setIsBuilderOpen(false);
          setEditingReportId(null);
        }}
        onSaved={fetchReports}
      />
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0a1f3f]">Service Reports</h1>
          <p className="text-sm text-[#4a6580] mt-1">Build and share professional service reports</p>
        </div>
        <Button onClick={() => setIsBuilderOpen(true)} className="shadow-sm">
          <Plus className="w-4 h-4 mr-2" /> New Report
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => {
          const Icon = config.icon;
          const isActive = statusFilter === key;
          return (
            <button
              key={key}
              onClick={() => setStatusFilter(isActive ? '' : key)}
              className={`relative p-4 rounded-xl border text-left transition-all duration-200 shadow-sm hover:shadow-md ${
                isActive
                  ? `${config.activeBg} ${config.cardBorder} ring-2 ring-[#e55b2b]/30`
                  : `${config.cardBg} ${config.cardBorder} hover:border-[#c8d8ea]`
              }`}
            >
              <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg mb-3 ${isActive ? 'bg-white/80' : 'bg-white/60'}`}>
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#e55b2b]' : config.iconColor}`} />
              </div>
              <p className="text-2xl font-bold text-[#0a1f3f] leading-none mb-1">{statusCounts[key] || 0}</p>
              <p className={`text-sm font-medium ${isActive ? 'text-[#e55b2b]' : 'text-[#4a6580]'}`}>{config.label}</p>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a6580]" />
          <Input
            placeholder="Search by customer or equipment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="!pl-10 !border-[#c8d8ea] focus:!ring-[#e55b2b] focus:!border-[#e55b2b]"
          />
        </div>
      </div>

      {/* Reports List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-[#0a1f3f] animate-spin mb-3" />
          <p className="text-sm text-[#4a6580]">Loading reports...</p>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-8 h-8" />}
          title={search || statusFilter ? 'No reports match your filters' : 'No service reports yet'}
          description={search || statusFilter ? 'Try adjusting your search or filter criteria' : 'Create your first professional service report to get started'}
          action={
            !search && !statusFilter ? (
              <Button onClick={() => setIsBuilderOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Create Your First Report
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((report) => {
            const config = STATUS_CONFIG[report.status] || STATUS_CONFIG.draft;
            const Icon = config.icon;
            const total = getRecommendedTotal(report.repair_options);
            return (
              <div key={report.id} className="bg-white rounded-xl border border-[#c8d8ea] shadow-sm hover:shadow-md transition-all duration-200 group">
                <div className="px-4 sm:px-5 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="font-semibold text-[#0a1f3f] truncate">
                          {report.customers?.full_name || report.customer_name || 'No Customer'}
                        </h3>
                        <Badge variant={config.variant} icon={<Icon className="w-3 h-3" />}>
                          {config.label}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#4a6580]">
                        {report.equipment_info?.equipment_type && (
                          <span className="text-[#4a6580]">{report.equipment_info.equipment_type}{report.equipment_info.make ? ` - ${report.equipment_info.make}` : ''}</span>
                        )}
                        <span>{formatDate(report.service_date || report.created_at)}</span>
                        {total !== null && <span className="font-semibold text-[#0a1f3f]">{formatCurrency(total)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
                      {report.share_token && (
                        <>
                          <a
                            href={`/report/${report.share_token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-[#4a6580] hover:text-[#0a1f3f] hover:bg-[#dceaf8] rounded-lg transition-colors"
                            title="View Report"
                          >
                            <Eye className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => copyShareLink(report.share_token!, report.id)}
                            className="p-2 text-[#4a6580] hover:text-[#e55b2b] hover:bg-[#e55b2b]/10 rounded-lg transition-colors"
                            title="Copy Link"
                          >
                            {copiedId === report.id ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Link2 className="w-4 h-4" />}
                          </button>
                          {report.status === 'completed' && (
                            <button
                              onClick={() => markAsSent(report.id)}
                              className="p-2 text-[#4a6580] hover:text-[#f5a623] hover:bg-[#f5a623]/10 rounded-lg transition-colors"
                              title="Mark as Sent"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                      <button
                        onClick={() => setEditingReportId(report.id)}
                        className="p-2 text-[#4a6580] hover:text-[#e55b2b] hover:bg-[#e55b2b]/10 rounded-lg transition-colors"
                        title={report.status === 'draft' ? 'Resume' : 'Edit'}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteReport(report.id)}
                        className="p-2 text-[#4a6580] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
