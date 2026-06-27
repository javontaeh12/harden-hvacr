'use client';

import { DuctPath3D } from '@/lib/installs/types';
import DuctPath from './DuctPath';

interface DuctNetworkProps {
  paths: DuctPath3D[];
  visible: boolean;
}

export default function DuctNetwork({ paths, visible }: DuctNetworkProps) {
  if (!visible) return null;

  return (
    <group name="duct-network">
      {paths.map((path) => (
        <DuctPath
          key={path.segmentId}
          points={path.points}
          diameter={path.diameter}
          type={path.type}
        />
      ))}
    </group>
  );
}
