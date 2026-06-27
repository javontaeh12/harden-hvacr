'use client';

import { useState } from 'react';
import { ArrowLeft, Pencil, Check, X, MapPin, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { ProjectStatusBadge } from '@/components/installs/ProjectStatusBadge';
import { ModeToggle } from '@/components/installs/ModeToggle';
import type { InstallProject, ProjectStatus, UXMode } from '@/lib/installs/types';

interface ProjectHeaderProps {
  project: InstallProject;
  onModeChange: (mode: UXMode) => void;
  onRefresh: () => void;
}

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'survey', label: 'Survey' },
  { value: 'designing', label: 'Designing' },
  { value: 'proposal_sent', label: 'Proposal Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function ProjectHeader({ project, onModeChange, onRefresh }: ProjectHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(project.project_name);
  const [saving, setSaving] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const handleSaveName = async () => {
    if (!editName.trim() || editName.trim() === project.project_name) {
      setIsEditing(false);
      setEditName(project.project_name);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/installs/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: project.id, project_name: editName.trim() }),
      });
      if (res.ok) {
        setIsEditing(false);
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to update project name:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleModeChange = async (mode: UXMode) => {
    try {
      const res = await fetch('/api/installs/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: project.id, current_mode: mode }),
      });
      if (res.ok) {
        onModeChange(mode);
      }
    } catch (err) {
      console.error('Failed to update mode:', err);
    }
  };

  const handleStatusChange = async (status: ProjectStatus) => {
    setShowStatusMenu(false);
    try {
      const res = await fetch('/api/installs/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: project.id, status }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const fullAddress = [project.address, project.city, project.state, project.zip]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="space-y-4">
      {/* Back button */}
      <Link
        href="/admin/installs"
        className="inline-flex items-center gap-1.5 text-sm text-steel hover:text-navy transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Installs
      </Link>

      {/* Title row */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="space-y-1 min-w-0 flex-1">
          {/* Project name with inline edit */}
          <div className="flex items-center gap-2">
            {isEditing ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') {
                      setIsEditing(false);
                      setEditName(project.project_name);
                    }
                  }}
                  autoFocus
                  className="text-2xl font-bold text-gray-900 bg-transparent border-b-2 border-ember outline-none flex-1 min-w-0"
                  disabled={saving}
                />
                <button
                  onClick={handleSaveName}
                  disabled={saving}
                  className="p-1.5 rounded-md bg-green-100 text-green-700 hover:bg-green-200 transition-colors disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditName(project.project_name);
                  }}
                  className="p-1.5 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                  {project.project_name}
                </h1>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* Address */}
          {fullAddress && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{fullAddress}</span>
            </div>
          )}

          {/* Customer name */}
          {project.customers?.full_name && (
            <p className="text-sm text-gray-600">{project.customers.full_name}</p>
          )}
        </div>

        {/* Status badge with dropdown */}
        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            className="inline-flex items-center gap-1.5 hover:opacity-80 transition-opacity"
          >
            <ProjectStatusBadge status={project.status} />
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>
          {showStatusMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowStatusMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl border border-gray-200 shadow-lg py-1 min-w-[180px]">
                {STATUS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleStatusChange(opt.value)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                      project.status === opt.value ? 'text-[var(--accent)] font-semibold' : 'text-[var(--navy)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Mode</span>
        <ModeToggle currentMode={project.current_mode} onChange={handleModeChange} />
      </div>
    </div>
  );
}
