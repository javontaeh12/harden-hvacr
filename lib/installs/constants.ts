// Scale: 1 foot = 0.3 scene units for 3D rendering
export const FEET_TO_UNITS = 0.3;

// ============================================
// R-VALUE DEFAULTS BY CONSTRUCTION TYPE
// ============================================
export const WALL_R_VALUES: Record<string, number> = {
  'uninsulated': 4,
  '2x4_r11': 11,
  '2x4_r13': 13,
  '2x4_r15': 15,
  '2x6_r19': 19,
  '2x6_r21': 21,
  'brick_uninsulated': 5,
  'brick_r11': 14,
  'block_uninsulated': 3,
  'block_r8': 11,
  'sip_4in': 15,
  'sip_6in': 23,
  'icf': 22,
};

export const CEILING_R_VALUES: Record<string, number> = {
  'uninsulated': 3,
  'r19': 19,
  'r30': 30,
  'r38': 38,
  'r49': 49,
  'r60': 60,
};

export const FLOOR_R_VALUES: Record<string, { rValue: number; tempDiff: number }> = {
  'slab': { rValue: 0, tempDiff: 0 },         // slab-on-grade: minimal floor loss
  'crawlspace': { rValue: 11, tempDiff: 15 },  // vented crawl
  'basement': { rValue: 5, tempDiff: 10 },      // conditioned basement
  'over_garage': { rValue: 19, tempDiff: 20 },  // unconditioned garage below
  'second_floor': { rValue: 0, tempDiff: 0 },   // above conditioned space
};

// ============================================
// WINDOW DEFAULTS
// ============================================
export const WINDOW_U_FACTORS: Record<string, number> = {
  'single': 1.10,
  'double': 0.49,
  'double_low_e': 0.30,
  'triple': 0.30,
  'triple_low_e': 0.18,
};

export const WINDOW_SHGC: Record<string, number> = {
  'single': 0.86,
  'double': 0.56,
  'double_low_e': 0.27,
  'triple': 0.41,
  'triple_low_e': 0.22,
};

// ============================================
// SOLAR HEAT GAIN FACTORS BY ORIENTATION (BTU/hr per sqft of glass)
// For 30-35 deg latitude (Florida/Southern US)
// ============================================
export const SOLAR_GAIN_FACTORS: Record<string, number> = {
  'N': 20,
  'NE': 45,
  'E': 80,
  'SE': 90,
  'S': 75,
  'SW': 90,
  'W': 80,
  'NW': 45,
};

// ============================================
// INFILTRATION RATES (ACH - air changes per hour)
// ============================================
export const INFILTRATION_ACH: Record<string, number> = {
  'tight': 0.25,       // new construction, spray foam, blower-door tested
  'average': 0.50,     // typical existing home, some sealing
  'leaky': 0.75,       // older home, minimal sealing
  'very_leaky': 1.0,   // old home, no improvements
};

// ============================================
// INTERNAL LOAD DEFAULTS
// ============================================
export const INTERNAL_LOADS = {
  PERSON_SENSIBLE_BTUH: 230,
  PERSON_LATENT_BTUH: 200,
  KITCHEN_BTUH: 1200,
  FIREPLACE_BTUH: -500, // net loss due to draft
};

// ============================================
// DUCT LOSS FACTORS
// ============================================
export const DUCT_LOSS_FACTORS: Record<string, number> = {
  'conditioned_space': 0.05,   // 5% loss
  'attic_insulated': 0.10,     // 10% loss
  'attic_uninsulated': 0.20,   // 20% loss
  'crawlspace_insulated': 0.10,
  'crawlspace_uninsulated': 0.15,
  'garage': 0.15,
};

// ============================================
// DUCT SIZING TABLE (equal friction method)
// CFM -> recommended round duct diameter (inches)
// Based on 0.08 in. w.c. per 100 ft friction rate
// ============================================
export const DUCT_SIZING_TABLE: Array<{ maxCFM: number; diameter: number }> = [
  { maxCFM: 40, diameter: 4 },
  { maxCFM: 65, diameter: 5 },
  { maxCFM: 100, diameter: 6 },
  { maxCFM: 150, diameter: 7 },
  { maxCFM: 200, diameter: 8 },
  { maxCFM: 280, diameter: 9 },
  { maxCFM: 375, diameter: 10 },
  { maxCFM: 500, diameter: 12 },
  { maxCFM: 700, diameter: 14 },
  { maxCFM: 950, diameter: 16 },
  { maxCFM: 1250, diameter: 18 },
  { maxCFM: 1600, diameter: 20 },
  { maxCFM: 2000, diameter: 22 },
  { maxCFM: 2500, diameter: 24 },
];

