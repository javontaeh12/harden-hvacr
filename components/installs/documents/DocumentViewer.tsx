'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, RefreshCw, Printer, Trash2, ClipboardList, Package, FileCheck } from 'lucide-react';
import type { InstallDocument, DocType } from '@/lib/installs/types';
import { ScopeOfWork } from './ScopeOfWork';
import { InstallChecklist } from './InstallChecklist';
import { PartsList } from './PartsList';

interface DocumentViewerProps {
  projectId: string;
}

const DOC_TYPE_INFO: Record<DocType, { label: string; icon: typeof FileText }> = {
  scope_of_work: { label: 'Scope of Work', icon: FileCheck },
  install_checklist: { label: 'Install Checklist', icon: ClipboardList },
  parts_list: { label: 'Parts List', icon: Package },
  equipment_spec: { label: 'Equipment Spec', icon: FileText },
  permit_application: { label: 'Permit Application', icon: FileText },
  inspection_report: { label: 'Inspection Report', icon: FileText },
};

export function DocumentViewer({ projectId }: DocumentViewerProps) {
  const [documents, setDocuments] = useState<InstallDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch(`/api/installs/documents?project_id=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
        if (data.length > 0 && !activeDocId) {
          setActiveDocId(data[0].id);
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [projectId, activeDocId]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const generateAll = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/installs/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, action: 'auto_generate' }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Generation failed');
      }
      const data = await res.json();
      setDocuments(data);
      if (data.length > 0) setActiveDocId(data[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }, [projectId]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/installs/documents?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        const remaining = documents.filter(d => d.id !== id);
        setDocuments(remaining);
        if (activeDocId === id) {
          setActiveDocId(remaining.length > 0 ? remaining[0].id : null);
        }
      }
    } catch { /* silent */ }
  };

  const handleChecklistUpdate = async (docId: string, content: Record<string, unknown>) => {
    try {
      await fetch('/api/installs/documents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: docId, content }),
      });
      setDocuments(documents.map(d => d.id === docId ? { ...d, content } : d));
    } catch { /* silent */ }
  };

  const handlePrint = () => {
    window.print();
  };

  const activeDoc = documents.find(d => d.id === activeDocId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-[var(--navy)]">Production Documents</h3>
          <p className="text-sm text-[var(--steel)]">
            Scope of work, install checklist, and parts list for the crew
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeDoc && (
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--navy)] border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          )}
          <button
            type="button"
            onClick={generateAll}
            disabled={generating}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[var(--accent)] rounded-full hover:bg-[var(--accent-dark)] transition-colors disabled:opacity-50"
          >
            {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {generating ? 'Generating...' : documents.length > 0 ? 'Regenerate All' : 'Generate Documents'}
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 print:hidden">{error}</div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-[var(--accent)] rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && documents.length === 0 && !generating && (
        <div className="flex flex-col items-center justify-center py-16 px-6 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 print:hidden">
          <FileText className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-sm font-semibold text-[var(--navy)] mb-1">No documents generated</p>
          <p className="text-sm text-[var(--steel)] text-center max-w-sm">
            Click &quot;Generate Documents&quot; to create scope of work, install checklist, and parts list.
          </p>
        </div>
      )}

      {/* Document tabs + content */}
      {documents.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Document sidebar */}
          <div className="lg:w-56 flex-shrink-0 print:hidden">
            <div className="space-y-1">
              {documents.map(doc => {
                const info = DOC_TYPE_INFO[doc.doc_type as DocType] || { label: doc.doc_type, icon: FileText };
                const Icon = info.icon;
                const isActive = activeDocId === doc.id;

                return (
                  <div key={doc.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setActiveDocId(doc.id)}
                      className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                        isActive
                          ? 'bg-[var(--accent)]/10 text-[var(--accent)] font-semibold'
                          : 'text-[var(--steel)] hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{info.label}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(doc.id)}
                      className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Document content */}
          <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm p-6 lg:p-8 print:border-none print:shadow-none print:p-0">
            {activeDoc && activeDoc.doc_type === 'scope_of_work' && (
              <ScopeOfWork document={activeDoc} />
            )}
            {activeDoc && activeDoc.doc_type === 'install_checklist' && (
              <InstallChecklist
                document={activeDoc}
                editable
                onUpdate={(content) => handleChecklistUpdate(activeDoc.id, content)}
              />
            )}
            {activeDoc && activeDoc.doc_type === 'parts_list' && (
              <PartsList document={activeDoc} />
            )}
            {activeDoc && !['scope_of_work', 'install_checklist', 'parts_list'].includes(activeDoc.doc_type) && (
              <div className="text-center py-12">
                <p className="text-sm text-[var(--steel)]">Document type &quot;{activeDoc.doc_type}&quot; preview not yet supported.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
