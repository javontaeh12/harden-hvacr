import Link from 'next/link';
import { PhoneIcon } from './icons';

interface ServiceCTAProps {
  heading: string;
}

export default function ServiceCTA({ heading }: ServiceCTAProps) {
  return (
    <section className="relative py-20 sm:py-28 bg-gradient-to-br from-[var(--navy)] to-[var(--navy-light)] overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[var(--accent)]/10 rounded-full blur-[100px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="font-[var(--font-display)] text-4xl sm:text-5xl tracking-wide text-white mb-4" style={{ fontWeight: 700 }}>
          {heading}
        </h2>
        <p className="text-white/50 text-lg max-w-xl mx-auto mb-10">
          Request service online or give us a call. We&apos;re ready to help.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/#request"
            className="inline-flex items-center justify-center rounded-full bg-[var(--ember)] px-8 py-4 text-base font-bold text-white hover:bg-[var(--ember-dark)] transition-all shadow-lg shadow-[var(--ember)]/30"
          >
            Request This Service
          </Link>
          <a
            href="tel:9105466485"
            className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/25 px-8 py-4 text-base font-semibold text-white hover:bg-white/10 transition-colors"
          >
            <PhoneIcon className="w-5 h-5" />
            Call (910) 546-6485
          </a>
        </div>
      </div>
    </section>
  );
}
