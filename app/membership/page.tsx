import type { Metadata } from 'next';
import MembershipForm from '@/components/MembershipForm';
import MembershipBenefitsGrid from '@/components/MembershipBenefitsGrid';
import FooterSection from '@/components/FooterSection';
import Navbar from '@/components/Navbar';
import { CheckIcon } from '@/components/icons';

export const metadata: Metadata = {
  title: 'Priority Membership | Harden HVAC & Refrigeration',
  description:
    'Save money and get priority service with our HVAC membership plan. Discounted rates, annual tune-ups, chemical condenser cleaning, customer portal, and more.',
};

export default function MembershipPage() {
  return (
    <>
      <Navbar />

      {/* Hero — Bold promotional splash */}
      <section className="relative pt-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#061428] via-[var(--navy)] to-[#0d2e5e]" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[var(--ember)]/20 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[var(--gold)]/20 rounded-full blur-[100px]" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-14 pb-16 sm:pt-20 sm:pb-24 text-center">
          {/* Promotional badge */}
          <div className="inline-block mb-5">
            <div className="bg-[var(--gold)] text-[var(--navy)] font-black text-sm sm:text-base px-6 py-2.5 rounded-full shadow-lg shadow-[var(--gold)]/40 tracking-wide animate-pulse">
              SAVE UP TO 30% ON SERVICE
            </div>
          </div>

          <h1
            className="font-[var(--font-display)] text-5xl sm:text-6xl lg:text-7xl tracking-wide leading-[1.08]"
            style={{ fontWeight: 800 }}
          >
            <span className="text-white">PRIORITY</span>
            <br />
            <span className="text-[var(--ember)]">MEMBERSHIP</span>
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-white/60 font-medium max-w-2xl mx-auto">
            Lower rates, priority service, and peace of mind — all year long.
          </p>

          <p className="mt-5 text-white/40 text-sm font-medium">
            Starting at just $21.99/mo
          </p>
        </div>

        <div className="relative z-10">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full block">
            <path d="M0 60V20C240 0 480 40 720 30C960 20 1200 0 1440 20V60H0Z" fill="var(--background)" />
          </svg>
        </div>
      </section>

      {/* Benefits Grid — Bold flyer section */}
      <section className="py-16 sm:py-24 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[var(--ember)] via-[var(--gold)] to-[var(--accent)]" />
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-[var(--accent)]/5 rounded-full blur-[80px]" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-[var(--ember)]/5 rounded-full blur-[80px]" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            {/* Diagonal banner feel */}
            <div className="inline-block bg-[var(--navy)] text-white text-xs font-black uppercase tracking-[0.3em] px-6 py-2 rounded-full mb-4">
              TAP ANY CARD FOR DETAILS
            </div>
            <h2
              className="font-[var(--font-display)] text-4xl sm:text-5xl lg:text-6xl tracking-wide text-[var(--navy)]"
              style={{ fontWeight: 900 }}
            >
              <span className="text-[var(--ember)]">9</span> POWERFUL BENEFITS
            </h2>
            <p className="mt-3 text-[var(--navy)]/50 text-lg max-w-xl mx-auto">
              Every membership includes all of these — no tiers, no upsells.
            </p>
          </div>

          <MembershipBenefitsGrid />

          {/* Bottom urgency bar */}
          <div className="mt-10 text-center">
            <a
              href="#signup"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-[var(--ember)] to-[var(--ember-dark)] text-white font-extrabold text-base sm:text-lg px-8 py-4 rounded-full shadow-xl shadow-[var(--ember)]/30 hover:scale-105 transition-transform"
            >
              GET ALL 9 BENEFITS TODAY
              <span className="bg-white/20 rounded-full px-3 py-1 text-sm">$21.99/mo</span>
            </a>
          </div>
        </div>
      </section>

      {/* Referral Program — Coupon / Ticket style */}
      <section className="py-16 sm:py-20 relative overflow-hidden">
        {/* Full-width colored band */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--gold)]/8 via-[var(--gold)]/15 to-[var(--gold)]/5" />
        {/* Decorative circles */}
        <div className="absolute top-1/2 -left-6 w-12 h-12 bg-[var(--background)] rounded-full" />
        <div className="absolute top-1/2 -right-6 w-12 h-12 bg-[var(--background)] rounded-full" />

        <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-block text-xs font-black uppercase tracking-[0.3em] text-[var(--gold)] mb-3 bg-[var(--gold)]/10 px-4 py-1.5 rounded-full">
            Referral Rewards
          </div>
          <h2
            className="font-[var(--font-display)] text-3xl sm:text-4xl tracking-wide text-[var(--navy)] mb-8"
            style={{ fontWeight: 900 }}
          >
            SHARE &amp; EARN
          </h2>

          {/* Coupon ticket */}
          <div className="relative inline-block max-w-md w-full">
            {/* Perforated edge effect — hidden on small screens to prevent overflow */}
            <div className="absolute -left-3 top-0 bottom-0 hidden sm:flex flex-col justify-around">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="w-6 h-6 bg-[var(--background)] rounded-full" />
              ))}
            </div>
            <div className="absolute -right-3 top-0 bottom-0 hidden sm:flex flex-col justify-around">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="w-6 h-6 bg-[var(--background)] rounded-full" />
              ))}
            </div>

            <div className="bg-white rounded-2xl shadow-xl border-2 border-[var(--gold)]/30 px-10 py-10 relative overflow-hidden">
              {/* Top stripe */}
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[var(--gold)] via-[var(--ember)] to-[var(--gold)]" />
              {/* Bottom stripe */}
              <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gradient-to-r from-[var(--gold)] via-[var(--ember)] to-[var(--gold)]" />

              <div className="text-8xl sm:text-9xl font-black text-[var(--gold)] leading-none mb-1" style={{ letterSpacing: '-0.03em' }}>
                $25
              </div>
              <div className="text-base font-extrabold uppercase tracking-[0.2em] text-[var(--navy)] mb-5">
                Per Referral Credit
              </div>
              <div className="w-full h-px bg-[var(--gold)]/20 mb-5" style={{ backgroundImage: 'repeating-linear-gradient(90deg, var(--gold) 0, var(--gold) 8px, transparent 8px, transparent 16px)' }} />
              <p className="text-sm text-[var(--navy)]/60 leading-relaxed">
                Refer a friend or neighbor. When they join Priority Membership,
                you earn <span className="font-bold text-[var(--navy)]">$25 cash</span>.{' '}
                <span className="font-bold text-[var(--ember)]">No limit.</span>
              </p>
              <p className="text-sm text-[var(--navy)]/60 leading-relaxed mt-2">
                Plus, your referrals get <span className="font-bold text-[var(--navy)]">5-10% off</span> their first service visit.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing + Signup */}
      <section id="signup" className="relative py-20 sm:py-28 bg-gradient-to-br from-[#061428] via-[var(--navy)] to-[#0d2e5e] overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[var(--accent)]/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[var(--gold)]/10 rounded-full blur-[80px]" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-block bg-[var(--gold)] text-[var(--navy)] text-xs font-black uppercase tracking-[0.2em] px-5 py-2 rounded-full mb-4 shadow-lg shadow-[var(--gold)]/30">
              LIMITED TIME OFFER
            </div>
            <h2
              className="font-[var(--font-display)] text-4xl sm:text-5xl lg:text-6xl tracking-wide text-white"
              style={{ fontWeight: 900 }}
            >
              CHOOSE YOUR PLAN
            </h2>
          </div>

          <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-start">
            {/* Left — pricing table */}
            <div className="mb-10 lg:mb-0">
              {/* Header row */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <span className="text-xs font-bold text-white/40 uppercase tracking-wider pl-4">Plan</span>
                <div className="grid grid-cols-2 text-xs font-bold text-white/40 uppercase tracking-wider text-right">
                  <span>Monthly</span>
                  <span className="relative">
                    Annual
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[var(--gold)] text-[var(--navy)] text-[10px] font-black px-3 py-1 rounded-full whitespace-nowrap shadow-lg shadow-[var(--gold)]/40 animate-pulse">
                      BEST VALUE
                    </span>
                  </span>
                </div>
              </div>

              {/* Pricing rows */}
              <div className="space-y-3">
                {/* Main plan - highlighted */}
                <div className="bg-white/10 border-2 border-[var(--gold)]/30 rounded-xl px-4 py-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[var(--gold)]" />
                  <span className="text-white font-semibold text-sm pl-2 block mb-2 sm:mb-0">
                    Complete System{' '}
                    <span className="text-white/50 text-xs block">(Condenser + Air Handler)</span>
                  </span>
                  <div className="flex justify-between pl-2 sm:pl-0">
                    <span className="text-white font-bold text-base sm:text-lg">
                      $21.99<span className="text-white/40 text-xs font-normal">/mo</span>
                    </span>
                    <span className="text-[var(--gold)] font-extrabold text-base sm:text-lg">
                      $240<span className="text-[var(--gold)]/60 text-xs font-normal">/yr</span>
                    </span>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                  <span className="text-white/80 text-sm block mb-1 sm:mb-0">Each Additional System</span>
                  <div className="flex justify-between">
                    <span className="text-white/80 font-bold text-base sm:text-lg">
                      +$15<span className="text-white/40 text-xs font-normal">/mo</span>
                    </span>
                    <span className="text-[var(--gold)] font-bold text-base sm:text-lg">
                      +$150<span className="text-[var(--gold)]/60 text-xs font-normal">/yr</span>
                    </span>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                  <span className="text-white/80 text-sm block mb-1 sm:mb-0">Refrigerator PM</span>
                  <div className="flex justify-between">
                    <span className="text-white/80 font-bold text-base sm:text-lg">
                      +$5<span className="text-white/40 text-xs font-normal">/mo</span>
                    </span>
                    <span className="text-[var(--gold)] font-bold text-base sm:text-lg">
                      +$60<span className="text-[var(--gold)]/60 text-xs font-normal">/yr</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Includes checklist */}
              <div className="mt-8 bg-white/5 rounded-xl border border-white/10 p-5">
                <h3 className="text-sm font-black text-[var(--gold)] uppercase tracking-wider mb-4">
                  Every Plan Includes
                </h3>
                <div className="space-y-3">
                  {[
                    'Priority scheduling — skip the line',
                    'Discounted service rates on all repairs',
                    'Annual system tune-ups',
                    'Chemical condenser cleaning',
                    'Customer portal & easy scheduling',
                    'Extended parts warranty',
                    'Dedicated technician',
                    'Up to $1,000 off system upgrade',
                    '50% off service fees',
                    'Earn $25 cash for every referral that joins Priority Membership',
                    'Your referrals save 5-10% off their first service visit',
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <span className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-full bg-[var(--gold)]/20 flex items-center justify-center">
                        <CheckIcon className="w-3.5 h-3.5 text-[var(--gold)]" />
                      </span>
                      <span className="text-white/80 text-sm leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right — form */}
            <div>
              <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                {/* Top accent bar */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--ember)] via-[var(--gold)] to-[var(--accent)]" />
                <h3 className="text-xl font-extrabold text-white mb-1">Sign Up for Priority Service</h3>
                <p className="text-sm text-white/50 mb-6">
                  We&apos;ll contact you to finalize your membership details and pricing.
                </p>
                <MembershipForm />
              </div>
            </div>
          </div>
        </div>
      </section>

      <FooterSection />
    </>
  );
}
