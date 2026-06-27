'use client';

import { useState, useMemo } from 'react';
import { Plus, Building2 } from 'lucide-react';
import type { InstallRoom, UXMode } from '@/lib/installs/types';
import { RoomCard } from '@/components/installs/RoomCard';
import { RoomEditor } from '@/components/installs/RoomEditor';

interface BuildingModelTabProps {
  projectId: string;
  rooms: InstallRoom[];
  mode: UXMode;
  onRoomsChange: (rooms: InstallRoom[]) => void;
}

export function BuildingModelTab({ projectId, rooms, mode, onRoomsChange }: BuildingModelTabProps) {
  const [showEditor, setShowEditor] = useState(false);
  const [editingRoom, setEditingRoom] = useState<InstallRoom | undefined>(undefined);
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null);

  const totalSqft = useMemo(
    () => rooms.reduce((sum, r) => sum + (r.sqft || 0), 0),
    [rooms],
  );

  const handleAddRoom = () => {
    setEditingRoom(undefined);
    setShowEditor(true);
  };

  const handleEditRoom = (room: InstallRoom) => {
    setEditingRoom(room);
    setShowEditor(true);
  };

  const handleDeleteRoom = async (roomId: string) => {
    try {
      const res = await fetch(`/api/installs/rooms?id=${roomId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete room');
      onRoomsChange(rooms.filter((r) => r.id !== roomId));
      if (expandedRoomId === roomId) setExpandedRoomId(null);
    } catch {
      // Silently fail — could add toast later
    }
  };

  const handleRoomSaved = (savedRoom: InstallRoom) => {
    const exists = rooms.find((r) => r.id === savedRoom.id);
    if (exists) {
      onRoomsChange(rooms.map((r) => (r.id === savedRoom.id ? savedRoom : r)));
    } else {
      onRoomsChange([...rooms, savedRoom]);
    }
    setShowEditor(false);
    setEditingRoom(undefined);
  };

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-[var(--navy)]">Building Model</h3>
          {rooms.length > 0 && (
            <p className="text-sm text-[var(--steel)]">
              {rooms.length} room{rooms.length !== 1 ? 's' : ''}, {totalSqft.toLocaleString()} total sq ft
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleAddRoom}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-[var(--accent)] rounded-full hover:bg-[var(--accent-dark)] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Room
        </button>
      </div>

      {/* Room grid or empty state */}
      {rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
          <Building2 className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-sm font-semibold text-[var(--navy)] mb-1">No rooms added yet</p>
          <p className="text-sm text-[var(--steel)] text-center max-w-sm">
            Start by adding rooms to model the building. Each room&apos;s dimensions and insulation
            values feed into the load calculation.
          </p>
          <button
            type="button"
            onClick={handleAddRoom}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-[var(--accent)] border border-[var(--accent)] rounded-full hover:bg-[var(--accent)]/5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add First Room
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              mode={mode}
              onEdit={handleEditRoom}
              onDelete={handleDeleteRoom}
              isExpanded={expandedRoomId === room.id}
              onToggleExpand={() =>
                setExpandedRoomId(expandedRoomId === room.id ? null : room.id)
              }
            />
          ))}
        </div>
      )}

      {/* Room editor modal */}
      <RoomEditor
        projectId={projectId}
        room={editingRoom}
        isOpen={showEditor}
        onClose={() => {
          setShowEditor(false);
          setEditingRoom(undefined);
        }}
        onSaved={handleRoomSaved}
      />
    </div>
  );
}
