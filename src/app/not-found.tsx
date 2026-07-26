import Link from 'next/link';
import type { Metadata } from 'next';
import Container from '@/components/ui/Container';

export const metadata: Metadata = {
  title: '404 — Page Not Found',
  description: 'The page you are looking for could not be found. Return to ChessHub Academy.',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <section
      className="min-h-screen flex items-center bg-surface-light pt-20"
      aria-label="Page not found"
    >
      <Container>
        <div className="max-w-2xl mx-auto text-center py-20">
          {/* Chess King SVG */}
          <div className="flex items-center justify-center mb-8">
            <div className="w-32 h-32 rounded-3xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
              <svg
                width="72"
                height="72"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M12 2C11.45 2 11 2.45 11 3V4H9.5C9.22 4 9 4.22 9 4.5V6H7L8.5 9H7L9 13H8C8 13 7 14 7 15H17C17 14 16 13 16 13H15L17 9H15.5L17 6H15V4.5C15 4.22 14.78 4 14.5 4H13V3C13 2.45 12.55 2 12 2Z"
                  fill="#D4AF37"
                />
                <rect x="6" y="16" width="12" height="2" rx="1" fill="#1E40AF" />
                <rect x="5" y="19" width="14" height="2" rx="1" fill="#1E40AF" />
              </svg>
            </div>
          </div>

          {/* 404 number */}
          <div
            className="font-heading text-8xl lg:text-9xl font-bold text-gradient-gold mb-4"
            aria-hidden="true"
          >
            404
          </div>

          <h1 className="font-heading text-3xl lg:text-4xl font-bold text-text-primary mb-4">
            Page Not Found
          </h1>
          <p className="text-text-secondary text-lg max-w-md mx-auto mb-10 leading-relaxed">
            It looks like this page has been moved or doesn&apos;t exist. Let&apos;s get you back
            to the right square.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-all duration-200 shadow-blue"
            >
              Back to Home
            </Link>
            <Link
              href="/book-demo"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-accent hover:bg-accent-hover text-surface-dark font-bold rounded-xl transition-all duration-200 shadow-gold"
            >
              Book Free Demo
            </Link>
          </div>

          {/* Quick links */}
          <div className="border-t border-border pt-10">
            <p className="text-text-secondary text-sm mb-6">Or explore these popular pages:</p>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { href: '/programs', label: 'Programs' },
                { href: '/about', label: 'About' },
                { href: '/blog', label: 'Blog' },
                { href: '/faq', label: 'FAQ' },
                { href: '/contact', label: 'Contact' },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-5 py-2.5 rounded-full border border-border text-text-secondary text-sm hover:border-primary hover:text-primary transition-all duration-200"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
