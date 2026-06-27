// Project types
export type ProjectStatus = 'draft' | 'survey' | 'designing' | 'proposal_sent' | 'accepted' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type ProjectType = 'replacement' | 'new_construction' | 'add_on' | 'conversion';
export type SystemType = 'split' | 'package' | 'mini_split' | 'dual_fuel' | 'heat_pump' | 'furnace_only';
export type BuildingType = 'single_family' | 'townhome' | 'duplex' | 'condo' | 'mobile_home' | 'apartment' | 'small_commercial';
export type UXMode = 'sales' | 'design' | 'production';
export type Orientation = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
export type FloorType = 'slab' | 'crawlspace' | 'basement' | 'over_garage' | 'second_floor';
export type EquipmentCategory = 'condenser' | 'air_handler' | 'furnace' | 'coil' | 'heat_pump' | 'mini_split' | 'package_unit' | 'thermostat' | 'line_set' | 'disconnect' | 'whip' | 'pad' | 'filter_drier' | 'refrigerant' | 'accessory' | 'other';
export type Tier = 'good' | 'better' | 'best';
export type SegmentType = 'supply_trunk' | 'supply_branch' | 'return_trunk' | 'return_drop';
export type DuctShape = 'round' | 'rectangular' | 'flex';
export type DuctMaterial = 'galvanized' | 'flex' | 'ductboard' | 'fiberglass_lined';
export type MaterialCategory = 'equipment' | 'ductwork' | 'electrical' | 'refrigerant' | 'fittings' | 'supports' | 'insulation' | 'misc' | 'disposal';
export type ProposalStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired';
export type DocType = 'scope_of_work' | 'install_checklist' | 'parts_list' | 'equipment_spec' | 'permit_application' | 'inspection_report';
export type HumidityZone = 'dry' | 'moderate' | 'humid' | 'very_humid';
export type FrameType = 'vinyl' | 'wood' | 'aluminum' | 'fiberglass' | 'steel';
export type GlassType = 'single' | 'double' | 'double_low_e' | 'triple' | 'triple_low_e';
export type AHLocation = 'attic' | 'closet' | 'garage' | 'basement' | 'utility_room' | 'rooftop';
export type RoomType = 'bedroom' | 'bathroom' | 'kitchen' | 'living' | 'dining' | 'hallway' | 'closet' | 'garage' | 'utility' | 'office' | 'other';
export type EquipmentType = 'air_handler' | 'furnace' | 'condenser' | 'heat_pump' | 'mini_split' | 'thermostat';

// Database row interfaces
export interface InstallProject {
  id: string;
  customer_id: string | null;
  created_by: string | null;
  assigned_to: string | null;
  project_name: string;
  status: ProjectStatus;
  project_type: ProjectType;
  system_type: SystemType;
  address: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  building_type: BuildingType;
  stories: number;
  year_built: number | null;
  total_sqft: number | null;
  conditioned_sqft: number | null;
  design_cooling_temp: number | null;
  design_heating_temp: number | null;
  indoor_cooling_temp: number;
  indoor_heating_temp: number;
  elevation_ft: number | null;
  humidity_zone: HumidityZone | null;
  climate_zone: string | null;
  existing_equipment: Record<string, unknown>;
  current_mode: UXMode;
  notes: string | null;
  group_id: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  customers?: { full_name: string; phone: string; address: string; email: string | null } | null;
}

export interface InstallRoom {
  id: string;
  project_id: string;
  name: string;
  floor_level: number;
  length_ft: number | null;
  width_ft: number | null;
  ceiling_height_ft: number;
  sqft: number | null;
  orientation: Orientation | null;
  ceiling_r_value: number;
  floor_type: FloorType;
  floor_r_value: number;
  occupants: number;
  has_kitchen: boolean;
  has_fireplace: boolean;
  appliance_btuh: number;
  cooling_btuh: number | null;
  heating_btuh: number | null;
  cooling_cfm: number | null;
  heating_cfm: number | null;
  sort_order: number;
  created_at: string;
}

export interface InstallSurface {
  id: string;
  room_id: string;
  surface_type: 'wall' | 'ceiling' | 'floor';
  orientation: Orientation | null;
  gross_area_sqft: number | null;
  net_area_sqft: number | null;
  r_value: number | null;
  construction: string | null;
  is_exterior: boolean;
  created_at: string;
}

export interface InstallOpening {
  id: string;
  room_id: string;
  surface_id: string | null;
  opening_type: 'window' | 'door' | 'skylight';
  quantity: number;
  width_in: number | null;
  height_in: number | null;
  area_sqft: number | null;
  u_factor: number;
  shgc: number;
  orientation: Orientation | null;
  has_overhang: boolean;
  frame_type: FrameType;
  glass_type: GlassType;
  created_at: string;
}

export interface InstallLoad {
  id: string;
  project_id: string;
  room_id: string | null;
  load_type: 'room' | 'total';
  sensible_wall: number;
  sensible_ceiling: number;
  sensible_floor: number;
  sensible_window_conduction: number;
  sensible_window_solar: number;
  sensible_door: number;
  sensible_infiltration: number;
  sensible_internal: number;
  sensible_duct: number;
  total_sensible_cooling: number;
  total_latent_cooling: number;
  total_cooling: number;
  heating_wall: number;
  heating_ceiling: number;
  heating_floor: number;
  heating_window: number;
  heating_door: number;
  heating_infiltration: number;
  heating_duct: number;
  total_heating: number;
  cooling_cfm: number;
  heating_cfm: number;
  tonnage_required: number;
  calculated_at: string;
  created_at: string;
}

