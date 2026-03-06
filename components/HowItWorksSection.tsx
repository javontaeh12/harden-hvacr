import { ClipboardIcon, PhoneIcon, ZapIcon, WrenchIcon } from './icons';

const steps = [
  {
    number: '01',
    icon: ClipboardIcon,
    title: 'Complete the Form',
    description:
      'Fill out the service request form below with your details and describe the issue.',
  },
  {
    number: '02',
    icon: PhoneIcon,
    title: 'We Confirm & Schedule',
    description:
      'We review your request and call to confirm details, timing, and schedule your booking.',
  },
  {
    number: '03',
    icon: ZapIcon,
    title: 'You Pay the Service Fee',
    description:
      'You receive an invoice with service fee, this covers travel and deposit for any services performed.',
  },
  {
    number: '04',
    icon: WrenchIcon,
    title: 'We Fix It Right',
    description:
      'A qualified tech arrives with the right parts and tools to get it done.',
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative py-14 sm:py-20 bg-[var(--ice)] overflow-hidden">
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="inline-block text-xs font-bold uppercase tracking-[0.25em] text-[var(--accent)] mb-2">Simple Process</span>
          <h2 className="font-[var(--font-display)] text-4xl sm:text-5xl tracking-wide text-[var(--navy)]" style={{ fontWeight: 700 }}>
            HOW IT WORKS
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {steps.map((step) => (
            <div key={step.number} className="text-center group">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-md border border-[var(--border)] mb-4 group-hover:shadow-lg transition-shadow">
                <step.icon className="w-7 h-7 text-[var(--accent)]" />
              </div>
              <h3 className="text-base font-bold text-[var(--navy)] mb-1.5">
                {step.title}
              </h3>
              <p className="text-[var(--steel)] text-sm leading-relaxed max-w-xs mx-auto">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA strip */}
        <div className="mt-10 text-center bg-white rounded-xl border border-[var(--border)] shadow-sm p-5">
          <p className="text-sm font-semibold text-[var(--navy)]">
            Ready to get started? It takes less than 2 minutes.
          </p>
        </div>
      </div>
    </section>
  );
}
