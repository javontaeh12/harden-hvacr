import {
  InstallRoom,
  InstallSurface,
  InstallOpening,
  DesignConditions,
  RoomCoolingLoad,
  RoomHeatingLoad,
  TotalLoads,
} from './types';
import {
  SOLAR_GAIN_FACTORS,
  INFILTRATION_ACH,
  INTERNAL_LOADS,
  DUCT_LOSS_FACTORS,
  CFM_PER_TON,
  FLOOR_R_VALUES,
} from './constants';

// Air properties at standard conditions
const AIR_DENSITY = 0.075; // lb/ft³
const AIR_SPECIFIC_HEAT = 0.24; // BTU/(lb·°F)
const AIR_LATENT_FACTOR = 0.68; // BTU/(ft³·grains)

// Humidity ratios by zone (grains of moisture above indoor)
const LATENT_GRAIN_DIFF: Record<string, number> = {
  dry: 10,
  moderate: 20,
  humid: 30,
  very_humid: 43,
};

// Default infiltration tightness (based on year built heuristic)
function inferTightness(yearBuilt: number | null): string {
  if (!yearBuilt) return 'average';
  if (yearBuilt >= 2015) return 'tight';
  if (yearBuilt >= 1990) return 'average';
  if (yearBuilt >= 1970) return 'leaky';
  return 'very_leaky';
}

// Altitude correction factor for CFM at elevation
function altitudeFactor(elevationFt: number): number {
  // Air density decreases ~3.5% per 1000 ft
  return 1 + (elevationFt / 1000) * 0.035;
}

interface RoomWithEnvelope {
  room: InstallRoom;
  surfaces: InstallSurface[];
  openings: InstallOpening[];
}

/**
 * Compute cooling load for a single room (simplified Manual J approach).
 */
export function computeRoomCoolingLoad(
  data: RoomWithEnvelope,
  design: DesignConditions,
  ductLocation: string,
  yearBuilt: number | null,
): RoomCoolingLoad {
  const { room, surfaces, openings } = data;
  const deltaT = design.outdoorCoolingTemp - design.indoorCoolingTemp;

  // --- Wall conduction ---
  const exteriorWalls = surfaces.filter(s => s.surface_type === 'wall' && s.is_exterior);
  let sensibleWall = 0;
  for (const wall of exteriorWalls) {
    const netArea = wall.net_area_sqft ?? wall.gross_area_sqft ?? 0;
    const rValue = wall.r_value ?? 13;
    sensibleWall += (netArea / rValue) * deltaT;
  }

  // --- Ceiling conduction ---
  const ceilings = surfaces.filter(s => s.surface_type === 'ceiling' && s.is_exterior);
  let sensibleCeiling = 0;
  for (const ceil of ceilings) {
    const area = ceil.net_area_sqft ?? ceil.gross_area_sqft ?? (room.sqft ?? 0);
    const rValue = ceil.r_value ?? room.ceiling_r_value ?? 30;
    // Attic has ~25°F temperature difference above outdoor temp for solar loading
    const ceilDeltaT = deltaT + 15;
    sensibleCeiling += (area / rValue) * ceilDeltaT;
  }
  // If no ceiling surfaces defined, use room sqft with default R-value
  if (ceilings.length === 0 && room.floor_level >= 1) {
    const area = room.sqft ?? 0;
    const rValue = room.ceiling_r_value ?? 30;
    const ceilDeltaT = deltaT + 15;
    sensibleCeiling = (area / rValue) * ceilDeltaT;
  }

  // --- Floor conduction ---
  const floorConfig = FLOOR_R_VALUES[room.floor_type] ?? FLOOR_R_VALUES['slab'];
  let sensibleFloor = 0;
  if (floorConfig.rValue > 0 && floorConfig.tempDiff > 0) {
    const floorArea = room.sqft ?? 0;
    sensibleFloor = (floorArea / floorConfig.rValue) * floorConfig.tempDiff;
  }

  // --- Window conduction ---
  const windows = openings.filter(o => o.opening_type === 'window' || o.opening_type === 'skylight');
  let sensibleWindowConduction = 0;
  for (const win of windows) {
    const area = (win.area_sqft ?? 0) * win.quantity;
    sensibleWindowConduction += area * win.u_factor * deltaT;
  }

  // --- Window solar gain ---
  let sensibleWindowSolar = 0;
  for (const win of windows) {
    const area = (win.area_sqft ?? 0) * win.quantity;
    const orientation = win.orientation ?? 'N';
    const solarFactor = SOLAR_GAIN_FACTORS[orientation] ?? 40;
    const overhangReduction = win.has_overhang ? 0.65 : 1.0;
    sensibleWindowSolar += area * win.shgc * solarFactor * overhangReduction;
  }

  // --- Door conduction ---
  const doors = openings.filter(o => o.opening_type === 'door');
  let sensibleDoor = 0;
  for (const door of doors) {
    const area = (door.area_sqft ?? 20) * door.quantity; // default ~20 sqft door
    sensibleDoor += area * door.u_factor * deltaT;
  }

  // --- Infiltration ---
  const volume = (room.sqft ?? 0) * (room.ceiling_height_ft ?? 9);
  const tightness = inferTightness(yearBuilt);
  const ach = INFILTRATION_ACH[tightness] ?? 0.5;
  const cfmInfiltration = (volume * ach) / 60;
  const sensibleInfiltration = cfmInfiltration * AIR_DENSITY * AIR_SPECIFIC_HEAT * deltaT * 60;

  // --- Internal gains ---
  const personGain = (room.occupants ?? 1) * INTERNAL_LOADS.PERSON_SENSIBLE_BTUH;
  const kitchenGain = room.has_kitchen ? INTERNAL_LOADS.KITCHEN_BTUH : 0;
  const applianceGain = room.appliance_btuh ?? 0;
  const sensibleInternal = personGain + kitchenGain + applianceGain;

  // --- Subtotal sensible before duct loss ---
  const subtotalSensible =
    sensibleWall +
    sensibleCeiling +
    sensibleFloor +
    sensibleWindowConduction +
    sensibleWindowSolar +
    sensibleDoor +
    sensibleInfiltration +
    sensibleInternal;

  // --- Duct losses ---
  const ductFactor = DUCT_LOSS_FACTORS[ductLocation] ?? 0.10;
  const sensibleDuct = subtotalSensible * ductFactor;

  const totalSensibleCooling = Math.round(subtotalSensible + sensibleDuct);

  // --- Latent load ---
  const grainDiff = LATENT_GRAIN_DIFF[design.humidityZone] ?? 20;
  const latentInfiltration = cfmInfiltration * AIR_LATENT_FACTOR * grainDiff * 60;
  const latentPeople = (room.occupants ?? 1) * INTERNAL_LOADS.PERSON_LATENT_BTUH;
  const totalLatentCooling = Math.round(latentInfiltration + latentPeople);

  return {
    roomId: room.id,
    sensibleWall: Math.round(sensibleWall),
    sensibleCeiling: Math.round(sensibleCeiling),
    sensibleFloor: Math.round(sensibleFloor),
    sensibleWindowConduction: Math.round(sensibleWindowConduction),
    sensibleWindowSolar: Math.round(sensibleWindowSolar),
    sensibleDoor: Math.round(sensibleDoor),
    sensibleInfiltration: Math.round(sensibleInfiltration),
    sensibleInternal: Math.round(sensibleInternal),
    sensibleDuct: Math.round(sensibleDuct),
    totalSensibleCooling,
    totalLatentCooling,
    totalCooling: totalSensibleCooling + totalLatentCooling,
  };
}