// Default friction rate (in. w.c. per 100 ft)
export const DEFAULT_FRICTION_RATE = 0.08;

// CFM per ton for cooling
export const CFM_PER_TON = 400;

// ============================================
// DESIGN TEMPERATURE DEFAULTS BY REGION
// (ASHRAE 99.6% heating / 0.4% cooling)
// ============================================
export const DESIGN_TEMPS_BY_REGION: Record<string, { cooling: number; heating: number }> = {
  // Alabama
  'birmingham': { cooling: 96, heating: 18 },
  'huntsville': { cooling: 96, heating: 14 },
  'mobile': { cooling: 95, heating: 27 },
  'montgomery': { cooling: 97, heating: 22 },
  'tuscaloosa': { cooling: 96, heating: 19 },
  // Arizona
  'phoenix': { cooling: 110, heating: 34 },
  'tucson': { cooling: 105, heating: 30 },
  'mesa': { cooling: 110, heating: 34 },
  'scottsdale': { cooling: 110, heating: 34 },
  'flagstaff': { cooling: 84, heating: -2 },
  // Arkansas
  'little_rock': { cooling: 98, heating: 15 },
  'fayetteville': { cooling: 96, heating: 10 },
  // California
  'los_angeles': { cooling: 93, heating: 41 },
  'san_francisco': { cooling: 84, heating: 35 },
  'san_diego': { cooling: 89, heating: 42 },
  'sacramento': { cooling: 102, heating: 30 },
  'fresno': { cooling: 104, heating: 28 },
  'bakersfield': { cooling: 106, heating: 31 },
  'riverside': { cooling: 104, heating: 32 },
  'san_jose': { cooling: 93, heating: 33 },
  'oakland': { cooling: 85, heating: 35 },
  'long_beach': { cooling: 89, heating: 41 },
  // Colorado
  'denver': { cooling: 95, heating: 1 },
  'colorado_springs': { cooling: 93, heating: -1 },
  'fort_collins': { cooling: 95, heating: -5 },
  'aurora': { cooling: 95, heating: 1 },
  // Connecticut
  'hartford': { cooling: 91, heating: 5 },
  'bridgeport': { cooling: 90, heating: 8 },
  'new_haven': { cooling: 90, heating: 7 },
  // Delaware
  'wilmington': { cooling: 93, heating: 12 },
  // Florida
  'tallahassee': { cooling: 95, heating: 27 },
  'jacksonville': { cooling: 96, heating: 29 },
  'orlando': { cooling: 95, heating: 35 },
  'miami': { cooling: 93, heating: 47 },
  'tampa': { cooling: 93, heating: 36 },
  'pensacola': { cooling: 95, heating: 26 },
  'fort_lauderdale': { cooling: 93, heating: 45 },
  'st._petersburg': { cooling: 93, heating: 38 },
  'saint_petersburg': { cooling: 93, heating: 38 },
  'naples': { cooling: 93, heating: 42 },
  'gainesville': { cooling: 95, heating: 30 },
  'daytona_beach': { cooling: 94, heating: 33 },
  'sarasota': { cooling: 93, heating: 39 },
  'cape_coral': { cooling: 94, heating: 41 },
  'lakeland': { cooling: 95, heating: 35 },
  'ocala': { cooling: 95, heating: 30 },
  'palm_bay': { cooling: 94, heating: 36 },
  'clearwater': { cooling: 93, heating: 38 },
  'port_st._lucie': { cooling: 94, heating: 39 },
  'port_saint_lucie': { cooling: 94, heating: 39 },
  'kissimmee': { cooling: 95, heating: 35 },
  'deltona': { cooling: 95, heating: 33 },
  'palm_coast': { cooling: 94, heating: 31 },
  'spring_hill': { cooling: 94, heating: 35 },
  'brandon': { cooling: 93, heating: 36 },
  'pompano_beach': { cooling: 93, heating: 45 },
  'davie': { cooling: 93, heating: 45 },
  'boca_raton': { cooling: 93, heating: 43 },
  'plantation': { cooling: 93, heating: 45 },
  'sunrise': { cooling: 93, heating: 45 },
  'hollywood': { cooling: 93, heating: 45 },
  'pembroke_pines': { cooling: 93, heating: 45 },
  'coral_springs': { cooling: 93, heating: 44 },
  'miramar': { cooling: 93, heating: 45 },
  'deerfield_beach': { cooling: 93, heating: 44 },
  'west_palm_beach': { cooling: 93, heating: 42 },
  'boynton_beach': { cooling: 93, heating: 42 },
  'delray_beach': { cooling: 93, heating: 43 },
  'jupiter': { cooling: 93, heating: 41 },
  'hialeah': { cooling: 93, heating: 47 },
  'homestead': { cooling: 93, heating: 45 },
  'melbourne': { cooling: 94, heating: 36 },
  'fort_myers': { cooling: 94, heating: 41 },
  'winter_haven': { cooling: 95, heating: 35 },
  'sanford': { cooling: 95, heating: 34 },
  'largo': { cooling: 93, heating: 38 },
  'doral': { cooling: 93, heating: 46 },
  'apopka': { cooling: 95, heating: 34 },
  'ocoee': { cooling: 95, heating: 34 },
  'winter_garden': { cooling: 95, heating: 34 },
  'clermont': { cooling: 95, heating: 34 },
  'tavares': { cooling: 95, heating: 33 },
  'leesburg': { cooling: 95, heating: 32 },
  'the_villages': { cooling: 95, heating: 31 },
  // Georgia
  'atlanta': { cooling: 95, heating: 18 },
  'savannah': { cooling: 96, heating: 26 },
  'augusta': { cooling: 97, heating: 20 },
  'macon': { cooling: 97, heating: 21 },
  'columbus_ga': { cooling: 97, heating: 22 },
  // Hawaii
  'honolulu': { cooling: 90, heating: 60 },
  // Idaho
  'boise': { cooling: 99, heating: 4 },
  // Illinois
  'chicago': { cooling: 93, heating: -3 },
  'springfield': { cooling: 94, heating: -1 },
  'peoria': { cooling: 93, heating: -4 },
  'rockford': { cooling: 92, heating: -7 },
  // Indiana
  'indianapolis': { cooling: 92, heating: 2 },
  'fort_wayne': { cooling: 91, heating: 0 },
  // Iowa
  'des_moines': { cooling: 93, heating: -7 },
  'cedar_rapids': { cooling: 91, heating: -8 },
  // Kansas
  'wichita': { cooling: 100, heating: 5 },
  'kansas_city': { cooling: 97, heating: 3 },
  // Kentucky
  'louisville': { cooling: 94, heating: 8 },
  'lexington': { cooling: 93, heating: 8 },
  // Louisiana
  'new_orleans': { cooling: 95, heating: 30 },
  'baton_rouge': { cooling: 96, heating: 27 },
  'shreveport': { cooling: 98, heating: 21 },
  'lafayette': { cooling: 96, heating: 28 },
  // Maine
  'portland_me': { cooling: 88, heating: -1 },
  // Maryland
  'baltimore': { cooling: 94, heating: 12 },
  'annapolis': { cooling: 93, heating: 14 },
  // Massachusetts
  'boston': { cooling: 91, heating: 6 },
  'worcester': { cooling: 89, heating: 1 },
  'springfield_ma': { cooling: 91, heating: 3 },
  // Michigan
  'detroit': { cooling: 91, heating: 3 },
  'grand_rapids': { cooling: 90, heating: 1 },
  'lansing': { cooling: 90, heating: 0 },
  // Minnesota
  'minneapolis': { cooling: 92, heating: -12 },
  'st._paul': { cooling: 92, heating: -12 },
  'saint_paul': { cooling: 92, heating: -12 },
  'duluth': { cooling: 85, heating: -19 },
  // Mississippi
  'jackson': { cooling: 97, heating: 21 },
  'gulfport': { cooling: 95, heating: 27 },
  // Missouri
  'st._louis': { cooling: 96, heating: 4 },
  'saint_louis': { cooling: 96, heating: 4 },
  'kansas_city_mo': { cooling: 97, heating: 3 },
  // Montana
  'billings': { cooling: 95, heating: -10 },
  // Nebraska
  'omaha': { cooling: 95, heating: -5 },
  'lincoln': { cooling: 96, heating: -4 },
  // Nevada
  'las_vegas': { cooling: 108, heating: 25 },
  'reno': { cooling: 98, heating: 10 },
  // New Hampshire
  'manchester': { cooling: 90, heating: 0 },
  // New Jersey
  'newark': { cooling: 93, heating: 11 },
  'trenton': { cooling: 93, heating: 11 },
  // New Mexico
  'albuquerque': { cooling: 98, heating: 14 },
  'santa_fe': { cooling: 92, heating: 5 },
  // New York
  'new_york': { cooling: 93, heating: 11 },
  'buffalo': { cooling: 88, heating: 2 },
  'albany': { cooling: 91, heating: -1 },
  'syracuse': { cooling: 89, heating: -2 },
  'rochester': { cooling: 90, heating: 1 },
  // North Carolina
  'charlotte': { cooling: 95, heating: 19 },
  'raleigh': { cooling: 95, heating: 18 },
  'greensboro': { cooling: 94, heating: 16 },
  'durham': { cooling: 95, heating: 17 },
  'wilmington_nc': { cooling: 94, heating: 24 },
  'asheville': { cooling: 90, heating: 12 },
  'fayetteville_nc': { cooling: 95, heating: 20 },
  // North Dakota
  'fargo': { cooling: 92, heating: -18 },
  'bismarck': { cooling: 95, heating: -19 },
  // Ohio
  'columbus': { cooling: 92, heating: 3 },
  'cleveland': { cooling: 90, heating: 2 },
  'cincinnati': { cooling: 93, heating: 6 },
  'dayton': { cooling: 92, heating: 2 },
  'toledo': { cooling: 91, heating: 0 },
  'akron': { cooling: 89, heating: 2 },
  // Oklahoma
  'oklahoma_city': { cooling: 100, heating: 11 },
  'tulsa': { cooling: 100, heating: 12 },
  // Oregon
  'portland': { cooling: 93, heating: 21 },
  'eugene': { cooling: 92, heating: 19 },
  'salem': { cooling: 92, heating: 19 },
  // Pennsylvania
  'philadelphia': { cooling: 93, heating: 12 },
  'pittsburgh': { cooling: 90, heating: 5 },
  'harrisburg': { cooling: 93, heating: 9 },
  // Rhode Island
  'providence': { cooling: 90, heating: 6 },
  // South Carolina
  'columbia': { cooling: 97, heating: 21 },
  'charleston': { cooling: 95, heating: 25 },
  'greenville': { cooling: 94, heating: 18 },
  // South Dakota
  'sioux_falls': { cooling: 93, heating: -11 },
  // Tennessee
  'nashville': { cooling: 96, heating: 11 },
  'memphis': { cooling: 97, heating: 15 },
  'knoxville': { cooling: 94, heating: 14 },
  'chattanooga': { cooling: 96, heating: 15 },
  // Texas
  'dallas': { cooling: 102, heating: 19 },
  'houston': { cooling: 97, heating: 29 },
  'san_antonio': { cooling: 100, heating: 25 },
  'austin': { cooling: 100, heating: 24 },
  'fort_worth': { cooling: 102, heating: 19 },
  'el_paso': { cooling: 101, heating: 20 },
  'corpus_christi': { cooling: 96, heating: 32 },
  'lubbock': { cooling: 100, heating: 11 },
  'amarillo': { cooling: 98, heating: 8 },
  'mcallen': { cooling: 99, heating: 35 },
  'laredo': { cooling: 102, heating: 32 },
  'plano': { cooling: 102, heating: 19 },
  'arlington': { cooling: 102, heating: 19 },
  'irving': { cooling: 102, heating: 19 },
  'frisco': { cooling: 102, heating: 18 },
  'mckinney': { cooling: 101, heating: 18 },
  'round_rock': { cooling: 100, heating: 24 },
  'the_woodlands': { cooling: 97, heating: 29 },
  'sugar_land': { cooling: 97, heating: 29 },
  'katy': { cooling: 97, heating: 29 },
  'pearland': { cooling: 97, heating: 29 },
  'league_city': { cooling: 96, heating: 30 },
  'conroe': { cooling: 97, heating: 28 },
  'new_braunfels': { cooling: 99, heating: 25 },
  'bryan': { cooling: 98, heating: 25 },
  'college_station': { cooling: 98, heating: 25 },
  'killeen': { cooling: 100, heating: 22 },
  'temple': { cooling: 100, heating: 22 },
  'waco': { cooling: 101, heating: 20 },
  'beaumont': { cooling: 96, heating: 28 },
  'midland': { cooling: 101, heating: 16 },
  'odessa': { cooling: 101, heating: 16 },
  'abilene': { cooling: 101, heating: 14 },
  'tyler': { cooling: 98, heating: 21 },
  'san_marcos': { cooling: 100, heating: 24 },
  // Utah
  'salt_lake_city': { cooling: 97, heating: 5 },
  // Vermont
  'burlington': { cooling: 88, heating: -7 },
  // Virginia
  'richmond': { cooling: 95, heating: 14 },
  'virginia_beach': { cooling: 93, heating: 19 },
  'norfolk': { cooling: 93, heating: 19 },
  // Washington
  'seattle': { cooling: 88, heating: 23 },
  'spokane': { cooling: 93, heating: 2 },
  'tacoma': { cooling: 87, heating: 22 },
  // Washington DC
  'washington': { cooling: 95, heating: 14 },
  // West Virginia
  'charleston_wv': { cooling: 92, heating: 7 },
  // Wisconsin
  'milwaukee': { cooling: 91, heating: -6 },
  'madison': { cooling: 91, heating: -9 },
  // Wyoming
  'cheyenne': { cooling: 91, heating: -6 },
};

