'use client';

import { useMemo } from 'react';
import { RoomLayout } from '@/lib/installs/types';
import SupplyVentMarker from './SupplyVentMarker';
import ReturnVentMarker from './ReturnVentMarker';

interface VentMarkersProps {
  rooms: RoomLayout[];
  showSupply: boolean;
  showReturn: boolean;
}

interface VentPlacement {
  key: string;
  position: [number, number, number];
  label?: string;
}

export default function VentMarkers({ rooms, showSupply, showReturn }: VentMarkersProps) {
  const { supplyVents, returnVents } = useMemo(() => {
    const supply: VentPlacement[] = [];
    const returns: VentPlacement[] = [];

    for (const room of rooms) {
      const ceilingY = room.y + room.height - 0.03; // slight offset below ceiling
      const numVents = room.numSupplyVents || 0;

      if (numVents > 0) {
        // Distribute supply vents across the room ceiling
        if (numVents === 1) {
          supply.push({
            key: `supply-${room.roomId}-0`,
            position: [room.x, ceilingY, room.z],
            label: room.name,
          });
        } else {
          // Distribute in a line across the room width
          const spacing = room.width * 0.7; // use 70% of room width for distribution
          const startX = room.x - spacing / 2;
          const step = numVents > 1 ? spacing / (numVents - 1) : 0;

          for (let i = 0; i < numVents; i++) {
            const ventX = startX + step * i;
            // Alternate Z slightly for visual clarity when many vents
            const zOffset = numVents > 2 ? (i % 2 === 0 ? -0.05 : 0.05) : 0;
            supply.push({
              key: `supply-${room.roomId}-${i}`,
              position: [ventX, ceilingY, room.z + zOffset],
              label: i === 0 ? room.name : undefined,
            });
          }
        }
      }

      // Return vent: positioned on a wall near floor level
      if (room.hasReturnVent) {
        const returnY = room.y + 0.15; // near floor
        // Position on the "wall" -- offset toward the edge of the room
        const wallX = room.x - room.width / 2 + 0.1;
        returns.push({
          key: `return-${room.roomId}`,
          position: [wallX, returnY, room.z],
          label: `${room.name} Return`,
        });
      }
    }

    return { supplyVents: supply, returnVents: returns };
  }, [rooms]);

  if (!showSupply && !showReturn) return null;

  return (
    <group name="vent-markers">
      {showSupply &&
        supplyVents.map((vent) => (
          <SupplyVentMarker
            key={vent.key}
            position={vent.position}
            label={vent.label}
          />
        ))}
      {showReturn &&
        returnVents.map((vent) => (
          <ReturnVentMarker
            key={vent.key}
            position={vent.position}
            label={vent.label}
          />
        ))}
    </group>
  );
}