export interface EquipmentCatalogItem {
  id: string;
  category: EquipmentCategory;
  brand: string;
  model_number: string;
  description: string | null;
  tonnage: number | null;
  seer_rating: number | null;
  hspf: number | null;
  btu_cooling: number | null;
  btu_heating: number | null;
  voltage: string | null;
  phase: string;
  refrigerant_type: string | null;
  dimensions: Record<string, unknown>;
  weight_lbs: number | null;
  wholesale_cost: number | null;
  retail_price: number | null;
  tier: Tier | null;
  is_active: boolean;
  group_id: string;
  created_at: string;
  updated_at: string;
}

export interface PriceBookItem {
  id: string;
  category: string;
  name: string;
  description: string | null;
  unit: string;
  unit_cost: number;
  is_active: boolean;
  group_id: string;
  created_at: string;
}

export interface InstallEquipmentOption {
  id: string;
  project_id: string;
  tier: Tier;
  label: string | null;
  condenser_id: string | null;
  air_handler_id: string | null;
  furnace_id: string | null;
  coil_id: string | null;
  thermostat_id: string | null;
  condenser_model: string | null;
  condenser_price: number | null;
  air_handler_model: string | null;
  air_handler_price: number | null;
  furnace_model: string | null;
  furnace_price: number | null;
  coil_model: string | null;
  coil_price: number | null;
  thermostat_model: string | null;
  thermostat_price: number | null;
  accessories: Array<{ name: string; qty: number; unit_cost: number; total: number }>;
  equipment_total: number;
  labor_total: number;
  material_total: number;
  permit_fee: number;
  disposal_fee: number;
  subtotal: number;
  tax: number;
  total: number;
  tonnage: number | null;
  seer: number | null;
  hspf: number | null;
  warranty_years: number | null;
  estimated_annual_savings: number | null;
  is_recommended: boolean;
  sort_order: number;
  created_at: string;
}

export interface InstallDuctSegment {
  id: string;
  project_id: string;
  room_id: string | null;
  segment_type: SegmentType;
  shape: DuctShape;
  diameter_in: number | null;
  width_in: number | null;
  height_in: number | null;
  length_ft: number | null;
  cfm: number | null;
  friction_rate: number | null;
  velocity_fpm: number | null;
  insulation_r: number;
  material: DuctMaterial;
  register_type: string | null;
  register_size: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
}

export interface InstallMaterial {
  id: string;
  project_id: string;
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
  created_at: string;
}

export interface InstallProposal {
  id: string;
  project_id: string;
  status: ProposalStatus;
  selected_tier: Tier | null;
  cover_title: string;
  cover_subtitle: string | null;
  intro_message: string | null;
  closing_message: string | null;
  company_terms: string | null;
  show_financing: boolean;
  financing_provider: string | null;
  financing_term_months: number | null;
  financing_apr: number | null;
  financing_monthly: number | null;
  valid_until: string | null;
  share_token: string | null;
  accepted_at: string | null;
  customer_signature_url: string | null;
  customer_name_signed: string | null;
  created_at: string;
  updated_at: string;
}

export interface InstallDocument {
  id: string;
  project_id: string;
  doc_type: DocType;
  title: string;
  content: Record<string, unknown>;
  pdf_url: string | null;
  status: 'draft' | 'final' | 'signed';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Design conditions
export interface DesignConditions {
  outdoorCoolingTemp: number;
  outdoorHeatingTemp: number;
  indoorCoolingTemp: number;
  indoorHeatingTemp: number;
  elevationFt: number;
  humidityZone: HumidityZone;
  dailyRange: 'low' | 'medium' | 'high';
  latitude: number;
}

// Calculation result types
export interface RoomCoolingLoad {
  roomId: string;
  sensibleWall: number;
  sensibleCeiling: number;
  sensibleFloor: number;
  sensibleWindowConduction: number;
  sensibleWindowSolar: number;
  sensibleDoor: number;
  sensibleInfiltration: number;
  sensibleInternal: number;
  sensibleDuct: number;
  totalSensibleCooling: number;
  totalLatentCooling: number;
  totalCooling: number;
}

export interface RoomHeatingLoad {
  roomId: string;
  heatingWall: number;
  heatingCeiling: number;
  heatingFloor: number;
  heatingWindow: number;
  heatingDoor: number;
  heatingInfiltration: number;
  heatingDuct: number;
  totalHeating: number;
}

export interface TotalLoads {
  totalSensibleCooling: number;
  totalLatentCooling: number;
  totalCooling: number;
  totalHeating: number;
  coolingCFM: number;
  heatingCFM: number;
  tonnageRequired: number;
}

// 3D visualization types
export interface RoomLayout {
  roomId: string;
  name: string;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  floorLevel: number;
  roomType: string;
  supplyCfm: number | null;
  numSupplyVents: number;
  hasReturnVent: boolean;
}

export interface DuctPath3D {
  segmentId: string;
  type: SegmentType;
  points: [number, number, number][];
  diameter: number;
  cfm: number | null;
  roomId: string | null;
}

export interface EquipmentPlacement {
  id: string;
  type: EquipmentType;
  position: [number, number, number];
  dimensions: [number, number, number];
  label: string;
}

export interface LayerVisibility {
  walls: boolean;
  ceiling: boolean;
  ducts: boolean;
  supplyVents: boolean;
  returnVents: boolean;
  equipment: boolean;
  labels: boolean;
}
