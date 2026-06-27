'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import {
  ClockIcon,
  StarIcon,
  WrenchIcon,
  SnowflakeIcon,
  SearchIcon,
  ShieldIcon,
  CheckIcon,
  ZapIcon,
  FlameIcon,
} from '@/components/icons';

const accentColors = [
  { bg: 'bg-[var(--ember)]/10', text: 'text-[var(--ember)]', borderColor: 'var(--ember)' },
  { bg: 'bg-[var(--gold)]/10', text: 'text-[var(--gold)]', borderColor: 'var(--gold)' },
  { bg: 'bg-[var(--accent)]/10', text: 'text-[var(--accent)]', borderColor: 'var(--accent)' },
  { bg: 'bg-[#22c55e]/10', text: 'text-[#22c55e]', borderColor: '#22c55e' },
  { bg: 'bg-[#8b5cf6]/10', text: 'text-[#8b5cf6]', borderColor: '#8b5cf6' },
  { bg: 'bg-[var(--accent)]/10', text: 'text-[var(--accent)]', borderColor: 'var(--accent)' },
  { bg: 'bg-[var(--ember)]/10', text: 'text-[var(--ember)]', borderColor: 'var(--ember)' },
  { bg: 'bg-[var(--gold)]/10', text: 'text-[var(--gold)]', borderColor: 'var(--gold)' },
  { bg: 'bg-[#22c55e]/10', text: 'text-[#22c55e]', borderColor: '#22c55e' },
];

