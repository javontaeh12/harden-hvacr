'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MapPin, ChevronRight } from 'lucide-react';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';

interface JobCardProps {
  job: {
    id: string;
    status: string;
    priority: string;
    description: string;
    created_at: string;
    customers: { full_name: string; phone: string | null; address: string | null } | null;
  };
  onAdvanceStatus?: (jobId: string, nextStatus: string) => Promise<void> | void;
}

const statusConfig: Record<string, { label: string; variant: BadgeVariant }> = {
  assigned: { label: 'Assigned', variant: 'info' },
  en_route: { label: 'En Route', variant: 'warning' },
  in_progress: { label: 'On Site', variant: 'danger' },
  completed: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'default' },
};

const priorityConfig: Record<string, { label: string; variant: BadgeVariant; border: string }> = {
  urgent: { label: 'Urgent', variant: 'danger', border: 'border-red-500' },
  high: { label: 'High', variant: 'warning', border: 'border-[#e55b2b]' },
  normal: { label: 'Normal', variant: 'info', border: 'border-[#2563eb]' },
  low: { label: 'Low', variant: 'default', border: 'border-[#c8d8ea]' },
};

const statusFlow: Record<string, string> = {
  assigned: 'en_route',
  en_route: 'in_progress',
  in_progress: 'completed',
};

export default function JobCard({ job, onAdvanceStatus }: JobCardProps) {
  const [advancing, setAdvancing] = useState(false);
  const status = statusConfig[job.status] || statusConfig.assigned;
  const priority = priorityConfig[job.priority] || priorityConfig.normal;
  const nextStatus = statusFlow[job.status];
  const nextLabel = nextStatus ? statusConfig[nextStatus]?.label : null;

  return (
    <Link href={`/admin/tech/jobs/${job.id}`} className="block">
      <div className={`bg-white rounded-xl border border-[#c8d8ea] p-4 border-l-4 ${priority.border} hover:shadow-md transition-shadow active:bg-[#f0f6fc]`}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-[#0a1f3f] truncate">
                {job.customers?.full_name || 'Unknown Customer'}
              </h3>
              <Badge variant={status.variant} dot size="sm">
                {status.label}
              </Badge>
            </div>
            <p className="text-sm text-[#4a6580] truncate">{job.description}</p>
            {job.customers?.address && (
              <p className="text-xs text-[#4a6580]/70 flex items-center gap-1 mt-1 truncate">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                {job.customers.address}
              </p>
            )}
            {job.priority !== 'normal' && (
              <Badge variant={priority.variant} size="sm" className="mt-1.5">
                {priority.label}
              </Badge>
            )}
          </div>
          <ChevronRight className="w-5 h-5 text-[#c8d8ea] flex-shrink-0 ml-2 mt-1" />
        </div>
        {nextStatus && onAdvanceStatus && (
          <button
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              setAdvancing(true);
              try {
                await onAdvanceStatus(job.id, nextStatus);
              } finally {
                setAdvancing(false);
              }
            }}
            disabled={advancing}
            className="mt-3 w-full py-2 rounded-lg bg-[#e55b2b] text-white text-xs font-medium hover:bg-[#d14e22] active:bg-[#c04520] disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors"
          >
            {advancing ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>&#8594; {nextLabel}</>
            )}
          </button>
        )}
      </div>
    </Link>
  );
}
