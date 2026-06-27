'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { VIEWER_COLORS } from '@/lib/installs/constants';

interface ReturnVentMarkerProps {
  position: [number, number, number];
  label?: string;
}

export default function ReturnVentMarker({ position, label }: ReturnVentMarkerProps) {
  const geometry = useMemo(() => {
    // Slightly larger rectangle: 0.5 x 0.05 x 0.3 scene units
    return new THREE.BoxGeometry(0.5, 0.05, 0.3);
  }, []);

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: VIEWER_COLORS.RETURN_VENT,
      metalness: 0.1,
      roughness: 0.8,
    });
  }, []);

  return (
    <group position={position} name="return-vent-marker">
      <mesh geometry={geometry} material={material} />
      {label && (
        <Html
          position={[0, -0.1, 0]}
          center
          distanceFactor={6}
          style={{ pointerEvents: 'none' }}
        >
          <div
            style={{
              background: 'rgba(229, 91, 43, 0.85)',
              color: '#fff',
              padding: '1px 5px',
              borderRadius: '3px',
              fontSize: '9px',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              userSelect: 'none',
            }}
          >
            {label}
          </div>
        </Html>
      )}
    </group>
  );
}