// State-level fallback design temps (approximate for largest city in each state)
export const DESIGN_TEMPS_BY_STATE: Record<string, { cooling: number; heating: number }> = {
  'AL': { cooling: 96, heating: 18 },
  'AK': { cooling: 73, heating: -18 },
  'AZ': { cooling: 110, heating: 34 },
  'AR': { cooling: 98, heating: 15 },
  'CA': { cooling: 93, heating: 35 },
  'CO': { cooling: 95, heating: 1 },
  'CT': { cooling: 91, heating: 5 },
  'DE': { cooling: 93, heating: 12 },
  'FL': { cooling: 95, heating: 35 },
  'GA': { cooling: 95, heating: 18 },
  'HI': { cooling: 90, heating: 60 },
  'ID': { cooling: 99, heating: 4 },
  'IL': { cooling: 93, heating: -3 },
  'IN': { cooling: 92, heating: 2 },
  'IA': { cooling: 93, heating: -7 },
  'KS': { cooling: 100, heating: 5 },
  'KY': { cooling: 94, heating: 8 },
  'LA': { cooling: 95, heating: 30 },
  'ME': { cooling: 88, heating: -1 },
  'MD': { cooling: 94, heating: 12 },
  'MA': { cooling: 91, heating: 6 },
  'MI': { cooling: 91, heating: 3 },
  'MN': { cooling: 92, heating: -12 },
  'MS': { cooling: 97, heating: 21 },
  'MO': { cooling: 96, heating: 4 },
  'MT': { cooling: 95, heating: -10 },
  'NE': { cooling: 95, heating: -5 },
  'NV': { cooling: 108, heating: 25 },
  'NH': { cooling: 90, heating: 0 },
  'NJ': { cooling: 93, heating: 11 },
  'NM': { cooling: 98, heating: 14 },
  'NY': { cooling: 93, heating: 11 },
  'NC': { cooling: 95, heating: 19 },
  'ND': { cooling: 92, heating: -18 },
  'OH': { cooling: 92, heating: 3 },
  'OK': { cooling: 100, heating: 11 },
  'OR': { cooling: 93, heating: 21 },
  'PA': { cooling: 93, heating: 12 },
  'RI': { cooling: 90, heating: 6 },
  'SC': { cooling: 97, heating: 21 },
  'SD': { cooling: 93, heating: -11 },
  'TN': { cooling: 96, heating: 11 },
  'TX': { cooling: 100, heating: 25 },
  'UT': { cooling: 97, heating: 5 },
  'VT': { cooling: 88, heating: -7 },
  'VA': { cooling: 95, heating: 14 },
  'WA': { cooling: 88, heating: 23 },
  'DC': { cooling: 95, heating: 14 },
  'WV': { cooling: 92, heating: 7 },
  'WI': { cooling: 91, heating: -6 },
  'WY': { cooling: 91, heating: -6 },
};