/**
 * Compute heating load for a single room.
 */
export function computeRoomHeatingLoad(
  data: RoomWithEnvelope,
  design: DesignConditions,
  ductLocation: string,
  yearBuilt: number | null,
): RoomHeatingLoad {
  const { room, surfaces, openings } = data;
  const deltaT = design.indoorHeatingTemp - design.outdoorHeatingTemp;

  // --- Wall conduction ---
  const exteriorWalls = surfaces.filter(s => s.surface_type === 'wall' && s.is_exterior);
  let heatingWall = 0;
  for (const wall of exteriorWalls) {
    const netArea = wall.net_area_sqft ?? wall.gross_area_sqft ?? 0;
    const rValue = wall.r_value ?? 13;
    heatingWall += (netArea / rValue) * deltaT;
  }

  // --- Ceiling ---
  const ceilings = surfaces.filter(s => s.surface_type === 'ceiling' && s.is_exterior);
  let heatingCeiling = 0;
  for (const ceil of ceilings) {
    const area = ceil.net_area_sqft ?? ceil.gross_area_sqft ?? (room.sqft ?? 0);
    const rValue = ceil.r_value ?? room.ceiling_r_value ?? 30;
    heatingCeiling += (area / rValue) * deltaT;
  }
  if (ceilings.length === 0 && room.floor_level >= 1) {
    const area = room.sqft ?? 0;
    const rValue = room.ceiling_r_value ?? 30;
    heatingCeiling = (area / rValue) * deltaT;
  }

  // --- Floor ---
  const floorConfig = FLOOR_R_VALUES[room.floor_type] ?? FLOOR_R_VALUES['slab'];
  let heatingFloor = 0;
  if (floorConfig.rValue > 0) {
    const floorArea = room.sqft ?? 0;
    // For heating, use full deltaT against floor buffer
    heatingFloor = (floorArea / floorConfig.rValue) * Math.max(deltaT * 0.5, floorConfig.tempDiff);
  }

  // --- Windows ---
  const windows = openings.filter(o => o.opening_type === 'window' || o.opening_type === 'skylight');
  let heatingWindow = 0;
  for (const win of windows) {
    const area = (win.area_sqft ?? 0) * win.quantity;
    heatingWindow += area * win.u_factor * deltaT;
  }

  // --- Doors ---
  const doors = openings.filter(o => o.opening_type === 'door');
  let heatingDoor = 0;
  for (const door of doors) {
    const area = (door.area_sqft ?? 20) * door.quantity;
    heatingDoor += area * door.u_factor * deltaT;
  }

  // --- Infiltration ---
  const volume = (room.sqft ?? 0) * (room.ceiling_height_ft ?? 9);
  const tightness = inferTightness(yearBuilt);
  const ach = INFILTRATION_ACH[tightness] ?? 0.5;
  const cfmInfiltration = (volume * ach) / 60;
  const heatingInfiltration = cfmInfiltration * AIR_DENSITY * AIR_SPECIFIC_HEAT * deltaT * 60;

  // Fireplace draft loss
  const fireplaceLoss = room.has_fireplace ? Math.abs(INTERNAL_LOADS.FIREPLACE_BTUH) : 0;

  const subtotalHeating =
    heatingWall + heatingCeiling + heatingFloor + heatingWindow + heatingDoor + heatingInfiltration + fireplaceLoss;

  // Duct losses
  const ductFactor = DUCT_LOSS_FACTORS[ductLocation] ?? 0.10;
  const heatingDuct = subtotalHeating * ductFactor;

  return {
    roomId: room.id,
    heatingWall: Math.round(heatingWall),
    heatingCeiling: Math.round(heatingCeiling),
    heatingFloor: Math.round(heatingFloor),
    heatingWindow: Math.round(heatingWindow),
    heatingDoor: Math.round(heatingDoor),
    heatingInfiltration: Math.round(heatingInfiltration),
    heatingDuct: Math.round(heatingDuct),
    totalHeating: Math.round(subtotalHeating + heatingDuct),
  };
}

