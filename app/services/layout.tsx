import Navbar from '@/components/Navbar';
import FooterSection from '@/components/FooterSection';

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
      <FooterSection />
    </>
  );
}
