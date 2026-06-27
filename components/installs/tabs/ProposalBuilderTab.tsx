'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, Eye, Send, Trash2, Edit3, Check } from 'lucide-react';
import type {
  InstallProposal,
  InstallEquipmentOption,
  InstallProject,
  Tier,
  ProposalStatus,
} from '@/lib/installs/types';
import { calculateFinancingMonthly } from '@/lib/installs/proposal-helpers';
import { ProposalPreview } from '@/components/installs/ProposalPreview';

interface ProposalBuilderTabProps {
  projectId: string;
  project: InstallProject;
}

const STATUS_STYLES: Record<ProposalStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700' },
  viewed: { label: 'Viewed', color: 'bg-purple-100 text-purple-700' },
  accepted: { label: 'Accepted', color: 'bg-emerald-100 text-emerald-700' },
  declined: { label: 'Declined', color: 'bg-red-100 text-red-700' },
  expired: { label: 'Expired', color: 'bg-amber-100 text-amber-700' },
};

export function ProposalBuilderTab({ projectId, project }: ProposalBuilderTabProps) {
  const [proposals, setProposals] = useState<InstallProposal[]>([]);
  const [equipmentOptions, setEquipmentOptions] = useState<InstallEquipmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingProposal, setEditingProposal] = useState<InstallProposal | null>(null);
  const [previewProposal, setPreviewProposal] = useState<InstallProposal | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [propRes, eqRes] = await Promise.all([
        fetch(`/api/installs/proposals?project_id=${projectId}`),
        fetch(`/api/installs/equipment-options?project_id=${projectId}`),
      ]);
      if (propRes.ok) setProposals(await propRes.json());
      if (eqRes.ok) setEquipmentOptions(await eqRes.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/installs/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          cover_title: 'HVAC System Proposal',
          cover_subtitle: project.address,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setProposals([created, ...proposals]);
        setEditingProposal(created);
        setShowEditor(true);
      }
    } catch {
      // silent
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/installs/proposals?id=${id}`, { method: 'DELETE' });
      if (res.ok) setProposals(proposals.filter(p => p.id !== id));
    } catch { /* silent */ }
  };

  const handleSend = async (proposal: InstallProposal) => {
    try {
      const res = await fetch('/api/installs/proposals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: proposal.id, status: 'sent' }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProposals(proposals.map(p => p.id === updated.id ? updated : p));
      }
    } catch { /* silent */ }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-[var(--navy)]">Proposal Builder</h3>
          <p className="text-sm text-[var(--steel)]">
            Create and send customer-facing proposals with pricing tiers
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[var(--accent)] rounded-full hover:bg-[var(--accent-dark)] transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Proposal
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-[var(--accent)] rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && proposals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-6 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
          <FileText className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-sm font-semibold text-[var(--navy)] mb-1">No proposals yet</p>
          <p className="text-sm text-[var(--steel)] text-center max-w-sm">
            Create a proposal to present equipment options and pricing to your customer.
          </p>
        </div>
      )}

      {/* Proposal list */}
      {proposals.length > 0 && (
        <div className="space-y-4">
          {proposals.map(p => {
            const statusInfo = STATUS_STYLES[p.status] || STATUS_STYLES.draft;
            return (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-bold text-[var(--navy)]">{p.cover_title}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--steel)]">
                      Created {new Date(p.created_at).toLocaleDateString()}
                      {p.valid_until && ` — Valid until ${new Date(p.valid_until).toLocaleDateString()}`}
                      {p.selected_tier && ` — ${p.selected_tier.charAt(0).toUpperCase() + p.selected_tier.slice(1)} tier selected`}
                    </p>
                    {p.share_token && p.status !== 'draft' && (
                      <p className="text-xs text-blue-500 mt-1">
                        Share link: /proposal/{p.share_token}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPreviewProposal(p)}
                      className="p-2 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                      title="Preview"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditingProposal(p); setShowEditor(true); }}
                      className="p-2 rounded-lg text-gray-400 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors"
                      title="Edit"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {p.status === 'draft' && (
                      <button
                        type="button"
                        onClick={() => handleSend(p)}
                        className="p-2 rounded-lg text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 transition-colors"
                        title="Mark as Sent"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    )}
                    {p.status === 'draft' && (
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Proposal Editor Modal */}
      {showEditor && editingProposal && (
        <ProposalEditorModal
          proposal={editingProposal}
          equipmentOptions={equipmentOptions}
          onClose={() => { setShowEditor(false); setEditingProposal(null); }}
          onSave={async (updates) => {
            try {
              const res = await fetch('/api/installs/proposals', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: editingProposal.id, ...updates }),
              });
              if (res.ok) {
                const updated = await res.json();
                setProposals(proposals.map(p => p.id === updated.id ? updated : p));
                setEditingProposal(updated);
              }
            } catch { /* silent */ }
          }}
        />
      )}

      {/* Preview Modal */}
      {previewProposal && (
        <ProposalPreview
          isOpen={!!previewProposal}
          onClose={() => setPreviewProposal(null)}
          proposal={previewProposal}
          project={project}
          equipmentOptions={equipmentOptions}
        />
      )}
    </div>
  );
}

/* ─── Proposal Editor Modal ─── */

function ProposalEditorModal({
  proposal,
  equipmentOptions,
  onClose,
  onSave,
}: {
  proposal: InstallProposal;
  equipmentOptions: InstallEquipmentOption[];
  onClose: () => void;
  onSave: (updates: Partial<InstallProposal>) => Promise<void>;
}) {
  const [title, setTitle] = useState(proposal.cover_title);
  const [subtitle, setSubtitle] = useState(proposal.cover_subtitle ?? '');
  const [intro, setIntro] = useState(proposal.intro_message ?? '');
  const [closing, setClosing] = useState(proposal.closing_message ?? '');
  const [terms, setTerms] = useState(proposal.company_terms ?? '');
  const [selectedTier, setSelectedTier] = useState<Tier | ''>(proposal.selected_tier ?? '');
  const [showFinancing, setShowFinancing] = useState(proposal.show_financing);
  const [finProvider, setFinProvider] = useState(proposal.financing_provider ?? '');
  const [finTermMonths, setFinTermMonths] = useState(proposal.financing_term_months ?? 60);
  const [finApr, setFinApr] = useState(proposal.financing_apr ?? 5.99);
  const [validUntil, setValidUntil] = useState(
    proposal.valid_until ? proposal.valid_until.split('T')[0] : ''
  );
  const [saving, setSaving] = useState(false);

  // Calculate monthly payment from selected tier
  const selectedOption = equipmentOptions.find(o => o.tier === selectedTier);
  const finMonthly = selectedOption && showFinancing
    ? calculateFinancingMonthly(selectedOption.total, finApr, finTermMonths)
    : null;

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      cover_title: title,
      cover_subtitle: subtitle || null,
      intro_message: intro || null,
      closing_message: closing || null,
      company_terms: terms || null,
      selected_tier: selectedTier || null,
      show_financing: showFinancing,
      financing_provider: finProvider || null,
      financing_term_months: finTermMonths,
      financing_apr: finApr,
      financing_monthly: finMonthly,
      valid_until: validUntil ? new Date(validUntil).toISOString() : null,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl z-10">
          <h3 className="text-lg font-bold text-[var(--navy)]">Edit Proposal</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <span className="text-gray-500 text-sm">Close</span>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Cover */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-[var(--navy)]">Cover</h4>
            <div>
              <label className="block text-xs font-medium text-[var(--steel)] mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--steel)] mb-1">Subtitle</label>
              <input
                type="text"
                value={subtitle}
                onChange={e => setSubtitle(e.target.value)}
                placeholder="e.g. property address"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] outline-none"
              />
            </div>
          </div>

          {/* Messages */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-[var(--navy)]">Messages</h4>
            <div>
              <label className="block text-xs font-medium text-[var(--steel)] mb-1">Intro Message</label>
              <textarea
                value={intro}
                onChange={e => setIntro(e.target.value)}
                rows={3}
                placeholder="Thank you for choosing Harden HVACR..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--steel)] mb-1">Closing Message</label>
              <textarea
                value={closing}
                onChange={e => setClosing(e.target.value)}
                rows={3}
                placeholder="We look forward to serving you..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] outline-none resize-none"
              />
            </div>
          </div>

          {/* Tier selection */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-[var(--navy)]">Recommended Tier</h4>
            <div className="flex gap-2">
              {(['good', 'better', 'best'] as Tier[]).map(t => {
                const opt = equipmentOptions.find(o => o.tier === t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedTier(t)}
                    disabled={!opt}
                    className={`flex-1 p-3 rounded-xl border text-left transition-colors ${
                      selectedTier === t
                        ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${!opt ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <p className="text-xs font-semibold capitalize text-[var(--navy)]">{t}</p>
                    {opt && <p className="text-sm font-bold text-[var(--navy)]">${opt.total.toLocaleString()}</p>}
                    {!opt && <p className="text-xs text-[var(--steel)]">No option</p>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Financing */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h4 className="text-sm font-semibold text-[var(--navy)]">Financing</h4>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showFinancing}
                  onChange={e => setShowFinancing(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--accent)]"></div>
              </label>
            </div>
            {showFinancing && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--steel)] mb-1">Provider</label>
                  <input
                    type="text"
                    value={finProvider}
                    onChange={e => setFinProvider(e.target.value)}
                    placeholder="e.g. GreenSky"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--steel)] mb-1">Term (months)</label>
                  <input
                    type="number"
                    value={finTermMonths}
                    onChange={e => setFinTermMonths(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--steel)] mb-1">APR %</label>
                  <input
                    type="number"
                    value={finApr}
                    onChange={e => setFinApr(Number(e.target.value))}
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] outline-none"
                  />
                </div>
              </div>
            )}
            {showFinancing && finMonthly && (
              <p className="text-sm text-emerald-600 font-medium">
                Estimated monthly: ${finMonthly}/mo
              </p>
            )}
          </div>

          {/* Terms */}
          <div>
            <label className="block text-xs font-medium text-[var(--steel)] mb-1">Terms & Conditions</label>
            <textarea
              value={terms}
              onChange={e => setTerms(e.target.value)}
              rows={4}
              placeholder="Standard warranty applies..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] outline-none resize-none"
            />
          </div>

          {/* Valid until */}
          <div>
            <label className="block text-xs font-medium text-[var(--steel)] mb-1">Valid Until</label>
            <input
              type="date"
              value={validUntil}
              onChange={e => setValidUntil(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0 bg-white rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[var(--steel)] border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-dark)] transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : <><Check className="w-4 h-4" /> Save Proposal</>}
          </button>
        </div>
      </div>
    </div>
  );
}
