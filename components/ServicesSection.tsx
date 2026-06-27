import Link from 'next/link';
import { ZapIcon, ThermometerIcon, SearchIcon, SnowflakeIcon, ArrowRightIcon, WrenchIcon, CheckIcon, SunIcon, FlameIcon, WindIcon } from './icons';

/* ── HVAC Services ── */
const hvacServices = [
  'AC Repair & Installation',
  'Heating & Furnace Repair',
  'Heat Pump Repair & Installation',
  'System Tune-Ups & Maintenance',
  'Duct Cleaning & Repair',
  'Thermostat Installation & Calibration',
  'Air Quality & Filtration',
  'Emergency HVAC Service',
  'Full System Diagnostics',
  'New System Installation & Replacement',
];

/* ── Refrigeration Services ── */
const refrigerationServices = [
  'Refrigerator Repair',
  'Freezer Repair',
  'Refrigerator & Freezer Installation',
  'Walk-In Cooler Service',
  'Walk-In Freezer Service',
  'Commercial Refrigeration Maintenance',
  'Ice Machine Repair',
];

/* ── Common HVAC Problems ── */
const hvacProblems = [
  {
    category: 'Cooling Issues',
    items: [
      'AC not cooling or blowing warm air',
      'Uneven cooling throughout the home',
      'AC running constantly but not reaching set temperature',
      'Frozen evaporator coils',
      'Refrigerant leaks',
      'AC short cycling on and off',
    ],
  },
  {
    category: 'Heating Issues',
    items: [
      'Furnace not turning on',
      'Heat pump not heating',
      'Uneven heating or cold spots',
      'Furnace blowing cold air',
      'Pilot light keeps going out',
      'Heater running but not warming the house',
    ],
  },
  {
    category: 'Thermostat Problems',
    items: [
      'Thermostat not responding',
      'Temperature reading is inaccurate',
      'System won\'t switch between heating and cooling',
      'Programmable thermostat losing settings',
      'Blank thermostat screen',
    ],
  },
  {
    category: 'Weird Smells',
    items: [
      'Burning smell from vents',
      'Musty or moldy odor when system runs',
      'Rotten egg or sulfur smell',
      'Chemical or electrical burning smell',
      'Exhaust or gas fumes',
    ],
  },
  {
    category: 'Strange Noises',
    items: [
      'Banging or clanking from the unit',
      'Squealing or screeching sounds',
      'Buzzing or humming noises',
      'Rattling in the ductwork',
      'Clicking sounds when system starts',
      'Hissing or whistling from vents',
    ],
  },
];

/* ── Common Refrigeration Problems ── */
const fridgeProblems = [
  {
    category: 'Refrigerator Problems',
    items: [
      'Not cooling or maintaining temperature',
      'Leaking water on the floor',
      'Making loud or unusual noises',
      'Ice buildup inside the unit',
      'Compressor running constantly',
      'Door seal not sealing properly',
      'Warm spots inside the fridge',
    ],
  },
  {
    category: 'Freezer Problems',
    items: [
      'Not freezing or temperature too warm',
      'Excessive frost buildup',
      'Freezer running but not cold enough',
      'Ice maker not working',
      'Freezer leaking water',
      'Door not closing properly',
      'Food thawing unexpectedly',
    ],
  },
];

