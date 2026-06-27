import { CheckIcon } from './icons';
import type { ChecklistGroup } from '@/lib/services-data';

interface ServiceChecklistProps {
  groups: ChecklistGroup[];
  callout?: string;
  sectionTitle?: string;
}

export default function ServiceChecklist({
  groups,
  callout,
  sectionTitle = 'WHAT WE INSPECT & SERVICE',
}: ServiceChecklistProps) {
  return (
    <section className="py-20 sm:py-28 bg-[var(--ice)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="font-[var(--font-display)] text-4xl sm:text-5xl tracking-wide text-[var(--navy)]" style={{ fontWeight: 700 }}>
            {sectionTitle}
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {groups.map((group) => {
            const hasHighlighted = group.items.some((item) => item.highlighted);

            return (
              <div
                key={group.title}
                className={`bg-white rounded-2xl border shadow-sm p-7 ${
                  hasHighlighted
                    ? 'border-l-4 border-l-[var(--gold)] border-[var(--border)]'
                    : 'border-[var(--border)]'
                }`}
              >
                <h3 className="text-lg font-bold text-[var(--navy)] mb-4">
                  {group.title}
                </h3>
                <ul className="space-y-3">
                  {group.items.map((item) => (
                    <li key={item.text} className="flex items-start gap-3">
                      <CheckIcon
                        className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                          item.highlighted
                            ? 'text-[var(--gold)]'
                            : 'text-green-600'
                        }`}
                      />
                      <span
                        className={`text-sm leading-relaxed ${
                          item.highlighted
                            ? 'text-[var(--navy)] font-semibold'
                            : 'text-[var(--steel)]'
                        }`}
                      >
                        {item.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Callout card */}
        {callout && (
          <div className="mt-8 bg-white rounded-2xl border border-[var(--border)] border-l-4 border-l-[var(--gold)] shadow-sm p-7">
            <p className="text-[var(--navy)] font-medium text-base leading-relaxed">
              {callout}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
