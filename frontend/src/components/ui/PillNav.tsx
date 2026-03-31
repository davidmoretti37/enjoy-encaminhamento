// Type checking disabled: GSAP Tween type mismatch with callback
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { gsap } from 'gsap';
import { LayoutGrid, User, LogOut, Settings, LucideIcon } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import './PillNav.css';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface PillNavProps {
  items: NavItem[];
  homeHref: string;
  activeHref?: string;
  className?: string;
  containerClassName?: string;
  profileHref?: string;
  user?: {
    name?: string;
    email?: string;
  };
  onLogout?: () => void;
}

const PillNav = ({
  items,
  homeHref,
  activeHref,
  className = '',
  containerClassName = '',
  profileHref = '/settings',
  user,
  onLogout,
}: PillNavProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const ease = 'power3.easeOut';

  const currentActiveHref = activeHref ?? location;

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const toggleMobileMenu = () => {
    const newState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newState);

    const hamburger = hamburgerRef.current;
    const menu = mobileMenuRef.current;

    if (hamburger) {
      const lines = hamburger.querySelectorAll('.hamburger-line');
      if (newState) {
        gsap.to(lines[0], { rotation: 45, y: 3, duration: 0.3, ease });
        gsap.to(lines[1], { rotation: -45, y: -3, duration: 0.3, ease });
      } else {
        gsap.to(lines[0], { rotation: 0, y: 0, duration: 0.3, ease });
        gsap.to(lines[1], { rotation: 0, y: 0, duration: 0.3, ease });
      }
    }

    if (menu) {
      if (newState) {
        gsap.set(menu, { visibility: 'visible' });
        gsap.fromTo(
          menu,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.3, ease }
        );
      } else {
        gsap.to(menu, {
          opacity: 0,
          y: 10,
          duration: 0.2,
          ease,
          onComplete: (() => gsap.set(menu, { visibility: 'hidden' })) as any
        });
      }
    }
  };

  return (
    <div className={`pill-nav-container ${containerClassName} ${className}`}>
      {/* Desktop Navigation - Single Pill */}
      <nav className="pill-nav desktop-only">
        {/* Home Button */}
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <Link
              href={homeHref}
              className={`pill-btn ${currentActiveHref === homeHref ? 'is-active' : ''}`}
            >
              <LayoutGrid className="h-5 w-5" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={8} className="z-[200]">
            <p>Home</p>
          </TooltipContent>
        </Tooltip>

        {/* Separator */}
        <div className="pill-separator" />

        {/* Nav Items */}
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentActiveHref === item.href;
          return (
            <Tooltip key={item.href} delayDuration={100}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  className={`pill-btn ${isActive ? 'is-active' : ''}`}
                >
                  <Icon className="h-5 w-5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8} className="z-[200]">
                <p>{item.label}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}

        {/* Separator */}
        <div className="pill-separator" />

        {/* Profile Button */}
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <Link href={profileHref} className={`pill-btn profile-btn ${currentActiveHref === profileHref ? 'is-active' : ''}`}>
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs bg-slate-300 text-slate-700">
                  {user?.name?.charAt(0).toUpperCase() || <User className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={8} className="z-[200]">
            <p>Configurações</p>
          </TooltipContent>
        </Tooltip>
      </nav>

      {/* Mobile Navigation */}
      <div className="pill-nav-mobile mobile-only">
        <Link href={homeHref} className="pill-btn-mobile">
          <LayoutGrid className="h-5 w-5" />
        </Link>

        <button
          className="pill-btn-mobile hamburger-btn"
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
          ref={hamburgerRef}
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>
      </div>

      {/* Mobile Menu Popover */}
      <div className="mobile-menu-popover mobile-only" ref={mobileMenuRef}>
        <ul className="mobile-menu-list">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`mobile-menu-link ${currentActiveHref === item.href ? 'is-active' : ''}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li>
            <Link
              href="/settings"
              className={`mobile-menu-link ${currentActiveHref === '/settings' ? 'is-active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Settings className="h-5 w-5 mr-3" />
              Configuracoes
            </Link>
          </li>
          <li>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onLogout?.();
              }}
              className="mobile-menu-link text-destructive w-full text-left"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Sair
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default PillNav;