/* ── Service page link cards ── */
const serviceCards = [
  {
    icon: ZapIcon,
    title: 'Emergency Repair',
    slug: 'emergency-repair',
    description: 'Fast response for breakdowns and no-cool/no-heat emergencies.',
    gradient: 'from-[var(--ember)] to-[#ff7043]',
    iconBg: 'bg-[var(--ember)]/10',
    iconColor: 'text-[var(--ember)]',
  },
  {
    icon: ThermometerIcon,
    title: 'System Tune-Up',
    slug: 'tune-up',
    description: 'Preventive maintenance with a full diagnostic and written performance report.',
    gradient: 'from-[var(--accent)] to-[#42a5f5]',
    iconBg: 'bg-[var(--accent)]/10',
    iconColor: 'text-[var(--accent)]',
  },
  {
    icon: SearchIcon,
    title: 'Full Diagnostics',
    slug: 'diagnostics',
    description: 'Comprehensive system evaluation to find issues before they become costly.',
    gradient: 'from-[var(--navy-light)] to-[var(--steel)]',
    iconBg: 'bg-[var(--navy)]/10',
    iconColor: 'text-[var(--navy)]',
  },
  {
    icon: SnowflakeIcon,
    title: 'Commercial Refrigeration',
    slug: 'commercial-refrigeration',
    description: 'Walk-in coolers, freezers, and commercial units — repair and maintenance.',
    gradient: 'from-[#0288d1] to-[var(--accent)]',
    iconBg: 'bg-[var(--accent)]/10',
    iconColor: 'text-[var(--accent)]',
  },
  {
    icon: SunIcon,
    title: 'Cooling Services',
    slug: 'cooling',
    description: 'AC repair, installation, and refrigerant services to keep you cool all summer.',
    gradient: 'from-[var(--accent)] to-[#4fc3f7]',
    iconBg: 'bg-[var(--accent)]/10',
    iconColor: 'text-[var(--accent)]',
  },
  {
    icon: FlameIcon,
    title: 'Heating Services',
    slug: 'heating',
    description: 'Furnace repair, heat pump service, and heating installation for year-round warmth.',
    gradient: 'from-[var(--ember)] to-[var(--gold)]',
    iconBg: 'bg-[var(--ember)]/10',
    iconColor: 'text-[var(--ember)]',
  },
  {
    icon: WindIcon,
    title: 'Ductless Installs',
    slug: 'ductless-installs',
    description: 'Mini-split installation for zoned comfort — no ductwork required.',
    gradient: 'from-[#00897b] to-[var(--accent)]',
    iconBg: 'bg-[#00897b]/10',
    iconColor: 'text-[#00897b]',
  },
  {
    icon: WrenchIcon,
    title: 'Refrigerator Repair',
    slug: 'refrigerator-repair',
    description: 'Fast refrigerator repair for all major residential and commercial brands.',
    gradient: 'from-[var(--navy-light)] to-[var(--accent)]',
    iconBg: 'bg-[var(--navy)]/10',
    iconColor: 'text-[var(--navy)]',
  },
  {
    icon: ThermometerIcon,
    title: 'Inverter Heat Pumps',
    slug: 'inverter-heat-pumps',
    description: 'High-efficiency inverter heat pump installation for year-round comfort.',
    gradient: 'from-[var(--accent)] to-[#26c6da]',
    iconBg: 'bg-[var(--accent)]/10',
    iconColor: 'text-[var(--accent)]',
  },
  {
    icon: WindIcon,
    title: 'Ductless Heat Pumps',
    slug: 'ductless-heat-pumps',
    description: 'Efficient heating and cooling without ductwork — perfect for any room.',
    gradient: 'from-[#00897b] to-[#4db6ac]',
    iconBg: 'bg-[#00897b]/10',
    iconColor: 'text-[#00897b]',
  },
  {
    icon: SnowflakeIcon,
    title: 'Freezer Repair',
    slug: 'freezer-repair',
    description: 'Emergency freezer repair to protect your food and keep your business running.',
    gradient: 'from-[var(--steel)] to-[#90a4ae]',
    iconBg: 'bg-[var(--steel)]/10',
    iconColor: 'text-[var(--steel)]',
  },
];

