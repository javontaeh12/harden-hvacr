import type { InstallDuctSegment, InstallEquipmentOption, MaterialCategory } from './types';
import { DEFAULT_MATERIAL_COSTS } from './constants';

interface MaterialLine {
  category: MaterialCategory;
  name: string;
  description: string | null;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
  source: string | null;
  equipment_option_tier: string | null;
  sort_order: number;
}

/**
 * Auto-generate a materials takeoff from duct segments and equipment option.
 */
export function generateMaterials(
  segments: InstallDuctSegment[],
  equipmentOption: InstallEquipmentOption | null,
  lineSetLengthFt: number = 25,
  thermostatWireLengthFt: number = 50,
): MaterialLine[] {
  const materials: MaterialLine[] = [];
  let sortOrder = 0;
  const tier = equipmentOption?.tier ?? null;

  // --- Equipment ---
  if (equipmentOption) {
    if (equipmentOption.condenser_model) {
      materials.push({
        category: 'equipment',
        name: `Condenser - ${equipmentOption.condenser_model}`,
        description: equipmentOption.tonnage ? `${equipmentOption.tonnage}T, ${equipmentOption.seer ?? ''} SEER` : null,
        quantity: 1,
        unit: 'each',
        unit_cost: equipmentOption.condenser_price ?? 0,
        total_cost: equipmentOption.condenser_price ?? 0,
        source: 'equipment_option',
        equipment_option_tier: tier,
        sort_order: sortOrder++,
      });
    }
    if (equipmentOption.air_handler_model) {
      materials.push({
        category: 'equipment',
        name: `Air Handler - ${equipmentOption.air_handler_model}`,
        description: null,
        quantity: 1,
        unit: 'each',
        unit_cost: equipmentOption.air_handler_price ?? 0,
        total_cost: equipmentOption.air_handler_price ?? 0,
        source: 'equipment_option',
        equipment_option_tier: tier,
        sort_order: sortOrder++,
      });
    }
    if (equipmentOption.furnace_model) {
      materials.push({
        category: 'equipment',
        name: `Furnace - ${equipmentOption.furnace_model}`,
        description: null,
        quantity: 1,
        unit: 'each',
        unit_cost: equipmentOption.furnace_price ?? 0,
        total_cost: equipmentOption.furnace_price ?? 0,
        source: 'equipment_option',
        equipment_option_tier: tier,
        sort_order: sortOrder++,
      });
    }
    if (equipmentOption.thermostat_model) {
      materials.push({
        category: 'equipment',
        name: `Thermostat - ${equipmentOption.thermostat_model}`,
        description: null,
        quantity: 1,
        unit: 'each',
        unit_cost: equipmentOption.thermostat_price ?? 0,
        total_cost: equipmentOption.thermostat_price ?? 0,
        source: 'equipment_option',
        equipment_option_tier: tier,
        sort_order: sortOrder++,
      });
    }
  }

  // --- Ductwork ---
  const supplyBranches = segments.filter(s => s.segment_type === 'supply_branch');
  const returnDrops = segments.filter(s => s.segment_type === 'return_drop');
  const trunks = segments.filter(s => s.segment_type === 'supply_trunk' || s.segment_type === 'return_trunk');

  // Flex duct by diameter
  const flexByDiameter = new Map<number, number>();
  for (const seg of [...supplyBranches, ...returnDrops]) {
    if (seg.material === 'flex' && seg.diameter_in && seg.length_ft) {
      const d = seg.diameter_in;
      flexByDiameter.set(d, (flexByDiameter.get(d) ?? 0) + seg.length_ft);
    }
  }
  for (const [diameter, totalFt] of flexByDiameter) {
    const costKey = `flex_duct_${diameter}in`;
    const cost = DEFAULT_MATERIAL_COSTS[costKey]?.cost ?? 2.00;
    materials.push({
      category: 'ductwork',
      name: `Flex Duct ${diameter}"`,
      description: null,
      quantity: Math.ceil(totalFt),
      unit: 'linear_foot',
      unit_cost: cost,
      total_cost: Math.round(Math.ceil(totalFt) * cost * 100) / 100,
      source: 'auto_duct',
      equipment_option_tier: tier,
      sort_order: sortOrder++,
    });
  }

  // Sheet metal trunk
  let totalTrunkFt = 0;
  for (const seg of trunks) {
    if (seg.length_ft) totalTrunkFt += seg.length_ft;
  }
  if (totalTrunkFt > 0) {
    const cost = DEFAULT_MATERIAL_COSTS['sheet_metal_duct']?.cost ?? 8.00;
    materials.push({
      category: 'ductwork',
      name: 'Sheet Metal Trunk Duct',
      description: null,
      quantity: Math.ceil(totalTrunkFt),
      unit: 'linear_foot',
      unit_cost: cost,
      total_cost: Math.round(Math.ceil(totalTrunkFt) * cost * 100) / 100,
      source: 'auto_duct',
      equipment_option_tier: tier,
      sort_order: sortOrder++,
    });
  }

  // Supply registers
  const supplyRegisters = new Map<string, number>();
  for (const seg of supplyBranches) {
    if (seg.register_size) {
      supplyRegisters.set(seg.register_size, (supplyRegisters.get(seg.register_size) ?? 0) + 1);
    }
  }
  for (const [size, qty] of supplyRegisters) {
    const costKey = `supply_register_${size}`;
    const cost = DEFAULT_MATERIAL_COSTS[costKey]?.cost ?? 10.00;
    materials.push({
      category: 'fittings',
      name: `Supply Register ${size}`,
      description: null,
      quantity: qty,
      unit: 'each',
      unit_cost: cost,
      total_cost: Math.round(qty * cost * 100) / 100,
      source: 'auto_duct',
      equipment_option_tier: tier,
      sort_order: sortOrder++,
    });
  }

  // Return grilles
  const returnGrilles = new Map<string, number>();
  for (const seg of returnDrops) {
    if (seg.register_size) {
      returnGrilles.set(seg.register_size, (returnGrilles.get(seg.register_size) ?? 0) + 1);
    }
  }
  for (const [size, qty] of returnGrilles) {
    const costKey = `return_grille_${size}`;
    const cost = DEFAULT_MATERIAL_COSTS[costKey]?.cost ?? 18.00;
    materials.push({
      category: 'fittings',
      name: `Return Grille ${size}`,
      description: null,
      quantity: qty,
      unit: 'each',
      unit_cost: cost,
      total_cost: Math.round(qty * cost * 100) / 100,
      source: 'auto_duct',
      equipment_option_tier: tier,
      sort_order: sortOrder++,
    });
  }

  // Start collars (one per branch)
  const branchCount = supplyBranches.length + returnDrops.length;
  if (branchCount > 0) {
    const cost = DEFAULT_MATERIAL_COSTS['start_collar_6in']?.cost ?? 5.00;
    materials.push({
      category: 'fittings',
      name: 'Start Collars (assorted)',
      description: null,
      quantity: branchCount,
      unit: 'each',
      unit_cost: cost,
      total_cost: Math.round(branchCount * cost * 100) / 100,
      source: 'auto_duct',
      equipment_option_tier: tier,
      sort_order: sortOrder++,
    });
  }

  // Plenum box
  materials.push({
    category: 'fittings',
    name: 'Plenum Box',
    description: 'Supply plenum',
    quantity: 1,
    unit: 'each',
    unit_cost: DEFAULT_MATERIAL_COSTS['plenum_box']?.cost ?? 45.00,
    total_cost: DEFAULT_MATERIAL_COSTS['plenum_box']?.cost ?? 45.00,
    source: 'auto_standard',
    equipment_option_tier: tier,
    sort_order: sortOrder++,
  });

  // Hanging strap
  const totalDuctFt = totalTrunkFt + [...flexByDiameter.values()].reduce((s, v) => s + v, 0);
  // ~1 hanger per 4 ft
  const hangerCount = Math.ceil(totalDuctFt / 4);
  if (hangerCount > 0) {
    const cost = DEFAULT_MATERIAL_COSTS['hanging_strap']?.cost ?? 0.50;
    materials.push({
      category: 'supports',
      name: 'Hanging Strap',
      description: null,
      quantity: hangerCount * 2, // ~2 ft per hanger
      unit: 'linear_foot',
      unit_cost: cost,
      total_cost: Math.round(hangerCount * 2 * cost * 100) / 100,
      source: 'auto_duct',
      equipment_option_tier: tier,
      sort_order: sortOrder++,
    });
  }

  // Duct tape + mastic
  const rolls = Math.ceil(branchCount / 8); // ~8 connections per roll
  addMaterial(materials, 'ductwork', 'Duct Tape', rolls, 'roll', 'duct_tape', tier, sortOrder++);
  const gallons = Math.ceil(branchCount / 15); // ~15 connections per gallon
  addMaterial(materials, 'ductwork', 'Mastic Sealant', gallons, 'gallon', 'mastic_sealant', tier, sortOrder++);

  // --- Electrical ---
  addMaterial(materials, 'electrical', 'Disconnect 60A', 1, 'each', 'disconnect_60a', tier, sortOrder++);
  addMaterial(materials, 'electrical', 'Whip 6ft', 1, 'each', 'whip_6ft', tier, sortOrder++);
  addMaterial(materials, 'electrical', 'Thermostat Wire', thermostatWireLengthFt, 'linear_foot', 'thermostat_wire', tier, sortOrder++);

  // --- Refrigerant ---
  // Line set
  const tonnage = equipmentOption?.tonnage ?? 3;
  const lineSetKey = tonnage >= 3 ? 'line_set_3/8_7/8' : 'line_set_3/8_3/4';
  const lineSetName = tonnage >= 3 ? 'Line Set 3/8" x 7/8"' : 'Line Set 3/8" x 3/4"';
  addMaterial(materials, 'refrigerant', lineSetName, lineSetLengthFt, 'linear_foot', lineSetKey, tier, sortOrder++);

  // Refrigerant (extra charge above factory charge)
  const extraRefrigerant = Math.max(0, lineSetLengthFt - 15) * 0.6; // ~0.6 lb per ft over 15ft
  if (extraRefrigerant > 0) {
    addMaterial(materials, 'refrigerant', 'Refrigerant R-410A', Math.ceil(extraRefrigerant), 'lb', 'refrigerant_r410a', tier, sortOrder++);
  }

  // --- Standard items ---
  addMaterial(materials, 'misc', 'Drain Line 3/4" PVC', 15, 'linear_foot', 'drain_line_3/4_pvc', tier, sortOrder++);
  addMaterial(materials, 'misc', 'Safety Float Switch', 1, 'each', 'safety_float_switch', tier, sortOrder++);
  addMaterial(materials, 'misc', 'Concrete Pad', 1, 'each', 'concrete_pad', tier, sortOrder++);

  // Filter
  const filterSize = tonnage >= 3.5 ? '20x25x4' : tonnage >= 2.5 ? '20x25x1' : '16x25x1';
  const filterKey = `filter_${filterSize}`;
  addMaterial(materials, 'misc', `Filter ${filterSize}`, 1, 'each', filterKey, tier, sortOrder++);

  // --- Disposal ---
  materials.push({
    category: 'disposal',
    name: 'Old Equipment Disposal',
    description: 'Haul away and recycling of old system',
    quantity: 1,
    unit: 'each',
    unit_cost: equipmentOption?.disposal_fee ?? 200,
    total_cost: equipmentOption?.disposal_fee ?? 200,
    source: 'auto_standard',
    equipment_option_tier: tier,
    sort_order: sortOrder++,
  });

  return materials;
}

function addMaterial(
  materials: MaterialLine[],
  category: MaterialCategory,
  name: string,
  quantity: number,
  unit: string,
  costKey: string,
  tier: string | null,
  sortOrder: number,
) {
  const cost = DEFAULT_MATERIAL_COSTS[costKey]?.cost ?? 0;
  materials.push({
    category,
    name,
    description: null,
    quantity,
    unit,
    unit_cost: cost,
    total_cost: Math.round(quantity * cost * 100) / 100,
    source: 'auto_standard',
    equipment_option_tier: tier,
    sort_order: sortOrder,
  });
}
