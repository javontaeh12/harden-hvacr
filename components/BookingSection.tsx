'use client';

import { MessageCircle, Phone, Clock, Shield, Wrench } from 'lucide-react';

export default function BookingSection() {
  return (
    <section id="request" className="py-10 sm:py-28 bg-[var(--ice)]">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-6 sm:mb-10">
          <h2 className="font-[var(--font-display)] text-2xl sm:text-5xl tracking-wide text-[var(--navy)]" style={{ fontWeight: 700 }}>
            SCHEDULE SERVICE IN SECONDS
          </h2>
          <p className="mt-2 sm:mt-4 text-base sm:text-lg text-[var(--steel)] leading-relaxed max-w-xl mx-auto">
            Chat with Alex, our AI assistant, to book your appointment instantly.
            No forms, no hold times &mdash; just tell us what you need.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg shadow-black/5 border border-[var(--border)] p-6 sm:p-10">
          <div className="grid sm:grid-cols-2 gap-8 items-center">
            {/* Left — benefits */}
            <div className="space-y-5">
              {[
                { icon: MessageCircle, title: 'Book in the chat', desc: 'Alex collects your info and schedules everything automatically' },
                { icon: Clock, title: 'Instant confirmation', desc: 'Get your appointment date, time, and invoice right away' },
                { icon: Wrench, title: 'Technician assigned', desc: 'A certified tech is assigned and ready for your service date' },
                { icon: Shield, title: 'No surprise charges', desc: '$89 diagnostic fee — credited toward any approved repairs' },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                    <item.icon className="h-4.5 w-4.5 text-[#1e40af]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--navy)]">{item.title}</p>
                    <p className="text-sm text-[var(--steel)]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Right — CTA */}
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#1e40af]/10">
                <MessageCircle className="h-10 w-10 text-[#1e40af]" />
              </div>
              <h3 className="text-xl font-bold text-[var(--navy)]">Ready to get started?</h3>
              <p className="text-sm text-[var(--steel)] max-w-xs">
                Click below to chat with Alex. He&apos;ll get your name, address, and issue &mdash; then book your appointment on the spot.
              </p>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('open-chat'))}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--ember)] px-8 py-4 text-sm font-bold text-white hover:bg-[var(--ember-dark)] transition-all shadow-lg shadow-[var(--ember)]/30 hover:shadow-xl hover:-translate-y-0.5 uppercase tracking-wider"
              >
                <MessageCircle className="h-5 w-5" />
                Chat with Alex
              </button>
              <a
                href="tel:9566699093"
                className="inline-flex items-center gap-2 text-sm text-[var(--steel)] hover:text-[var(--navy)] transition-colors"
              >
                <Phone className="h-4 w-4" />
                Or call (956) 669-9093
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
