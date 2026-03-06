// HVAC & Refrigeration brand database for autocomplete
export const HVAC_BRANDS = [
  // Major residential
  'Carrier', 'Trane', 'Lennox', 'Rheem', 'Ruud', 'Goodman', 'Amana', 'Daikin',
  'Mitsubishi Electric', 'Fujitsu', 'LG', 'Samsung', 'York', 'Bryant', 'American Standard',
  'Heil', 'Tempstar', 'Comfortmaker', 'Payne', 'Coleman', 'Maytag', 'Frigidaire',
  'Bosch', 'Napoleon', 'Keeprite',
  // Water heaters / boilers
  'Navien', 'Rinnai', 'Noritz', 'AO Smith', 'Bradford White', 'Takagi', 'Weil-McLain',
  'Burnham', 'Buderus', 'Lochinvar', 'Laars', 'HTP', 'Viessmann',
  // Commercial HVAC
  'McQuay', 'Bard', 'Mammoth', 'Aaon', 'Bohn', 'Heatcraft', 'Modine', 'Reznor',
  'Sterling', 'Dunham-Bush', 'Climatemaster',
  // Refrigeration
  'Hussmann', 'Tyler', 'Hill Phoenix', 'Zero Zone', 'True Manufacturing', 'Turbo Air',
  'Beverage-Air', 'Continental', 'Traulsen', 'Victory', 'Delfield', 'Master-Bilt',
  'Norlake', 'Kolpak', 'Amerikooler',
  // Ice machines
  'Manitowoc', 'Hoshizaki', 'Scotsman', 'Ice-O-Matic', 'Follett',
  // Compressors / components
  'Copeland', 'Emerson', 'Danfoss', 'Sporlan', 'Parker', 'Tecumseh', 'Embraco',
  'Bitzer', 'Honeywell', 'White-Rodgers', 'Sensi', 'Ecobee', 'Nest',
].sort();

