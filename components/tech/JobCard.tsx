'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MapPin, ChevronRight } from 'lucide-react';

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

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  assigned: { label: 'Assigned', bg: 'bg-blue-100', text: 'text-blue-700' },
  en_route: { label: 'En Route', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  in_progress: { label: 'On Site', bg: 'bg-orange-100', text: 'text-orange-700' },
  completed: { label: 'Completed', bg: 'bg-green-100', text: 'text-green-700' },
  cancelled: { label: 'Cancelled', bg: 'bg-gray-100', text: 'text-gray-700' },
};

const priorityColor: Record<string, string> = {
  urgent: 'border-red-500',
  high: 'border-orange-500',
  normal: 'border-blue-500',
  low: 'border-gray-400',
};

const statusFlow: Record<string, string> = {
  assigned: 'en_route',
  en_route: 'in_progress',
  in_progress: 'completed',
};

export default function JobCard({ job, onAdvanceStatus }: JobCardProps) {
  const [advancing, setAdvancing] = useState(false);
  const status = statusConfig[job.status] || statusConfig.assigned;
  const nextStatus = statusFlow[job.status];
  const nextLabel = nextStatus ? statusConfig[nextStatus]?.label : null;

  return (
    <Link href={`/admin/tech/jobs/${job.id}`} className="block">
      <div className={`bg-white rounded-xl shadow-sm p-4 border-l-4 ${priorityColor[job.priority] || 'border-blue-500'} active:bg-gray-50`}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 truncate">
                {job.customers?.full_name || 'Unknown Customer'}
              </h3>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${status.bg} ${status.text}`}>
                {status.label}
              </span>
            </div>
            <p className="text-sm text-gray-500 truncate">{job.description}</p>
            {job.customers?.address && (
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-1 truncate">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                {job.customers.address}
              </p>
            )}
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0 ml-2 mt-1" />
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
            className="mt-3 w-full py-2 rounded-lg bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 active:bg-blue-200 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {advancing ? (
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>&rarr; {nextLabel}</>
            )}
          </button>
        )}
      </div>
    </Link>
  );
}
