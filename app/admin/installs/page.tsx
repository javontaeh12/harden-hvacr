'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, Input, Select } from '@/components/ui';
import { ProjectStatusBadge } from '@/components/installs/ProjectStatusBadge';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Building2, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import type { InstallProject } from '@/lib/installs/types';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'survey', label: 'Site Survey' },
  { value: 'designing', label: 'Designing' },
  { value: 'proposal_sent', label: 'Proposal Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const SYSTEM_TYPE_LABELS: Record<string, string> = {
  split: 'Split System',
  package: 'Package Unit',
  mini_split: 'Mini Split',
  dual_fuel: 'Dual Fuel',
  heat_pump: 'Heat Pump',
  furnace_only: 'Furnace Only',
};

interface ProjectWithOptions extends InstallProject {
  install_equipment_options?: Array<{ total: number }>;
}

export default function InstallsPage() {
  const { groupId, isLoading: authLoading } = useAuth();
  const [projects, setProjects] = useState<ProjectWithOptions[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    if (!authLoading && groupId) fetchProjects();
  }, [authLoading, groupId]);

  const fetchProjects = async () => {
    if (!groupId) return;
    try {
      const res = await fetch(`/api/installs/projects?group_id=${groupId}`);
      if (!res.ok) throw new Error('Failed to load projects');
      const data = await res.json();
      setProjects(data.projects || data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesSearch =
        !search ||
        p.project_name.toLowerCase().includes(search.toLowerCase()) ||
        (p.address && p.address.toLowerCase().includes(search.toLowerCase()));
      const matchesStatus = !statusFilter || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, search, statusFilter]);

  // Quick stats
  const activeCount = useMemo(
    () => projects.filter((p) => p.status !== 'completed' && p.status !== 'cancelled').length,
    [projects]
  );

  const proposalsSent = useMemo(
    () => projects.filter((p) => p.status === 'proposal_sent').length,
    [projects]
  );

  const acceptedThisMonth = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return projects.filter(
      (p) => p.status === 'accepted' && new Date(p.created_at) >= monthStart
    ).length;
  }, [projects]);

  const revenuePipeline = useMemo(() => {
    return projects
      .filter((p) => p.status !== 'cancelled')
      .reduce((sum, p) => {
        const firstOption = p.install_equipment_options?.[0];
        return sum + (firstOption?.total || 0);
      }, 0);
  }, [projects]);

  // Pipeline stage counts for the visual bar
  const pipelineCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of projects) {
      counts[p.status] = (counts[p.status] || 0) + 1;
    }
    return counts;
  }, [projects]);

  const getProjectTotal = (project: ProjectWithOptions): string => {
    const firstOption = project.install_equipment_options?.[0];
    if (!firstOption?.total) return '\u2014';
    return formatCurrency(firstOption.total);
  };

  const getCustomerName = (project: InstallProject): string => {
    return project.customers?.full_name || 'No customer';
  };

  if (isLoading || authLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl" />
          ))}
        </div>
        <div className="h-12 bg-gray-200 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800 font-medium">Failed to load install projects</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">HVAC Installs</h1>
          <p className="text-gray-600 mt-1">Residential installation projects</p>
        </div>
        <Link
          href="/admin/installs/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-ember text-white hover:bg-ember-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Project
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-medium text-gray-500">Active Projects</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-medium text-gray-500">Proposals Sent</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{proposalsSent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-medium text-gray-500">Accepted This Month</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{acceptedThisMonth}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-medium text-gray-500">Revenue Pipeline</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {revenuePipeline > 0 ? formatCurrency(revenuePipeline) : '$0'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Stages */}
      {projects.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Pipeline</p>
          <div className="flex gap-1">
            {STATUS_OPTIONS.filter(s => s.value && s.value !== 'cancelled').map(s => {
              const count = pipelineCounts[s.value] || 0;
              const total = projects.filter(p => p.status !== 'cancelled').length;
              const pct = total > 0 ? Math.max((count / total) * 100, count > 0 ? 8 : 0) : 0;
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatusFilter(statusFilter === s.value ? '' : s.value)}
                  className={`group relative rounded-md transition-all ${
                    statusFilter === s.value ? 'ring-2 ring-[var(--accent)]' : ''
                  }`}
                  style={{ flex: Math.max(pct, 4) }}
                  title={`${s.label}: ${count}`}
                >
                  <div className={`h-8 rounded-md flex items-center justify-center ${
                    count > 0
                      ? s.value === 'completed' ? 'bg-emerald-100' :
                        s.value === 'in_progress' ? 'bg-blue-100' :
                        s.value === 'accepted' ? 'bg-green-100' :
                        s.value === 'proposal_sent' ? 'bg-purple-100' :
                        s.value === 'designing' ? 'bg-cyan-100' :
                        'bg-gray-100'
                      : 'bg-gray-50'
                  }`}>
                    {count > 0 && (
                      <span className="text-xs font-bold text-gray-700">{count}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1 block text-center truncate">{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by project name or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-48"
        />
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {search || statusFilter ? 'No matching projects' : 'No install projects yet'}
              </h3>
              <p className="text-gray-600">
                {search || statusFilter
                  ? 'Try adjusting your search or filters.'
                  : 'Create your first project to get started.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <Link key={project.id} href={`/admin/installs/${project.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {project.project_name}
                    </h3>
                    <ProjectStatusBadge status={project.status} />
                  </div>

                  <p className="text-sm text-gray-600 mb-1">{getCustomerName(project)}</p>

                  {project.address && (
                    <p className="text-sm text-gray-500 truncate mb-3">{project.address}</p>
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      {SYSTEM_TYPE_LABELS[project.system_type] || project.system_type}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-sm font-medium text-gray-900">
                      {getProjectTotal(project)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDate(project.created_at)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
