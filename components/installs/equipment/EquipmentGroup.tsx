'use client';

import { useMemo } from 'react';
import { RoomLayout } from '@/lib/installs/types';
import { FEET_TO_UNITS } from '@/lib/installs/constants';
import AirHandlerModel from './AirHandlerModel';
import CondenserModel from './CondenserModel';

interface EquipmentGroupProps {
  rooms: RoomLayout[];
  ahLocation: string;
  visible: boolean;
}

export default function EquipmentGroup({ rooms, ahLocation, visible }: EquipmentGroupProps) {
  const { ahPosition, condenserPosition } = useMemo(() => {
    if (rooms.length === 0) {
      return {
        ahPosition: [0, 0, 0] as [number, number, number],
        condenserPosition: [2, 0, 0] as [number, number, number],
      };
    }

    // Compute bounding box of all rooms
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    let maxCeilingY = -Infinity;

    for (const room of rooms) {
      const rMinX = room.x - room.width / 2;
      const rMaxX = room.x + room.width / 2;
      const rMinZ = room.z - room.depth / 2;
      const rMaxZ = room.z + room.depth / 2;
      const ceilingY = room.y + room.height;

      if (rMinX < minX) minX = rMinX;
      if (rMaxX > maxX) maxX = rMaxX;
      if (rMinZ < minZ) minZ = rMinZ;
      if (rMaxZ > maxZ) maxZ = rMaxZ;
      if (ceilingY > maxCeilingY) maxCeilingY = ceilingY;
    }

    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;

    // Determine AH position based on location type
    let ahPos: [number, number, number];

    switch (ahLocation) {
      case 'attic':
      case 'rooftop':
        ahPos = [centerX, maxCeilingY, centerZ];
        break;

      case 'closet':
      case 'utility_room': {
        // Try to find a utility/closet room
        const utilityRoom = rooms.find(
          r => r.roomType === 'utility' || r.roomType === 'closet'
        );
        if (utilityRoom) {
          ahPos = [utilityRoom.x, utilityRoom.y, utilityRoom.z];
        } else {
          ahPos = [centerX, 0, centerZ];
        }
        break;
      }

      case 'garage': {
        const garageRoom = rooms.find(r => r.roomType === 'garage');
        if (garageRoom) {
          ahPos = [garageRoom.x, garageRoom.y, garageRoom.z];
        } else {
          // Place at house edge
          ahPos = [maxX + 0.3, 0, centerZ];
        }
        break;
      }

      case 'basement':
      case 'crawlspace':
        ahPos = [centerX, -1, centerZ];
        break;

      default:
        ahPos = [centerX, maxCeilingY, centerZ];
    }

    // Condenser position: outside the house (past max X, at ground level, centered Z)
    const condenserOffset = 3 * FEET_TO_UNITS + 0.5;
    const condPos: [number, number, number] = [maxX + condenserOffset, 0, centerZ];

    return { ahPosition: ahPos, condenserPosition: condPos };
  }, [rooms, ahLocation]);

  if (!visible) return null;

  return (
    <group name="equipment-group">
      <AirHandlerModel position={ahPosition} visible={visible} />
      <CondenserModel position={condenserPosition} visible={visible} />
    </group>
  );
}
