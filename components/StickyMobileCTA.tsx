'use client';

import Link from 'next/link';
import { PhoneIcon } from './icons';

export default function StickyMobileCTA() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-[var(--navy)] border-t border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
      <div className="flex">
        <a
          href="tel:9105466485"
          className="flex-1 flex items-center justify-center gap-2 py-3.5 text-white font-bold text-sm bg-[var(--ember)] active:bg-[var(--ember-dark)] transition-colors"
        >
          <PhoneIcon className="w-4 h-4" />
          Call Now
        </a>
        <Link
          href="/request"
          className="flex-1 flex items-center justify-center gap-2 py-3.5 text-white font-bold text-sm bg-[var(--navy)] active:bg-[var(--navy-light)] transition-colors"
        >
          Book Service
        </Link>
      </div>
    </div>
  );
}
