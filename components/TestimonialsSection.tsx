import { StarIcon, PhoneIcon } from './icons';

const testimonials = [
  {
    quote:
      'Called on a Saturday when our AC went out. They were at our house within an hour and had it fixed before dinner. Incredible service.',
    name: 'Marcus T.',
    context: 'Emergency Repair',
  },
  {
    quote:
      'Been using Harden HVAC for our restaurant walk-in coolers for over two years. Always reliable, always fair pricing. Wouldn\'t call anyone else.',
    name: 'Lisa D.',
    context: 'Commercial Refrigeration',
  },
  {
    quote:
      'The priority membership has saved us so much money. Annual tune-ups keep everything running and we never wait when something breaks.',
    name: 'James & Karen W.',
    context: 'Priority Member',
  },
];

export default function TestimonialsSection() {
  return (
    <section id="reviews" className="py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="inline-block text-xs font-bold uppercase tracking-[0.25em] text-[var(--gold)] mb-2">Real Reviews</span>
          <h2 className="font-[var(--font-display)] text-4xl sm:text-5xl tracking-wide text-[var(--navy)]" style={{ fontWeight: 700 }}>
            WHAT OUR CUSTOMERS SAY
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5 mb-10">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="relative bg-white rounded-2xl shadow-sm hover:shadow-lg transition-shadow p-5 overflow-hidden border border-[var(--border)]"
            >
              {/* Stars */}
              <div className="flex gap-0.5 mb-3">
                {[...Array(5)].map((_, i) => (
                  <StarIcon key={i} className="w-4 h-4 text-[var(--gold)]" filled />
                ))}
              </div>
              <p className="text-[var(--foreground)] text-sm leading-relaxed mb-4">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div>
                <p className="font-bold text-[var(--navy)] text-sm">{t.name}</p>
                <p className="text-xs text-[var(--steel)]">{t.context}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Call-to-action banner */}
        <div className="bg-gradient-to-r from-[var(--ember)] to-[#ff7043] rounded-2xl p-6 sm:p-8 text-center shadow-lg">
          <h3 className="font-[var(--font-display)] text-2xl sm:text-3xl tracking-wide text-white mb-2" style={{ fontWeight: 700 }}>
            READY TO EXPERIENCE THE DIFFERENCE?
          </h3>
          <p className="text-white/80 text-sm mb-5 max-w-lg mx-auto">
            Join hundreds of satisfied customers across Tallahassee and Quincy.
            Call now or request service online.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="tel:9105466485"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-base font-bold text-[var(--ember)] hover:bg-white/90 transition-colors shadow-md"
            >
              <PhoneIcon className="w-5 h-5" />
              (910) 546-6485
            </a>
            <a
              href="#request"
              className="inline-flex items-center justify-center rounded-full border-2 border-white px-6 py-3 text-base font-bold text-white hover:bg-white/10 transition-colors"
            >
              Request Service Online
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
