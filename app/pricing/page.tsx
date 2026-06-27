import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import Navbar from '@/components/Navbar';
import FooterSection from '@/components/FooterSection';
import { CheckIcon, PhoneIcon } from '@/components/icons';

export const metadata: Metadata = {
  title: 'Flat Rate Pricing | Harden HVAC & Refrigeration',
  description:
    'Transparent flat rate labor pricing for all HVAC and refrigeration services. Residential and commercial. You know what you pay for labor — parts are billed separately at cost.',
};

export const revalidate = 300; // revalidate every 5 minutes

interface PricingRow {
  name: string;
  price: number;
  service_type: string;
  trade: string;
  note: string | null;
  description: string | null;
  category: string;
  sort_order: number;
}

async function getPricing(): Promise<PricingRow[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
  );

  const { data, error } = await supabase
    .from('pricing')
    .select('name, price, service_type, trade, note, description, category, sort_order')
    .order('sort_order')
    .order('name');

  if (error) {
    console.error('Failed to fetch pricing:', error);
    return [];
  }
  return data || [];
}

function formatPrice(price: number): string {
  if (price >= 1000) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
  }
  return `$${price}`;
}

function PricingTable({ items, accent }: { items: PricingRow[]; accent: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)]">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className={accent}>
            <th className="px-4 py-3 font-bold text-white text-sm tracking-wide">Service</th>
            <th className="px-4 py-3 font-bold text-white text-sm tracking-wide text-right whitespace-nowrap">Labor Price</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr
              key={`${item.name}-${item.note ?? i}`}
              className={`border-t border-[var(--border)] ${i % 2 === 0 ? 'bg-white' : 'bg-[var(--ice)]/30'}`}
            >
              <td className="px-4 py-3 text-[var(--navy)] font-medium">
                {item.name}
                {item.description && (
                  <span className="block text-xs text-[var(--steel)] mt-0.5">{item.description}</span>
                )}
                {item.note && (
                  <span className="block text-xs text-[var(--steel)]/70 mt-0.5 italic">{item.note}</span>
                )}
              </td>
              <td className="px-4 py-3 text-right font-bold text-[var(--navy)] whitespace-nowrap">
                {formatPrice(item.price)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 && (
        <div className="px-4 py-8 text-center text-[var(--steel)] text-sm">
          No services listed yet.
        </div>
      )}
    </div>
  );
}

