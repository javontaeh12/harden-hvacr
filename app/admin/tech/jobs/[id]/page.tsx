'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import StatusProgressBar from '@/components/tech/StatusProgressBar';
import PhotoCapture from '@/components/tech/PhotoCapture';
import PartsLogger from '@/components/tech/PartsLogger';
import SignaturePad from '@/components/tech/SignaturePad';
import { Phone, MapPin, ArrowLeft, FileText, Camera, Package, PenLine, MessageSquare, Receipt, DollarSign } from 'lucide-react';
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
  { key: 'photos', label: 'Photos', icon: Camera },
  { key: 'parts', label: 'Parts', icon: Package },
  { key: 'notes', label: 'Notes', icon: MessageSquare },
  { key: 'signature', label: 'Signature', icon: PenLine },
];

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { groupId, profile } = useAuth();
  const [job, setJob] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('photos');
  const [photos, setPhotos] = useState<string[]>([]);
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);

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

    const res = await fetch('/api/work-orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const updated = await res.json();
      setJob(updated as WorkOrder);
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
    const newNote = `[${timestamp}] ${noteText.trim()}`;
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
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="pt-12 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="pt-12 text-center">
        <p className="text-gray-500">Job not found</p>
        <Link href="/admin/tech/jobs" className="text-blue-600 text-sm mt-2 inline-block">
          Back to Jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-4 pb-6 space-y-4">
      {/* Back button */}
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-steel">
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
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
        <h2 className="font-semibold text-navy">{job.customers?.full_name || 'Unknown Customer'}</h2>
        <p className="text-sm text-gray-500">{job.description}</p>
        <div className="flex gap-2 pt-1">
          {job.customers?.phone && (
            <a
              href={`tel:${job.customers.phone}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-medium"
            >
              <Phone className="w-3.5 h-3.5" />
              Call
            </a>
          )}
          {job.customers?.address && (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(job.customers.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-light text-accent text-xs font-medium"
            >
              <MapPin className="w-3.5 h-3.5" />
              Maps
            </a>
          )}
          <Link
            href={`/admin/tech/report/${job.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 text-xs font-medium"
          >
            <FileText className="w-3.5 h-3.5" />
            Report
          </Link>
          <Link
            href={`/admin/tech/jobs/${job.id}/quote`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ember/10 text-ember text-xs font-medium"
          >
            <Receipt className="w-3.5 h-3.5" />
            Quote
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-md text-xs font-medium transition ${
              activeTab === tab.key ? 'bg-white shadow-sm text-navy' : 'text-steel'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        {activeTab === 'photos' && (
          <PhotoCapture workOrderId={job.id} photos={photos} onPhotosChange={setPhotos} />
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
            {job.notes && (
              <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                {job.notes.split('\n').map((line, i) => (
                  <p key={i} className="text-sm text-gray-700 mb-1">{line}</p>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note..."
                className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
              />
              <button
                onClick={handleAddNote}
                disabled={!noteText.trim()}
                className="px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-40"
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
          className="w-full py-3 rounded-xl bg-accent text-white font-semibold hover:bg-accent-dark active:bg-accent-dark flex items-center justify-center gap-2"
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
          className="w-full py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 active:bg-green-800 disabled:opacity-50"
        >
          {saving ? 'Saving...' : job.signature_url ? 'Complete Job' : 'Sign & Complete Job'}
        </button>
      )}
    </div>
  );
}
