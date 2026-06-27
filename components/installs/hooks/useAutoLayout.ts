import { InstallRoom, RoomLayout } from '@/lib/installs/types';
import { FEET_TO_UNITS } from '@/lib/installs/constants';

// Default dimensions when room data is incomplete
const DEFAULT_WIDTH_FT = 12;
const DEFAULT_LENGTH_FT = 12;
const DEFAULT_CEILING_FT = 9;

// Max row width in feet before wrapping to a new row
const MAX_ROW_WIDTH_FT = 60;

// Small gap between rooms (in feet) so walls don't z-fight
const ROOM_GAP_FT = 0.5;

/**
 * Infer a room type string from the room name for the RoomLayout.roomType field.
 * This is a best-effort heuristic since InstallRoom doesn't carry a room_type column.
 */
function inferRoomType(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('bed')) return 'bedroom';
  if (lower.includes('bath') || lower.includes('restroom')) return 'bathroom';
  if (lower.includes('kitchen')) return 'kitchen';
  if (lower.includes('living') || lower.includes('family') || lower.includes('great')) return 'living';
  if (lower.includes('dining')) return 'dining';
  if (lower.includes('hall')) return 'hallway';
  if (lower.includes('closet') || lower.includes('pantry')) return 'closet';
  if (lower.includes('garage')) return 'garage';
  if (lower.includes('utility') || lower.includes('laundry') || lower.includes('mechanical')) return 'utility';
  if (lower.includes('office') || lower.includes('study') || lower.includes('den')) return 'office';
  return 'other';
}

/**
 * Estimate the number of supply vents for a room based on its cooling CFM.
 * Rule of thumb: ~100 CFM per standard supply register.
 */
function estimateSupplyVents(cfm: number | null): number {
  if (!cfm || cfm <= 0) return 1;
  return Math.max(1, Math.round(cfm / 100));
}

/**
 * Determine whether a room should have a return vent.
 * Most bedrooms and larger rooms get return air; closets and small spaces typically do not.
 */
function shouldHaveReturn(name: string, sqft: number): boolean {
  const type = inferRoomType(name);
  if (type === 'closet' || type === 'hallway') return false;
  // Rooms under ~60 sqft probably don't need their own return
  if (sqft < 60) return false;
  return true;
}

/**
 * Convert an array of InstallRoom records into positioned RoomLayout objects
 * suitable for 3D rendering.
 *
 * Algorithm:
 * 1. Group rooms by floor_level
 * 2. Sort each floor's rooms by area (largest first) for stable packing
 * 3. Row-pack rooms along the X axis; wrap to a new row (Z axis) when the
 *    cumulative row width exceeds MAX_ROW_WIDTH_FT
 * 4. Stack floors vertically using ceiling height
 */
export function computeAutoLayout(rooms: InstallRoom[]): RoomLayout[] {
  if (!rooms || rooms.length === 0) return [];

  // ---- Step 1: Group by floor ----
  const floorMap = new Map<number, InstallRoom[]>();
  for (const room of rooms) {
    const level = room.floor_level ?? 1;
    if (!floorMap.has(level)) {
      floorMap.set(level, []);
    }
    floorMap.get(level)!.push(room);
  }

  // Sort floor levels ascending so ground floor is processed first
  const sortedFloors = Array.from(floorMap.keys()).sort((a, b) => a - b);

  const layouts: RoomLayout[] = [];

  for (const floorLevel of sortedFloors) {
    const floorRooms = floorMap.get(floorLevel)!;

    // ---- Step 2: Sort rooms by area, largest first ----
    const sorted = [...floorRooms].sort((a, b) => {
      const areaA = (a.width_ft ?? DEFAULT_WIDTH_FT) * (a.length_ft ?? DEFAULT_LENGTH_FT);
      const areaB = (b.width_ft ?? DEFAULT_WIDTH_FT) * (b.length_ft ?? DEFAULT_LENGTH_FT);
      return areaB - areaA;
    });

    // ---- Step 3: Row-based packing ----
    let rowX = 0;         // current X position within the row (feet)
    let rowZ = 0;         // current Z offset for this row (feet)
    let rowMaxDepth = 0;  // tallest depth in the current row (feet)

    for (const room of sorted) {
      const widthFt = room.width_ft ?? DEFAULT_WIDTH_FT;
      const lengthFt = room.length_ft ?? DEFAULT_LENGTH_FT;
      const ceilingFt = room.ceiling_height_ft ?? DEFAULT_CEILING_FT;
      const sqft = room.sqft ?? widthFt * lengthFt;

      // Wrap to new row if this room would exceed the max row width
      if (rowX > 0 && rowX + widthFt > MAX_ROW_WIDTH_FT) {
        rowZ += rowMaxDepth + ROOM_GAP_FT;
        rowX = 0;
        rowMaxDepth = 0;
      }

      // Floor Y position: (floorLevel - 1) * ceiling height
      // Floor level 1 sits at y=0, floor level 2 sits at y=ceilingHeight, etc.
      const floorY = (floorLevel - 1) * ceilingFt * FEET_TO_UNITS;

      const layout: RoomLayout = {
        roomId: room.id,
        name: room.name,
        x: rowX * FEET_TO_UNITS,
        y: floorY,
        z: rowZ * FEET_TO_UNITS,
        width: widthFt * FEET_TO_UNITS,
        height: ceilingFt * FEET_TO_UNITS,
        depth: lengthFt * FEET_TO_UNITS,
        floorLevel: floorLevel,
        roomType: inferRoomType(room.name),
        supplyCfm: room.cooling_cfm,
        numSupplyVents: estimateSupplyVents(room.cooling_cfm),
        hasReturnVent: shouldHaveReturn(room.name, sqft),
      };

      layouts.push(layout);

      // Advance cursor
      rowX += widthFt + ROOM_GAP_FT;
      rowMaxDepth = Math.max(rowMaxDepth, lengthFt);
    }
  }

  return layouts;
}
