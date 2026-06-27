'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { FEET_TO_UNITS, VIEWER_COLORS } from '@/lib/installs/constants';

interface CondenserModelProps {
  position: [number, number, number];
  visible: boolean;
}

export default function CondenserModel({ position, visible }: CondenserModelProps) {
  // Condenser: 3ft wide x 2.5ft tall x 3ft deep in scene units
  const width = 3 * FEET_TO_UNITS;
  const height = 2.5 * FEET_TO_UNITS;
  const depth = 3 * FEET_TO_UNITS;

  const boxMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: VIEWER_COLORS.CONDENSER,
      metalness: 0.4,
      roughness: 0.5,
    });
  }, []);

  const boxGeometry = useMemo(() => {
    return new THREE.BoxGeometry(width, height, depth);
  }, [width, height, depth]);

  // Fan circle on top (torus ring)
  const fanMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#222222',
      metalness: 0.6,
      roughness: 0.3,
    });
  }, []);

  const fanGeometry = useMemo(() => {
    const radius = Math.min(width, depth) * 0.35;
    const tube = 0.02;
    return new THREE.TorusGeometry(radius, tube, 8, 24);
  }, [width, depth]);

  // Fan hub in center
  const hubGeometry = useMemo(() => {
    return new THREE.CylinderGeometry(0.03, 0.03, 0.02, 12);
  }, []);

  if (!visible) return null;

  return (
    <group position={position} name="condenser">
      {/* Main body */}
      <mesh geometry={boxGeometry} material={boxMaterial} position={[0, height / 2, 0]} />

      {/* Fan ring on top */}
      <group position={[0, height + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh geometry={fanGeometry} material={fanMaterial} />
        <mesh geometry={hubGeometry} material={fanMaterial} rotation={[Math.PI / 2, 0, 0]} />
      </group>

      {/* Label */}
      <Html
        position={[0, height + 0.25, 0]}
        center
        distanceFactor={8}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            background: 'rgba(74, 101, 128, 0.85)',
            color: '#fff',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            userSelect: 'none',
          }}
        >
          Condenser
        </div>
      </Html>
    </group>
  );
}
