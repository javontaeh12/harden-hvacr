'use client';

import { STATUS_LABELS } from '@/lib/installs/constants';

interface Props {
  status: string;
}

export function ProjectStatusBadge({ status }: Props) {
  const config = STATUS_LABELS[status] || { label: status, color: 'bg-gray-100 text-gray-700' };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}
    >
      {config.label}
    </span>
  );
}
