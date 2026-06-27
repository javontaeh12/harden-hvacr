import { RoomLayout, DuctPath3D, InstallDuctSegment, SegmentType } from '@/lib/installs/types';
import { FEET_TO_UNITS, DUCT_SIZING_TABLE } from '@/lib/installs/constants';

/**
 * Generates 3D duct paths from room layouts, duct segment data, and AH location.
 * Routes are Manhattan-style (axis-aligned with right-angle turns).
 */
export function computeDuctRouting(
  rooms: RoomLayout[],
  ductSegments: InstallDuctSegment[],
  ahLocation: string
): DuctPath3D[] {
  if (rooms.length === 0) return [];

  // --- Step 1: Compute bounding box of all rooms ---
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
  const buildingWidth = maxX - minX;
  const buildingDepth = maxZ - minZ;

  // --- Step 2: Determine duct plane Y based on AH location ---
  let ductPlaneY: number;
  switch (ahLocation) {
    case 'attic':
    case 'closet':
    case 'garage':
    case 'utility_room':
    case 'rooftop':
      ductPlaneY = maxCeilingY + 0.3;
      break;
    case 'basement':
    case 'crawlspace':
      ductPlaneY = -0.3;
      break;
    default:
      ductPlaneY = maxCeilingY + 0.3;
  }

  // --- Step 3: AH position is center of the building at duct plane Y ---
  const ahPosition: [number, number, number] = [centerX, ductPlaneY, centerZ];

  // --- Step 4: Determine trunk axis (longest building axis) ---
  const trunkAlongX = buildingWidth >= buildingDepth;
  const trunkStart: [number, number, number] = trunkAlongX
    ? [minX, ductPlaneY, centerZ]
    : [centerX, ductPlaneY, minZ];
  const trunkEnd: [number, number, number] = trunkAlongX
    ? [maxX, ductPlaneY, centerZ]
    : [centerX, ductPlaneY, maxZ];

  const paths: DuctPath3D[] = [];

  // --- Build a map of room-id to duct segments ---
  const segmentsByRoom = new Map<string, InstallDuctSegment[]>();
  for (const seg of ductSegments) {
    if (seg.room_id) {
      const existing = segmentsByRoom.get(seg.room_id) || [];
      existing.push(seg);
      segmentsByRoom.set(seg.room_id, existing);
    }
  }

  // Find trunk segments from the data (or auto-generate)
  const supplyTrunkSegments = ductSegments.filter(s => s.segment_type === 'supply_trunk');
  const returnTrunkSegments = ductSegments.filter(s => s.segment_type === 'return_trunk');

  // --- Step 5: Generate supply trunk ---
  const supplyTrunkDiameter = supplyTrunkSegments.length > 0
    ? (supplyTrunkSegments[0].diameter_in || 14) * FEET_TO_UNITS / 12
    : estimateTrunkDiameter(rooms) * FEET_TO_UNITS / 12;

  paths.push({
    segmentId: supplyTrunkSegments[0]?.id || 'auto-supply-trunk',
    type: 'supply_trunk',
    points: [trunkStart, ahPosition, trunkEnd],
    diameter: supplyTrunkDiameter,
    cfm: supplyTrunkSegments[0]?.cfm || totalCfm(rooms),
    roomId: null,
  });

  // --- Step 6: Generate supply branches for each room ---
  const hasSegmentData = ductSegments.length > 0;

  for (const room of rooms) {
    const roomSegs = segmentsByRoom.get(room.roomId) || [];
    const supplySegs = roomSegs.filter(s => s.segment_type === 'supply_branch');

    // Skip if segment data exists but this room has no supply branches
    if (hasSegmentData && supplySegs.length === 0 && room.numSupplyVents === 0) continue;

    const branchDiameter = supplySegs.length > 0
      ? (supplySegs[0].diameter_in || 6) * FEET_TO_UNITS / 12
      : lookupDuctDiameter(room.supplyCfm || 100) * FEET_TO_UNITS / 12;

    const roomCenterX = room.x;
    const roomCenterZ = room.z;
    const roomCeilingY = room.y + room.height;

    // Tap point on the trunk nearest to the room
    const trunkTapPoint: [number, number, number] = trunkAlongX
      ? [clamp(roomCenterX, trunkStart[0], trunkEnd[0]), ductPlaneY, centerZ]
      : [centerX, ductPlaneY, clamp(roomCenterZ, trunkStart[2], trunkEnd[2])];

    // Branch midpoint: move off the trunk toward the room at duct plane height
    const branchMidpoint: [number, number, number] = [
      roomCenterX,
      ductPlaneY,
      roomCenterZ,
    ];

    // Above room: directly above room center at duct plane height
    const aboveRoom: [number, number, number] = [roomCenterX, ductPlaneY, roomCenterZ];

    // Room ceiling center: drop down to ceiling
    const roomCeilingCenter: [number, number, number] = [roomCenterX, roomCeilingY, roomCenterZ];

    // Manhattan routing with 3-4 waypoints
    const branchPoints: [number, number, number][] = trunkAlongX
      ? [trunkTapPoint, [roomCenterX, ductPlaneY, centerZ], branchMidpoint, roomCeilingCenter]
      : [trunkTapPoint, [centerX, ductPlaneY, roomCenterZ], branchMidpoint, roomCeilingCenter];

    // Deduplicate consecutive identical points
    const cleanedPoints = deduplicatePoints(branchPoints);

    paths.push({
      segmentId: supplySegs[0]?.id || `auto-supply-${room.roomId}`,
      type: 'supply_branch',
      points: cleanedPoints,
      diameter: branchDiameter,
      cfm: supplySegs[0]?.cfm || room.supplyCfm,
      roomId: room.roomId,
    });
  }

  // --- Step 7: Generate return trunk ---
  const returnTrunkDiameter = returnTrunkSegments.length > 0
    ? (returnTrunkSegments[0].diameter_in || 18) * FEET_TO_UNITS / 12
    : (estimateTrunkDiameter(rooms) + 2) * FEET_TO_UNITS / 12;

  // Offset return trunk slightly from supply trunk
  const returnOffset = trunkAlongX ? 0.15 : 0.15;
  const returnTrunkStart: [number, number, number] = trunkAlongX
    ? [minX, ductPlaneY, centerZ + returnOffset]
    : [centerX + returnOffset, ductPlaneY, minZ];
  const returnTrunkEnd: [number, number, number] = trunkAlongX
    ? [maxX, ductPlaneY, centerZ + returnOffset]
    : [centerX + returnOffset, ductPlaneY, maxZ];
  const returnAhPoint: [number, number, number] = [
    ahPosition[0] + (trunkAlongX ? 0 : returnOffset),
    ductPlaneY,
    ahPosition[2] + (trunkAlongX ? returnOffset : 0),
  ];

  paths.push({
    segmentId: returnTrunkSegments[0]?.id || 'auto-return-trunk',
    type: 'return_trunk',
    points: [returnTrunkStart, returnAhPoint, returnTrunkEnd],
    diameter: returnTrunkDiameter,
    cfm: returnTrunkSegments[0]?.cfm || totalCfm(rooms),
    roomId: null,
  });

  // --- Step 8: Generate return drops (fewer, larger -- one per room with return vent) ---
  const returnRooms = rooms.filter(r => r.hasReturnVent);
  // If no rooms are flagged, pick the largest rooms as return locations
  const effectiveReturnRooms = returnRooms.length > 0
    ? returnRooms
    : rooms
        .filter(r => r.roomType !== 'closet' && r.roomType !== 'bathroom')
        .sort((a, b) => (b.width * b.depth) - (a.width * a.depth))
        .slice(0, Math.max(1, Math.ceil(rooms.length / 3)));

  for (const room of effectiveReturnRooms) {
    const roomSegs = segmentsByRoom.get(room.roomId) || [];
    const returnSegs = roomSegs.filter(s => s.segment_type === 'return_drop');

    const dropDiameter = returnSegs.length > 0
      ? (returnSegs[0].diameter_in || 14) * FEET_TO_UNITS / 12
      : lookupDuctDiameter((room.supplyCfm || 200) * 1.2) * FEET_TO_UNITS / 12;

    const roomCenterX = room.x;
    const roomCenterZ = room.z;
    // Return drops go to near-floor level (wall position)
    const returnY = room.y + 0.15; // slightly above floor

    const trunkTap: [number, number, number] = trunkAlongX
      ? [clamp(roomCenterX, returnTrunkStart[0], returnTrunkEnd[0]), ductPlaneY, centerZ + returnOffset]
      : [centerX + returnOffset, ductPlaneY, clamp(roomCenterZ, returnTrunkStart[2], returnTrunkEnd[2])];

    // Route: trunk tap -> above room -> down to wall
    const dropPoints: [number, number, number][] = [
      trunkTap,
      [roomCenterX, ductPlaneY, roomCenterZ],
      [roomCenterX, returnY, roomCenterZ],
    ];

    paths.push({
      segmentId: returnSegs[0]?.id || `auto-return-${room.roomId}`,
      type: 'return_drop',
      points: deduplicatePoints(dropPoints),
      diameter: dropDiameter,
      cfm: returnSegs[0]?.cfm || (room.supplyCfm ? room.supplyCfm * 1.2 : null),
      roomId: room.roomId,
    });
  }

  return paths;
}

// ---- Helpers ----

function clamp(val: number, min: number, max: number): number {
  if (min > max) [min, max] = [max, min];
  return Math.max(min, Math.min(max, val));
}

function totalCfm(rooms: RoomLayout[]): number {
  return rooms.reduce((sum, r) => sum + (r.supplyCfm || 0), 0);
}

function estimateTrunkDiameter(rooms: RoomLayout[]): number {
  const cfm = totalCfm(rooms);
  return lookupDuctDiameter(cfm);
}

function lookupDuctDiameter(cfm: number): number {
  for (const entry of DUCT_SIZING_TABLE) {
    if (cfm <= entry.maxCFM) return entry.diameter;
  }
  return DUCT_SIZING_TABLE[DUCT_SIZING_TABLE.length - 1].diameter;
}

function deduplicatePoints(points: [number, number, number][]): [number, number, number][] {
  if (points.length === 0) return points;
  const result: [number, number, number][] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = result[result.length - 1];
    const curr = points[i];
    const dist = Math.sqrt(
      (curr[0] - prev[0]) ** 2 +
      (curr[1] - prev[1]) ** 2 +
      (curr[2] - prev[2]) ** 2
    );
    if (dist > 0.001) {
      result.push(curr);
    }
  }
  return result;
}