export default function ServicesSection() {
  return (
    <section id="services" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-xs font-bold uppercase tracking-[0.25em] text-[var(--accent)] mb-3">Our Services</span>
          <h2 className="font-[var(--font-display)] text-4xl sm:text-5xl tracking-wide text-[var(--navy)]" style={{ fontWeight: 700 }}>
            HVAC &amp; REFRIGERATION SERVICES WE OFFER
          </h2>
          <p className="mt-3 text-lg text-[var(--steel)] max-w-2xl mx-auto">
            From emergency repairs to routine maintenance, we handle it all with
            professionalism and care.
          </p>
        </div>

        {/* ── HVAC & Refrigeration Service Lists ── */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* HVAC */}
          <div className="relative bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-[var(--ember)] to-[var(--gold)]" />
            <div className="p-7">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-[var(--ember)]/10 flex items-center justify-center">
                  <WrenchIcon className="w-5 h-5 text-[var(--ember)]" />
                </div>
                <h3 className="font-[var(--font-display)] text-2xl tracking-wide text-[var(--navy)]" style={{ fontWeight: 700 }}>HVAC SERVICES</h3>
              </div>
              <ul className="space-y-2.5">
                {hvacServices.map((s) => (
                  <li key={s} className="flex items-center gap-2.5">
                    <CheckIcon className="w-4 h-4 text-[var(--accent)] flex-shrink-0" />
                    <span className="text-sm text-[var(--steel)]">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Refrigeration */}
          <div className="relative bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-[#0288d1] to-[var(--accent)]" />
            <div className="p-7">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center">
                  <SnowflakeIcon className="w-5 h-5 text-[var(--accent)]" />
                </div>
                <h3 className="font-[var(--font-display)] text-2xl tracking-wide text-[var(--navy)]" style={{ fontWeight: 700 }}>REFRIGERATION SERVICES</h3>
              </div>
              <ul className="space-y-2.5">
                {refrigerationServices.map((s) => (
                  <li key={s} className="flex items-center gap-2.5">
                    <CheckIcon className="w-4 h-4 text-[var(--accent)] flex-shrink-0" />
                    <span className="text-sm text-[var(--steel)]">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ── Common Problems ── */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <span className="inline-block text-xs font-bold uppercase tracking-[0.25em] text-[var(--ember)] mb-3">Experiencing Issues?</span>
            <h3 className="font-[var(--font-display)] text-3xl sm:text-4xl tracking-wide text-[var(--navy)]" style={{ fontWeight: 700 }}>
              COMMON HVAC PROBLEMS WE FIX
            </h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {hvacProblems.map((group) => (
              <div key={group.category} className="bg-white rounded-2xl shadow-sm border border-[var(--border)] p-6">
                <h4 className="text-base font-bold text-[var(--navy)] mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--ember)]" />
                  {group.category}
                </h4>
                <ul className="space-y-2">
                  {group.items.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="w-1 h-1 rounded-full bg-[var(--steel)] mt-2 flex-shrink-0" />
                      <span className="text-sm text-[var(--steel)] leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* ── Common Refrigeration Problems ── */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <span className="inline-block text-xs font-bold uppercase tracking-[0.25em] text-[var(--accent)] mb-3">Fridge or Freezer Acting Up?</span>
            <h3 className="font-[var(--font-display)] text-3xl sm:text-4xl tracking-wide text-[var(--navy)]" style={{ fontWeight: 700 }}>
              COMMON REFRIGERATION PROBLEMS WE FIX
            </h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {fridgeProblems.map((group) => (
              <div key={group.category} className="bg-white rounded-2xl shadow-sm border border-[var(--border)] p-6">
                <h4 className="text-base font-bold text-[var(--navy)] mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                  {group.category}
                </h4>
                <ul className="space-y-2">
                  {group.items.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="w-1 h-1 rounded-full bg-[var(--steel)] mt-2 flex-shrink-0" />
                      <span className="text-sm text-[var(--steel)] leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* ── Service Detail Cards ── */}
        <div className="text-center mb-10">
          <h3 className="font-[var(--font-display)] text-3xl sm:text-4xl tracking-wide text-[var(--navy)]" style={{ fontWeight: 700 }}>
            EXPLORE OUR SERVICES
          </h3>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {serviceCards.map((service) => (
            <Link
              key={service.title}
              href={`/services/${service.slug}`}
              className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              <div className={`h-1.5 bg-gradient-to-r ${service.gradient}`} />
              <div className="p-7">
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${service.iconBg}`}>
                    <service.icon className={`w-6 h-6 ${service.iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-[var(--navy)] mb-1">
                      {service.title}
                    </h3>
                    <p className="text-[var(--steel)] text-sm leading-relaxed">
                      {service.description}
                    </p>
                    <span className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-[var(--accent)] group-hover:gap-2.5 transition-all">
                      Learn More
                      <ArrowRightIcon className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
