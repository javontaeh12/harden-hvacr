import { CheckIcon } from './icons';
import MembershipForm from './MembershipForm';

const benefits = [
  'Priority scheduling — skip the line during busy season',
  'Discounted service rates on all repairs',
  'Annual system tune-ups included',
  'Extended parts warranty on all work',
  'Dedicated technician who knows your system',
  'Earn $25 cash for every referral that purchases a Priority Membership',
  'Your referrals save 5-10% off their first service visit',
];

export default function MembershipSection() {
  return (
    <section id="membership" className="relative py-20 sm:py-28 bg-gradient-to-br from-[#0d47a1] via-[#1256a8] to-[var(--navy)] overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[var(--gold)]/10 rounded-full blur-[80px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="inline-block text-xs font-bold uppercase tracking-[0.25em] text-[var(--gold)] mb-3">Earn Cash &amp; Save More</span>
          <h2 className="font-[var(--font-display)] text-4xl sm:text-5xl tracking-wide text-white" style={{ fontWeight: 700 }}>
            PRIORITY MEMBERSHIP
          </h2>
          <p className="mt-3 text-lg text-white/50 max-w-2xl mx-auto">
            Get priority service, lower rates, and peace of mind with our
            annual membership plan.
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-start">
          {/* Left — benefits */}
          <div className="mb-10 lg:mb-0">
            <h3 className="text-sm font-bold text-[var(--gold)] uppercase tracking-wider mb-6">
              Membership Benefits
            </h3>
            <ul className="space-y-4">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3">
                  <span className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-full bg-[var(--gold)]/20 flex items-center justify-center">
                    <CheckIcon className="w-3.5 h-3.5 text-[var(--gold)]" />
                  </span>
                  <span className="text-white/80 text-sm leading-relaxed">
                    {benefit}
                  </span>
                </li>
              ))}
            </ul>

            <h3 className="text-sm font-bold text-[var(--gold)] uppercase tracking-wider mt-10 mb-4">
              Pricing
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <span className="text-xs font-bold text-white/40 uppercase tracking-wider pl-4">Plan</span>
              <div className="grid grid-cols-2 text-xs font-bold text-white/40 uppercase tracking-wider text-right">
                <span>Monthly</span>
                <span>Annual</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <span className="text-white/80 text-sm block mb-1">Complete System <span className="text-white/50 text-xs block">(Condenser + Air Handler)</span></span>
                <div className="flex justify-between">
                  <span className="text-[var(--gold)] font-bold text-base sm:text-lg">$21.99<span className="text-white/40 text-xs font-normal">/mo</span></span>
                  <span className="text-[var(--gold)] font-bold text-base sm:text-lg">$240<span className="text-white/40 text-xs font-normal">/yr</span></span>
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <span className="text-white/80 text-sm block mb-1">Each Additional System</span>
                <div className="flex justify-between">
                  <span className="text-[var(--gold)] font-bold text-base sm:text-lg">+$15<span className="text-white/40 text-xs font-normal">/mo</span></span>
                  <span className="text-[var(--gold)] font-bold text-base sm:text-lg">+$150<span className="text-white/40 text-xs font-normal">/yr</span></span>
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <span className="text-white/80 text-sm block mb-1">Refrigerator PM</span>
                <div className="flex justify-between">
                  <span className="text-[var(--gold)] font-bold text-base sm:text-lg">+$5<span className="text-white/40 text-xs font-normal">/mo</span></span>
                  <span className="text-[var(--gold)] font-bold text-base sm:text-lg">+$60<span className="text-white/40 text-xs font-normal">/yr</span></span>
                </div>
              </div>
            </div>
          </div>

          {/* Right — form */}
          <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md p-6 sm:p-8 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-1">
              Sign Up for Priority Service
            </h3>
            <p className="text-sm text-white/50 mb-6">
              We&apos;ll contact you to finalize your membership details and pricing.
            </p>
            <MembershipForm />
          </div>
        </div>
      </div>
    </section>
  );
}