/**
 * Full project load calculation — all rooms, plus whole-house totals.
 */
export function computeProjectLoads(
  roomsWithEnvelopes: RoomWithEnvelope[],
  design: DesignConditions,
  ductLocation: string,
  yearBuilt: number | null,
): {
  coolingLoads: RoomCoolingLoad[];
  heatingLoads: RoomHeatingLoad[];
  totals: TotalLoads;
} {
  const coolingLoads: RoomCoolingLoad[] = [];
  const heatingLoads: RoomHeatingLoad[] = [];

  for (const rwe of roomsWithEnvelopes) {
    coolingLoads.push(computeRoomCoolingLoad(rwe, design, ductLocation, yearBuilt));
    heatingLoads.push(computeRoomHeatingLoad(rwe, design, ductLocation, yearBuilt));
  }

  const totalSensibleCooling = coolingLoads.reduce((s, l) => s + l.totalSensibleCooling, 0);
  const totalLatentCooling = coolingLoads.reduce((s, l) => s + l.totalLatentCooling, 0);
  const totalCooling = totalSensibleCooling + totalLatentCooling;
  const totalHeating = heatingLoads.reduce((s, l) => s + l.totalHeating, 0);

  // Altitude correction
  const elevFactor = altitudeFactor(design.elevationFt);
  const coolingCFM = Math.round((totalCooling / 12000) * CFM_PER_TON * elevFactor);
  const heatingCFM = Math.round((totalHeating / 12000) * CFM_PER_TON * elevFactor);
  const tonnageRequired = Math.round((totalCooling / 12000) * 10) / 10; // round to 0.1

  return {
    coolingLoads,
    heatingLoads,
    totals: {
      totalSensibleCooling,
      totalLatentCooling,
      totalCooling,
      totalHeating,
      coolingCFM,
      heatingCFM,
      tonnageRequired,
    },
  };
}

/**
 * Determine the best matching standard equipment tonnage.
 */
export function recommendTonnage(calculatedTons: number): number {
  const standardSizes = [1.5, 2, 2.5, 3, 3.5, 4, 5];
  for (const size of standardSizes) {
    if (calculatedTons <= size) return size;
  }
  return standardSizes[standardSizes.length - 1];
}

/**
 * Compute CFM for each room proportionally based on cooling load share.
 */
export function distributeAirflow(
  coolingLoads: RoomCoolingLoad[],
  totalCFM: number,
): Map<string, { coolingCfm: number; heatingCfm: number }> {
  const totalBTU = coolingLoads.reduce((s, l) => s + l.totalCooling, 0);
  if (totalBTU === 0) return new Map();

  const result = new Map<string, { coolingCfm: number; heatingCfm: number }>();
  for (const load of coolingLoads) {
    const fraction = load.totalCooling / totalBTU;
    const cfm = Math.round(totalCFM * fraction);
    result.set(load.roomId, {
      coolingCfm: cfm,
      heatingCfm: Math.round(cfm * 0.85), // slightly less for heating
    });
  }
  return result;
}
