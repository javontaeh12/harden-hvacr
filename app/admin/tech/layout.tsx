import TechBottomNav from '@/components/tech/TechBottomNav';

export default function TechLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="max-w-lg mx-auto px-4">
        {children}
      </div>
      <TechBottomNav />
    </div>
  );
}