const benefits = [
  {
    icon: ClockIcon,
    title: 'Priority Scheduling',
    description: 'Skip the line during busy season — members get served first.',
    modal: {
      paragraphs: [
        'When your AC goes out in the middle of July, waiting 3-5 days for a technician is not an option. As a Priority Member, you jump straight to the front of the line — no matter how backed up the schedule gets.',
        'We also offer after-hours emergency access exclusively for members. Whether it\'s a weekend breakdown or a holiday heat wave, your comfort comes first.',
      ],
      bullets: [
        'Same-day or next-day service during peak season',
        'Skip the 3-5 day wait that non-members face in summer',
        'After-hours emergency scheduling access',
        'Dedicated scheduling line — no hold queues',
        'Flexible appointment windows that fit your schedule',
      ],
    },
  },
  {
    icon: StarIcon,
    title: 'Discounted Service Rates',
    description: 'Lower rates on all repairs and service calls, all year long.',
    modal: {
      paragraphs: [
        'Every service call, every repair, every part — your membership discount applies automatically. Most members save 15-20% on every visit, which adds up fast when you consider diagnostics, labor, and replacement parts.',
        'Whether it\'s a simple capacitor swap or a full compressor replacement, the savings are built into every invoice from day one.',
      ],
      bullets: [
        '15-20% savings on every service call',
        'Reduced rates on diagnostics, labor, and parts',
        'Applies to all equipment types — AC, heat pump, furnace, refrigeration',
        'No per-visit minimums or hidden fees',
        'Savings apply immediately upon enrollment',
      ],
    },
  },
  {
    icon: WrenchIcon,
    title: 'Annual System Tune-Ups',
    description: 'Comprehensive tune-ups included to keep your system running efficiently.',
    modal: {
      paragraphs: [
        'Your annual tune-up is a full 20+ point professional inspection — the kind that typically costs $150 or more. We check every critical component so small issues get caught before they become expensive breakdowns.',
        'Regular maintenance extends system lifespan by years, keeps your energy bills low, and ensures your manufacturer warranty stays valid.',
      ],
      bullets: [
        'Full 20+ point system inspection (valued at $150+)',
        'Refrigerant level check and top-off assessment',
        'Electrical connection safety inspection',
        'Filter check with replacement reminder schedule',
        'Performance optimization and airflow calibration',
        'Written report with system health grade',
      ],
    },
  },
  {
    icon: SnowflakeIcon,
    title: 'Chemical Condenser Cleaning',
    description: 'Deep chemical cleaning of your condenser coils included with membership.',
    modal: {
      paragraphs: [
        'This is not a quick hose-down. Our chemical condenser cleaning uses professional-grade coil cleaner to dissolve years of built-up grime, pollen, and debris that a garden hose simply cannot remove.',
        'A clean condenser coil means your system doesn\'t have to work as hard, which directly translates to lower energy bills — many homeowners see up to 15% reduction in cooling costs after a proper chemical wash.',
      ],
      bullets: [
        'Professional-grade chemical coil wash (not just a rinse)',
        'Removes deep grime, mold, pollen, and mineral deposits',
        'Restores optimal airflow and heat transfer',
        'Can lower energy bills by up to 15%',
        'Extends compressor life by reducing strain',
        'Included annually with your membership',
      ],
    },
  },
  {
    icon: SearchIcon,
    title: 'Customer Portal',
    description: 'View your system health dashboard, schedule service, and manage your account online.',
    modal: {
      paragraphs: [
        'Your membership includes full access to our online customer portal — a one-stop hub to manage your HVAC service, view system details, and stay on top of maintenance without a single phone call.',
        'Track your referral credits, review past service history, and get proactive reminders when it\'s time for your next tune-up or filter change.',
      ],
      bullets: [
        'Online scheduling — book service 24/7',
        'System health dashboard with equipment details',
        'Complete service history and invoice archive',
        'Referral credit tracking and status',
        'Automated maintenance reminders',
        'Direct messaging with your service team',
      ],
    },
  },
  {
    icon: ShieldIcon,
    title: 'Extended Parts Warranty',
    description: 'Extended warranty coverage on all parts for work performed under your plan.',
    modal: {
      paragraphs: [
        'Standard parts warranties typically last just 90 days. As a Priority Member, your parts warranty extends up to a full year — giving you real peace of mind that the repair is truly handled.',
        'If a part we installed fails within the warranty period, we replace it at no cost. No deductibles, no fine print, no hassle.',
      ],
      bullets: [
        'Up to 1-year parts warranty (vs. standard 90 days)',
        'Full replacement cost covered — no deductibles',
        'Covers all parts installed during member service visits',
        'No claim forms or approval process — just call us',
        'Transferable if you sell your home',
      ],
    },
  },
  {
    icon: CheckIcon,
    title: 'Dedicated Technician',
    description: 'A technician who knows your system inside and out — consistent, reliable service.',
    modal: {
      paragraphs: [
        'No more explaining your system to a different tech every time. As a member, you get a dedicated technician assigned to your account — someone who already knows your equipment, your home layout, and your preferences.',
        'Your tech builds a relationship with your system over time, spotting trends and making personalized recommendations that a rotating lineup of strangers simply cannot.',
      ],
      bullets: [
        'Same technician on every visit',
        'Knows your system history and past repairs',
        'Personalized maintenance recommendations',
        'Direct communication with your assigned tech',
        'Faster diagnostics from someone who knows your equipment',
      ],
    },
  },
  {
    icon: ZapIcon,
    title: 'Up to $1,000 Off System Upgrade',
    description: 'Massive savings when it\'s time for a new system — members get exclusive upgrade pricing.',
    modal: {
      paragraphs: [
        'When your system reaches the end of its life, replacing it shouldn\'t break the bank. Priority Members receive up to $1,000 off a full system upgrade — a discount you won\'t find anywhere else.',
        'Whether you\'re upgrading to a high-efficiency heat pump or replacing an aging AC unit, your membership pays for itself many times over with this benefit alone.',
      ],
      bullets: [
        'Up to $1,000 off a complete system replacement',
        'Applies to AC, heat pump, and furnace upgrades',
        'Stackable with manufacturer rebates and tax credits',
        'Priority installation scheduling for members',
        'Free upgrade consultation and system sizing',
        'Financing options available for remaining balance',
      ],
    },
  },
  {
    icon: FlameIcon,
    title: '50% Off Service Fees',
    description: 'Members pay half-price service fees on every visit — the savings never stop.',
    modal: {
      paragraphs: [
        'Every time we come out, your service fee is cut in half. Not just the first visit — every single one. That\'s an automatic 50% discount on the service fee for every repair, diagnostic, or maintenance call.',
        'Most HVAC companies charge $75-$150 just to show up. As a Priority Member, you\'ll never pay full price for a service fee again.',
      ],
      bullets: [
        '50% off service fees on every visit',
        'Applies to all service types — repair, diagnostic, maintenance',
        'Discount applied automatically at time of service',
        'Stacks on top of your member parts and labor savings',
        'No visit limits or restrictions',
      ],
    },
  },
];

