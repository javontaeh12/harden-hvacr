import Image from 'next/image';
import { PhoneIcon } from './icons';

const quickLinks = [
  { label: 'Services', href: '/#services' },
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'Request Service', href: '/#request' },
  { label: 'Membership', href: '/membership' },
  { label: 'Reviews', href: '/#reviews' },
  { label: 'Admin Portal', href: '/admin' },
];

const serviceLinks = [
  { label: 'Emergency Repair', href: '/services/emergency-repair' },
  { label: 'System Tune-Up', href: '/services/tune-up' },
  { label: 'Full Diagnostics', href: '/services/diagnostics' },
  { label: 'Commercial Refrigeration', href: '/services/commercial-refrigeration' },
  { label: 'Cooling Services', href: '/services/cooling' },
  { label: 'Heating Services', href: '/services/heating' },
  { label: 'Ductless Installs', href: '/services/ductless-installs' },
  { label: 'Refrigerator Repair', href: '/services/refrigerator-repair' },
  { label: 'Freezer Repair', href: '/services/freezer-repair' },
];

export default function FooterSection() {
  return (
    <footer className="bg-[var(--navy)] text-white/60">
      {/* Top accent line */}
      <div className="h-1 bg-gradient-to-r from-[var(--accent)] via-[var(--ember)] to-[var(--gold)]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Business info */}
          <div>
            <Image
              src="/logo.png"
              alt="Harden HVAC & Refrigeration"
              width={200}
              height={67}
              className="h-12 w-auto mb-4"
            />
            <p className="text-sm leading-relaxed mb-4">
              Licensed &amp; insured HVAC and commercial refrigeration service
              proudly serving Tallahassee, Quincy, Florida and the surrounding areas.
            </p>
            <a
              href="tel:9105466485"
              className="inline-flex items-center gap-2 text-white font-semibold text-sm hover:text-[var(--ember)] transition-colors"
            >
              <PhoneIcon className="w-4 h-4" />
              (910) 546-6485
            </a>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Our Services
            </h4>
            <ul className="space-y-2.5">
              {serviceLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Hours of Operation
            </h4>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between">
                <span>Monday – Friday</span>
                <span className="text-white">7:00 AM – 6:00 PM</span>
              </li>
              <li className="flex justify-between">
                <span>Saturday</span>
                <span className="text-white">8:00 AM – 2:00 PM</span>
              </li>
              <li className="flex justify-between">
                <span>Sunday</span>
                <span>Closed</span>
              </li>
              <li className="mt-3 pt-3 border-t border-white/10 text-xs">
                Emergency service available 24/7 for priority members
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-white/30">
            &copy; {new Date().getFullYear()} Harden HVAC &amp; Refrigeration. All rights reserved.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <p className="text-xs text-white/30">
              Tallahassee &amp; Quincy, FL &amp; Surrounding Areas
            </p>
            <a
              href="https://bizfloo.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              Built by <span className="font-semibold">Bizfloo</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
