import { PhoneIcon } from './icons';

const promos = [
  {
    badge: 'New Customer Special',
    title: '$49 HVAC Tune-Up',
    description: 'Complete system inspection, filter check, and performance report included.',
    cta: 'Claim Offer',
    accent: 'var(--ember)',
    badgeBg: 'bg-[var(--ember)]',
  },
  {
    badge: 'Limited Time',
    title: '$25 Off Any Repair',
    description: 'First-time customers save $25 on any HVAC or refrigeration repair service.',
    cta: 'Claim Offer',
    accent: 'var(--accent)',
    badgeBg: 'bg-[var(--accent)]',
  },
  {
    badge: 'Free Estimate',
    title: 'Free New System Quote',
    description: 'Considering a new AC, furnace, or mini-split or ductless system? Get a free on-site estimate.',
    cta: 'Get Quote',
    accent: 'var(--gold)',
    badgeBg: 'bg-[var(--gold)]',
  },
];

export default function PromoBanner() {
  return (
    <section className="py-10 sm:py-14 bg-[var(--background)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-8">
          <span className="inline-block text-xs font-bold uppercase tracking-[0.25em] text-[var(--ember)] mb-2">Limited Time Offers</span>
          <h2 className="font-[var(--font-display)] text-4xl sm:text-5xl tracking-wide text-[var(--navy)]" style={{ fontWeight: 700 }}>
            CURRENT SPECIALS &amp; DEALS FOR TALLAHASSEE, FLORIDA AND SURROUNDING CITIES
          </h2>
        </div>

        {/* Coupon cards */}
        <div className="grid sm:grid-cols-3 gap-5">
          {promos.map((promo) => (
            <div
              key={promo.title}
              className="relative bg-white rounded-2xl border-2 border-dashed border-[var(--border)] hover:border-[var(--ember)] transition-colors overflow-hidden group"
            >
              {/* Top badge */}
              <div className={`${promo.badgeBg} px-4 py-1.5`}>
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  {promo.badge}
                </span>
              </div>

              <div className="p-5">
                <h3 className="font-[var(--font-display)] text-2xl sm:text-3xl tracking-wide text-[var(--navy)] mb-2" style={{ fontWeight: 700 }}>
                  {promo.title}
                </h3>
                <p className="text-sm text-[var(--steel)] leading-relaxed mb-4">
                  {promo.description}
                </p>
                <a
                  href="tel:9105466485"
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--navy)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--navy-light)] transition-colors"
                >
                  <PhoneIcon className="w-4 h-4" />
                  {promo.cta}
                </a>
              </div>

              {/* Decorative corner */}
              <div className="absolute top-12 right-0 w-16 h-16 bg-[var(--ice)] rounded-full -mr-8 opacity-50" />
            </div>
          ))}
        </div>

        {/* Urgency footer */}
        <p className="text-center mt-6 text-sm text-[var(--steel)]">
          Mention these offers when you call. Cannot be combined with other promotions.
        </p>
      </div>
    </section>
  );
}
