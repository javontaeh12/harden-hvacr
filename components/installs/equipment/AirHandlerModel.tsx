'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { FEET_TO_UNITS, VIEWER_COLORS } from '@/lib/installs/constants';

interface AirHandlerModelProps {
  position: [number, number, number];
  visible: boolean;
}

export default function AirHandlerModel({ position, visible }: AirHandlerModelProps) {
  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: VIEWER_COLORS.AIR_HANDLER,
      metalness: 0.2,
      roughness: 0.7,
    });
  }, []);

  // Air handler: 2ft wide x 3ft tall x 2ft deep in scene units
  const width = 2 * FEET_TO_UNITS;
  const height = 3 * FEET_TO_UNITS;
  const depth = 2 * FEET_TO_UNITS;

  const geometry = useMemo(() => {
    return new THREE.BoxGeometry(width, height, depth);
  }, [width, height, depth]);

  if (!visible) return null;

  return (
    <group position={position} name="air-handler">
      <mesh geometry={geometry} material={material} position={[0, height / 2, 0]} />
      <Html
        position={[0, height + 0.15, 0]}
        center
        distanceFactor={8}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            background: 'rgba(10, 31, 63, 0.85)',
            color: '#fff',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            userSelect: 'none',
          }}
        >
          AH
        </div>
      </Html>
    </group>
  );
}