// ============================================
// HVAC BRANDS
// ============================================
export const HVAC_BRANDS = [
  'Carrier', 'Trane', 'Lennox', 'Goodman', 'Rheem', 'Ruud',
  'York', 'Daikin', 'Mitsubishi', 'Fujitsu', 'Amana', 'American Standard',
  'Bryant', 'Heil', 'Tempstar', 'Coleman', 'Payne', 'Maytag',
  'Bosch', 'Napoleon', 'Gree', 'LG', 'Samsung', 'Honeywell',
  'Emerson', 'White-Rodgers', 'Ecobee', 'Nest', 'Other',
];

// ============================================
// REFRIGERANT TYPES
// ============================================
export const REFRIGERANT_TYPES = [
  'R-410A', 'R-32', 'R-454B', 'R-22 (legacy)', 'R-407C', 'R-134a',
];

// ============================================
// 3D VIEWER COLORS
// ============================================
export const VIEWER_COLORS = {
  WALL: '#e0e0e0',
  WALL_OPACITY: 0.6,
  FLOOR: '#d4cfc7',
  CEILING: '#ffffff',
  CEILING_OPACITY: 0.15,
  SUPPLY_DUCT: '#7eb8e0',
  RETURN_DUCT: '#e07e7e',
  DUCT_OPACITY: 0.85,
  SUPPLY_VENT: '#42a5f5',
  RETURN_VENT: '#e55b2b',
  AIR_HANDLER: '#0a1f3f',
  CONDENSER: '#4a6580',
  SELECTED_OUTLINE: '#f5a623',
  GRID: '#cccccc',
  GROUND: '#f5f5f0',
};

