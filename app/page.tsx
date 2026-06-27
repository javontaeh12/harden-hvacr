import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import PromoBanner from '../components/PromoBanner';
import BookingSection from '../components/BookingSection';
import WhyChooseUs from '../components/WhyChooseUs';
import HowItWorksSection from '../components/HowItWorksSection';
import MembershipSection from '../components/MembershipSection';
import TestimonialsSection from '../components/TestimonialsSection';
import FooterSection from '../components/FooterSection';
export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <PromoBanner />
        <HowItWorksSection />
        <BookingSection />
        <MembershipSection />
        <WhyChooseUs />
        <TestimonialsSection />
      </main>
      <FooterSection />
    </>
  );
}