export default function MembershipBenefitsGrid() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-7">
        {benefits.map((benefit, i) => {
          const color = accentColors[i];
          return (
            <button
              key={benefit.title}
              type="button"
              onClick={() => setOpenIndex(i)}
              className="group text-left rounded-2xl bg-white p-7 cursor-pointer hover:shadow-2xl hover:shadow-black/10 hover:scale-[1.04] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden border-0 shadow-lg shadow-black/5"
            >
              {/* Top accent bar */}
              <div className="absolute top-0 left-0 w-full h-1.5" style={{ backgroundColor: color.borderColor }} />

              <div className={`w-16 h-16 rounded-2xl ${color.bg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                <benefit.icon className={`w-8 h-8 ${color.text}`} />
              </div>
              <h3 className="text-xl font-extrabold text-[var(--navy)] mb-2">{benefit.title}</h3>
              <p className="text-sm text-[var(--navy)]/55 leading-relaxed mb-4">{benefit.description}</p>
              <span className={`inline-flex items-center gap-1 text-sm font-bold ${color.text} group-hover:gap-2 transition-all`}>
                Learn More
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </button>
          );
        })}
      </div>

      {benefits.map((benefit, i) => {
        const color = accentColors[i];
        return (
          <Modal
            key={benefit.title}
            isOpen={openIndex === i}
            onClose={() => setOpenIndex(null)}
          >
            {/* Close button */}
            <button
              onClick={() => setOpenIndex(null)}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Modal header */}
            <div className="flex items-center gap-4 mb-5 pr-8">
              <div className={`w-14 h-14 rounded-xl ${color.bg} flex items-center justify-center flex-shrink-0`}>
                <benefit.icon className={`w-7 h-7 ${color.text}`} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--navy)]">{benefit.title}</h2>
                <p className="text-sm text-[var(--navy)]/50">Priority Membership Benefit</p>
              </div>
            </div>

            {/* Paragraphs */}
            {benefit.modal.paragraphs.map((p, pi) => (
              <p key={pi} className="text-[var(--navy)]/70 leading-relaxed mb-4 text-[15px]">
                {p}
              </p>
            ))}

            {/* Bullet points */}
            <div className="bg-gray-50 rounded-xl p-5 mb-5">
              <h4 className="text-sm font-bold text-[var(--navy)] uppercase tracking-wider mb-3">
                What&apos;s Included
              </h4>
              <ul className="space-y-2.5">
                {benefit.modal.bullets.map((bullet, bi) => (
                  <li key={bi} className="flex items-start gap-3">
                    <span className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-full ${color.bg} flex items-center justify-center`}>
                      <CheckIcon className={`w-3 h-3 ${color.text}`} />
                    </span>
                    <span className="text-sm text-[var(--navy)]/70 leading-relaxed">{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <a
              href="#signup"
              onClick={() => setOpenIndex(null)}
              className="block w-full text-center rounded-full bg-[var(--ember)] px-6 py-3.5 text-base font-bold text-white hover:bg-[var(--ember-dark)] transition-all shadow-lg shadow-[var(--ember)]/25"
            >
              Join Today &amp; Get This Benefit
            </a>
          </Modal>
        );
      })}
    </>
  );
}
