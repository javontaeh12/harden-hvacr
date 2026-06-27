import ServiceRequestForm from './ServiceRequestForm';

export default function ServiceRequestSection() {
  return (
    <section id="request" className="py-20 sm:py-28 bg-[var(--ice)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-start">
          {/* Left — info */}
          <div className="mb-10 lg:mb-0 lg:sticky lg:top-24">
            <span className="inline-block text-xs font-bold uppercase tracking-[0.25em] text-[var(--accent)] mb-3">Get Started</span>
            <h2 className="font-[var(--font-display)] text-4xl sm:text-5xl tracking-wide text-[var(--navy)]" style={{ fontWeight: 700 }}>
              REQUEST HVAC/R SERVICE IN TALLAHASSEE FL, QUINCY AND SURROUNDING CITIES
            </h2>
            <p className="mt-4 text-lg text-[var(--steel)] leading-relaxed">
              Tell us about your HVAC or refrigeration issue and we&apos;ll get
              back to you with a plan and pricing — no surprise charges.
            </p>

            <div className="mt-8 space-y-5">
              <h3 className="text-sm font-bold text-[var(--navy)] uppercase tracking-wider">
                What happens next
              </h3>
              <ol className="space-y-4 text-sm text-[var(--steel)]">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dark)] text-white text-xs font-bold flex items-center justify-center shadow-sm">
                    1
                  </span>
                  We review your request within a few hours
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dark)] text-white text-xs font-bold flex items-center justify-center shadow-sm">
                    2
                  </span>
                  We call or text to confirm details and schedule
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dark)] text-white text-xs font-bold flex items-center justify-center shadow-sm">
                    3
                  </span>
                  You receive an invoice after service is discussed
                </li>
              </ol>
            </div>

            <div className="mt-8 p-5 rounded-xl bg-white border border-[var(--border)] shadow-sm">
              <h4 className="text-sm font-bold text-[var(--navy)] mb-2">
                Tips for a faster response
              </h4>
              <ul className="text-sm text-[var(--steel)] space-y-1.5">
                <li>Include the make and model of your unit</li>
                <li>Describe any error codes or unusual behavior</li>
                <li>Upload a photo if possible</li>
                <li>Mention if it&apos;s an emergency or can wait</li>
              </ul>
            </div>
          </div>

          {/* Right — form card */}
          <div className="bg-white rounded-2xl shadow-lg shadow-black/5 border border-[var(--border)] p-6 sm:p-8">
            <ServiceRequestForm />
          </div>
        </div>
      </div>
    </section>
  );
}
