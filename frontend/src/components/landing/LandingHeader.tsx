import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { APP_LOGO } from "@/const";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const navLinks = [
  { label: "Como Funciona", href: "#como-funciona" },
  { label: "Planos", href: "#planos" },
  { label: "Depoimentos", href: "#depoimentos" },
];

interface LandingHeaderProps {
  hasSelectedPersona?: boolean;
}

export default function LandingHeader({ hasSelectedPersona = false }: LandingHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (href: string) => {
    if (!hasSelectedPersona) return;
    setIsMobileMenuOpen(false);
    if (href.startsWith("#")) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200/50"
            : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <img
                src={APP_LOGO}
                alt="ANEC RG"
                className="h-10 md:h-12 w-auto"
              />
              <span
                className={`text-lg md:text-xl font-bold transition-colors ${
                  isScrolled ? "text-[#0A2342]" : "text-[#0A2342]"
                }`}
              >
                ANEC RG
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollToSection(link.href)}
                  disabled={!hasSelectedPersona}
                  className={`text-sm font-medium transition-colors ${
                    hasSelectedPersona
                      ? "text-slate-600 hover:text-[#FF6B35] cursor-pointer"
                      : "text-slate-300 cursor-not-allowed"
                  }`}
                  title={!hasSelectedPersona ? "Selecione Empresa ou Candidato primeiro" : undefined}
                >
                  {link.label}
                </button>
              ))}
            </nav>

            {/* Desktop CTAs */}
            <div className="hidden md:flex items-center gap-4">
              <Link
                href="/login"
                className={`text-sm font-medium transition-colors hover:text-[#FF6B35] ${
                  isScrolled ? "text-slate-600" : "text-slate-600"
                }`}
              >
                Entrar
              </Link>
              <Link href="/login?tab=signup">
                <Button
                  size="sm"
                  className="bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white px-6"
                >
                  Cadastrar
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6 text-slate-600" />
              ) : (
                <Menu className="h-6 w-6 text-slate-600" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-72 bg-white z-50 shadow-xl md:hidden"
          >
            <div className="flex flex-col h-full">
              {/* Mobile Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <span className="text-lg font-bold text-[#0A2342]">Menu</span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-slate-100"
                >
                  <X className="h-5 w-5 text-slate-600" />
                </button>
              </div>

              {/* Mobile Nav Links */}
              <nav className="flex-1 p-4">
                <div className="space-y-2">
                  {navLinks.map((link) => (
                    <button
                      key={link.href}
                      onClick={() => scrollToSection(link.href)}
                      disabled={!hasSelectedPersona}
                      className={`block w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                        hasSelectedPersona
                          ? "text-slate-600 hover:bg-slate-100 hover:text-[#FF6B35]"
                          : "text-slate-300 cursor-not-allowed"
                      }`}
                    >
                      {link.label}
                      {!hasSelectedPersona && (
                        <span className="block text-xs text-slate-400 mt-1">
                          Selecione uma opção primeiro
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </nav>

              {/* Mobile CTAs */}
              <div className="p-4 border-t space-y-3">
                <Link
                  href="/login"
                  className="block w-full text-center py-3 rounded-lg border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                >
                  Entrar
                </Link>
                <Link href="/login?tab=signup">
                  <Button className="w-full bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white">
                    Cadastrar Grátis
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
