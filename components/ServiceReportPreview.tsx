'use client';

import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import type { BadgeVariant } from '@/components/ui/Badge';
import {
  Snowflake,
  Shield,
  Zap,
  Thermometer,
  Clock,
  Heart,
  CheckCircle2,
  Star,
  AlertTriangle,
  Camera,
  Printer,
  Wrench,
  User,
  Settings,
  Crown,
  Eye,
  Play,
  ArrowUpCircle,
  FileText,
} from 'lucide-react';
import type { ServiceReport, ServiceReportMedia } from '@/types';

interface ServiceReportPreviewProps {
  report: ServiceReport;
  media: ServiceReportMedia[];
  groupName?: string;
  showActions?: boolean;
}

const IMPACT_ICONS: Record<string, typeof Zap> = {
  efficiency: Zap,
  safety: Shield,
  comfort: Thermometer,
  lifespan: Clock,
  energy_cost: Heart,
};

const IMPACT_LABELS: Record<string, string> = {
  efficiency: 'Energy Efficiency',
  safety: 'Safety',
  comfort: 'Comfort',
  lifespan: 'Equipment Lifespan',
  energy_cost: 'Energy Cost',
};

function ImpactBar({ value, label, iconKey }: { value: number; label: string; iconKey: string }) {
  const Icon = IMPACT_ICONS[iconKey] || Zap;
  // LOW = good (green), HIGH = bad (red) — 1-2 green, 3 yellow, 4-5 red
  const barColor = value <= 2 ? 'bg-emerald-500' : value <= 3 ? 'bg-amber-400' : 'bg-red-500';
  const iconColor = value <= 2 ? 'text-emerald-600' : value <= 3 ? 'text-amber-600' : 'text-red-500';
  const labelSuffix = value <= 2 ? 'Good' : value <= 3 ? 'Fair' : 'Concerning';
  const labelColor = value <= 2 ? 'text-emerald-700' : value <= 3 ? 'text-amber-700' : 'text-red-700';
  return (
    <div className="flex items-center gap-4 py-2">
      <div className="w-9 h-9 rounded-lg bg-[#dceaf8] flex items-center justify-center flex-shrink-0">
        <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
      </div>
      <div className="flex-1">
        <div className="flex justify-between text-sm mb-1.5">
          <span className="font-medium text-[#0a1f3f]">{label}</span>
          <span className={`text-xs font-semibold ${labelColor}`}>{value}/5 &middot; {labelSuffix}</span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${(value / 5) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

export function ServiceReportPreview({ report, media, groupName, showActions = true }: ServiceReportPreviewProps) {
  const photos = media.filter((m) => m.type === 'photo');
  const videos = media.filter((m) => m.type === 'video');

  const severityBadgeVariant: Record<string, BadgeVariant> = {
    low: 'success',
    medium: 'warning',
    high: 'danger',
    critical: 'danger',
  };

  const handlePrint = () => window.print();

  const reportNumber = report.id ? report.id.slice(0, 8).toUpperCase() : '--------';

  return (
    <div className="max-w-4xl mx-auto" id="service-report-preview">
      {/* ── Header ── */}
      <div className="relative bg-gradient-to-r from-[#0a1f3f] to-[#122e5c] text-white rounded-t-2xl px-8 py-7 overflow-hidden print:bg-[#0a1f3f] print:text-white">
        {/* Subtle grid texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.5) 10px, rgba(255,255,255,0.5) 11px)',
          }}
        />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/10">
              <Wrench className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{groupName || 'HVAC Service'}</h1>
              <p className="text-[#f5a623] text-sm font-semibold tracking-wide mt-0.5">Service Report</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white/50 text-xs uppercase tracking-widest font-medium">Report No.</p>
            <p className="font-mono font-bold text-sm tracking-wide text-white/90 mt-0.5">{reportNumber}</p>
            <p className="text-white/50 text-xs mt-2 uppercase tracking-wider">Service Date</p>
            <p className="font-semibold text-sm text-white/90">
              {report.service_date
                ? new Date(report.service_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-t-0 border-gray-200 rounded-b-2xl shadow-sm">
        {/* ── Customer & Equipment ── */}
        <div className="px-8 py-6 border-b border-gray-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3 border-l-4 border-[#0a1f3f] pl-3">
                <User className="w-4 h-4 text-[#4a6580]" />
                <h2 className="text-xs font-bold text-[#4a6580] uppercase tracking-widest">Customer</h2>
              </div>
              <div className="pl-5">
                <p className="font-semibold text-[#0a1f3f] text-base">{report.customer_name || 'N/A'}</p>
                {report.customer_address && <p className="text-sm text-[#4a6580] mt-0.5">{report.customer_address}</p>}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3 border-l-4 border-[#0a1f3f] pl-3">
                <Settings className="w-4 h-4 text-[#4a6580]" />
                <h2 className="text-xs font-bold text-[#4a6580] uppercase tracking-widest">Equipment</h2>
              </div>
              <div className="pl-5">
                <p className="font-semibold text-[#0a1f3f] text-base">{report.equipment_info?.equipment_type || 'N/A'}</p>
                <div className="text-sm text-[#4a6580] space-y-0.5 mt-0.5">
                  {report.equipment_info?.make && <p>{report.equipment_info.make} {report.equipment_info.model}</p>}
                  {report.equipment_info?.serial_number && <p>S/N: {report.equipment_info.serial_number}</p>}
                  {report.equipment_info?.tonnage && <p>Tonnage: {report.equipment_info.tonnage}</p>}
                  {report.equipment_info?.condition && <p>Condition: {report.equipment_info.condition}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Warranty ── */}
        {report.warranty_info?.has_warranty && (
          <div className="mx-8 my-4 rounded-xl bg-[#f5a623]/10 border border-[#f5a623]/30 px-5 py-4">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-7 h-7 rounded-full bg-[#f5a623]/20 flex items-center justify-center">
                <Shield className="w-4 h-4 text-[#f5a623]" />
              </div>
              <h2 className="text-sm font-bold text-[#0a1f3f]">Warranty Active</h2>
            </div>
            <p className="text-sm text-[#4a6580] ml-9.5">
              {report.warranty_info.warranty_type && <span className="capitalize font-medium">{report.warranty_info.warranty_type}</span>}
              {report.warranty_info.provider && <span> by {report.warranty_info.provider}</span>}
              {report.warranty_info.expiration && <span> (Expires: {report.warranty_info.expiration})</span>}
            </p>
            {report.warranty_info.coverage && <p className="text-sm text-[#4a6580] mt-1 ml-9.5">Coverage: {report.warranty_info.coverage}</p>}
          </div>
        )}

        {/* ── AI Customer Summary (hero section) ── */}
        {report.ai_customer_summary && (
          <div className="px-8 py-6 border-b border-gray-100">
            <div className="bg-white rounded-xl shadow-[0_1px_8px_rgba(10,31,63,0.08)] border border-gray-100 overflow-hidden">
              {/* Gradient left accent */}
              <div className="flex">
                <div className="w-1.5 flex-shrink-0 bg-gradient-to-b from-[#0a1f3f] to-[#e55b2b]" />
                <div className="flex-1 p-6 space-y-5">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-5 h-5 text-[#0a1f3f]" />
                      <h2 className="text-xl font-bold text-[#0a1f3f]">What We Found</h2>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{report.ai_customer_summary.findings_summary}</p>
                  </div>
                  <div className="bg-amber-50/70 border border-amber-200/60 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <h3 className="text-sm font-bold text-amber-800">Why This Matters</h3>
                    </div>
                    <p className="text-sm text-amber-900/80 leading-relaxed">{report.ai_customer_summary.urgency_explanation}</p>
                  </div>
                  {report.ai_customer_summary.recommendation && (
                    <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <h3 className="text-sm font-bold text-emerald-800">Our Recommendation</h3>
                      </div>
                      <p className="text-sm text-emerald-900/80 leading-relaxed">{report.ai_customer_summary.recommendation}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Problem Found ── */}
        <div className="px-8 py-6 border-b border-gray-100">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[#e55b2b]/10 flex items-center justify-center">
              <AlertTriangle className="w-4.5 h-4.5 text-[#e55b2b]" />
            </div>
            <h2 className="text-lg font-bold text-[#0a1f3f]">Problem Found</h2>
            <Badge
              variant={severityBadgeVariant[report.problem_details?.severity || 'medium'] || 'warning'}
              size="sm"
              dot
            >
              {report.problem_details?.severity || 'medium'}
            </Badge>
          </div>
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{report.problem_found || 'No description provided.'}</p>
          {report.problem_details?.symptoms?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {report.problem_details.symptoms.map((s: string) => (
                <span key={s} className="px-3 py-1 bg-[#dceaf8] text-[#0a1f3f] rounded-full text-xs font-medium">{s}</span>
              ))}
            </div>
          )}
          {report.problem_details?.area_affected && (
            <p className="text-sm text-[#4a6580] mt-3">Area Affected: {report.problem_details.area_affected}</p>
          )}
        </div>

        {/* ── System Impact ── */}
        {(report.system_impact || report.impact_details) && (
          <div className="px-8 py-6 border-b border-gray-100">
            <div className="bg-[#f8fafc] rounded-xl border border-gray-100 p-6">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[#0a1f3f]/5 flex items-center justify-center">
                  <Zap className="w-4.5 h-4.5 text-[#0a1f3f]" />
                </div>
                <h2 className="text-lg font-bold text-[#0a1f3f]">System Impact</h2>
              </div>
              {report.system_impact && <p className="text-gray-700 mb-5 leading-relaxed">{report.system_impact}</p>}
              {report.impact_details && (
                <div className="space-y-1">
                  {Object.entries(IMPACT_LABELS).map(([key, label]) => (
                    <ImpactBar
                      key={key}
                      iconKey={key}
                      label={label}
                      value={report.impact_details?.[key as keyof typeof report.impact_details] || 0}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Repair Options (the money section) ── */}
        {report.repair_options?.length > 0 && (
          <div className="px-8 py-6 border-b border-gray-100">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg bg-[#0a1f3f]/5 flex items-center justify-center">
                <Wrench className="w-4.5 h-4.5 text-[#0a1f3f]" />
              </div>
              <h2 className="text-lg font-bold text-[#0a1f3f]">Repair Options</h2>
            </div>
            <div className={`grid gap-5 ${report.repair_options.length >= 2 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
              {report.repair_options.map((opt, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl overflow-hidden flex flex-col ${
                    opt.is_recommended
                      ? 'border-2 border-[#f5a623] shadow-lg shadow-[#f5a623]/10 relative'
                      : 'border border-gray-200 shadow-sm'
                  }`}
                >
                  {/* Recommended banner */}
                  {opt.is_recommended && (
                    <div className="bg-gradient-to-r from-[#f5a623] to-[#f0c060] px-4 py-2.5 flex items-center gap-2">
                      <Crown className="w-4 h-4 text-white" />
                      <span className="text-sm font-bold text-white tracking-wide">Best Value</span>
                    </div>
                  )}
                  <div className="p-5 flex-1 flex flex-col">
                    {/* Title + Price row */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                            opt.is_recommended
                              ? 'bg-[#0a1f3f] text-[#f5a623]'
                              : 'bg-[#0a1f3f] text-white'
                          }`}
                        >
                          {opt.label}
                        </span>
                        <h3 className="font-bold text-[#0a1f3f] text-base">{opt.name || `Option ${opt.label}`}</h3>
                      </div>
                      <span className="text-2xl font-extrabold text-[#e55b2b] whitespace-nowrap ml-2">{formatCurrency(opt.subtotal)}</span>
                    </div>

                    {/* Line items table */}
                    <div className="overflow-x-auto mb-4 flex-1">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b-2 border-gray-100">
                            <th className="text-left py-2 text-[#4a6580] font-semibold text-xs uppercase tracking-wider">Item</th>
                            <th className="text-center py-2 text-[#4a6580] font-semibold text-xs uppercase tracking-wider w-16">Type</th>
                            <th className="text-center py-2 text-[#4a6580] font-semibold text-xs uppercase tracking-wider w-12">Qty</th>
                            <th className="text-right py-2 text-[#4a6580] font-semibold text-xs uppercase tracking-wider w-20">Price</th>
                            <th className="text-right py-2 text-[#4a6580] font-semibold text-xs uppercase tracking-wider w-20">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {opt.line_items.map((li, liIdx) => (
                            <tr key={liIdx} className={liIdx % 2 === 0 ? 'bg-gray-50/60' : 'bg-white'}>
                              <td className="py-2 px-1 text-gray-800">{li.description}</td>
                              <td className="py-2 px-1 text-center text-[#4a6580] capitalize text-xs">{li.type.replace('_', ' ')}</td>
                              <td className="py-2 px-1 text-center text-gray-800">{li.quantity}</td>
                              <td className="py-2 px-1 text-right text-gray-700">{formatCurrency(li.unit_price)}</td>
                              <td className="py-2 px-1 text-right font-semibold text-[#0a1f3f]">{formatCurrency(li.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Benefits */}
                    {opt.benefits?.length > 0 && opt.benefits.some((b: string) => b) && (
                      <div className="mb-3">
                        <ul className="space-y-1.5">
                          {opt.benefits.filter((b: string) => b).map((b: string, bIdx: number) => (
                            <li key={bIdx} className="flex items-start gap-2 text-sm text-gray-700">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                              {b}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {opt.timeline && (
                      <p className="text-sm text-[#4a6580] flex items-center gap-1.5 pt-2 border-t border-gray-100 mt-auto">
                        <Clock className="w-3.5 h-3.5" /> Timeline: {opt.timeline}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Upgrades ── */}
        {report.upgrades?.length > 0 && (
          <div className="px-8 py-6 border-b border-gray-100">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#0a1f3f]/5 flex items-center justify-center">
                <ArrowUpCircle className="w-4.5 h-4.5 text-[#0a1f3f]" />
              </div>
              <h2 className="text-lg font-bold text-[#0a1f3f]">Recommended Upgrades</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {report.upgrades.map((upg, idx) => {
                const priorityVariant: BadgeVariant =
                  upg.priority === 'high' ? 'danger' : upg.priority === 'medium' ? 'warning' : 'success';
                return (
                  <div key={idx} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow bg-white">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-[#dceaf8] flex items-center justify-center flex-shrink-0">
                          <Star className="w-4.5 h-4.5 text-[#0a1f3f]" />
                        </div>
                        <h3 className="font-semibold text-[#0a1f3f] text-sm">{upg.name}</h3>
                      </div>
                      <span className="font-bold text-[#e55b2b] text-base whitespace-nowrap ml-2">{formatCurrency(upg.price)}</span>
                    </div>
                    <div className="ml-11.5 mb-2">
                      <Badge variant={priorityVariant} size="sm" dot>
                        {upg.priority} priority
                      </Badge>
                    </div>
                    {upg.benefits?.length > 0 && upg.benefits.some((b: string) => b) && (
                      <ul className="space-y-1 ml-11.5">
                        {upg.benefits.filter((b: string) => b).map((b: string, bIdx: number) => (
                          <li key={bIdx} className="flex items-start gap-1.5 text-xs text-gray-600">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                            {b}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Photos ── */}
        {photos.length > 0 && (
          <div className="px-8 py-6 border-b border-gray-100">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#0a1f3f]/5 flex items-center justify-center">
                <Camera className="w-4.5 h-4.5 text-[#0a1f3f]" />
              </div>
              <h2 className="text-lg font-bold text-[#0a1f3f]">Photo Evidence</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {photos.map((p) => (
                <div key={p.id} className="group relative">
                  <div className="relative overflow-hidden rounded-xl shadow-sm">
                    <img src={p.url} alt={p.caption || ''} className="w-full h-44 object-cover transition-transform duration-300 group-hover:scale-105" />
                    {/* Hover overlay with eye icon */}
                    <div className="absolute inset-0 bg-[#0a1f3f]/0 group-hover:bg-[#0a1f3f]/40 transition-colors duration-300 flex items-center justify-center">
                      <Eye className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  </div>
                  {p.caption && <p className="text-xs text-[#4a6580] mt-1.5 font-medium">{p.caption}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Videos ── */}
        {videos.length > 0 && (
          <div className="px-8 py-6 border-b border-gray-100">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#0a1f3f]/5 flex items-center justify-center">
                <Play className="w-4.5 h-4.5 text-[#0a1f3f]" />
              </div>
              <h2 className="text-lg font-bold text-[#0a1f3f]">Video Evidence</h2>
            </div>
            <div className="space-y-4">
              {videos.map((v) => (
                <div key={v.id}>
                  <video src={v.url} controls className="w-full rounded-xl max-h-72 shadow-sm" />
                  {v.caption && <p className="text-xs text-[#4a6580] mt-1.5 font-medium">{v.caption}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="relative bg-gradient-to-r from-[#0a1f3f] to-[#122e5c] rounded-b-2xl px-8 py-8 text-center overflow-hidden">
          {/* Subtle texture overlay */}
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.5) 10px, rgba(255,255,255,0.5) 11px)',
            }}
          />
          <div className="relative">
            <p className="text-white font-bold text-lg tracking-tight">{groupName || 'Your HVAC Service Provider'}</p>
            <p className="text-white/60 text-sm mt-1.5">
              Questions about this report? Contact us directly — we&apos;re here to help.
            </p>

            {showActions && (
              <div className="flex justify-center gap-3 mt-5 print:hidden">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-transparent border-2 border-white/30 rounded-lg text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                >
                  <Printer className="w-4 h-4" /> Print Report
                </button>
              </div>
            )}

            <p className="text-white/30 text-xs mt-5 font-medium tracking-wide">Powered by Harden HVACR</p>
          </div>
        </div>
      </div>
    </div>
  );
}
