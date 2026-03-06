'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PhoneIcon, MenuIcon, XIcon, ChevronDownIcon } from './icons';
import { servicesData } from '@/lib/services-data';

const makeServiceLink = (s: (typeof servicesData)[string]) => {
  const shortTitle = s.title.replace(/ IN .+$/, '');
  const label = shortTitle.charAt(0) + shortTitle.slice(1).toLowerCase();
  return { label, href: `/services/${s.slug}`, Icon: s.icon };
};

const refrigerationSlugs = ['commercial-refrigeration', 'refrigerator-repair', 'freezer-repair'];

const hvacServices = Object.values(servicesData)
  .filter((s) => !refrigerationSlugs.includes(s.slug))
  .map(makeServiceLink);

const refrigerationServices = Object.values(servicesData)
  .filter((s) => refrigerationSlugs.includes(s.slug))
  .map(makeServiceLink);

const navLinks = [
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'Membership', href: '/membership' },
  { label: 'Reviews', href: '/#reviews' },
  { label: 'Member Login', href: '/login' },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setServicesOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setServicesOpen(false), 150);
  };

  return (
    <>
      {/* Header — scrolls with page */}
      <nav className="bg-white z-30 relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-18 sm:h-28 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <Image
                src="/logo.png"
                alt="Harden HVAC & Refrigeration"
                width={360}
                height={120}
                className="h-12 sm:h-22 w-auto"
                priority
              />
            </Link>

            {/* Desktop links */}
            <div className="hidden md:flex items-center gap-8">
              {/* Services dropdown */}
              <div
                ref={dropdownRef}
                className="relative"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  type="button"
                  className="flex items-center gap-1 text-base font-bold text-[var(--navy)] hover:text-[var(--ember)] transition-colors"
                >
                  Services
                  <ChevronDownIcon
                    className={`w-4 h-4 transition-transform duration-200 ${
                      servicesOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Dropdown panel */}
                {servicesOpen && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 z-50">
                    <div className="bg-white border border-gray-200 rounded-xl shadow-2xl shadow-black/10 p-5">
                      <div className="flex gap-8">
                        {/* HVAC column */}
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-[var(--navy)] mb-2 px-3">HVAC</p>
                          <div className="space-y-0.5">
                            {hvacServices.map((service) => (
                              <Link
                                key={service.href}
                                href={service.href}
                                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--navy)]/70 hover:text-[var(--ember)] hover:bg-gray-50 transition-colors"
                                onClick={() => setServicesOpen(false)}
                              >
                                <service.Icon className="w-4 h-4 flex-shrink-0" />
                                <span className="whitespace-nowrap">{service.label}</span>
                              </Link>
                            ))}
                          </div>
                        </div>
                        {/* Refrigeration column */}
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-[var(--navy)] mb-2 px-3">Refrigeration</p>
                          <div className="space-y-0.5">
                            {refrigerationServices.map((service) => (
                              <Link
                                key={service.href}
                                href={service.href}
                                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--navy)]/70 hover:text-[var(--ember)] hover:bg-gray-50 transition-colors"
                                onClick={() => setServicesOpen(false)}
                              >
                                <service.Icon className="w-4 h-4 flex-shrink-0" />
                                <span className="whitespace-nowrap">{service.label}</span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-gray-200">
                        <Link
                          href="/#services"
                          className="block text-center text-xs font-semibold text-[var(--accent)] hover:text-[var(--ember)] transition-colors"
                          onClick={() => setServicesOpen(false)}
                        >
                          View All Services
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Link
                href="/#request"
                className="text-base font-bold text-[var(--navy)] hover:text-[var(--ember)] transition-colors"
              >
                Request Service
              </Link>

              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-base font-bold text-[var(--navy)] hover:text-[var(--ember)] transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* Phone CTA (desktop) */}
            <a
              href="tel:9105466485"
              className="hidden sm:flex items-center gap-2 rounded-full bg-[var(--ember)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--ember-dark)] transition-colors shadow-md shadow-[var(--ember)]/25"
            >
              <PhoneIcon className="w-4 h-4" />
              (910) 546-6485
            </a>
          </div>
        </div>
      </nav>

      {/* Mobile menu button — fixed full-width at bottom */}
      {!menuOpen && (
        <button
          onClick={() => { setMenuOpen(true); setServicesOpen(false); }}
          className="md:hidden fixed bottom-0 left-0 right-0 z-50 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-[var(--ember)] text-white shadow-[0_-2px_10px_rgba(0,0,0,0.15)] flex items-center justify-center gap-2 active:bg-[var(--ember-dark)] transition-colors"
          aria-label="Open menu"
        >
          <MenuIcon className="w-5 h-5" />
          <span className="text-sm font-semibold">Menu</span>
        </button>
      )}

      {/* Mobile bottom sheet menu */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-black/40 z-40"
            onClick={() => { setMenuOpen(false); setServicesOpen(false); }}
          />
          {/* Sheet */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.15)] max-h-[85vh] overflow-y-auto animate-[slideUp_0.25s_ease-out]">
            <div className="px-4 pt-3 pb-6">
              {/* Handle bar */}
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />

              {/* Services accordion */}
              <button
                onClick={() => setServicesOpen(!servicesOpen)}
                className="flex items-center justify-between w-full rounded-lg px-4 py-3 text-base font-medium text-[var(--navy)] hover:bg-gray-50 hover:text-[var(--ember)] transition-colors"
              >
                Services
                <ChevronDownIcon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    servicesOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {servicesOpen && (
                <div className="pl-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--navy)] mt-2 mb-1 px-4">HVAC</p>
                  {hvacServices.map((service) => (
                    <Link
                      key={service.href}
                      href={service.href}
                      onClick={() => { setMenuOpen(false); setServicesOpen(false); }}
                      className="flex items-center gap-2.5 rounded-lg px-4 py-2.5 text-sm text-[var(--navy)]/70 hover:bg-gray-50 hover:text-[var(--ember)] transition-colors"
                    >
                      <service.Icon className="w-4 h-4 flex-shrink-0" />
                      {service.label}
                    </Link>
                  ))}
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--navy)] mt-3 mb-1 px-4">Refrigeration</p>
                  {refrigerationServices.map((service) => (
                    <Link
                      key={service.href}
                      href={service.href}
                      onClick={() => { setMenuOpen(false); setServicesOpen(false); }}
                      className="flex items-center gap-2.5 rounded-lg px-4 py-2.5 text-sm text-[var(--navy)]/70 hover:bg-gray-50 hover:text-[var(--ember)] transition-colors"
                    >
                      <service.Icon className="w-4 h-4 flex-shrink-0" />
                      {service.label}
                    </Link>
                  ))}
                </div>
              )}

              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg px-4 py-3 text-base font-medium text-[var(--navy)] hover:bg-gray-50 hover:text-[var(--ember)] transition-colors"
                >
                  {link.label}
                </a>
              ))}

              <Link
                href="/request"
                onClick={() => { setMenuOpen(false); setServicesOpen(false); }}
                className="flex items-center justify-center gap-2 mt-3 rounded-xl bg-[var(--ember)] px-4 py-3 text-base font-semibold text-white active:bg-[var(--ember-dark)] transition-colors"
              >
                Request Service
              </Link>

              {/* Close button at bottom */}
              <button
                onClick={() => { setMenuOpen(false); setServicesOpen(false); }}
                className="flex items-center justify-center gap-2 w-full mt-3 rounded-lg px-4 py-3 text-base font-medium text-[var(--steel)] border border-[var(--border)] active:bg-gray-50 transition-colors"
              >
                <XIcon className="w-4 h-4" />
                Close Menu
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
