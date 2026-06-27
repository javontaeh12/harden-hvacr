'use client';

import { useEffect, useState, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import StatusProgressBar from '@/components/tech/StatusProgressBar';
import PhotoCapture from '@/components/tech/PhotoCapture';
import PartsLogger from '@/components/tech/PartsLogger';
import SignaturePad from '@/components/tech/SignaturePad';
import { Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/hooks/useToast';
import { Phone, MapPin, ArrowLeft, FileText, Camera, Package, PenLine, MessageSquare, Receipt, DollarSign, CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface WorkOrder {
  id: string;
  status: string;
  priority: string;
  description: string;
  notes: string | null;
  parts_used: Array<{ name: string; quantity: number; cost: number; inventory_item_id?: string }> | null;
  signature_url: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  group_id: string;
  customers: { full_name: string; phone: string | null; address: string | null } | null;
  profiles: { full_name: string } | null;
}

const tabs = [
  { value: 'photos', label: 'Photos', icon: <Camera className="w-3.5 h-3.5" /> },
  { value: 'parts', label: 'Parts', icon: <Package className="w-3.5 h-3.5" /> },
  { value: 'notes', label: 'Notes', icon: <MessageSquare className="w-3.5 h-3.5" /> },
  { value: 'signature', label: 'Signature', icon: <PenLine className="w-3.5 h-3.5" /> },
];

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { groupId, profile } = useAuth();
  const { toast } = useToast();
  const [job, setJob] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('photos');
  const [photos, setPhotos] = useState<string[]>([]);
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const completedRef = useRef<HTMLDivElement>(null);

  // Load notes draft from server on mount
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const res = await fetch(`/api/drafts?work_order_id=${id}&draft_type=notes`);
        if (res.ok) {
          const draft = await res.json();
          if (draft?.data?.noteText) setNoteText(draft.data.noteText);
        }
      } catch {}
    };
    loadDraft();
  }, [id]);

  // Auto-save notes draft to server on changes (debounced)
  useEffect(() => {
    if (!groupId) return;
    const timer = setTimeout(() => {
      if (noteText) {
        fetch('/api/drafts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            work_order_id: id,
            draft_type: 'notes',
            data: { noteText },
            group_id: groupId,
            updated_by: profile?.id || null,
          }),
        }).catch(() => {});
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [noteText, id, groupId, profile?.id]);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res = await fetch(`/api/work-orders?id=${id}`);
        if (res.ok) {
          const data = await res.json();
          const jobData = Array.isArray(data) ? data[0] : data;
          if (jobData) {
            setJob(jobData as WorkOrder);
            loadPhotos(jobData.id);
          }
        }
      } catch (err) {
        console.error('fetchJob error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [id]);

  const loadPhotos = async (workOrderId: string) => {
    try {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      const { data } = await supabase.storage
        .from('service-reports')
        .list(`service-reports/work-orders/${workOrderId}`);
      if (data && data.length > 0) {
        const urls = data.map((file) => {
          const { data: urlData } = supabase.storage
            .from('service-reports')
            .getPublicUrl(`service-reports/work-orders/${workOrderId}/${file.name}`);
          return urlData.publicUrl;
        });
        setPhotos(urls);
      }
    } catch (err) {
      console.error('loadPhotos error:', err);
    }
  };

  const handleStatusAdvance = async (nextStatus: string) => {
    if (!job) return;
    setSaving(true);
    const updates: Record<string, unknown> = { id: job.id, status: nextStatus };
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
        // GPS unavailable — still advance status, just no ETA call
        console.warn('GPS unavailable — skipping ETA call');
      }
    }

    const res = await fetch('/api/work-orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const updated = await res.json();
      setJob(updated as WorkOrder);
      const statusLabels: Record<string, string> = {
        en_route: 'En Route',
        in_progress: 'On Site',
        completed: 'Completed',
      };
      toast.success('Status Updated', `Job moved to ${statusLabels[nextStatus] || nextStatus}`);
    }
    setSaving(false);
  };

  const handlePartsChange = async (parts: Array<{ name: string; quantity: number; cost: number; inventory_item_id?: string }>) => {
    if (!job) return;
    const res = await fetch('/api/work-orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: job.id, parts_used: parts }),
    });
    if (res.ok) {
      setJob({ ...job, parts_used: parts });
    }
  };

  const handleAddNote = async () => {
    if (!job || !noteText.trim()) return;
    const timestamp = new Date().toLocaleString();
    const techName = profile?.full_name || 'Tech';
    const newNote = `[${timestamp} - ${techName}] ${noteText.trim()}`;
    const updatedNotes = job.notes ? `${job.notes}\n${newNote}` : newNote;

    const res = await fetch('/api/work-orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: job.id, notes: updatedNotes }),
    });
    if (res.ok) {
      setJob({ ...job, notes: updatedNotes });
      setNoteText('');
      fetch(`/api/drafts?work_order_id=${id}&draft_type=notes`, { method: 'DELETE' }).catch(() => {});
      toast.success('Note Saved', 'Your note has been added to this job.');
    }
  };

  const handlePhotosChange = (newPhotos: string[]) => {
    setPhotos(newPhotos);
    if (newPhotos.length > photos.length) {
      toast.success('Photo Uploaded', 'Photo has been saved to this job.');
    }
  };

  const handleSignatureSaved = async (url: string) => {
    if (!job) return;
    const res = await fetch('/api/work-orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: job.id, signature_url: url }),
    });
    if (res.ok) {
      setJob({ ...job, signature_url: url });
    }
  };

  const handleCompleteJob = async () => {
    if (!job) return;
    if (!job.signature_url) {
      setActiveTab('signature');
      toast.warning('Signature Required', 'Please collect a signature before completing the job.');
      return;
    }

    setSaving(true);
    const res = await fetch('/api/work-orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: job.id,
        status: 'completed',
        completed_at: new Date().toISOString(),
        parts_used: job.parts_used,
      }),
    });

    if (res.ok) {
      setJob({ ...job, status: 'completed', completed_at: new Date().toISOString() });
      setJustCompleted(true);
      toast.success('Job Completed', 'Great work! The job has been marked as completed.');
      setTimeout(() => {
        completedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="pt-12 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-[#e55b2b] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="pt-12 text-center">
        <p className="text-[#4a6580]">Job not found</p>
        <Link href="/admin/tech/jobs" className="text-[#e55b2b] text-sm mt-2 inline-block hover:underline">
          Back to Jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-4 pb-6 space-y-4 w-full overflow-x-hidden">
      {/* Back button */}
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-[#4a6580] active:text-[#0a1f3f] transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Status bar */}
      <StatusProgressBar
        currentStatus={job.status}
        onAdvance={job.status !== 'completed' ? handleStatusAdvance : undefined}
        loading={saving}
      />

      {/* Customer card */}
      <div className="rounded-xl overflow-hidden border border-[#c8d8ea]">
        {/* Navy gradient header */}
        <div className="bg-gradient-to-r from-[#0a1f3f] to-[#122e5c] px-4 py-3">
          <h2 className="font-semibold text-white">{job.customers?.full_name || 'Unknown Customer'}</h2>
          <p className="text-sm text-white/70">{job.description}</p>
        </div>
        {/* Action buttons */}
        <div className="bg-white px-4 py-3">
          <div className="grid grid-cols-4 gap-2">
            {job.customers?.phone && (
              <a
                href={`tel:${job.customers.phone}`}
                className="flex flex-col items-center gap-1.5"
              >
                <div className="w-10 h-10 rounded-full bg-[#e55b2b]/10 text-[#e55b2b] flex items-center justify-center">
                  <Phone className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-medium text-[#4a6580]">Call</span>
              </a>
            )}
            {job.customers?.address && (
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(job.customers.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5"
              >
                <div className="w-10 h-10 rounded-full bg-[#e55b2b]/10 text-[#e55b2b] flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-medium text-[#4a6580]">Maps</span>
              </a>
            )}
            <Link
              href={`/admin/tech/jobs/${job.id}/quote`}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="w-10 h-10 rounded-full bg-[#e55b2b]/10 text-[#e55b2b] flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-medium text-[#4a6580]">Quote</span>
            </Link>
            <Link
              href={`/admin/tech/report/${job.id}`}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="w-10 h-10 rounded-full bg-[#e55b2b]/10 text-[#e55b2b] flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-medium text-[#4a6580]">Report</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={tabs}
        value={activeTab}
        onChange={setActiveTab}
        variant="underline"
        fullWidth
      />

      {/* Tab content */}
      <div className="bg-white rounded-xl border border-[#c8d8ea] p-4">
        {activeTab === 'photos' && (
          <PhotoCapture workOrderId={job.id} photos={photos} onPhotosChange={handlePhotosChange} />
        )}
        {activeTab === 'parts' && groupId && (
          <PartsLogger
            groupId={groupId}
            partsUsed={job.parts_used || []}
            onPartsChange={handlePartsChange}
          />
        )}
        {activeTab === 'notes' && (
          <div className="space-y-3">
            <p className="text-xs text-[#4a6580]/70 italic">Notes are visible to techs and office only, not the customer.</p>
            {job.notes && (
              <div className="bg-[#f0f6fc] rounded-lg p-3 max-h-48 overflow-y-auto">
                {job.notes.split('\n').map((line, i) => (
                  <p key={i} className="text-sm text-[#0a1f3f]/80 mb-1">{line}</p>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note..."
                className="flex-1 px-3 py-2.5 rounded-lg border border-[#c8d8ea] text-sm focus:outline-none focus:border-[#e55b2b] focus:ring-1 focus:ring-[#e55b2b]"
                onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
              />
              <button
                onClick={handleAddNote}
                disabled={!noteText.trim()}
                className="px-4 py-2.5 rounded-lg bg-[#e55b2b] text-white text-sm font-medium disabled:opacity-40 hover:bg-[#d14e22] active:bg-[#c04520] transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        )}
        {activeTab === 'signature' && (
          <SignaturePad
            workOrderId={job.id}
            signatureUrl={job.signature_url}
            onSignatureSaved={handleSignatureSaved}
          />
        )}
      </div>

      {/* Collect Payment button */}
      {['in_progress', 'completed'].includes(job.status) && (
        <Link
          href={`/admin/tech/jobs/${job.id}/payment`}
          className="w-full py-3 rounded-xl bg-[#e55b2b] text-white font-semibold active:bg-[#c04520] flex items-center justify-center gap-2 transition-colors"
        >
          <DollarSign className="w-5 h-5" />
          Collect Payment
        </Link>
      )}

      {/* Complete Job button */}
      {job.status !== 'completed' && job.status !== 'cancelled' && (
        <button
          onClick={handleCompleteJob}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold active:bg-emerald-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Completing...
            </>
          ) : job.signature_url ? 'Complete Job' : 'Sign & Complete Job'}
        </button>
      )}

      {/* Completed confirmation — slides into view */}
      {justCompleted && (
        <div
          ref={completedRef}
          className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center animate-[slideUp_0.3s_ease-out]"
        >
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-emerald-800 mb-1">Job Completed!</h3>
          <p className="text-sm text-emerald-600 mb-4">Great work. The job has been marked as completed.</p>
          <div className="flex gap-3">
            <Link
              href={`/admin/tech/jobs/${job.id}/complete`}
              className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold active:bg-emerald-700 transition-colors text-center"
            >
              View Summary
            </Link>
            <Link
              href="/admin/tech/jobs"
              className="flex-1 py-2.5 rounded-lg bg-white border border-emerald-300 text-emerald-700 text-sm font-semibold active:bg-emerald-50 transition-colors text-center"
            >
              Back to Jobs
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
