'use client';

import { useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/components/AuthProvider';
import { ProjectHeader } from '@/components/installs/ProjectHeader';
import { BuildingModelTab } from '@/components/installs/tabs/BuildingModelTab';
import { LoadSummaryTab } from '@/components/installs/tabs/LoadSummaryTab';
import { EquipmentSelectionTab } from '@/components/installs/tabs/EquipmentSelectionTab';
import { DuctLayoutTab } from '@/components/installs/tabs/DuctLayoutTab';
import { MaterialsTakeoffTab } from '@/components/installs/tabs/MaterialsTakeoffTab';
import { ProposalBuilderTab } from '@/components/installs/tabs/ProposalBuilderTab';
import { DocumentViewer } from '@/components/installs/documents/DocumentViewer';
import {
  Building2,
  Box,
  Thermometer,
  Cpu,
  Wind,
  Package,
  FileText,
  ClipboardList,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import type {
  InstallProject,
  InstallRoom,
  InstallEquipmentOption,
  InstallProposal,
  UXMode,
} from '@/lib/installs/types';

const HouseViewer3D = dynamic(
  () => import('@/components/installs/HouseViewer3D'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] md:h-[600px] bg-gray-100 rounded-xl animate-pulse flex items-center justify-center">
        <p className="text-gray-500">Loading 3D viewer...</p>
      </div>
    ),
  }
);

interface ProjectDetailClientProps {
  initialProject: InstallProject & {
    install_rooms: InstallRoom[];
    install_equipment_options: InstallEquipmentOption[];
    install_proposals: InstallProposal[];
  };
}

type TabKey = 'building' | '3d' | 'loads' | 'equipment' | 'ducts' | 'materials' | 'proposal' | 'documents';

interface TabDef {
  key: TabKey;
  label: string;
  icon: typeof Building2;
  modes: UXMode[]; // which modes show this tab
}

const allTabs: TabDef[] = [
  { key: 'building', label: 'Building', icon: Building2, modes: ['sales', 'design', 'production'] },
  { key: '3d', label: '3D View', icon: Box, modes: ['sales', 'design'] },
  { key: 'loads', label: 'Loads', icon: Thermometer, modes: ['design'] },
  { key: 'equipment', label: 'Equipment', icon: Cpu, modes: ['sales', 'design'] },
  { key: 'ducts', label: 'Ducts', icon: Wind, modes: ['design'] },
  { key: 'materials', label: 'Materials', icon: Package, modes: ['design', 'production'] },
  { key: 'proposal', label: 'Proposal', icon: FileText, modes: ['sales'] },
  { key: 'documents', label: 'Documents', icon: ClipboardList, modes: ['production'] },
];

// Workflow steps for the progress bar
const WORKFLOW_STEPS = [
  { key: 'rooms', label: 'Rooms' },
  { key: 'loads', label: 'Loads' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'ducts', label: 'Ducts' },
  { key: 'materials', label: 'Materials' },
  { key: 'proposal', label: 'Proposal' },
] as const;

export default function ProjectDetailClient({ initialProject }: ProjectDetailClientProps) {
  const { groupId } = useAuth();
  const [project, setProject] = useState(initialProject);
  const [rooms, setRooms] = useState<InstallRoom[]>(initialProject.install_rooms || []);
  const [activeTab, setActiveTab] = useState<TabKey>('building');

  // Filter tabs by current mode
  const visibleTabs = useMemo(
    () => allTabs.filter(t => t.modes.includes(project.current_mode)),
    [project.current_mode]
  );

  // When mode changes, reset tab if current tab is hidden
  const handleModeChange = (mode: UXMode) => {
    setProject((prev) => ({ ...prev, current_mode: mode }));
    const newVisible = allTabs.filter(t => t.modes.includes(mode));
    if (!newVisible.find(t => t.key === activeTab)) {
      setActiveTab(newVisible[0]?.key ?? 'building');
    }
  };

  // Workflow progress calculation
  const workflowProgress = useMemo(() => {
    const hasRooms = rooms.length > 0;
    const hasLoads = rooms.some(r => r.cooling_cfm && r.cooling_cfm > 0);
    const hasEquipment = (initialProject.install_equipment_options || []).length > 0;
    // Ducts/materials/proposal we can't check without fetching, but we can infer from status
    const status = project.status;
    const hasDucts = ['designing', 'proposal_sent', 'accepted', 'scheduled', 'in_progress', 'completed'].includes(status) || hasEquipment;
    const hasMaterials = hasDucts;
    const hasProposal = (initialProject.install_proposals || []).length > 0;

    return {
      rooms: hasRooms,
      loads: hasLoads,
      equipment: hasEquipment,
      ducts: hasDucts && hasEquipment,
      materials: hasMaterials && hasEquipment,
      proposal: hasProposal,
    };
  }, [rooms, initialProject.install_equipment_options, initialProject.install_proposals, project.status]);

  const completedSteps = Object.values(workflowProgress).filter(Boolean).length;

  const refreshProject = useCallback(async () => {
    if (!groupId) return;
    try {
      const res = await fetch(
        `/api/installs/projects?id=${project.id}&group_id=${groupId}`
      );
      if (res.ok) {
        const data = await res.json();
        setProject(data);
        setRooms(data.install_rooms || []);
      }
    } catch (err) {
      console.error('Failed to refresh project:', err);
    }
  }, [project.id, groupId]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'building':
        return (
          <BuildingModelTab
            projectId={project.id}
            rooms={rooms}
            mode={project.current_mode}
            onRoomsChange={setRooms}
          />
        );
      case '3d':
        return (
          <HouseViewer3D
            rooms={rooms}
            ductSegments={[]}
            ahLocation="attic"
            className="rounded-xl border border-gray-200 shadow-sm overflow-hidden"
          />
        );
      case 'loads':
        return (
          <LoadSummaryTab
            projectId={project.id}
            rooms={rooms}
            onRoomsChange={setRooms}
          />
        );
      case 'equipment':
        return (
          <EquipmentSelectionTab
            projectId={project.id}
          />
        );
      case 'ducts':
        return (
          <DuctLayoutTab
            projectId={project.id}
            rooms={rooms}
          />
        );
      case 'materials':
        return (
          <MaterialsTakeoffTab
            projectId={project.id}
          />
        );
      case 'proposal':
        return (
          <ProposalBuilderTab
            projectId={project.id}
            project={project}
          />
        );
      case 'documents':
        return (
          <DocumentViewer
            projectId={project.id}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Project Header */}
      <ProjectHeader
        project={project}
        onModeChange={handleModeChange}
        onRefresh={refreshProject}
      />

      {/* Workflow Progress Bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 print:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[var(--navy)] uppercase tracking-wide">Workflow</span>
          <span className="text-xs font-medium text-[var(--steel)]">{completedSteps}/{WORKFLOW_STEPS.length} steps</span>
        </div>
        <div className="flex items-center gap-1">
          {WORKFLOW_STEPS.map((step, i) => {
            const done = workflowProgress[step.key];
            return (
              <div key={step.key} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-center">
                  {i > 0 && (
                    <div className={`flex-1 h-0.5 ${done ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                  )}
                  {done ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />
                  )}
                  {i < WORKFLOW_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 ${done ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                  )}
                </div>
                <span className={`text-[10px] font-medium ${done ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-1 min-w-max border-b border-gray-200">
          {visibleTabs.map(({ key, label, icon: Icon }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`
                  inline-flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium whitespace-nowrap
                  border-b-2 transition-all
                  ${isActive
                    ? 'border-ember text-ember'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {renderTabContent()}
      </div>
    </div>
  );
}
