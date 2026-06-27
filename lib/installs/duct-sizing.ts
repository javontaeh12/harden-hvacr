import type { InstallRoom, InstallDuctSegment } from './types';
import { DUCT_SIZING_TABLE, DEFAULT_FRICTION_RATE } from './constants';

/**
 * Look up the recommended round duct diameter for a given CFM
 * using the equal friction method.
 */
export function sizeRoundDuct(cfm: number, _frictionRate?: number): { diameter: number; velocityFpm: number } {
  let diameter = 4;
  for (const entry of DUCT_SIZING_TABLE) {
    if (cfm <= entry.maxCFM) {
      diameter = entry.diameter;
      break;
    }
    diameter = entry.diameter;
  }
  // Velocity = CFM / area (ft²)
  const areaFt2 = Math.PI * (diameter / 24) ** 2; // diameter in inches → radius in feet
  const velocityFpm = areaFt2 > 0 ? Math.round(cfm / areaFt2) : 0;

  return { diameter, velocityFpm };
}

/**
 * Convert round duct to equivalent rectangular dimensions
 * when height is constrained (e.g., in a soffit or joist bay).
 */
export function sizeRectangularDuct(
  cfm: number,
  maxHeightIn: number = 8
): { widthIn: number; heightIn: number; velocityFpm: number } {
  const { diameter } = sizeRoundDuct(cfm);

  // Equivalent rectangular: area = π * (d/2)² → w * h
  const roundArea = Math.PI * (diameter / 2) ** 2; // in²
  const height = Math.min(maxHeightIn, diameter);
  const width = Math.ceil(roundArea / height);

  // Round up to nearest even inch
  const finalWidth = width % 2 === 0 ? width : width + 1;

  const areaFt2 = (finalWidth * height) / 144;
  const velocityFpm = areaFt2 > 0 ? Math.round(cfm / areaFt2) : 0;

  return { widthIn: finalWidth, heightIn: height, velocityFpm };
}

/**
 * Calculate the available friction rate based on system static pressure
 * and longest duct run.
 */
export function calculateFrictionRate(
  availablePressureInWc: number,
  longestRunFt: number
): number {
  if (longestRunFt <= 0) return DEFAULT_FRICTION_RATE;
  // Add 50% for fittings (equivalent length method)
  const totalEquivLength = longestRunFt * 1.5;
  return (availablePressureInWc / totalEquivLength) * 100;
}

interface RoomCfmData {
  roomId: string;
  roomName: string;
  coolingCfm: number;
  heatingCfm: number;
  floorLevel: number;
}

/**
 * Auto-generate a duct layout from room CFM data.
 * Creates supply trunk, supply branches, return trunk, and return drops.
 */