// ============================================
// DEFAULT MATERIAL COSTS
// ============================================
export const DEFAULT_MATERIAL_COSTS: Record<string, { unit: string; cost: number }> = {
  'flex_duct_6in': { unit: 'linear_foot', cost: 1.50 },
  'flex_duct_8in': { unit: 'linear_foot', cost: 2.00 },
  'flex_duct_10in': { unit: 'linear_foot', cost: 2.75 },
  'flex_duct_12in': { unit: 'linear_foot', cost: 3.50 },
  'sheet_metal_duct': { unit: 'linear_foot', cost: 8.00 },
  'duct_tape': { unit: 'roll', cost: 8.00 },
  'mastic_sealant': { unit: 'gallon', cost: 15.00 },
  'line_set_3/8_3/4': { unit: 'linear_foot', cost: 4.50 },
  'line_set_3/8_7/8': { unit: 'linear_foot', cost: 5.50 },
  'refrigerant_r410a': { unit: 'lb', cost: 15.00 },
  'drain_line_3/4_pvc': { unit: 'linear_foot', cost: 1.25 },
  'safety_float_switch': { unit: 'each', cost: 12.00 },
  'condensate_pump': { unit: 'each', cost: 65.00 },
  'concrete_pad': { unit: 'each', cost: 35.00 },
  'disconnect_60a': { unit: 'each', cost: 25.00 },
  'whip_6ft': { unit: 'each', cost: 18.00 },
  'thermostat_wire': { unit: 'linear_foot', cost: 0.35 },
  'supply_register_6x10': { unit: 'each', cost: 8.00 },
  'supply_register_8x12': { unit: 'each', cost: 12.00 },
  'return_grille_14x20': { unit: 'each', cost: 15.00 },
  'return_grille_20x25': { unit: 'each', cost: 22.00 },
  'filter_16x25x1': { unit: 'each', cost: 5.00 },
  'filter_20x25x1': { unit: 'each', cost: 6.00 },
  'filter_20x25x4': { unit: 'each', cost: 18.00 },
  'plenum_box': { unit: 'each', cost: 45.00 },
  'start_collar_6in': { unit: 'each', cost: 5.00 },
  'start_collar_8in': { unit: 'each', cost: 6.00 },
  'elbow_6in': { unit: 'each', cost: 7.00 },
  'elbow_8in': { unit: 'each', cost: 9.00 },
  'wye_fitting': { unit: 'each', cost: 12.00 },
  'reducer': { unit: 'each', cost: 8.00 },
  'hanging_strap': { unit: 'linear_foot', cost: 0.50 },
};

// ============================================
// PROJECT STATUS DISPLAY
// ============================================
export const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  'draft': { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  'survey': { label: 'Site Survey', color: 'bg-blue-100 text-blue-700' },
  'designing': { label: 'Designing', color: 'bg-purple-100 text-purple-700' },
  'proposal_sent': { label: 'Proposal Sent', color: 'bg-amber-100 text-amber-700' },
  'accepted': { label: 'Accepted', color: 'bg-green-100 text-green-700' },
  'scheduled': { label: 'Scheduled', color: 'bg-cyan-100 text-cyan-700' },
  'in_progress': { label: 'In Progress', color: 'bg-orange-100 text-orange-700' },
  'completed': { label: 'Completed', color: 'bg-emerald-100 text-emerald-700' },
  'cancelled': { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
};
