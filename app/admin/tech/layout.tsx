import TechBottomNav from '@/components/tech/TechBottomNav';
import Image from 'next/image';

export default function TechLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-[calc(3.5rem+env(safe-area-inset-bottom))]">
      {/* Branded Top Header */}
      <header className="bg-navy pt-[env(safe-area-inset-top)] sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Image
            src="/logo-transparent.png"
            alt="Harden HVAC & Refrigeration"
            width={140}
            height={40}
            className="h-8 w-auto"
            priority
          />
          <span className="text-[10px] font-semibold text-ember uppercase tracking-widest">Tech Portal</span>
        </div>
      </header>
      <div className="max-w-2xl mx-auto px-4">
        {children}
      </div>
      <TechBottomNav />
    </div>
  );
}
