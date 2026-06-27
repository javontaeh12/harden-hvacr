import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getServiceBySlug, getAllServiceSlugs } from '@/lib/services-data';
import ServiceHero from '@/components/ServiceHero';
import ServiceChecklist from '@/components/ServiceChecklist';
import ServiceCTA from '@/components/ServiceCTA';
import { ClipboardIcon, SearchIcon, WrenchIcon, CheckIcon } from '@/components/icons';

export function generateStaticParams() {
  return getAllServiceSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) return {};

  return {
    title: service.seo.title,
    description: service.seo.description,
    openGraph: {
      title: service.seo.title,
      description: service.seo.description,
    },
  };
}

const processIcons = [ClipboardIcon, SearchIcon, WrenchIcon, CheckIcon];

export default async function ServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);

  if (!service) {
    notFound();
  }

  const checklistTitle =
    service.slug === 'tune-up'
      ? "EVERYTHING THAT'S INCLUDED"
      : 'WHAT WE INSPECT & SERVICE';

  return (
    <>
      <ServiceHero service={service} />

      {/* Highlights */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {service.highlights.map((highlight, i) => (
              <div
                key={highlight.title}
                className="relative bg-white rounded-2xl shadow-sm hover:shadow-lg transition-shadow p-7 text-center overflow-hidden"
              >
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
                  i === 0 ? 'from-[var(--accent)] to-[var(--accent-dark)]' :
                  i === 1 ? 'from-[var(--ember)] to-[var(--gold)]' :
                  'from-[var(--navy-light)] to-[var(--accent)]'
                }`} />
                <h3 className="text-lg font-bold text-[var(--navy)] mb-2">
                  {highlight.title}
                </h3>
                <p className="text-[var(--steel)] text-sm leading-relaxed">
                  {highlight.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Checklist */}
      <ServiceChecklist
        groups={service.checklists}
        callout={service.callout}
        sectionTitle={checklistTitle}
      />

      {/* What to Expect / Process */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold uppercase tracking-[0.25em] text-[var(--accent)] mb-3">The Process</span>
            <h2 className="font-[var(--font-display)] text-4xl sm:text-5xl tracking-wide text-[var(--navy)]" style={{ fontWeight: 700 }}>
              WHAT TO EXPECT
            </h2>
            <p className="mt-3 text-lg text-[var(--steel)] max-w-2xl mx-auto">
              Here&apos;s how the process works from start to finish.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {service.process.map((step, i) => {
              const StepIcon = processIcons[i] || CheckIcon;
              return (
                <div key={step.number} className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white border border-[var(--border)] shadow-sm mb-5">
                    <StepIcon className="w-7 h-7 text-[var(--accent)]" />
                  </div>
                  <h3 className="text-lg font-bold text-[var(--navy)] mb-2">
                    {step.title}
                  </h3>
                  <p className="text-[var(--steel)] text-sm leading-relaxed max-w-xs mx-auto">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <ServiceCTA heading={service.ctaHeading} />
    </>
  );
}
