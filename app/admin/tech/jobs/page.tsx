'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import JobCard from '@/components/tech/JobCard';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { Search, MapPin, Briefcase } from 'lucide-react';

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

    // Grab GPS when going en_route — CSR will auto-call customer with ETA
    if (nextStatus === 'en_route' && navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, enableHighAccuracy: true })
        );
        updates.tech_lat = pos.coords.latitude;
        updates.tech_lng = pos.coords.longitude;
      } catch {
        console.warn('GPS unavailable — skipping ETA call');
      }
    }

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

  // Build tab items with counts
  const filterTabs = [
    { value: 'all', label: 'All', count: jobs.length },
    { value: 'assigned', label: 'Assigned', count: jobs.filter(j => j.status === 'assigned').length },
    { value: 'en_route', label: 'En Route', count: jobs.filter(j => j.status === 'en_route').length },
    { value: 'in_progress', label: 'On Site', count: jobs.filter(j => j.status === 'in_progress').length },
    { value: 'completed', label: 'Completed', count: jobs.filter(j => j.status === 'completed').length },
  ];

  return (
    <div className="pt-6 space-y-4">
      <h1 className="text-xl font-bold text-[#0a1f3f]">Job Queue</h1>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a6580]" />
        <input
          type="text"
          placeholder="Search jobs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#c8d8ea] text-sm bg-white focus:outline-none focus:border-[#e55b2b] focus:ring-1 focus:ring-[#e55b2b]"
        />
      </div>

      {/* Filter tabs */}
      <Tabs
        tabs={filterTabs}
        value={activeFilter}
        onChange={setActiveFilter}
        variant="pills"
      />

      {/* Job list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#e55b2b] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="w-7 h-7" />}
          title="No jobs found"
          description={search ? 'Try adjusting your search or filter to find what you are looking for.' : 'No jobs match the selected filter.'}
        />
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
          <h2 className="text-sm font-semibold text-[#4a6580] uppercase tracking-wide">
            Available Jobs ({unassigned.length})
          </h2>
          {unassigned.map((job) => (
            <div key={job.id} className="bg-[#dceaf8]/20 rounded-xl p-4 border border-dashed border-[#c8d8ea]">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[#0a1f3f] truncate">
                    {job.customers?.full_name || 'Unknown Customer'}
                  </h3>
                  <p className="text-sm text-[#4a6580] truncate">{job.description}</p>
                  {job.customers?.address && (
                    <p className="text-xs text-[#4a6580]/70 flex items-center gap-1 mt-1 truncate">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      {job.customers.address}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => claimJob(job.id)}
                className="mt-3 w-full py-2 rounded-lg bg-[#e55b2b] text-white text-sm font-medium hover:bg-[#d14e22] active:bg-[#c04520] transition-colors"
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
