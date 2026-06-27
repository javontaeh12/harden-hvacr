export interface ServiceInfo {
  slug: string;
  title: string;
  description: string;
  commonIssues: string[];
  process: string[];
  estimatedDuration: string;
  urgencyHint: 'routine' | 'soon' | 'urgent' | 'emergency';
}

export const SERVICES: ServiceInfo[] = [
  {
    slug: 'emergency-repair',
    title: 'Emergency HVAC Repair',
    description: 'Fast, reliable HVAC repair when you need it most. 30-minute average response time.',
    commonIssues: ['No cooling or heating', 'Strange or loud noises from the unit', 'Burning smells or electrical odors', 'Refrigerant leaks', 'Frozen evaporator coils', 'Thermostat failures', 'Compressor failures'],
    process: ['Call received and triaged', 'Technician dispatched with fully stocked truck', 'On-site diagnosis', 'Repair completed (most first-visit)'],
    estimatedDuration: '1-3 hours',
    urgencyHint: 'emergency',
  },
  {
    slug: 'tune-up',
    title: 'HVAC Tune-Up & Maintenance',
    description: 'Preventive maintenance to keep your system running efficiently and extend its lifespan.',
    commonIssues: ['System running but not cooling/heating well', 'Higher than normal energy bills', 'System short-cycling', 'Uneven temperatures'],
    process: ['Schedule appointment', 'Full system inspection (20+ point checklist)', 'Clean and adjust components', 'Performance report and recommendations'],
    estimatedDuration: '1-2 hours',
    urgencyHint: 'routine',
  },
  {
    slug: 'diagnostics',
    title: 'HVAC Diagnostics',
    description: 'Comprehensive diagnosis to find the root cause of HVAC problems.',
    commonIssues: ['Intermittent issues', 'System underperforming', 'Unusual sounds or smells', 'Error codes on thermostat'],
    process: ['Schedule diagnostic visit', 'Full system test and measurement', 'Root cause identification', 'Repair estimate provided'],
    estimatedDuration: '1-2 hours',
    urgencyHint: 'soon',
  },
  {
    slug: 'commercial-refrigeration',
    title: 'Commercial Refrigeration',
    description: 'Walk-in coolers, freezers, display cases, and ice machines for restaurants and businesses.',
    commonIssues: ['Walk-in not holding temperature', 'Ice machine not producing', 'Display case frost buildup', 'Compressor running continuously', 'Door seal issues'],
    process: ['Emergency or scheduled visit', 'Temperature and pressure testing', 'Component repair/replacement', 'Verification and monitoring'],
    estimatedDuration: '2-4 hours',
    urgencyHint: 'urgent',
  },
  {
    slug: 'cooling',
    title: 'AC Repair & Installation',
    description: 'Central air conditioning repair, replacement, and new installation.',
    commonIssues: ['AC not blowing cold air', 'Weak airflow', 'AC turning on and off repeatedly', 'Water leaking from unit', 'Warm air from vents'],
    process: ['Schedule service call', 'Inspect and diagnose', 'Provide repair or replacement options', 'Complete work and verify operation'],
    estimatedDuration: '1-4 hours (repair) / 1-2 days (install)',
    urgencyHint: 'soon',
  },
  {
    slug: 'heating',
    title: 'Heating System Repair & Installation',
    description: 'Furnaces, heat pumps, and heating system service.',
    commonIssues: ['No heat', 'Pilot light issues', 'Furnace short cycling', 'Strange noises from furnace', 'Cold spots in house'],
    process: ['Schedule service call', 'Safety inspection and diagnosis', 'Repair or replacement recommendation', 'Complete work and safety verification'],
    estimatedDuration: '1-4 hours (repair) / 1-2 days (install)',
    urgencyHint: 'soon',
  },
  {
    slug: 'ductless-mini-splits',
    title: 'Ductless Mini-Split Systems',
    description: 'Installation and repair of ductless mini-split heating and cooling systems.',
    commonIssues: ['Mini-split not cooling/heating', 'Water leaking from indoor unit', 'Remote control not working', 'Ice on outdoor unit'],
    process: ['Free consultation and sizing', 'Custom installation plan', 'Professional installation', 'System commissioning and training'],
    estimatedDuration: '4-8 hours (install)',
    urgencyHint: 'routine',
  },
  {
    slug: 'refrigerator-repair',
    title: 'Residential Refrigerator Repair',
    description: 'Residential refrigerator and freezer repair service.',
    commonIssues: ['Not cooling properly', 'Making unusual noises', 'Leaking water', 'Ice buildup in freezer', 'Door not sealing'],
    process: ['Schedule appointment', 'Diagnose issue', 'Repair on-site if possible', 'Order parts if needed and return'],
    estimatedDuration: '1-2 hours',
    urgencyHint: 'soon',
  },
  {
    slug: 'inverter-heat-pumps',
    title: 'Inverter Heat Pump Systems',
    description: 'High-efficiency inverter heat pump installation and service.',
    commonIssues: ['System not reaching set temperature', 'High energy bills despite inverter', 'Defrost cycle issues', 'Inverter board errors'],
    process: ['Energy assessment', 'System sizing and selection', 'Professional installation', 'Performance verification'],
    estimatedDuration: '1-2 days (install)',
    urgencyHint: 'routine',
  },
  {
    slug: 'freezer-repair',
    title: 'Freezer Repair',
    description: 'Residential and commercial freezer repair.',
    commonIssues: ['Not freezing', 'Running constantly', 'Frost buildup', 'Temperature fluctuations', 'Strange noises'],
    process: ['Schedule visit', 'Temperature and component testing', 'Repair or part replacement', 'Verify proper operation'],
    estimatedDuration: '1-3 hours',
    urgencyHint: 'urgent',
  },
];

export function findServiceByKeyword(keyword: string): ServiceInfo | undefined {
  const lower = keyword.toLowerCase();
  return SERVICES.find(s =>
    s.title.toLowerCase().includes(lower) ||
    s.slug.includes(lower) ||
    s.commonIssues.some(i => i.toLowerCase().includes(lower))
  );
}

export function getServicesSummary(): string {
  return SERVICES.map(s => `- ${s.title}: ${s.description}`).join('\n');
}