// System health rating components by equipment type
export const SYSTEM_HEALTH_COMPONENTS: Record<string, { key: string; label: string }[]> = {
  'Air Conditioner': [
    { key: 'compressor', label: 'Compressor' },
    { key: 'condenser_coil', label: 'Condenser Coil' },
    { key: 'evaporator_coil', label: 'Evaporator Coil' },
    { key: 'blower_motor', label: 'Blower Motor' },
    { key: 'capacitor', label: 'Capacitor' },
    { key: 'contactor', label: 'Contactor' },
    { key: 'refrigerant_charge', label: 'Refrigerant Charge' },
    { key: 'electrical', label: 'Electrical Connections' },
    { key: 'thermostat', label: 'Thermostat' },
    { key: 'ductwork', label: 'Ductwork' },
    { key: 'air_filter', label: 'Air Filter' },
    { key: 'drain_line', label: 'Drain Line' },
  ],
  'Heat Pump': [
    { key: 'compressor', label: 'Compressor' },
    { key: 'condenser_coil', label: 'Condenser Coil' },
    { key: 'evaporator_coil', label: 'Evaporator Coil' },
    { key: 'blower_motor', label: 'Blower Motor' },
    { key: 'reversing_valve', label: 'Reversing Valve' },
    { key: 'defrost_board', label: 'Defrost Board' },
    { key: 'capacitor', label: 'Capacitor' },
    { key: 'contactor', label: 'Contactor' },
    { key: 'refrigerant_charge', label: 'Refrigerant Charge' },
    { key: 'electrical', label: 'Electrical Connections' },
    { key: 'thermostat', label: 'Thermostat' },
    { key: 'air_filter', label: 'Air Filter' },
    { key: 'drain_line', label: 'Drain Line' },
  ],
  'Furnace': [
    { key: 'heat_exchanger', label: 'Heat Exchanger' },
    { key: 'burners', label: 'Burners' },
    { key: 'igniter', label: 'Igniter' },
    { key: 'flame_sensor', label: 'Flame Sensor' },
    { key: 'inducer_motor', label: 'Inducer Motor' },
    { key: 'blower_motor', label: 'Blower Motor' },
    { key: 'gas_valve', label: 'Gas Valve' },
    { key: 'thermocouple', label: 'Thermocouple' },
    { key: 'flue_venting', label: 'Flue / Venting' },
    { key: 'air_filter', label: 'Air Filter' },
    { key: 'thermostat', label: 'Thermostat' },
    { key: 'electrical', label: 'Electrical Connections' },
  ],
  'Mini Split': [
    { key: 'compressor', label: 'Compressor' },
    { key: 'condenser_coil', label: 'Condenser Coil' },
    { key: 'evaporator_coil', label: 'Evaporator Coil' },
    { key: 'fan_motor', label: 'Fan Motor' },
    { key: 'line_set', label: 'Line Set' },
    { key: 'drain_line', label: 'Drain Line' },
    { key: 'remote_controls', label: 'Remote / Controls' },
    { key: 'air_filter', label: 'Air Filter' },
    { key: 'refrigerant_charge', label: 'Refrigerant Charge' },
    { key: 'electrical', label: 'Electrical Connections' },
  ],
  'Package Unit': [
    { key: 'compressor', label: 'Compressor' },
    { key: 'condenser_coil', label: 'Condenser Coil' },
    { key: 'evaporator_coil', label: 'Evaporator Coil' },
    { key: 'blower_motor', label: 'Blower Motor' },
    { key: 'heat_exchanger', label: 'Heat Exchanger' },
    { key: 'burners', label: 'Burners' },
    { key: 'capacitor', label: 'Capacitor' },
    { key: 'contactor', label: 'Contactor' },
    { key: 'refrigerant_charge', label: 'Refrigerant Charge' },
    { key: 'electrical', label: 'Electrical Connections' },
    { key: 'thermostat', label: 'Thermostat' },
    { key: 'air_filter', label: 'Air Filter' },
  ],
  'Boiler': [
    { key: 'heat_exchanger', label: 'Heat Exchanger' },
    { key: 'burner', label: 'Burner' },
    { key: 'circulator_pump', label: 'Circulator Pump' },
    { key: 'expansion_tank', label: 'Expansion Tank' },
    { key: 'pressure_relief', label: 'Pressure Relief Valve' },
    { key: 'aquastat', label: 'Aquastat / Controls' },
    { key: 'gas_valve', label: 'Gas Valve' },
    { key: 'igniter', label: 'Igniter' },
    { key: 'flue_venting', label: 'Flue / Venting' },
    { key: 'piping', label: 'Piping / Connections' },
    { key: 'zone_valves', label: 'Zone Valves' },
  ],
  'Water Heater': [
    { key: 'tank', label: 'Tank / Vessel' },
    { key: 'heating_element', label: 'Heating Element / Burner' },
    { key: 'anode_rod', label: 'Anode Rod' },
    { key: 'thermostat', label: 'Thermostat' },
    { key: 'pressure_relief', label: 'T&P Relief Valve' },
    { key: 'gas_valve', label: 'Gas Valve' },
    { key: 'flue_venting', label: 'Flue / Venting' },
    { key: 'dip_tube', label: 'Dip Tube' },
    { key: 'drain_valve', label: 'Drain Valve' },
    { key: 'piping', label: 'Piping / Connections' },
  ],
  'Thermostat': [
    { key: 'display', label: 'Display' },
    { key: 'wiring', label: 'Wiring' },
    { key: 'sensors', label: 'Temperature Sensors' },
    { key: 'programming', label: 'Programming / Schedule' },
    { key: 'wifi', label: 'WiFi / Connectivity' },
    { key: 'battery', label: 'Battery / Power' },
    { key: 'compatibility', label: 'System Compatibility' },
  ],
  'Ductwork': [
    { key: 'supply_ducts', label: 'Supply Ducts' },
    { key: 'return_ducts', label: 'Return Ducts' },
    { key: 'connections', label: 'Connections / Joints' },
    { key: 'insulation', label: 'Insulation' },
    { key: 'dampers', label: 'Dampers' },
    { key: 'registers', label: 'Registers / Grilles' },
    { key: 'sealing', label: 'Sealing / Leaks' },
  ],
  // Commercial refrigeration
  'Walk-in Cooler': [
    { key: 'compressor', label: 'Compressor' },
    { key: 'condenser_coil', label: 'Condenser Coil' },
    { key: 'evaporator_coil', label: 'Evaporator Coil' },
    { key: 'expansion_valve', label: 'Expansion Valve' },
    { key: 'refrigerant_charge', label: 'Refrigerant Charge' },
    { key: 'door_gaskets', label: 'Door Gaskets' },
    { key: 'temp_controls', label: 'Temperature Controls' },
    { key: 'defrost_system', label: 'Defrost System' },
    { key: 'fan_motors', label: 'Fan Motors' },
    { key: 'drain_line', label: 'Drain Line' },
    { key: 'insulation', label: 'Insulation / Panels' },
    { key: 'door_hardware', label: 'Door Hardware / Closer' },
  ],
  'Walk-in Freezer': [
    { key: 'compressor', label: 'Compressor' },
    { key: 'condenser_coil', label: 'Condenser Coil' },
    { key: 'evaporator_coil', label: 'Evaporator Coil' },
    { key: 'expansion_valve', label: 'Expansion Valve' },
    { key: 'refrigerant_charge', label: 'Refrigerant Charge' },
    { key: 'door_gaskets', label: 'Door Gaskets' },
    { key: 'door_heater', label: 'Door Frame Heater' },
    { key: 'temp_controls', label: 'Temperature Controls' },
    { key: 'defrost_system', label: 'Defrost System' },
    { key: 'fan_motors', label: 'Fan Motors' },
    { key: 'drain_line', label: 'Drain Line / Heater' },
    { key: 'insulation', label: 'Insulation / Panels' },
  ],
  'Reach-in Cooler': [
    { key: 'compressor', label: 'Compressor' },
    { key: 'condenser_coil', label: 'Condenser Coil' },
    { key: 'evaporator_coil', label: 'Evaporator Coil' },
    { key: 'fan_motors', label: 'Fan Motors' },
    { key: 'temp_controls', label: 'Temperature Controls' },
    { key: 'door_gaskets', label: 'Door Gaskets' },
    { key: 'shelving', label: 'Shelving' },
    { key: 'drain', label: 'Drain System' },
    { key: 'lighting', label: 'Interior Lighting' },
  ],
  'Ice Machine': [
    { key: 'compressor', label: 'Compressor' },
    { key: 'condenser', label: 'Condenser' },
    { key: 'evaporator', label: 'Evaporator Plate' },
    { key: 'water_valve', label: 'Water Inlet Valve' },
    { key: 'water_pump', label: 'Water Pump' },
    { key: 'harvest', label: 'Harvest System' },
    { key: 'bin_controls', label: 'Bin Controls' },
    { key: 'water_filter', label: 'Water Filter' },
    { key: 'drain', label: 'Drain System' },
    { key: 'cleaning', label: 'Cleanliness / Scale' },
  ],
};

