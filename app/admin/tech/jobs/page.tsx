'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import JobCard from '@/components/tech/JobCard';
import { Search, MapPin } from 'lucide-react';

interface WorkOrder {
  id: string;
  status: string;
  priority: string;
  description: string;
  notes: string | null;
  parts_used: Array<{ name: string; quantity: number; cost: number }> | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  assigned_tech_id?: string | null;
  customers: { full_name: string; phone: string | null; address: string | null } | null;
}

const filters = [
  { key: 'all', label: 'All' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'en_route', label: 'En Route' },
  { key: 'in_progress', label: 'On Site' },
  { key: 'completed', label: 'Completed' },
];

export default function JobQueuePage() {
  const { profile, groupId } = useAuth();
  const [jobs, setJobs] = useState<WorkOrder[]>([]);
  const [unassigned, setUnassigned] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchJobs = useCallback(async () => {
    if (!groupId) {
      setLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams({ group_id: groupId });
      if (profile?.id) params.set('tech_id', profile.id);

      const [myRes, unassignedRes] = await Promise.all([
        fetch(`/api/work-orders?${params}`),
        fetch(`/api/work-orders?group_id=${groupId}&unassigned=true`),
      ]);

      if (myRes.ok) {
        const data = await myRes.json();
        setJobs(Array.isArray(data) ? data : []);
      }

      if (unassignedRes.ok) {
        const data = await unassignedRes.json();
        setUnassigned(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('fetchJobs error:', err);
    } finally {
      setLoading(false);
    }
  }, [groupId, profile?.id]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const claimJob = async (jobId: string) => {
    if (!profile?.id) return;
    const res = await fetch('/api/work-orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: jobId, assigned_tech_id: profile.id }),
    });

    if (res.ok) {
      const claimed = unassigned.find(j => j.id === jobId);
      if (claimed) {
        setUnassigned(prev => prev.filter(j => j.id !== jobId));
        setJobs(prev => [{ ...claimed, assigned_tech_id: profile.id } as WorkOrder, ...prev]);
      }
    }
  };

  const handleAdvanceStatus = async (jobId: string, nextStatus: string) => {
    const updates: Record<string, unknown> = { id: jobId, status: nextStatus };
    if (nextStatus === 'in_progress') updates.started_at = new Date().toISOString();
    if (nextStatus === 'completed') updates.completed_at = new Date().toISOString();

    const res = await fetch('/api/work-orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (res.ok) {
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status: nextStatus, ...updates } as WorkOrder : j))
      );
    }
  };

  const filtered = jobs.filter((j) => {
    if (activeFilter !== 'all' && j.status !== activeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        j.customers?.full_name?.toLowerCase().includes(q) ||
        j.description?.toLowerCase().includes(q) ||
        j.customers?.address?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="pt-6 space-y-4">
      <h1 className="text-xl font-bold text-navy">Job Queue</h1>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search jobs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 ${
              activeFilter === f.key
                ? 'bg-navy text-white'
                : 'bg-ice text-steel hover:bg-accent-light'
            }`}
          >
            {f.label}
            {f.key !== 'all' && (
              <span className="ml-1 opacity-70">
                {jobs.filter((j) => j.status === f.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Job list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">No jobs found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((job) => (
            <JobCard key={job.id} job={job} onAdvanceStatus={handleAdvanceStatus} />
          ))}
        </div>
      )}

      {/* Available Jobs */}
      {unassigned.length > 0 && (
        <div className="space-y-3 mt-6">
          <h2 className="text-sm font-semibold text-steel uppercase tracking-wide">
            Available Jobs ({unassigned.length})
          </h2>
          {unassigned.map((job) => (
            <div key={job.id} className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-gray-300">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {job.customers?.full_name || 'Unknown Customer'}
                  </h3>
                  <p className="text-sm text-gray-500 truncate">{job.description}</p>
                  {job.customers?.address && (
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-1 truncate">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      {job.customers.address}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => claimJob(job.id)}
                className="mt-3 w-full py-2 rounded-lg bg-green-50 text-green-700 text-sm font-medium hover:bg-green-100 active:bg-green-200"
              >
                Claim Job
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
