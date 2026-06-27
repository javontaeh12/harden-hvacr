import {
  ZapIcon,
  ThermometerIcon,
  SearchIcon,
  SnowflakeIcon,
  SunIcon,
  FlameIcon,
  WindIcon,
  WrenchIcon,
} from '@/components/icons';

export interface ChecklistItem {
  text: string;
  highlighted?: boolean;
}

export interface ChecklistGroup {
  title: string;
  items: ChecklistItem[];
}

export interface ProcessStep {
  number: string;
  title: string;
  description: string;
}

export interface ServiceHighlight {
  title: string;
  description: string;
}

export interface ServiceData {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  icon: typeof ZapIcon;
  accent: string;
  accentLabel: string;
  highlights: ServiceHighlight[];
  checklists: ChecklistGroup[];
  callout?: string;
  process: ProcessStep[];
  ctaHeading: string;
  heroImage?: string;
  seo: {
    title: string;
    description: string;
  };
}

const servicesData: Record<string, ServiceData> = {
  'emergency-repair': {
    slug: 'emergency-repair',
    title: 'EMERGENCY HVAC REPAIR IN TALLAHASSEE FL, QUINCY FL AND SURROUNDING CITIES',
    subtitle: 'Fast, reliable HVAC repair when you need it most',
    description:
      'When your system breaks down, every minute counts. We respond quickly with fully equipped trucks to diagnose and repair your HVAC system on-site — getting your comfort restored as fast as possible.',
    icon: ZapIcon,
    accent: 'var(--ember)',
    accentLabel: 'Priority',
    highlights: [
      {
        title: 'Fast Response',
        description: '30-minute average response time for emergency calls in our service area.',
      },
      {
        title: 'Fully Equipped',
        description: 'Our trucks carry the most common parts and tools to repair on-site, first visit.',
      },
      {
        title: '24/7 for Members',
        description: 'Priority membership customers get around-the-clock emergency service access.',
      },
    ],
    checklists: [
      {
        title: 'Common Issues We Handle',
        items: [
          { text: 'No cooling or heating' },
          { text: 'Strange or loud noises from the unit' },
          { text: 'Burning smells or electrical odors' },
          { text: 'Refrigerant leaks' },
          { text: 'Frozen evaporator coils' },
          { text: 'Thermostat failures' },
          { text: 'Electrical and wiring problems' },
          { text: 'Compressor failures' },
        ],
      },
      {
        title: 'What We Bring',
        items: [
          { text: 'Capacitors, contactors, and relays' },
          { text: 'Refrigerant and leak detection equipment' },
          { text: 'Replacement motors and fan blades' },
          { text: 'Thermostats and control boards' },
          { text: 'Electrical testing and diagnostic tools' },
          { text: 'Filters and belts' },
        ],
      },
    ],
    process: [
      {
        number: '01',
        title: 'Call or Submit a Request',
        description:
          'Reach us by phone or submit a service request online. Describe the issue so we can prepare.',
      },
      {
        number: '02',
        title: 'Safety Assessment & Diagnosis',
        description:
          'Our technician arrives, assesses the situation for safety, and diagnoses the root cause.',
      },
      {
        number: '03',
        title: 'On-Site Repair',
        description:
          'We repair your system on the spot with parts from our fully stocked truck whenever possible.',
      },
      {
        number: '04',
        title: 'Follow-Up Verification',
        description:
          'We verify the repair is holding, test system performance, and make sure you are comfortable.',
      },
    ],
    ctaHeading: 'NEED EMERGENCY REPAIR?',
    seo: {
      title: 'Emergency HVAC Repair | Harden HVAC - Tallahassee and Quincy FL',
      description:
        'Fast emergency HVAC repair in Tallahassee and Quincy, FL. 30-minute average response time, fully equipped trucks, on-site repairs. Call (910) 546-6485.',
    },
  },

  'tune-up': {
    slug: 'tune-up',
    title: 'SYSTEM TUNE-UP IN TALLAHASSEE FL, QUINCY FL AND SURROUNDING CITIES',
    subtitle: 'Complete preventive maintenance for peak performance',
    description:
      'A thorough tune-up keeps your HVAC system running efficiently, prevents costly breakdowns, and extends equipment lifespan. Every tune-up includes a complete system diagnostic and written performance report.',
    icon: ThermometerIcon,
    accent: 'var(--accent)',
    accentLabel: 'Recommended',
    highlights: [
      {
        title: 'Prevent Breakdowns',
        description: 'Catch small issues before they become expensive emergency repairs.',
      },
      {
        title: 'Lower Energy Bills',
        description: 'A well-maintained system runs more efficiently, reducing monthly energy costs.',
      },
      {
        title: 'Performance Report',
        description: 'Every tune-up includes a written diagnostic report with findings and recommendations.',
      },
    ],
    checklists: [
      {
        title: 'Airflow & Filtration',
        items: [
          { text: 'Air filter inspection and replacement' },
          { text: 'Ductwork inspection for leaks and blockages' },
          { text: 'Static pressure measurement' },
          { text: 'Airflow testing at all registers' },
          { text: 'Temperature split verification' },
        ],
      },
      {
        title: 'Coil & Refrigerant System',
        items: [
          { text: 'Evaporator coil cleaning' },
          { text: 'Condenser coil cleaning' },
          { text: 'Refrigerant level check and leak inspection' },
        ],
      },
      {
        title: 'Electrical & Controls',
        items: [
          { text: 'Thermostat calibration and accuracy check' },
          { text: 'Electrical connection tightening and voltage testing' },
          { text: 'Capacitor testing' },
          { text: 'Safety control testing' },
        ],
      },
      {
        title: 'Mechanical Components',
        items: [
          { text: 'Blower motor inspection and amperage measurement' },
          { text: 'Belt and pulley inspection' },
          { text: 'Lubrication of all moving parts' },
          { text: 'Condensate drain line cleaning' },
        ],
      },
      {
        title: 'System Diagnostic & Performance Report',
        items: [
          { text: 'Full heating and cooling cycle testing', highlighted: true },
          { text: 'Written performance report with findings and recommendations', highlighted: true },
          { text: 'Efficiency assessment with actionable next steps', highlighted: true },
        ],
      },
    ],
    callout:
      'Every tune-up includes a complete system diagnostic and written performance report — so you know exactly how your system is performing and what to watch for.',
    process: [
      {
        number: '01',
        title: 'Schedule Your Tune-Up',
        description:
          'Request service online or call us to book a time that works for you.',
      },
      {
        number: '02',
        title: 'Full System Inspection',
        description:
          'Our technician performs a comprehensive multi-point inspection of your entire system.',
      },
      {
        number: '03',
        title: 'Maintenance & Cleaning',
        description:
          'We clean coils, replace filters, tighten connections, and address any issues found.',
      },
      {
        number: '04',
        title: 'Report Delivery',
        description:
          'You receive a written performance report with findings, recommendations, and next steps.',
      },
    ],
    ctaHeading: 'SCHEDULE YOUR TUNE-UP',
    seo: {
      title: 'HVAC Tune-Up & Maintenance | Harden HVAC - Tallahassee and Quincy FL',
      description:
        'Complete HVAC tune-up with full system diagnostic and written performance report. Preventive maintenance in Tallahassee and Quincy, FL. Call (910) 546-6485.',
    },
  },

  diagnostics: {
    slug: 'diagnostics',
    title: 'FULL DIAGNOSTICS IN TALLAHASSEE FL, QUINCY FL AND SURROUNDING CITIES',
    subtitle: 'Comprehensive system evaluation and performance analysis',
    description:
      'When something does not feel right but you are not sure what the problem is, our full diagnostic service identifies issues with precision. We test every component and deliver a written report with clear findings and recommendations.',
    icon: SearchIcon,
    accent: 'var(--steel)',
    accentLabel: 'Thorough',
    highlights: [
      {
        title: 'Multi-Point Inspection',
        description: 'Every component is tested and evaluated — nothing gets overlooked.',
      },
      {
        title: 'Performance Testing',
        description: 'Airflow, pressure, temperature, and efficiency measurements throughout the system.',
      },
      {
        title: 'Written Report',
        description: 'Detailed findings with prioritized recommendations and cost estimates.',
      },
    ],
    checklists: [
      {
        title: 'Performance Testing',
        items: [
          { text: 'Airflow measurement at supply and return' },
          { text: 'Static pressure testing' },
          { text: 'Temperature differential analysis' },
          { text: 'System cycling and timing evaluation' },
        ],
      },
      {
        title: 'Refrigerant Analysis',
        items: [
          { text: 'Superheat and subcooling measurement' },
          { text: 'Refrigerant pressure verification' },
          { text: 'Leak detection scan' },
          { text: 'Compressor amperage and performance' },
        ],
      },
      {
        title: 'Electrical Component Testing',
        items: [
          { text: 'Capacitor testing and evaluation' },
          { text: 'Contactor and relay inspection' },
          { text: 'Voltage and amperage readings' },
          { text: 'Control board diagnostics' },
          { text: 'Safety switch and sensor testing' },
        ],
      },
      {
        title: 'Ductwork & Efficiency',
        items: [
          { text: 'Ductwork leakage testing' },
          { text: 'Insulation inspection' },
          { text: 'Energy efficiency assessment' },
          { text: 'Indoor air quality evaluation' },
        ],
      },
    ],
    process: [
      {
        number: '01',
        title: 'Schedule Diagnostics',
        description:
          'Request a diagnostic appointment online or by phone. Let us know what symptoms you have noticed.',
      },
      {
        number: '02',
        title: 'Comprehensive Inspection',
        description:
          'Our technician performs a thorough 1–3 hour inspection of your entire HVAC system.',
      },
      {
        number: '03',
        title: 'Performance Analysis',
        description:
          'We analyze all test data to identify root causes and prioritize any issues found.',
      },
      {
        number: '04',
        title: 'Written Report Delivery',
        description:
          'You receive a detailed report with findings, photos, recommendations, and cost estimates.',
      },
    ],
    ctaHeading: 'SCHEDULE A DIAGNOSTIC',
    seo: {
      title: 'HVAC Diagnostics & System Evaluation | Harden HVAC - Tallahassee and Quincy FL',
      description:
        'Comprehensive HVAC diagnostic service with multi-point inspection and written performance report. Tallahassee and Quincy, FL. Call (910) 546-6485.',
    },
  },

  'commercial-refrigeration': {
    slug: 'commercial-refrigeration',
    title: 'COMMERCIAL REFRIGERATION IN TALLAHASSEE FL, QUINCY FL AND SURROUNDING CITIES',
    subtitle: 'Walk-in coolers, freezers, and commercial refrigeration systems',
    description:
      'We service and maintain commercial refrigeration systems to keep your business running and your inventory protected. From walk-in coolers to freezer units, we handle installation, repair, and preventive maintenance.',
    icon: SnowflakeIcon,
    accent: 'var(--accent)',
    accentLabel: 'Specialized',
    highlights: [
      {
        title: 'Walk-In Coolers & Freezers',
        description: 'Installation, repair, and maintenance for walk-in refrigeration units.',
      },
      {
        title: 'Temperature Compliance',
        description: 'We verify coolers hold 35°F and freezers hold -15°F to meet food safety standards.',
      },
      {
        title: 'Preventive Maintenance',
        description: 'Scheduled maintenance plans to prevent costly downtime and inventory loss.',
      },
    ],
    checklists: [
      {
        title: 'Coil & Airflow',
        items: [
          { text: 'Condenser coil cleaning and inspection' },
          { text: 'Evaporator coil cleaning and defrost check' },
          { text: 'Fan motor inspection and testing' },
          { text: 'Airflow verification throughout the unit' },
        ],
      },
      {
        title: 'Refrigerant & Compressor',
        items: [
          { text: 'Refrigerant pressure check' },
          { text: 'Compressor oil level inspection' },
          { text: 'Leak detection scan' },
          { text: 'Compressor amperage and performance test' },
        ],
      },
      {
        title: 'Seals & Drainage',
        items: [
          { text: 'Door gasket inspection and replacement' },
          { text: 'Drain pan cleaning and clearing' },
          { text: 'Drain line flushing' },
          { text: 'Door alignment and closure check' },
        ],
      },
      {
        title: 'Electrical & Controls',
        items: [
          { text: 'Electrical connections and control panel inspection' },
          { text: 'Defrost system check and calibration' },
          { text: 'Temperature controller verification' },
          { text: 'Safety switch and alarm testing' },
        ],
      },
    ],
    process: [
      {
        number: '01',
        title: 'Contact Us',
        description:
          'Call or submit a request describing your commercial refrigeration needs.',
      },
      {
        number: '02',
        title: 'On-Site Assessment',
        description:
          'We evaluate your equipment, identify issues, and discuss the best course of action.',
      },
      {
        number: '03',
        title: 'Service & Repair',
        description:
          'Our technician completes the repair or maintenance with commercial-grade parts and tools.',
      },
      {
        number: '04',
        title: 'Temperature Verification',
        description:
          'We verify your system holds the correct temperatures and meets compliance standards.',
      },
    ],
    ctaHeading: 'NEED REFRIGERATION SERVICE?',
    seo: {
      title: 'Commercial Refrigeration Service | Harden HVAC - Tallahassee and Quincy FL',
      description:
        'Walk-in cooler and freezer repair, maintenance, and installation in Tallahassee and Quincy, FL. Temperature compliance and preventive maintenance. Call (910) 546-6485.',
    },
  },

  cooling: {
    slug: 'cooling',
    title: 'COOLING SERVICES IN TALLAHASSEE FL, QUINCY FL AND SURROUNDING CITIES',
    subtitle: 'Keep your home cool and comfortable all summer',
    description:
      'Whether your AC stopped working or you need a brand-new system installed, we handle all aspects of residential and commercial cooling. From refrigerant recharges to complete system replacements, we restore your comfort fast.',
    icon: SunIcon,
    accent: 'var(--accent)',
    accentLabel: 'Essential',
    highlights: [
      {
        title: 'Fast AC Repair',
        description: 'Quick diagnosis and repair to get your cooling back online.',
      },
      {
        title: 'New System Installation',
        description: 'Professional installation of high-efficiency AC systems sized for your space.',
      },
      {
        title: 'Energy Efficiency',
        description: 'We optimize your system to lower energy bills and maximize performance.',
      },
    ],
    checklists: [
      {
        title: 'Refrigerant System',
        items: [
          { text: 'Refrigerant leak detection and repair' },
          { text: 'Refrigerant charge verification' },
          { text: 'System pressure testing' },
          { text: 'Compressor performance evaluation' },
        ],
      },
      {
        title: 'Airflow & Filtration',
        items: [
          { text: 'Air filter inspection and replacement' },
          { text: 'Ductwork inspection for leaks' },
          { text: 'Supply and return register check' },
          { text: 'Static pressure measurement' },
        ],
      },
      {
        title: 'Electrical & Controls',
        items: [
          { text: 'Thermostat calibration and testing' },
          { text: 'Capacitor testing and replacement' },
          { text: 'Contactor inspection' },
          { text: 'Wiring and connection tightening' },
        ],
      },
      {
        title: 'Compressor & Condenser',
        items: [
          { text: 'Condenser coil cleaning' },
          { text: 'Compressor amp draw measurement' },
          { text: 'Condenser fan motor inspection' },
          { text: 'Outdoor unit cleaning and clearance check' },
        ],
      },
    ],
    process: [
      {
        number: '01',
        title: 'Schedule Service',
        description:
          'Call or submit a request online. Let us know your cooling issue so we can come prepared.',
      },
      {
        number: '02',
        title: 'Diagnosis',
        description:
          'Our technician performs a thorough inspection to identify the root cause of the problem.',
      },
      {
        number: '03',
        title: 'Repair or Install',
        description:
          'We repair the issue on-site or install a new system — with clear pricing upfront.',
      },
      {
        number: '04',
        title: 'Performance Verification',
        description:
          'We verify temperature output, airflow, and system operation before leaving.',
      },
    ],
    ctaHeading: 'NEED COOLING SERVICE?',
    seo: {
      title: 'AC Repair & Cooling Services | Harden HVAC - Tallahassee and Quincy FL',
      description:
        'Professional AC repair, installation, and cooling services in Tallahassee and Quincy, FL. Fast, quality service and energy-efficient solutions. Call (910) 546-6485.',
    },
  },

  heating: {
    slug: 'heating',
    title: 'HEATING SERVICES IN TALLAHASSEE FL, QUINCY FL AND SURROUNDING CITIES',
    subtitle: 'Stay warm with reliable heating repair and installation',
    description:
      'From furnace repairs to heat pump installations, we keep your home warm and safe through the cold months. Our technicians diagnose and fix heating issues quickly so you are never left in the cold.',
    icon: FlameIcon,
    accent: 'var(--ember)',
    accentLabel: 'Essential',
    highlights: [
      {
        title: 'Furnace Repair',
        description: 'Expert diagnosis and repair for gas, electric, and oil furnaces.',
      },
      {
        title: 'Heat Pump Service',
        description: 'Complete heat pump repair, maintenance, and installation.',
      },
      {
        title: 'Quick Response',
        description: 'No-heat emergencies get priority scheduling for quick service.',
      },
    ],
    checklists: [
      {
        title: 'Furnace & Heat Exchanger',
        items: [
          { text: 'Ignition system inspection' },
          { text: 'Burner cleaning and adjustment' },
          { text: 'Heat exchanger crack inspection' },
          { text: 'Flue and venting verification' },
        ],
      },
      {
        title: 'Heat Pump System',
        items: [
          { text: 'Reversing valve operation check' },
          { text: 'Defrost board and sensor testing' },
          { text: 'Refrigerant charge verification' },
          { text: 'Outdoor coil inspection' },
        ],
      },
      {
        title: 'Electrical & Safety',
        items: [
          { text: 'Thermostat calibration and wiring' },
          { text: 'Limit switch testing' },
          { text: 'Gas valve operation check' },
          { text: 'Flame sensor cleaning and testing' },
        ],
      },
      {
        title: 'Airflow & Distribution',
        items: [
          { text: 'Blower motor inspection and amp draw' },
          { text: 'Filter inspection and replacement' },
          { text: 'Ductwork inspection for leaks' },
          { text: 'Register airflow verification' },
        ],
      },
    ],
    process: [
      {
        number: '01',
        title: 'Call or Submit a Request',
        description:
          'Reach us by phone or online. Describe the issue so we can prepare the right parts and tools.',
      },
      {
        number: '02',
        title: 'Safety Inspection',
        description:
          'Our technician inspects the system for safety hazards including gas leaks and carbon monoxide.',
      },
      {
        number: '03',
        title: 'Repair or Install',
        description:
          'We repair or replace components on-site, or install a new heating system if needed.',
      },
      {
        number: '04',
        title: 'Follow-Up',
        description:
          'We verify heat output, test safety controls, and ensure the system runs properly.',
      },
    ],
    ctaHeading: 'NEED HEATING SERVICE?',
    seo: {
      title: 'Heating Repair & Furnace Service | Harden HVAC - Tallahassee and Quincy FL',
      description:
        'Furnace repair, heat pump service, and heating installation in Tallahassee and Quincy, FL. Quick response for no-heat emergencies. Call (910) 546-6485.',
    },
  },

  'ductless-installs': {
    slug: 'ductless-installs',
    title: 'DUCTLESS MINI-SPLIT INSTALLATION IN TALLAHASSEE FL, QUINCY FL AND SURROUNDING CITIES',
    subtitle: 'Zoned comfort without the ductwork',
    description:
      'Ductless mini-split systems provide efficient heating and cooling for individual rooms or zones — without the need for ductwork. Ideal for home additions, garages, converted spaces, and homes without existing ducts.',
    icon: WindIcon,
    accent: 'var(--accent)',
    accentLabel: 'Popular',
    highlights: [
      {
        title: 'No Ductwork Needed',
        description: 'Install heating and cooling in any room without running new ductwork.',
      },
      {
        title: 'Zoned Temperature Control',
        description: 'Each unit has its own thermostat — control the temperature room by room.',
      },
      {
        title: 'Energy Efficient',
        description: 'Mini-splits avoid the energy loss associated with ductwork, lowering bills.',
      },
    ],
    checklists: [
      {
        title: 'Site Assessment',
        items: [
          { text: 'Room size and BTU calculation' },
          { text: 'Wall placement and mounting location' },
          { text: 'Electrical capacity evaluation' },
          { text: 'Refrigerant line routing plan' },
        ],
      },
      {
        title: 'Indoor Unit Installation',
        items: [
          { text: 'Mounting bracket installation and leveling' },
          { text: 'Refrigerant line connection' },
          { text: 'Condensate drain line routing' },
          { text: 'Electrical wiring and connection' },
        ],
      },
      {
        title: 'Outdoor Unit Installation',
        items: [
          { text: 'Condenser pad or wall bracket placement' },
          { text: 'Refrigerant piping connection and insulation' },
          { text: 'Electrical connection and disconnect' },
          { text: 'Line set protection and weatherproofing' },
        ],
      },
      {
        title: 'System Commissioning',
        items: [
          { text: 'Vacuum and refrigerant charge', highlighted: true },
          { text: 'Leak testing at all connections', highlighted: true },
          { text: 'Airflow and temperature verification', highlighted: true },
          { text: 'Thermostat programming and walkthrough', highlighted: true },
        ],
      },
    ],
    callout:
      'Ductless mini-splits let you heat and cool individual rooms — perfect for additions, garages, and homes without existing ductwork.',
    process: [
      {
        number: '01',
        title: 'Free Consultation',
        description:
          'We visit your space, assess your needs, and recommend the right system and placement.',
      },
      {
        number: '02',
        title: 'Custom Design',
        description:
          'We design a system layout with the right capacity, zones, and equipment for your space.',
      },
      {
        number: '03',
        title: 'Professional Install',
        description:
          'Our technicians install the indoor and outdoor units with clean, precise workmanship.',
      },
      {
        number: '04',
        title: 'System Testing',
        description:
          'We test every zone for proper heating, cooling, and airflow before final walkthrough.',
      },
    ],
    ctaHeading: 'INTERESTED IN DUCTLESS?',
    seo: {
      title: 'Ductless Mini-Split Installation | Harden HVAC - Tallahassee and Quincy FL',
      description:
        'Professional ductless mini-split installation in Tallahassee and Quincy, FL. Zoned comfort, energy efficiency, and no ductwork required. Call (910) 546-6485.',
    },
  },

  'refrigerator-repair': {
    slug: 'refrigerator-repair',
    title: 'REFRIGERATOR REPAIR IN TALLAHASSEE FL, QUINCY FL AND SURROUNDING CITIES',
    subtitle: 'Fast, reliable repair for residential and commercial refrigerators',
    description:
      'A broken refrigerator means spoiled food and lost money. We diagnose and repair all types of residential and commercial refrigerators quickly — restoring proper temperatures and keeping your food safe.',
    icon: WrenchIcon,
    accent: 'var(--accent)',
    accentLabel: 'All Brands',
    highlights: [
      {
        title: 'Quick Service',
        description: 'We prioritize refrigerator calls because every hour counts for your food.',
      },
      {
        title: 'All Major Brands',
        description: 'We service all major residential and commercial refrigerator brands.',
      },
      {
        title: 'Commercial & Residential',
        description: 'From kitchen fridges to restaurant walk-ins, we handle it all.',
      },
    ],
    checklists: [
      {
        title: 'Cooling System',
        items: [
          { text: 'Compressor diagnosis and repair' },
          { text: 'Condenser coil cleaning and inspection' },
          { text: 'Evaporator coil inspection' },
          { text: 'Refrigerant charge and leak detection' },
        ],
      },
      {
        title: 'Temperature & Controls',
        items: [
          { text: 'Thermostat testing and replacement' },
          { text: 'Control board diagnostics' },
          { text: 'Defrost timer and heater check' },
          { text: 'Temperature sensor calibration' },
        ],
      },
      {
        title: 'Mechanical',
        items: [
          { text: 'Evaporator and condenser fan motors' },
          { text: 'Door gasket inspection and replacement' },
          { text: 'Hinge and door alignment' },
          { text: 'Ice maker diagnosis and repair' },
        ],
      },
      {
        title: 'Electrical',
        items: [
          { text: 'Start relay testing and replacement' },
          { text: 'Overload protector inspection' },
          { text: 'Wiring and connection check' },
          { text: 'Capacitor testing' },
        ],
      },
    ],
    process: [
      {
        number: '01',
        title: 'Contact Us',
        description:
          'Call or submit a request describing your refrigerator issue and brand/model if known.',
      },
      {
        number: '02',
        title: 'On-Site Diagnosis',
        description:
          'Our technician inspects and diagnoses the problem, providing a clear repair estimate.',
      },
      {
        number: '03',
        title: 'Repair',
        description:
          'We repair the issue on-site with the right parts — most repairs completed quickly.',
      },
      {
        number: '04',
        title: 'Temperature Verification',
        description:
          'We verify the refrigerator reaches and holds proper temperature before leaving.',
      },
    ],
    ctaHeading: 'NEED FRIDGE REPAIR?',
    seo: {
      title: 'Refrigerator Repair Service | Harden HVAC - Tallahassee and Quincy FL',
      description:
        'Fast refrigerator repair for residential and commercial units in Tallahassee and Quincy, FL. Quick service, all major brands. Call (910) 546-6485.',
    },
  },

  'inverter-heat-pumps': {
    slug: 'inverter-heat-pumps',
    title: 'INVERTER HEAT PUMP INSTALLATIONS IN TALLAHASSEE FL, QUINCY FL AND SURROUNDING CITIES',
    subtitle: 'High-efficiency inverter heat pumps for year-round comfort',
    description:
      'Inverter heat pumps adjust compressor speed to match your heating and cooling demand — delivering precise temperatures, lower energy bills, and quieter operation compared to traditional systems.',
    icon: ThermometerIcon,
    accent: 'var(--accent)',
    accentLabel: 'Energy Efficient',
    highlights: [
      {
        title: 'Variable Speed Technology',
        description: 'The compressor adjusts speed continuously instead of cycling on and off, saving energy.',
      },
      {
        title: 'Lower Energy Bills',
        description: 'Inverter systems use up to 40% less energy than conventional heat pumps.',
      },
      {
        title: 'Year-Round Comfort',
        description: 'Provides both heating and cooling from a single system with consistent temperatures.',
      },
    ],
    checklists: [
      {
        title: 'Site Evaluation',
        items: [
          { text: 'Home load calculation for proper sizing' },
          { text: 'Existing ductwork inspection and assessment' },
          { text: 'Electrical panel capacity evaluation' },
          { text: 'Indoor and outdoor unit placement planning' },
        ],
      },
      {
        title: 'Installation',
        items: [
          { text: 'Indoor air handler mounting and connection' },
          { text: 'Outdoor condenser unit placement and leveling' },
          { text: 'Refrigerant line set installation and insulation' },
          { text: 'Electrical wiring and circuit breaker installation' },
        ],
      },
      {
        title: 'Ductwork & Airflow',
        items: [
          { text: 'Duct modification or replacement if needed' },
          { text: 'Airflow balancing at all registers' },
          { text: 'Static pressure testing' },
          { text: 'Return air sizing verification' },
        ],
      },
      {
        title: 'System Commissioning',
        items: [
          { text: 'Refrigerant charge verification', highlighted: true },
          { text: 'Heating and cooling mode testing', highlighted: true },
          { text: 'Thermostat programming and setup', highlighted: true },
          { text: 'Homeowner walkthrough and education', highlighted: true },
        ],
      },
    ],
    callout:
      'Inverter heat pumps deliver precise comfort and significant energy savings — the smartest upgrade for homes in our climate.',
    process: [
      {
        number: '01',
        title: 'Free In-Home Consultation',
        description:
          'We assess your home, calculate heating and cooling loads, and recommend the right inverter system.',
      },
      {
        number: '02',
        title: 'Custom System Design',
        description:
          'We design the installation with proper sizing, ductwork modifications, and equipment placement.',
      },
      {
        number: '03',
        title: 'Professional Installation',
        description:
          'Our technicians install the system with clean workmanship and attention to detail.',
      },
      {
        number: '04',
        title: 'Testing & Walkthrough',
        description:
          'We test both heating and cooling modes, verify performance, and walk you through the system.',
      },
    ],
    ctaHeading: 'READY FOR AN INVERTER HEAT PUMP?',
    seo: {
      title: 'Inverter Heat Pump Installation | Harden HVAC - Tallahassee and Quincy FL',
      description:
        'Professional inverter heat pump installation in Tallahassee and Quincy, FL. Energy-efficient, variable-speed technology for year-round comfort. Call (910) 546-6485.',
    },
  },

  'ductless-heat-pumps': {
    slug: 'ductless-heat-pumps',
    title: 'DUCTLESS HEAT PUMPS IN TALLAHASSEE FL, QUINCY FL AND SURROUNDING CITIES',
    subtitle: 'Efficient heating and cooling without ductwork',
    description:
      'Ductless heat pumps provide energy-efficient heating and cooling for homes without existing ductwork or for targeted zone control. Perfect for additions, converted garages, sunrooms, and older homes.',
    icon: WindIcon,
    accent: 'var(--accent)',
    accentLabel: 'Versatile',
    highlights: [
      {
        title: 'No Ductwork Required',
        description: 'Heat and cool any room without the cost and disruption of installing ductwork.',
      },
      {
        title: 'Heating & Cooling in One',
        description: 'A single system handles both heating and cooling — no separate furnace needed.',
      },
      {
        title: 'Quiet Operation',
        description: 'Ductless heat pumps run significantly quieter than traditional HVAC systems.',
      },
    ],
    checklists: [
      {
        title: 'Assessment & Planning',
        items: [
          { text: 'Room-by-room BTU load calculation' },
          { text: 'Wall and ceiling mounting location selection' },
          { text: 'Electrical capacity and circuit evaluation' },
          { text: 'Refrigerant line routing and penetration planning' },
        ],
      },
      {
        title: 'Indoor Unit Installation',
        items: [
          { text: 'Wall-mount or ceiling cassette installation' },
          { text: 'Refrigerant and condensate line connection' },
          { text: 'Electrical wiring to indoor unit' },
          { text: 'Mounting bracket leveling and securing' },
        ],
      },
      {
        title: 'Outdoor Unit Installation',
        items: [
          { text: 'Condenser pad or bracket placement' },
          { text: 'Refrigerant piping connection and brazing' },
          { text: 'Electrical disconnect and wiring' },
          { text: 'Line set insulation and weatherproofing' },
        ],
      },
      {
        title: 'System Testing',
        items: [
          { text: 'Vacuum pump and nitrogen pressure test', highlighted: true },
          { text: 'Refrigerant charge and leak check', highlighted: true },
          { text: 'Heating and cooling mode verification', highlighted: true },
          { text: 'Remote control setup and walkthrough', highlighted: true },
        ],
      },
    ],
    callout:
      'Ductless heat pumps are the ideal solution for homes without ductwork — providing efficient heating and cooling with minimal installation disruption.',
    process: [
      {
        number: '01',
        title: 'Free Consultation',
        description:
          'We visit your home, evaluate the space, and recommend the best ductless heat pump solution.',
      },
      {
        number: '02',
        title: 'System Design',
        description:
          'We select the right equipment, plan placement, and determine how many zones you need.',
      },
      {
        number: '03',
        title: 'Expert Installation',
        description:
          'Our team installs indoor and outdoor units with clean, professional workmanship.',
      },
      {
        number: '04',
        title: 'Performance Verification',
        description:
          'We test heating, cooling, and airflow in every zone and walk you through the controls.',
      },
    ],
    ctaHeading: 'NEED A DUCTLESS HEAT PUMP?',
    seo: {
      title: 'Ductless Heat Pump Installation | Harden HVAC - Tallahassee and Quincy FL',
      description:
        'Ductless heat pump installation in Tallahassee and Quincy, FL. Efficient heating and cooling without ductwork for any room. Call (910) 546-6485.',
    },
  },

  'freezer-repair': {
    slug: 'freezer-repair',
    title: 'FREEZER REPAIR IN TALLAHASSEE FL, QUINCY FL AND SURROUNDING CITIES',
    subtitle: 'Keep your food frozen and your business running',
    description:
      'A malfunctioning freezer puts your inventory and food safety at risk. We provide fast, expert freezer repair for residential chest and upright freezers, as well as commercial walk-in and reach-in units.',
    icon: SnowflakeIcon,
    accent: 'var(--steel)',
    accentLabel: 'Urgent',
    highlights: [
      {
        title: 'Emergency Response',
        description: 'We treat freezer failures as emergencies — fast scheduling to protect your inventory.',
      },
      {
        title: 'Walk-In & Stand-Up Units',
        description: 'We service residential and commercial freezers of all types and sizes.',
      },
      {
        title: 'Temperature Compliance',
        description: 'We verify your freezer holds safe temperatures that meet food safety standards.',
      },
    ],
    checklists: [
      {
        title: 'Cooling System',
        items: [
          { text: 'Compressor diagnosis and testing' },
          { text: 'Condenser coil cleaning and inspection' },
          { text: 'Evaporator coil inspection and cleaning' },
          { text: 'Refrigerant charge verification' },
        ],
      },
      {
        title: 'Defrost System',
        items: [
          { text: 'Defrost heater testing' },
          { text: 'Defrost timer or control board check' },
          { text: 'Defrost thermostat testing' },
          { text: 'Drain line clearing and cleaning' },
        ],
      },
      {
        title: 'Seals & Insulation',
        items: [
          { text: 'Door gasket inspection and replacement' },
          { text: 'Door alignment and closure check' },
          { text: 'Cabinet insulation inspection' },
          { text: 'Drain pan inspection and cleaning' },
        ],
      },
      {
        title: 'Electrical & Controls',
        items: [
          { text: 'Thermostat testing and calibration' },
          { text: 'Control board diagnostics' },
          { text: 'Fan motor inspection and replacement' },
          { text: 'Wiring and connection verification' },
        ],
      },
    ],
    process: [
      {
        number: '01',
        title: 'Call or Submit a Request',
        description:
          'Contact us immediately — we prioritize freezer failures to protect your food and inventory.',
      },
      {
        number: '02',
        title: 'Rapid Diagnosis',
        description:
          'Our technician quickly identifies the cause and provides a clear repair plan.',
      },
      {
        number: '03',
        title: 'On-Site Repair',
        description:
          'We complete the repair on-site with the right parts and tools — minimizing downtime.',
      },
      {
        number: '04',
        title: 'Temperature Verification',
        description:
          'We verify the freezer reaches and holds the correct temperature before leaving.',
      },
    ],
    ctaHeading: 'NEED FREEZER REPAIR?',
    seo: {
      title: 'Freezer Repair Service | Harden HVAC - Tallahassee and Quincy FL',
      description:
        'Fast freezer repair for residential and commercial units in Tallahassee and Quincy, FL. Emergency response, walk-in and stand-up units. Call (910) 546-6485.',
    },
  },
};

export function getServiceBySlug(slug: string): ServiceData | undefined {
  return servicesData[slug];
}

export function getAllServiceSlugs(): string[] {
  return Object.keys(servicesData);
}

export { servicesData };
