'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Play, Calendar, Wrench, CheckCircle2, DollarSign, ChevronDown, ChevronUp, Clock } from 'lucide-react';

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
  normal: 'border-blue-500',
  low: 'border-gray-400',
};

const priorityBadge: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  normal: 'bg-blue-100 text-blue-700',
  low: 'bg-gray-100 text-gray-700',
};

const statusBadge: Record<string, { label: string; bg: string; text: string }> = {
  assigned: { label: 'Assigned', bg: 'bg-blue-100', text: 'text-blue-700' },
  en_route: { label: 'En Route', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  in_progress: { label: 'On Site', bg: 'bg-orange-100', text: 'text-orange-700' },
  completed: { label: 'Completed', bg: 'bg-green-100', text: 'text-green-700' },
  cancelled: { label: 'Cancelled', bg: 'bg-gray-100', text: 'text-gray-700' },
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
    const status = statusBadge[job.status] || statusBadge.assigned;
    return (
      <div
        onClick={() => router.push(`/admin/tech/jobs/${job.id}`)}
        className={`bg-white rounded-xl shadow-sm p-4 border-l-4 ${priorityColor[job.priority] || 'border-blue-500'} active:bg-gray-50 cursor-pointer`}
      >
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-semibold text-gray-900 truncate flex-1">{job.customers?.full_name || 'Unknown Customer'}</h3>
          <div className="flex items-center gap-1.5 ml-2 shrink-0">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${status.bg} ${status.text}`}>
              {status.label}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${priorityBadge[job.priority] || 'bg-blue-100 text-blue-700'}`}>
              {job.priority}
            </span>
          </div>
        </div>
        <p className="text-sm text-gray-500 truncate">{job.description}</p>
        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
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
        <h1 className="text-2xl font-bold text-gray-900">Hey, {firstName}</h1>
        <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
          <Calendar className="w-3.5 h-3.5" />
          {today}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Wrench className="w-4 h-4" />
            <span className="text-xs">Total Jobs</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 text-orange-500 mb-1">
            <Play className="w-4 h-4" />
            <span className="text-xs text-gray-500">On Site</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{inProgressCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 text-green-500 mb-1">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs text-gray-500">Completed</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{completedCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs">Parts Used</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">${totalPartsCost.toFixed(0)}</p>
        </div>
      </div>

      {/* Next Job (Today) */}
      {nextJob ? (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Next Job</h2>
          <div className={`bg-white rounded-xl shadow-sm p-4 border-l-4 ${priorityColor[nextJob.priority] || 'border-blue-500'}`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-gray-900">{nextJob.customers?.full_name || 'Unknown Customer'}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{nextJob.description}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityBadge[nextJob.priority] || 'bg-blue-100 text-blue-700'}`}>
                {nextJob.priority}
              </span>
            </div>
            {nextJob.customers?.address && (
              <p className="text-sm text-gray-600 flex items-center gap-1 mb-3">
                <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                {nextJob.customers.address}
              </p>
            )}
            <div className="flex gap-2">
              {nextJob.customers?.address && (
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(nextJob.customers.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Open in Maps
                </a>
              )}
              <button
                onClick={() => router.push(`/admin/tech/jobs/${nextJob.id}`)}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
              >
                Start Job
              </button>
            </div>
          </div>
        </div>
      ) : todayJobs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
          <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" />
          <h3 className="font-semibold text-gray-900">No jobs for today</h3>
          <p className="text-sm text-gray-500 mt-1">Check upcoming jobs below.</p>
        </div>
      ) : null}

      {/* Today's Other Jobs */}
      {todayJobs.length > 1 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Today ({todayJobs.length})
          </h2>
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
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Upcoming ({upcomingJobs.length})
          </h2>
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
            className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2"
          >
            Completed ({completedJobs.length})
            {showCompleted ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
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