export default async function PricingPage() {
  const allPricing = await getPricing();

  const residentialHVAC = allPricing.filter(r => r.service_type === 'residential' && r.trade === 'hvac');
  const residentialRefrigeration = allPricing.filter(r => r.service_type === 'residential' && r.trade === 'refrigeration');
  const commercialHVAC = allPricing.filter(r => r.service_type === 'commercial' && r.trade === 'hvac');
  const commercialRefrigeration = allPricing.filter(r => r.service_type === 'commercial' && r.trade === 'refrigeration');

  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="relative pt-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#061428] via-[var(--navy)] to-[#0d2e5e]" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[var(--ember)]/20 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[var(--gold)]/20 rounded-full blur-[100px]" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-14 pb-16 sm:pt-20 sm:pb-24 text-center">
          <div className="inline-block mb-5">
            <div className="bg-[var(--gold)] text-[var(--navy)] font-black text-sm sm:text-base px-6 py-2.5 rounded-full shadow-lg shadow-[var(--gold)]/40 tracking-wide">
              TRANSPARENT PRICING
            </div>
          </div>

          <h1
            className="font-[var(--font-display)] text-5xl sm:text-6xl lg:text-7xl tracking-wide leading-[1.08]"
            style={{ fontWeight: 800 }}
          >
            <span className="text-white">FLAT RATE</span>
            <br />
            <span className="text-[var(--ember)]">LABOR PRICING</span>
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-white/60 font-medium max-w-2xl mx-auto">
            Know exactly what you&apos;re paying for labor. Parts are billed separately at cost — no markups, no surprises.
          </p>
        </div>

        <div className="relative z-10">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full block">
            <path d="M0 60V20C240 0 480 40 720 30C960 20 1200 0 1440 20V60H0Z" fill="var(--background)" />
          </svg>
        </div>
      </section>

      {/* How it works banner */}
      <section className="py-10 sm:py-14 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[var(--ember)] via-[var(--gold)] to-[var(--accent)]" />

        <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <div className="inline-block bg-[var(--navy)] text-white text-xs font-black uppercase tracking-[0.3em] px-6 py-2 rounded-full mb-4">
              HOW OUR PRICING WORKS
            </div>
            <h2
              className="font-[var(--font-display)] text-3xl sm:text-4xl tracking-wide text-[var(--navy)]"
              style={{ fontWeight: 900 }}
            >
              LABOR + PARTS = <span className="text-[var(--ember)]">YOUR TOTAL</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                step: '1',
                title: 'Flat Rate Labor',
                desc: 'You pay a fixed labor fee for the service — listed below. No hourly surprises.',
                color: 'var(--ember)',
              },
              {
                step: '2',
                title: 'Parts at Cost',
                desc: 'The actual cost of the part is added to your invoice. You see exactly what the part costs.',
                color: 'var(--gold)',
              },
              {
                step: '3',
                title: 'No Hidden Fees',
                desc: 'Labor + parts = your total. That\'s it. You know what you\'re paying us and what goes into your system.',
                color: 'var(--accent)',
              },
            ].map((item) => (
              <div key={item.step} className="bg-white rounded-xl border border-[var(--border)] p-5 shadow-md relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: item.color }} />
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-sm mb-3"
                  style={{ backgroundColor: item.color }}
                >
                  {item.step}
                </div>
                <h3 className="font-extrabold text-[var(--navy)] text-base mb-1">{item.title}</h3>
                <p className="text-sm text-[var(--steel)] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Residential Pricing */}
      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-block bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-black uppercase tracking-[0.3em] px-5 py-2 rounded-full mb-3">
              RESIDENTIAL
            </div>
            <h2
              className="font-[var(--font-display)] text-4xl sm:text-5xl tracking-wide text-[var(--navy)]"
              style={{ fontWeight: 900 }}
            >
              HOME <span className="text-[var(--ember)]">SERVICES</span>
            </h2>
            <p className="mt-3 text-[var(--steel)] text-base max-w-xl mx-auto">
              Flat rate labor for all residential HVAC and refrigeration repairs, maintenance, and installations.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <h3
                className="font-[var(--font-display)] text-2xl tracking-wide text-[var(--navy)] mb-4 flex items-center gap-2"
                style={{ fontWeight: 800 }}
              >
                <span className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center">
                  <WindIcon className="w-4 h-4 text-white" />
                </span>
                HVAC
              </h3>
              <PricingTable items={residentialHVAC} accent="bg-[var(--accent)]" />
            </div>

            <div>
              <h3
                className="font-[var(--font-display)] text-2xl tracking-wide text-[var(--navy)] mb-4 flex items-center gap-2"
                style={{ fontWeight: 800 }}
              >
                <span className="w-8 h-8 rounded-lg bg-[var(--navy)] flex items-center justify-center">
                  <SnowflakeIcon className="w-4 h-4 text-white" />
                </span>
                REFRIGERATION
              </h3>
              <PricingTable items={residentialRefrigeration} accent="bg-[var(--navy)]" />
            </div>
          </div>
        </div>
      </section>

      {/* Commercial Pricing */}
      <section className="py-14 sm:py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--navy)]/3 via-[var(--ice)]/40 to-[var(--navy)]/3" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-block bg-[var(--ember)]/10 text-[var(--ember)] text-xs font-black uppercase tracking-[0.3em] px-5 py-2 rounded-full mb-3">
              COMMERCIAL
            </div>
            <h2
              className="font-[var(--font-display)] text-4xl sm:text-5xl tracking-wide text-[var(--navy)]"
              style={{ fontWeight: 900 }}
            >
              BUSINESS <span className="text-[var(--ember)]">SERVICES</span>
            </h2>
            <p className="mt-3 text-[var(--steel)] text-base max-w-xl mx-auto">
              Flat rate labor for commercial HVAC systems, walk-in coolers, freezers, reach-ins, and ice machines.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <h3
                className="font-[var(--font-display)] text-2xl tracking-wide text-[var(--navy)] mb-4 flex items-center gap-2"
                style={{ fontWeight: 800 }}
              >
                <span className="w-8 h-8 rounded-lg bg-[var(--ember)] flex items-center justify-center">
                  <WindIcon className="w-4 h-4 text-white" />
                </span>
                HVAC
              </h3>
              <PricingTable items={commercialHVAC} accent="bg-[var(--ember)]" />
            </div>

            <div>
              <h3
                className="font-[var(--font-display)] text-2xl tracking-wide text-[var(--navy)] mb-4 flex items-center gap-2"
                style={{ fontWeight: 800 }}
              >
                <span className="w-8 h-8 rounded-lg bg-[var(--navy)] flex items-center justify-center">
                  <SnowflakeIcon className="w-4 h-4 text-white" />
                </span>
                REFRIGERATION
              </h3>
              <PricingTable items={commercialRefrigeration} accent="bg-[var(--navy)]" />
            </div>
          </div>
        </div>
      </section>

      {/* Member savings callout */}
      <section className="py-12 sm:py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#061428] via-[var(--navy)] to-[#0d2e5e]" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[var(--gold)]/15 rounded-full blur-[120px]" />

        <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-block bg-[var(--gold)] text-[var(--navy)] text-xs font-black uppercase tracking-[0.2em] px-5 py-2 rounded-full mb-5 shadow-lg shadow-[var(--gold)]/30">
            PRIORITY MEMBERS SAVE MORE
          </div>
          <h2
            className="font-[var(--font-display)] text-3xl sm:text-4xl lg:text-5xl tracking-wide text-white mb-6"
            style={{ fontWeight: 900 }}
          >
            UP TO <span className="text-[var(--gold)]">50% OFF</span> SERVICE FEES
          </h2>

          <div className="bg-white/10 border border-white/15 rounded-xl p-6 sm:p-8 backdrop-blur-md max-w-2xl mx-auto mb-8">
            <div className="space-y-3">
              {[
                'Discounted labor rates on all repairs',
                'Priority scheduling — skip the wait',
                'Annual tune-ups included',
                'No diagnostic fee for members',
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--gold)]/20 flex items-center justify-center">
                    <CheckIcon className="w-3.5 h-3.5 text-[var(--gold)]" />
                  </span>
                  <span className="text-white/80 text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/membership"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-[var(--ember)] to-[var(--ember-dark)] text-white font-extrabold text-base px-8 py-4 rounded-full shadow-xl shadow-[var(--ember)]/30 hover:scale-105 transition-transform"
            >
              JOIN PRIORITY MEMBERSHIP
              <span className="bg-white/20 rounded-full px-3 py-1 text-sm">$21.99/mo</span>
            </Link>
            <a
              href="tel:9105466485"
              className="inline-flex items-center gap-2 text-white/60 hover:text-white font-semibold text-base transition-colors"
            >
              <PhoneIcon className="w-4 h-4" />
              (910) 546-6485
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2
            className="font-[var(--font-display)] text-2xl sm:text-3xl tracking-wide text-[var(--navy)] text-center mb-8"
            style={{ fontWeight: 900 }}
          >
            GOOD TO KNOW
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                q: 'What do these prices include?',
                a: 'These are flat rate labor fees only. The cost of the part itself is added separately at cost — no markup.',
              },
              {
                q: 'What if my repair isn\'t listed?',
                a: 'Call us or request service online. We\'ll provide a quote before starting any work.',
              },
              {
                q: 'Do members get different pricing?',
                a: 'Yes — Priority Members receive up to 50% off service fees and waived diagnostic charges.',
              },
              {
                q: 'Is there a warranty on labor?',
                a: 'All labor is backed by our workmanship warranty. Priority Members get extended coverage.',
              },
              {
                q: 'Do you charge for estimates?',
                a: 'A diagnostic fee applies for service calls. If you approve the repair, it\'s applied toward the total.',
              },
              {
                q: 'Are emergency / after-hours rates different?',
                a: 'After-hours and emergency calls may include an additional surcharge. Contact us for details.',
              },
            ].map((item) => (
              <div key={item.q} className="bg-white rounded-xl border border-[var(--border)] p-5 shadow-sm">
                <h3 className="font-bold text-[var(--navy)] text-sm mb-1.5">{item.q}</h3>
                <p className="text-sm text-[var(--steel)] leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-12 sm:py-16 bg-[var(--ice)]/40">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2
            className="font-[var(--font-display)] text-3xl sm:text-4xl tracking-wide text-[var(--navy)] mb-4"
            style={{ fontWeight: 900 }}
          >
            READY TO <span className="text-[var(--ember)]">GET STARTED?</span>
          </h2>
          <p className="text-[var(--steel)] text-base mb-6 max-w-lg mx-auto">
            Request service online or give us a call. We&apos;ll get you on the schedule.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/#request"
              className="inline-flex items-center gap-2 bg-[var(--ember)] text-white font-extrabold text-base px-8 py-4 rounded-full shadow-lg shadow-[var(--ember)]/25 hover:bg-[var(--ember-dark)] transition-colors"
            >
              REQUEST SERVICE
            </Link>
            <a
              href="tel:9105466485"
              className="inline-flex items-center gap-2 bg-white text-[var(--navy)] font-bold text-base px-8 py-4 rounded-full border border-[var(--border)] shadow-sm hover:shadow-md transition-shadow"
            >
              <PhoneIcon className="w-4 h-4" />
              (910) 546-6485
            </a>
          </div>
        </div>
      </section>

      <FooterSection />
    </>
  );
}

function WindIcon({ className }: { className?: string }) {
  return (
    <svg width={24} height={24} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} viewBox="0 0 24 24">
      <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
    </svg>
  );
}

function SnowflakeIcon({ className }: { className?: string }) {
  return (
    <svg width={24} height={24} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} viewBox="0 0 24 24">
      <line x1="12" y1="2" x2="12" y2="22" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      <line x1="19.07" y1="4.93" x2="4.93" y2="19.07" />
    </svg>
  );
}
