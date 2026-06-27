'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { VIEWER_COLORS } from '@/lib/installs/constants';

interface DuctPathProps {
  points: [number, number, number][];
  diameter: number;
  type: 'supply_trunk' | 'supply_branch' | 'return_trunk' | 'return_drop';
}

export default function DuctPath({ points, diameter, type }: DuctPathProps) {
  const { geometry, material } = useMemo(() => {
    // Need at least 2 points for a curve
    if (points.length < 2) return { geometry: null, material: null };

    const curvePoints = points.map(p => new THREE.Vector3(p[0], p[1], p[2]));
    const curve = new THREE.CatmullRomCurve3(curvePoints, false, 'catmullrom', 0.5);

    const tubularSegments = 32;
    const radius = diameter / 2;
    const radialSegments = 12;

    const geo = new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false);

    const isSupply = type === 'supply_trunk' || type === 'supply_branch';
    const color = isSupply ? VIEWER_COLORS.SUPPLY_DUCT : VIEWER_COLORS.RETURN_DUCT;

    const mat = new THREE.MeshStandardMaterial({
      color,
      metalness: 0.3,
      roughness: 0.6,
      transparent: true,
      opacity: VIEWER_COLORS.DUCT_OPACITY,
      side: THREE.DoubleSide,
    });

    return { geometry: geo, material: mat };
  }, [points, diameter, type]);

  if (!geometry || !material) return null;

  return (
    <mesh geometry={geometry} material={material} />
  );
}