export function generateDuctLayout(
  rooms: RoomCfmData[],
  totalCoolingCfm: number,
  frictionRate: number = DEFAULT_FRICTION_RATE,
): Omit<InstallDuctSegment, 'id' | 'project_id' | 'created_at'>[] {
  if (rooms.length === 0) return [];

  const segments: Omit<InstallDuctSegment, 'id' | 'project_id' | 'created_at'>[] = [];
  let sortOrder = 0;

  // --- Supply Trunk ---
  const supplyTrunk = sizeRoundDuct(totalCoolingCfm);
  // Estimate trunk length: ~2ft per room + 10ft base
  const trunkLength = Math.round(rooms.length * 2 + 10);

  segments.push({
    room_id: null,
    segment_type: 'supply_trunk',
    shape: 'round',
    diameter_in: supplyTrunk.diameter,
    width_in: null,
    height_in: null,
    length_ft: trunkLength,
    cfm: totalCoolingCfm,
    friction_rate: frictionRate,
    velocity_fpm: supplyTrunk.velocityFpm,
    insulation_r: 6,
    material: 'galvanized',
    register_type: null,
    register_size: null,
    notes: 'Main supply trunk',
    sort_order: sortOrder++,
  });

  // --- Supply Branches (one per room) ---
  for (const room of rooms) {
    const cfm = room.coolingCfm || 100;
    const branch = sizeRoundDuct(cfm);
    // Estimate branch length based on floor level
    const branchLength = room.floorLevel > 1 ? 15 : 10;

    // Determine register size from CFM
    const registerSize = cfm <= 100 ? '6x10' : cfm <= 200 ? '8x12' : '10x14';

    segments.push({
      room_id: room.roomId,
      segment_type: 'supply_branch',
      shape: 'flex',
      diameter_in: branch.diameter,
      width_in: null,
      height_in: null,
      length_ft: branchLength,
      cfm,
      friction_rate: frictionRate,
      velocity_fpm: branch.velocityFpm,
      insulation_r: 6,
      material: 'flex',
      register_type: 'supply',
      register_size: registerSize,
      notes: `Supply to ${room.roomName}`,
      sort_order: sortOrder++,
    });
  }

  // --- Return Trunk ---
  // Return is typically sized for ~90% of supply (some air is lost)
  const returnCfm = Math.round(totalCoolingCfm * 0.95);
  const returnTrunk = sizeRoundDuct(returnCfm);

  segments.push({
    room_id: null,
    segment_type: 'return_trunk',
    shape: 'round',
    diameter_in: returnTrunk.diameter,
    width_in: null,
    height_in: null,
    length_ft: Math.round(trunkLength * 0.6), // return trunk is typically shorter
    cfm: returnCfm,
    friction_rate: frictionRate,
    velocity_fpm: returnTrunk.velocityFpm,
    insulation_r: 6,
    material: 'galvanized',
    register_type: null,
    register_size: null,
    notes: 'Main return trunk',
    sort_order: sortOrder++,
  });

  // --- Return Drops ---
  // Not every room gets a return — skip closets, bathrooms, small rooms
  const returnRooms = rooms.filter(r => {
    const name = r.roomName.toLowerCase();
    if (name.includes('closet') || name.includes('pantry')) return false;
    if (name.includes('bath') || name.includes('restroom')) return false;
    if (r.coolingCfm < 80) return false;
    return true;
  });

  // If too few return rooms, use all rooms except very small ones
  const effectiveReturnRooms = returnRooms.length > 0
    ? returnRooms
    : rooms.filter(r => r.coolingCfm >= 60);

  for (const room of effectiveReturnRooms) {
    // Return drop CFM ~ 120% of supply CFM for the room
    const dropCfm = Math.round(room.coolingCfm * 1.2);
    const drop = sizeRoundDuct(dropCfm);

    const grillSize = dropCfm <= 200 ? '14x20' : '20x25';

    segments.push({
      room_id: room.roomId,
      segment_type: 'return_drop',
      shape: 'round',
      diameter_in: drop.diameter,
      width_in: null,
      height_in: null,
      length_ft: room.floorLevel > 1 ? 12 : 8,
      cfm: dropCfm,
      friction_rate: frictionRate,
      velocity_fpm: drop.velocityFpm,
      insulation_r: 4,
      material: 'flex',
      register_type: 'return',
      register_size: grillSize,
      notes: `Return from ${room.roomName}`,
      sort_order: sortOrder++,
    });
  }

  return segments;
}

/**
 * Compute total system static pressure estimate.
 */
export function estimateStaticPressure(
  segments: Pick<InstallDuctSegment, 'length_ft' | 'friction_rate'>[],
  filterPressureDrop: number = 0.10,
  coilPressureDrop: number = 0.20,
): number {
  let ductPressure = 0;
  for (const seg of segments) {
    const len = seg.length_ft ?? 0;
    const rate = seg.friction_rate ?? DEFAULT_FRICTION_RATE;
    // Add 50% equivalent length for fittings
    ductPressure += (len * 1.5 / 100) * rate;
  }
  return Math.round((ductPressure + filterPressureDrop + coilPressureDrop) * 100) / 100;
}
