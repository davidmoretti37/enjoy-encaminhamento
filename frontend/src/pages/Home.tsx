import { useState, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { AnimatePresence } from "motion/react";
import LandingHeader from "@/components/landing/LandingHeader";
import HeroSection from "@/components/landing/HeroSection";
import CompanyContent from "@/components/landing/CompanyContent";
import CandidateContent from "@/components/landing/CandidateContent";
import LandingFooter from "@/components/landing/LandingFooter";

type PersonaType = "none" | "company" | "candidate";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [selectedPersona, setSelectedPersona] = useState<PersonaType>("none");
  const contentRef = useRef<HTMLDivElement>(null);

  const handlePersonaSelect = (persona: "company" | "candidate") => {
    setSelectedPersona(persona);
    // Smooth scroll to content section after a brief delay for animation
    setTimeout(() => {
      contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  };

  // If user is already authenticated, redirect logic could go here
  // For now, we still show the landing page but could add a dashboard link

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Header */}
      <LandingHeader hasSelectedPersona={selectedPersona !== "none"} />

      {/* Hero Section with Persona Selection */}
      <HeroSection
        selectedPersona={selectedPersona}
        onPersonaSelect={handlePersonaSelect}
      />

      {/* Content Section - Shows based on selection */}
      <div ref={contentRef}>
        <AnimatePresence mode="wait">
          {selectedPersona === "company" && (
            <CompanyContent key="company" />
          )}
          {selectedPersona === "candidate" && (
            <CandidateContent key="candidate" />
          )}
        </AnimatePresence>
      </div>

      {/* Footer - Always visible */}
      <LandingFooter />
    </div>
  );
}
