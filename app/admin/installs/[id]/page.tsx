'use client';

import { useEffect, useState, use } from 'react';
import { useAuth } from '@/components/AuthProvider';
import ProjectDetailClient from './ProjectDetailClient';
import Link from 'next/link';
import type {
  InstallProject,
  InstallRoom,
  InstallEquipmentOption,
  InstallProposal,
} from '@/lib/installs/types';

type FullProject = InstallProject & {
  install_rooms: InstallRoom[];
  install_equipment_options: InstallEquipmentOption[];
  install_proposals: InstallProposal[];
};

export default function InstallProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { groupId, isLoading: authLoading } = useAuth();
  const [project, setProject] = useState<FullProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !groupId) return;

    const fetchProject = async () => {
      try {
        const res = await fetch(`/api/installs/projects?id=${id}&group_id=${groupId}`);
        if (!res.ok) throw new Error('Failed to load project');
        const data = await res.json();
        setProject(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [id, groupId, authLoading]);

  if (loading || authLoading) {
    return (
      <div className="animate-pulse space-y-6">
        {/* Back button skeleton */}
        <div className="h-4 bg-gray-200 rounded w-32" />
        {/* Title skeleton */}
        <div className="space-y-3">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-4 bg-gray-200 rounded w-48" />
        </div>
        {/* Mode toggle skeleton */}
        <div className="h-9 bg-gray-200 rounded-lg w-72" />
        {/* Tabs skeleton */}
        <div className="flex gap-2 border-b border-gray-200 pb-2">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-8 bg-gray-200 rounded w-24" />
          ))}
        </div>
        {/* Content skeleton */}
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-center">
        <p className="text-red-800 font-medium">Failed to load project</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <Link
          href="/admin/installs"
          className="text-sm text-blue-600 hover:underline mt-3 inline-block"
        >
          Back to Installs
        </Link>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Project not found</p>
        <Link
          href="/admin/installs"
          className="text-sm text-blue-600 hover:underline mt-2 inline-block"
        >
          Back to Installs
        </Link>
      </div>
    );
  }

  return <ProjectDetailClient initialProject={project} />;
}
