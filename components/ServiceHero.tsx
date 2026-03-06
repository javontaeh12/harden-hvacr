import Link from 'next/link';
import { PhoneIcon, ShieldIcon, ClockIcon } from './icons';
import Breadcrumb from './Breadcrumb';
import type { ServiceData } from '@/lib/services-data';

interface ServiceHeroProps {
  service: ServiceData;
}

export default function ServiceHero({ service }: ServiceHeroProps) {
  const breadcrumbName = service.title
    .split(' ')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');

  return (
    <section className="relative pt-4 sm:pt-16 overflow-hidden">
      {/* Full navy background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--navy)] via-[var(--navy-light)] to-[var(--navy)]" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[var(--accent)]/10 rounded-full blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4 pb-12 sm:pt-16 sm:pb-24">
        <div>
          {/* Content */}
          <div className="text-center">
            <div className="mb-4 [&_a]:text-white/50 [&_a:hover]:text-white [&_span]:text-white/30 [&_span:last-child]:text-white/80">
              <Breadcrumb current={breadcrumbName} />
            </div>

            <div className="mt-4">
              <span
                className="inline-block text-xs font-semibold px-3 py-1 rounded-full mb-4 bg-white/10 backdrop-blur-sm border border-white/10"
                style={{ color: service.accent === 'var(--ember)' ? '#ff8a65' : '#64b5f6' }}
              >
                {service.accentLabel}
              </span>
            </div>

            <h1 className="font-[var(--font-display)] text-3xl sm:text-5xl lg:text-7xl tracking-wide text-white leading-[1.1]" style={{ fontWeight: 700 }}>
              {service.title.includes(' IN ') ? (
                <>
                  {service.title.split(' IN ')[0]}
                  <span className="block text-[var(--ember)]">IN {service.title.split(' IN ')[1]}</span>
                </>
              ) : service.title}
            </h1>
            <p className="mt-3 text-xl sm:text-2xl text-white/60 font-medium">
              {service.subtitle}
            </p>
            <p className="mt-4 text-base text-white/50 max-w-xl mx-auto leading-relaxed">
              {service.description}
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/request"
                className="inline-flex items-center justify-center rounded-full bg-[var(--ember)] px-8 py-4 text-base font-bold text-white hover:bg-[var(--ember-dark)] transition-all shadow-lg shadow-[var(--ember)]/30"
              >
                Request This Service
              </Link>
              <a
                href="tel:9105466485"
                className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/25 px-8 py-4 text-base font-semibold text-white hover:bg-white/10 transition-all"
              >
                <PhoneIcon className="w-5 h-5" />
                Call (910) 546-6485
              </a>
            </div>

            {/* Trust badges */}
            <div className="mt-10 flex flex-wrap gap-6 justify-center">
              <div className="flex items-center gap-2 text-sm text-white/50">
                <ShieldIcon className="w-5 h-5 text-[var(--accent)]" />
                Licensed &amp; Insured
              </div>
              <div className="flex items-center gap-2 text-sm text-white/50">
                <ClockIcon className="w-5 h-5 text-[var(--accent)]" />
                10+ Years Experience
              </div>
              <div className="flex items-center gap-2 text-sm text-white/50">
                <ShieldIcon className="w-5 h-5 text-[var(--ember)]" />
                Veteran Owned
              </div>
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
