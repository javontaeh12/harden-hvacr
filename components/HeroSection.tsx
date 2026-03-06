import Image from 'next/image';
import Link from 'next/link';
import { PhoneIcon, ShieldIcon, StarIcon, ClockIcon, CheckIcon } from './icons';

export default function HeroSection() {
  return (
    <section className="relative pt-16 overflow-hidden">
      {/* Dark navy background */}
      <div className="absolute inset-0 bg-[#0a1f3f]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="lg:grid lg:grid-cols-2 lg:gap-12 items-center">
          {/* Left column — text content */}
          <div>
            <p className="text-sm text-[var(--ember)] uppercase tracking-widest mb-4" style={{ fontWeight: 700 }}>
              Veteran Owned Business
            </p>

            {/* Headline */}
            <h1 className="font-[var(--font-display)] text-4xl sm:text-5xl lg:text-[3.5rem] tracking-wide text-white leading-[1.05] mb-4" style={{ fontWeight: 700 }}>
              TALLAHASSEE &amp; QUINCY&apos;S TRUSTED
              <span className="block text-[var(--ember)]">HVAC &amp; REFRIGERATION EXPERTS</span>
            </h1>

            <p className="text-base text-white/70 leading-relaxed mb-6 max-w-lg">
              Licensed, insured, and ready to serve. Fast response,
              honest pricing, and guaranteed work &mdash; every time.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <Link
                href="/request"
                className="inline-flex items-center justify-center rounded-full bg-[var(--ember)] px-7 py-3.5 text-sm font-bold text-white hover:bg-[var(--ember-dark)] transition-all shadow-lg shadow-[var(--ember)]/30 hover:shadow-xl hover:-translate-y-0.5 uppercase tracking-wider"
              >
                Book Service Now
              </Link>
              <a
                href="tel:9105466485"
                className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/25 px-7 py-3.5 text-sm font-bold text-white hover:bg-white/10 transition-all uppercase tracking-wider"
              >
                <PhoneIcon className="w-4 h-4" />
                Call Now
              </a>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-4">
              {[
                { icon: ShieldIcon, text: 'Licensed & Insured', color: 'text-[var(--accent)]' },
                { icon: ClockIcon, text: 'Quick Service', color: 'text-[var(--ember)]' },
                { icon: StarIcon, text: '5-Star Rated', color: 'text-[var(--gold)]', filled: true },
                { icon: CheckIcon, text: '10+ Years Exp.', color: 'text-[var(--accent)]' },
                { icon: ShieldIcon, text: 'Veteran Owned', color: 'text-[var(--ember)]' },
              ].map((badge) => (
                <div key={badge.text} className="flex items-center gap-2">
                  <badge.icon className={`w-4 h-4 ${badge.color}`} filled={badge.filled} />
                  <span className="text-xs font-semibold text-white/80">{badge.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right column — hero image */}
          <div className="mt-10 lg:mt-0">
            <div className="relative rounded-2xl overflow-hidden border border-white/15 shadow-2xl shadow-black/40 bg-white">
              <Image
                src="/hero-tech.png"
                alt="Harden HVAC technician greeting a customer at their home"
                width={1200}
                height={675}
                className="w-full h-auto object-cover"
                priority
              />
            </div>

            {/* Service list under image */}
            <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-1.5">
              {[
                'AC Repair & Installation',
                'Heating & Furnace Repair',
                'Refrigerator & Freezer Repair',
                'Commercial Refrigeration',
                'Ductless Mini-Splits',
                'System Tune-Ups',
                'Emergency Service',
                'Walk-In Coolers & Freezers',
              ].map((service) => (
                <div key={service} className="flex items-center gap-2">
                  <CheckIcon className="w-3.5 h-3.5 text-[var(--ember)] flex-shrink-0" />
                  <span className="text-xs text-white/60 font-medium">{service}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom wave */}
      <div className="relative z-10">
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full block">
          <path d="M0 60V20C240 0 480 40 720 30C960 20 1200 0 1440 20V60H0Z" fill="var(--background)" />
        </svg>
      </div>
    </section>
  );
}
