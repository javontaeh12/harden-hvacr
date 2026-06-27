'use client';

import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { RoomLayout } from '@/lib/installs/types';
import { VIEWER_COLORS } from '@/lib/installs/constants';

interface RoomGroupProps {
  room: RoomLayout;
  showWalls: boolean;
  showCeiling: boolean;
  showLabel: boolean;
}

/**
 * Renders a single room as a transparent box structure inside the Three.js scene.
 *
 * Coordinate conventions (inside the group):
 *   - X runs along room.width  (left to right)
 *   - Y runs along room.height (floor to ceiling)
 *   - Z runs along room.depth  (front to back)
 *
 * The group is positioned at [room.x, room.y, room.z] in world space.
 */
export default function RoomGroup({ room, showWalls, showCeiling, showLabel }: RoomGroupProps) {
  const { width, height, depth } = room;

  // Shared wall material
  const wallMaterial = (
    <meshStandardMaterial
      color={VIEWER_COLORS.WALL}
      transparent
      opacity={VIEWER_COLORS.WALL_OPACITY}
      side={THREE.DoubleSide}
      depthWrite={false}
    />
  );

  return (
    <group position={[room.x, room.y, room.z]}>
      {/* ---- Floor ---- */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[width / 2, 0, depth / 2]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={VIEWER_COLORS.FLOOR} side={THREE.DoubleSide} />
      </mesh>

      {/* ---- Walls ---- */}
      {showWalls && (
        <>
          {/* Front wall (z = 0, facing +Z) */}
          <mesh position={[width / 2, height / 2, 0]}>
            <planeGeometry args={[width, height]} />
            {wallMaterial}
          </mesh>

          {/* Back wall (z = depth, facing -Z) */}
          <mesh position={[width / 2, height / 2, depth]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[width, height]} />
            {wallMaterial}
          </mesh>

          {/* Left wall (x = 0, facing +X) */}
          <mesh position={[0, height / 2, depth / 2]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[depth, height]} />
            {wallMaterial}
          </mesh>

          {/* Right wall (x = width, facing -X) */}
          <mesh position={[width, height / 2, depth / 2]} rotation={[0, -Math.PI / 2, 0]}>
            <planeGeometry args={[depth, height]} />
            {wallMaterial}
          </mesh>
        </>
      )}

      {/* ---- Ceiling ---- */}
      {showCeiling && (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[width / 2, height, depth / 2]}>
          <planeGeometry args={[width, depth]} />
          <meshStandardMaterial
            color={VIEWER_COLORS.CEILING}
            transparent
            opacity={VIEWER_COLORS.CEILING_OPACITY}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* ---- Room Label ---- */}
      {showLabel && (
        <Html
          position={[width / 2, height / 2, depth / 2]}
          center
          distanceFactor={10}
          style={{ pointerEvents: 'none' }}
        >
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.65)',
              color: '#fff',
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              userSelect: 'none',
            }}
          >
            {room.name}
          </div>
        </Html>
      )}
    </group>
  );
}
