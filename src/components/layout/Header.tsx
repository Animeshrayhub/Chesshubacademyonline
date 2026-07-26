'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/utils/cn';
import { NAV_LINKS } from '@/constants/NAVIGATION';
import MobileMenu from './MobileMenu';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-40 transition-all duration-300 border-b border-transparent',
          scrolled
            ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-border'
            : 'bg-transparent'
        )}
        role="banner"
      >
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg"
              aria-label="ChessHub Academy — Home"
            >
              <Image
                src="/logo/logo.jpg"
                alt="ChessHub Academy Logo"
                width={120}
                height={48}
                priority
                className="h-10 lg:h-12 w-auto bg-white p-0.5 rounded-lg object-contain shadow-sm border border-border/10 transition-transform duration-300 hover:scale-105"
              />
            </Link>

            {/* Desktop Navigation */}
            <nav
              className="hidden lg:flex items-center gap-1"
              aria-label="Main navigation"
            >
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                    isActive(link.href)
                      ? scrolled
                        ? 'text-primary bg-primary/5'
                        : 'text-accent bg-white/10'
                      : scrolled
                      ? 'text-text-secondary hover:text-text-primary hover:bg-surface-light'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Desktop CTA */}
            <div className="hidden lg:flex items-center gap-3">
              <Link
                href="/login"
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  scrolled
                    ? 'text-text-secondary hover:text-text-primary hover:bg-surface-light'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                )}
              >
                Login
              </Link>
              <Link
                href="/book-demo"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover text-surface-dark text-sm font-semibold rounded-xl transition-all duration-200 shadow-gold hover:shadow-none"
              >
                Book Free Demo
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              className={cn(
                'lg:hidden p-2 rounded-lg transition-colors duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                scrolled
                  ? 'text-text-primary hover:bg-surface-light'
                  : 'text-white hover:bg-white/10'
              )}
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <MobileMenu
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        links={NAV_LINKS}
        isActive={isActive}
      />
    </>
  );
}
