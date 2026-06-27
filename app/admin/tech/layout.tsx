import TechBottomNav from '@/components/tech/TechBottomNav';
import { ToastProvider } from '@/components/ui/ToastProvider';
import Image from 'next/image';

export default function TechLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f0f5fb] pb-[calc(3.5rem+env(safe-area-inset-bottom))] overflow-x-hidden">
      {/* Branded Top Header */}
      <header className="bg-gradient-to-r from-[#0a1f3f] to-[#122e5c] pt-[env(safe-area-inset-top)] sticky top-0 z-40 shadow-md">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Image
            src="/logo-transparent.png"
            alt="Harden HVAC & Refrigeration"
            width={140}
            height={40}
            className="h-8 w-auto"
            priority
          />
          <span className="text-[10px] font-semibold text-[#e55b2b] uppercase tracking-widest">Tech Portal</span>
        </div>
      </header>
      <div className="max-w-2xl mx-auto px-4 overflow-x-hidden w-full box-border">
        <div className="w-full overflow-x-hidden">
          <ToastProvider>
            {children}
          </ToastProvider>
        </div>
      </div>
      <TechBottomNav />
    </div>
  );
}
