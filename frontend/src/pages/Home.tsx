import PublicLayout from "@/components/landing/PublicLayout";
import HeroSection from "@/components/landing/HeroSection";
import WhoWeHelpSection from "@/components/landing/WhoWeHelpSection";
import ServicesOverviewSection from "@/components/landing/ServicesOverviewSection";
import TrustBadgesSection from "@/components/landing/TrustBadgesSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import CredibilitySection from "@/components/landing/CredibilitySection";
import FAQSection from "@/components/landing/FAQSection";

export default function Home() {
  return (
    <PublicLayout>
      <HeroSection />
      <WhoWeHelpSection />
      <ServicesOverviewSection />
      <TrustBadgesSection />
      <TestimonialsSection />
      <CredibilitySection />
      <FAQSection />
    </PublicLayout>
  );
}
