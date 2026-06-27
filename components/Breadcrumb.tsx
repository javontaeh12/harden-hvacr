import Link from 'next/link';

interface BreadcrumbProps {
  current: string;
}

export default function Breadcrumb({ current }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-[var(--steel)]">
      <Link href="/" className="hover:text-[var(--navy)] transition-colors">
        Home
      </Link>
      <span className="text-[var(--border)]">/</span>
      <Link href="/#services" className="hover:text-[var(--navy)] transition-colors">
        Services
      </Link>
      <span className="text-[var(--border)]">/</span>
      <span className="text-[var(--navy)] font-medium">{current}</span>
    </nav>
  );
}
