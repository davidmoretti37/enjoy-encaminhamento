import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { APP_LOGO } from "@/const";
import { Menu, X, LogIn } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const navLinks = [
  { label: "HOME", href: "/" },
  { label: "EMPRESAS", href: "/empresas" },
  { label: "ASSESSORIA", href: "/assessoria" },
  { label: "JOVEM APRENDIZ", href: "/jovem-aprendiz" },
  { label: "ESTÁGIO", href: "/estagio" },
  { label: "CLT", href: "/clt" },
  { label: "VAGAS", href: "/vagas", highlighted: true },
];

export default function LandingHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
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
          <div className="relative flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0 relative z-10">
              <img
                src={APP_LOGO}
                alt="ANEC"
                className="h-10 md:h-12 w-auto"
              />
              <span className="text-lg md:text-xl font-bold text-[#0A2342]">
                ANEC
              </span>
            </Link>

            {/* Desktop Navigation — absolutely centered */}
            <nav className="hidden lg:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-xs font-semibold px-3 py-2 rounded-full transition-all ${
                    link.highlighted
                      ? "bg-[#FF6B35] text-white hover:bg-[#FF6B35]/90"
                      : isActive(link.href)
                        ? "text-[#FF6B35] bg-[#FF6B35]/10"
                        : "text-slate-600 hover:text-[#0A2342] hover:bg-slate-100"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>


            {/* Desktop Login Button */}
            <Link
              href="/login"
              className="hidden lg:inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full border border-[#0A2342] text-[#0A2342] hover:bg-[#0A2342] hover:text-white transition-all"
            >
              <LogIn className="h-3.5 w-3.5" />
              ENTRAR
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
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
            className="fixed inset-0 bg-black/20 z-40 lg:hidden"
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
            className="fixed top-0 right-0 bottom-0 w-72 bg-white z-50 shadow-xl lg:hidden"
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
              <nav className="flex-1 p-4 overflow-y-auto">
                <div className="space-y-1">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`block w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                        link.highlighted
                          ? "bg-[#FF6B35] text-white"
                          : isActive(link.href)
                            ? "text-[#FF6B35] bg-[#FF6B35]/10"
                            : "text-slate-600 hover:bg-slate-100 hover:text-[#0A2342]"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </nav>

              {/* Mobile Login Button */}
              <div className="p-4 border-t">
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg font-semibold border border-[#0A2342] text-[#0A2342] hover:bg-[#0A2342] hover:text-white transition-all"
                >
                  <LogIn className="h-4 w-4" />
                  Entrar
                </Link>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
