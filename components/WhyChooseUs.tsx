import { ShieldIcon, ClockIcon, StarIcon, WrenchIcon, PhoneIcon, CheckIcon } from './icons';

const stats = [
  {
    value: '30',
    unit: 'min',
    label: 'Average Response',
    icon: ClockIcon,
  },
  {
    value: '10+',
    unit: 'yrs',
    label: 'Experience',
    icon: WrenchIcon,
  },
  {
    value: '5.0',
    unit: '',
    label: 'Star Rating',
    icon: StarIcon,
  },
  {
    value: '100%',
    unit: '',
    label: 'Satisfaction',
    icon: ShieldIcon,
  },
];

const reasons = [
  {
    icon: ClockIcon,
    title: 'Quick Service',
    text: 'We respond fast so you are not waiting around. Get your comfort restored quickly.',
  },
  {
    icon: ShieldIcon,
    title: 'Licensed & Insured',
    text: 'Fully licensed, insured, and background-checked technicians on every job.',
  },
  {
    icon: CheckIcon,
    title: 'Upfront Pricing',
    text: 'You approve the price before any work begins. No hidden fees, no surprises.',
  },
  {
    icon: WrenchIcon,
    title: 'Guaranteed Work',
    text: 'Every repair is backed by our workmanship guarantee. If it breaks, we come back.',
  },
  {
    icon: PhoneIcon,
    title: '24/7 for Members',
    text: 'Priority members get around-the-clock emergency service access.',
  },
  {
    icon: StarIcon,
    title: 'HVAC & Refrigeration',
    text: 'Residential and commercial. AC, heating, fridges, freezers, walk-ins — we do it all.',
  },
];

export default function WhyChooseUs() {
  return (
    <section className="py-14 sm:py-20 bg-gradient-to-br from-[var(--navy)] to-[#122e5c] relative overflow-hidden">
      {/* Glow */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[var(--accent)]/5 rounded-full blur-[100px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="inline-block text-xs font-bold uppercase tracking-[0.25em] text-[var(--ember)] mb-2">Why Customers Choose Us</span>
          <h2 className="font-[var(--font-display)] text-4xl sm:text-5xl tracking-wide text-white" style={{ fontWeight: 700 }}>
            THE HARDEN DIFFERENCE
          </h2>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center bg-white/5 border border-white/10 rounded-xl px-4 py-5">
              <div className="font-[var(--font-display)] text-4xl sm:text-5xl text-white tracking-wide" style={{ fontWeight: 700 }}>
                {stat.value}
                {stat.unit && <span className="text-lg text-white/50 ml-1">{stat.unit}</span>}
              </div>
              <p className="text-xs font-bold text-white/50 uppercase tracking-wider mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Reasons grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reasons.map((reason) => (
            <div key={reason.title} className="flex gap-3 bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[var(--ember)]/20 flex items-center justify-center">
                <reason.icon className="w-5 h-5 text-[var(--ember)]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white mb-0.5">{reason.title}</h3>
                <p className="text-xs text-white/50 leading-relaxed">{reason.text}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-10 text-center">
          <a
            href="tel:9105466485"
            className="inline-flex items-center gap-3 rounded-full bg-[var(--ember)] px-8 py-4 text-lg font-bold text-white hover:bg-[var(--ember-dark)] transition-all shadow-lg shadow-[var(--ember)]/30 hover:shadow-xl uppercase tracking-wider"
          >
            <PhoneIcon className="w-5 h-5" />
            Call (910) 546-6485
          </a>
          <p className="mt-3 text-sm text-white/40">Tallahassee, Quincy, FL &amp; Surrounding Areas</p>
        </div>
      </div>
    </section>
  );
}
