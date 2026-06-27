'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Play, Calendar, Wrench, CheckCircle2, DollarSign, ChevronDown, ChevronUp, Clock, Sparkles, Phone, Navigation, FileText, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';

interface WorkOrder {
  id: string;
  status: string;
  priority: string;
  description: string;
  notes: string | null;
  scheduled_date: string | null;
  parts_used: Array<{ name: string; quantity: number; cost: number }> | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  customers: { full_name: string; phone: string | null; address: string | null } | null;
}

const priorityColor: Record<string, string> = {
  urgent: 'border-red-500',
  high: 'border-orange-500',
  normal: 'border-[#3b82f6]',
  low: 'border-gray-400',
};

const statusToBadgeVariant: Record<string, 'default' | 'info' | 'warning' | 'success' | 'danger'> = {
  assigned: 'default',
  en_route: 'info',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'danger',
};

const statusLabel: Record<string, string> = {
  assigned: 'Assigned',
  en_route: 'En Route',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const priorityToBadgeVariant: Record<string, 'danger' | 'warning' | 'info' | 'default'> = {
  urgent: 'danger',
  high: 'warning',
  normal: 'info',
  low: 'default',
};

interface TechDashboardClientProps {
  jobs: WorkOrder[];
  firstName: string;
}

export default function TechDashboardClient({ jobs, firstName }: TechDashboardClientProps) {
  const router = useRouter();
  const [showCompleted, setShowCompleted] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const todayJobs = jobs.filter((j) => {
    if (j.status === 'completed' || j.status === 'cancelled') return false;
    if (j.scheduled_date === todayStr) return true;
    if (!j.scheduled_date && j.created_at.split('T')[0] === todayStr) return true;
    return false;
  });

  const upcomingJobs = jobs.filter((j) => {
    if (j.status === 'completed' || j.status === 'cancelled') return false;
    if (todayJobs.some((t) => t.id === j.id)) return false;
    return true;
  });

  const completedJobs = jobs.filter((j) => j.status === 'completed');

  const activeCount = jobs.filter((j) => ['assigned', 'en_route', 'in_progress'].includes(j.status)).length;
  const inProgressCount = jobs.filter((j) => j.status === 'in_progress').length;
  const completedCount = completedJobs.length;
  const totalPartsCost = jobs.reduce((sum, j) => {
    if (!j.parts_used) return sum;
    return sum + j.parts_used.reduce((s, p) => s + (p.cost || 0) * (p.quantity || 1), 0);
  }, 0);

  const nextJob = todayJobs.find((j) => j.status !== 'completed' && j.status !== 'cancelled');

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const formatScheduledDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const JobListItem = ({ job }: { job: WorkOrder }) => {
    return (
      <div
        onClick={() => router.push(`/admin/tech/jobs/${job.id}`)}
        className={`bg-white rounded-xl border border-[#c8d8ea] p-4 border-l-4 ${priorityColor[job.priority] || 'border-[#3b82f6]'} cursor-pointer hover:shadow-md transition-shadow`}
      >
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-semibold text-[#0a1f3f] truncate flex-1">{job.customers?.full_name || 'Unknown Customer'}</h3>
          <div className="flex items-center gap-1.5 ml-2 shrink-0">
            <Badge variant={statusToBadgeVariant[job.status] || 'default'} dot>
              {statusLabel[job.status] || job.status}
            </Badge>
            <Badge variant={priorityToBadgeVariant[job.priority] || 'info'}>
              {job.priority}
            </Badge>
          </div>
        </div>
        <p className="text-sm text-[#4a6580] truncate">{job.description}</p>
        <div className="flex items-center gap-3 mt-1.5 text-xs text-[#4a6580]/70">
          {job.customers?.address && (
            <span className="flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              {job.customers.address}
            </span>
          )}
          {job.scheduled_date && (
            <span className="flex items-center gap-1 shrink-0">
              <Clock className="w-3 h-3" />
              {formatScheduledDate(job.scheduled_date)}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="pt-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0a1f3f]">Hey, {firstName}</h1>
        <p className="text-sm text-[#4a6580] flex items-center gap-1 mt-0.5">
          <Calendar className="w-3.5 h-3.5" />
          {today}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Jobs */}
        <div className="bg-white rounded-xl border border-[#c8d8ea] p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#e55b2b]/10 flex items-center justify-center flex-shrink-0">
              <Wrench className="w-5 h-5 text-[#e55b2b]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0a1f3f]">{activeCount}</p>
              <p className="text-sm text-[#4a6580]">Total Jobs</p>
            </div>
          </div>
        </div>
        {/* On Site */}
        <div className="bg-white rounded-xl border border-[#c8d8ea] p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <Play className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0a1f3f]">{inProgressCount}</p>
              <p className="text-sm text-[#4a6580]">On Site</p>
            </div>
          </div>
        </div>
        {/* Completed */}
        <div className="bg-white rounded-xl border border-[#c8d8ea] p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0a1f3f]">{completedCount}</p>
              <p className="text-sm text-[#4a6580]">Completed</p>
            </div>
          </div>
        </div>
        {/* Parts Cost */}
        <div className="bg-white rounded-xl border border-[#c8d8ea] p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#f5a623]/10 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-5 h-5 text-[#f5a623]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0a1f3f]">${totalPartsCost.toFixed(0)}</p>
              <p className="text-sm text-[#4a6580]">Parts Used</p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Tech Assistant */}
      <Link
        href="/admin/tech/assistant"
        className="flex items-center gap-3 bg-gradient-to-r from-[#f5a623]/10 to-[#f5a623]/5 border border-[#f5a623]/30 rounded-xl p-4 active:opacity-80 hover:shadow-md transition-all"
      >
        <div className="w-10 h-10 bg-[#f5a623]/15 rounded-full flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-[#f5a623]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[#0a1f3f] text-sm">AI Tech Assistant</h3>
          <p className="text-xs text-[#4a6580]">Get troubleshooting help</p>
        </div>
        <ChevronRight className="w-4 h-4 text-[#f5a623] flex-shrink-0" />
      </Link>

      {/* Next Job (Today) */}
      {nextJob ? (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-[#0a1f3f]">Next Job</h2>
          </div>
          <div className={`bg-white rounded-xl border border-[#c8d8ea] overflow-hidden border-l-4 ${priorityColor[nextJob.priority] || 'border-[#3b82f6]'} hover:shadow-md transition-shadow`}>
            {/* Navy gradient header */}
            <div className="bg-gradient-to-r from-[#0a1f3f] to-[#122e5c] px-4 py-3">
              <h3 className="font-semibold text-white">{nextJob.customers?.full_name || 'Unknown Customer'}</h3>
              {nextJob.customers?.address && (
                <p className="text-sm text-white/70 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  {nextJob.customers.address}
                </p>
              )}
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-[#4a6580]">{nextJob.description}</p>
                <Badge variant={priorityToBadgeVariant[nextJob.priority] || 'info'} className="ml-2 shrink-0">
                  {nextJob.priority}
                </Badge>
              </div>
              <div className="flex gap-2">
                {nextJob.customers?.phone && (
                  <a
                    href={`tel:${nextJob.customers.phone}`}
                    className="flex items-center justify-center gap-1.5 border border-[#e55b2b]/30 text-[#e55b2b] rounded-full px-3 py-1 text-sm font-medium hover:bg-[#e55b2b]/5 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Call
                  </a>
                )}
                {nextJob.customers?.address && (
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(nextJob.customers.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 border border-[#e55b2b]/30 text-[#e55b2b] rounded-full px-3 py-1 text-sm font-medium hover:bg-[#e55b2b]/5 transition-colors"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    Maps
                  </a>
                )}
                <Link
                  href={`/admin/tech/jobs/${nextJob.id}?tab=quote`}
                  className="flex items-center justify-center gap-1.5 border border-[#e55b2b]/30 text-[#e55b2b] rounded-full px-3 py-1 text-sm font-medium hover:bg-[#e55b2b]/5 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Quote
                </Link>
                <button
                  onClick={() => router.push(`/admin/tech/jobs/${nextJob.id}`)}
                  className="flex-1 py-1.5 rounded-full bg-[#e55b2b] text-white text-sm font-medium hover:bg-[#d04a1a] transition-colors"
                >
                  Start Job
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : todayJobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#c8d8ea]">
          <EmptyState
            icon={<CheckCircle2 className="w-7 h-7" />}
            title="No jobs for today"
            description="Check upcoming jobs below."
            className="py-8"
          />
        </div>
      ) : null}

      {/* Today's Other Jobs */}
      {todayJobs.length > 1 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-[#0a1f3f]">
              Today ({todayJobs.length})
            </h2>
            <Link href="/admin/tech/jobs" className="text-sm font-medium text-[#e55b2b] hover:underline">
              View all &rarr;
            </Link>
          </div>
          <div className="space-y-2">
            {todayJobs.filter((j) => j.id !== nextJob?.id).map((job) => (
              <JobListItem key={job.id} job={job} />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Jobs */}
      {upcomingJobs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-[#0a1f3f]">
              Upcoming ({upcomingJobs.length})
            </h2>
            <Link href="/admin/tech/jobs" className="text-sm font-medium text-[#e55b2b] hover:underline">
              View all &rarr;
            </Link>
          </div>
          <div className="space-y-2">
            {upcomingJobs.map((job) => (
              <JobListItem key={job.id} job={job} />
            ))}
          </div>
        </div>
      )}

      {/* Completed Jobs */}
      {completedJobs.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center justify-between w-full mb-2"
          >
            <h2 className="text-lg font-semibold text-[#0a1f3f]">
              Completed ({completedJobs.length})
            </h2>
            <span className="flex items-center gap-1 text-sm font-medium text-[#e55b2b]">
              {showCompleted ? 'Hide' : 'Show'}
              {showCompleted ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </span>
          </button>
          {showCompleted && (
            <div className="space-y-2">
              {completedJobs.map((job) => (
                <JobListItem key={job.id} job={job} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