// Default components for equipment types not in the map
export const DEFAULT_HEALTH_COMPONENTS = [
  { key: 'overall', label: 'Overall Condition' },
  { key: 'electrical', label: 'Electrical' },
  { key: 'mechanical', label: 'Mechanical' },
  { key: 'controls', label: 'Controls' },
  { key: 'refrigerant', label: 'Refrigerant System' },
];

// Health rating labels
export const HEALTH_RATINGS = [
  { value: 5, label: 'Excellent', color: 'bg-green-500' },
  { value: 4, label: 'Good', color: 'bg-green-400' },
  { value: 3, label: 'Fair', color: 'bg-yellow-500' },
  { value: 2, label: 'Poor', color: 'bg-orange-500' },
  { value: 1, label: 'Critical', color: 'bg-red-500' },
];

// Area affected suggestions
export const AREA_SUGGESTIONS = [
  // Residential
  'Entire Building', '1st Floor', '2nd Floor', '3rd Floor', 'Basement', 'Attic',
  'Master Bedroom', 'Living Room', 'Kitchen', 'Dining Room', 'Bathroom',
  'Garage', 'Office', 'Bonus Room', 'Laundry Room', 'Sunroom',
  // Commercial
  'Server Room', 'Walk-in Cooler', 'Walk-in Freezer', 'Display Case',
  'Reach-in Cooler', 'Reach-in Freezer', 'Ice Machine Area', 'Prep Area',
  'Storage Area', 'Front of House', 'Back of House', 'Outdoor Area',
  'Rooftop Unit Area', 'Mechanical Room', 'Lobby', 'Conference Room',
  'Break Room', 'Warehouse', 'Loading Dock',
];

// Extended equipment types (includes commercial refrigeration)
export const EQUIPMENT_TYPES = [
  'Air Conditioner', 'Heat Pump', 'Furnace', 'Mini Split', 'Package Unit',
  'Boiler', 'Water Heater', 'Thermostat', 'Ductwork',
  'Walk-in Cooler', 'Walk-in Freezer', 'Reach-in Cooler', 'Reach-in Freezer',
  'Ice Machine', 'Display Case', 'Prep Table', 'Other',
];

// Quote option item categories
export const QUOTE_ITEM_CATEGORIES = [
  { key: 'part', label: 'Part' },
  { key: 'service', label: 'Service' },
  { key: 'membership', label: 'Membership' },
  { key: 'upgrade', label: 'Upgrade' },
] as const;
