'use client';

import Link from 'next/link';
import BookingForm from './BookingForm';

export default function BookingSection() {
  return (
    <section id="request" className="py-10 sm:py-28 bg-[var(--ice)]">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-6 sm:mb-10">
          <h2 className="font-[var(--font-display)] text-2xl sm:text-5xl tracking-wide text-[var(--navy)]" style={{ fontWeight: 700 }}>
            REQUEST HVAC/R SERVICE IN TALLAHASSEE FL, QUINCY AND SURROUNDING CITIES
          </h2>
          <p className="mt-2 sm:mt-4 text-base sm:text-lg text-[var(--steel)] leading-relaxed max-w-xl mx-auto">
            Tell us about your HVAC or refrigeration issue and we&apos;ll get
            back to you with a plan and pricing &mdash; no surprise charges.
          </p>
        </div>

        <Link
          href="/request"
          className="block bg-white rounded-2xl shadow-lg shadow-black/5 border border-[var(--border)] p-4 sm:p-10 cursor-pointer"
        >
          <div className="pointer-events-none">
            <BookingForm />
          </div>
        </Link>
      </div>
    </section>
  );
}
