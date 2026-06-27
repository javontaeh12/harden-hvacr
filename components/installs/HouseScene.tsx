'use client';

import { RoomLayout, DuctPath3D, LayerVisibility } from '@/lib/installs/types';
import { VIEWER_COLORS } from '@/lib/installs/constants';
import RoomGroup from './geometry/RoomGroup';
import DuctNetwork from './ductwork/DuctNetwork';
import EquipmentGroup from './equipment/EquipmentGroup';
import VentMarkers from './markers/VentMarkers';

interface HouseSceneProps {
  layout: RoomLayout[];
  ductPaths: DuctPath3D[];
  ahLocation: string;
  visibleLayers: LayerVisibility;
}

/**
 * The main scene graph rendered inside the Three.js <Canvas>.
 * Currently renders rooms and a ground plane. Duct paths, vents, and equipment
 * will be added in subsequent phases.
 */
export default function HouseScene({ layout, ductPaths, ahLocation, visibleLayers }: HouseSceneProps) {
  // Calculate ground plane size based on the footprint of all rooms
  const bounds = layout.reduce(
    (acc, r) => ({
      minX: Math.min(acc.minX, r.x),
      maxX: Math.max(acc.maxX, r.x + r.width),
      minZ: Math.min(acc.minZ, r.z),
      maxZ: Math.max(acc.maxZ, r.z + r.depth),
    }),
    { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity },
  );

  // Add some padding around the house
  const padding = 3;
  const groundWidth = (bounds.maxX - bounds.minX) + padding * 2;
  const groundDepth = (bounds.maxZ - bounds.minZ) + padding * 2;
  const groundCenterX = (bounds.minX + bounds.maxX) / 2;
  const groundCenterZ = (bounds.minZ + bounds.maxZ) / 2;

  // Fallback for empty layout
  const hasRooms = layout.length > 0 && isFinite(bounds.minX);

  return (
    <>
      {/* ---- Ground Plane ---- */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[
          hasRooms ? groundCenterX : 0,
          -0.01, // slightly below y=0 to avoid z-fighting with floors
          hasRooms ? groundCenterZ : 0,
        ]}
        receiveShadow
      >
        <planeGeometry args={[hasRooms ? groundWidth : 30, hasRooms ? groundDepth : 30]} />
        <meshStandardMaterial color={VIEWER_COLORS.GROUND} />
      </mesh>

      {/* ---- Rooms ---- */}
      {layout.map((room) => (
        <RoomGroup
          key={room.roomId}
          room={room}
          showWalls={visibleLayers.walls}
          showCeiling={visibleLayers.ceiling}
          showLabel={visibleLayers.labels}
        />
      ))}

      {/* ---- Ductwork ---- */}
      <DuctNetwork paths={ductPaths} visible={visibleLayers.ducts} />

      {/* ---- Equipment ---- */}
      <EquipmentGroup
        rooms={layout}
        ahLocation={ahLocation}
        visible={visibleLayers.equipment}
      />

      {/* ---- Vent Markers ---- */}
      <VentMarkers
        rooms={layout}
        showSupply={visibleLayers.supplyVents}
        showReturn={visibleLayers.returnVents}
      />
    </>
  );
}
