'use client';

import { useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid } from '@react-three/drei';
import { InstallRoom, InstallDuctSegment, LayerVisibility } from '@/lib/installs/types';
import { VIEWER_COLORS } from '@/lib/installs/constants';
import { computeAutoLayout } from './hooks/useAutoLayout';
import { computeDuctRouting } from './hooks/useDuctRouting';
import HouseScene from './HouseScene';
import LayerTogglePanel from './controls/LayerTogglePanel';

interface HouseViewer3DProps {
  rooms: InstallRoom[];
  ductSegments: InstallDuctSegment[];
  ahLocation: string;
  className?: string;
}

const DEFAULT_LAYERS: LayerVisibility = {
  walls: true,
  ceiling: false,
  ducts: true,
  supplyVents: true,
  returnVents: true,
  equipment: true,
  labels: true,
};

/**
 * Main 3D house visualization wrapper.
 *
 * IMPORTANT: This component must be lazy-loaded with next/dynamic({ ssr: false })
 * because Three.js and @react-three/fiber require the DOM and WebGL context.
 *
 * Usage:
 *   const HouseViewer3D = dynamic(() => import('@/components/installs/HouseViewer3D'), { ssr: false });
 */
export default function HouseViewer3D({
  rooms,
  ductSegments,
  ahLocation,
  className,
}: HouseViewer3DProps) {
  const [layers, setLayers] = useState<LayerVisibility>(DEFAULT_LAYERS);

  const layout = useMemo(() => computeAutoLayout(rooms), [rooms]);
  const ductPaths = useMemo(() => computeDuctRouting(layout, ductSegments, ahLocation), [layout, ductSegments, ahLocation]);

  // Compute a reasonable camera look-at target (center of the bounding box)
  const center = useMemo(() => {
    if (layout.length === 0) return [0, 0, 0] as [number, number, number];
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    for (const r of layout) {
      minX = Math.min(minX, r.x);
      maxX = Math.max(maxX, r.x + r.width);
      minY = Math.min(minY, r.y);
      maxY = Math.max(maxY, r.y + r.height);
      minZ = Math.min(minZ, r.z);
      maxZ = Math.max(maxZ, r.z + r.depth);
    }
    return [
      (minX + maxX) / 2,
      (minY + maxY) / 2,
      (minZ + maxZ) / 2,
    ] as [number, number, number];
  }, [layout]);

  return (
    <div className={`relative h-[400px] md:h-[600px] w-full ${className ?? ''}`}>
      {/* Layer controls overlay */}
      <LayerTogglePanel layers={layers} onChange={setLayers} />

      {/* 3D Canvas */}
      <Canvas shadows gl={{ antialias: true, alpha: false }} style={{ background: '#f8f8f5' }}>
        {/* Camera */}
        <PerspectiveCamera
          makeDefault
          position={[
            center[0] + 15,
            center[1] + 12,
            center[2] + 15,
          ]}
          fov={50}
          near={0.1}
          far={200}
        />

        {/* Controls */}
        <OrbitControls
          target={center}
          enableDamping
          dampingFactor={0.12}
          minDistance={5}
          maxDistance={50}
          minPolarAngle={0.1}
          maxPolarAngle={Math.PI / 2 - 0.05}
        />

        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[10, 15, 10]}
          intensity={0.8}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-far={60}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
        />

        {/* Grid helper on the ground */}
        <Grid
          args={[60, 60]}
          position={[center[0], -0.02, center[2]]}
          cellSize={0.3}
          cellThickness={0.5}
          cellColor={VIEWER_COLORS.GRID}
          sectionSize={3}
          sectionThickness={1}
          sectionColor={VIEWER_COLORS.GRID}
          fadeDistance={40}
          fadeStrength={1.5}
          infiniteGrid={false}
        />

        {/* Scene content */}
        <HouseScene layout={layout} ductPaths={ductPaths} ahLocation={ahLocation} visibleLayers={layers} />
      </Canvas>
    </div>
  );
}
