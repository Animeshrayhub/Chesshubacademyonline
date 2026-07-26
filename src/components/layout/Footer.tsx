import Image from 'next/image';
import Link from 'next/link';
import Container from '@/components/ui/Container';
import NewsletterForm from '@/components/ui/NewsletterForm';
import {
  FOOTER_QUICK_LINKS,
  FOOTER_PROGRAM_LINKS,
  FOOTER_LEGAL_LINKS,
} from '@/constants/NAVIGATION';
import { SITE_NAME, SITE_EMAIL, SITE_PHONE, SITE_SOCIAL } from '@/constants/SITE';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-surface-dark text-white" aria-label="Site footer">
      {/* Main Footer Content */}
      <div className="border-b border-white/10">
        <Container className="py-16 lg:py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
            {/* Brand Column */}
            <div className="lg:col-span-1">
              <Link href="/" className="inline-flex items-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg" aria-label="ChessHub Academy home">
                <Image
                  src="/logo/logo.jpg"
                  alt="ChessHub Academy Logo"
                  width={120}
                  height={48}
                  className="h-10 lg:h-12 w-auto bg-white p-0.5 rounded-lg object-contain shadow-sm border border-border/10 transition-transform duration-300 hover:scale-105"
                />
              </Link>
              <p className="text-white/60 text-sm leading-relaxed mb-6 max-w-xs">
                Premium online chess coaching for students worldwide. Learn from FIDE-rated grandmasters and international masters.
              </p>
              {/* Social Links */}
              <div className="flex items-center gap-3">
                {[
                  {
                    href: SITE_SOCIAL.twitter,
                    label: 'Twitter',
                    icon: (
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    ),
                  },
                  {
                    href: SITE_SOCIAL.instagram,
                    label: 'Instagram',
                    icon: (
                      <>
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                      </>
                    ),
                    stroke: true,
                  },
                  {
                    href: SITE_SOCIAL.youtube,
                    label: 'YouTube',
                    icon: (
                      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
                    ),
                  },
                  {
                    href: SITE_SOCIAL.linkedin,
                    label: 'LinkedIn',
                    icon: (
                      <>
                        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                        <rect x="2" y="9" width="4" height="12" />
                        <circle cx="4" cy="4" r="2" />
                      </>
                    ),
                    stroke: true,
                  },
                ].map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Visit our ${social.label} page`}
                    className="w-9 h-9 rounded-lg bg-white/10 hover:bg-accent hover:text-surface-dark flex items-center justify-center transition-all duration-200 text-white/70 hover:text-surface-dark"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill={social.stroke ? 'none' : 'currentColor'}
                      stroke={social.stroke ? 'currentColor' : 'none'}
                      strokeWidth={social.stroke ? '2' : '0'}
                      aria-hidden="true"
                    >
                      {social.icon}
                    </svg>
                  </a>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-sm font-semibold tracking-widest uppercase text-accent mb-5">
                Quick Links
              </h3>
              <ul className="space-y-3">
                {FOOTER_QUICK_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-white/60 hover:text-white text-sm transition-colors duration-200 hover:translate-x-1 inline-flex items-center gap-1.5 group"
                    >
                      <span className="w-1 h-1 rounded-full bg-accent/50 group-hover:bg-accent transition-colors" aria-hidden="true" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Programs */}
            <div>
              <h3 className="text-sm font-semibold tracking-widest uppercase text-accent mb-5">
                Programs
              </h3>
              <ul className="space-y-3">
                {FOOTER_PROGRAM_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-white/60 hover:text-white text-sm transition-colors duration-200 inline-flex items-center gap-1.5 group"
                    >
                      <span className="w-1 h-1 rounded-full bg-accent/50 group-hover:bg-accent transition-colors" aria-hidden="true" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact + Newsletter */}
            <div>
              <h3 className="text-sm font-semibold tracking-widest uppercase text-accent mb-5">
                Get In Touch
              </h3>
              <ul className="space-y-3 mb-8">
                <li>
                  <a
                    href={`mailto:${SITE_EMAIL}`}
                    className="text-white/60 hover:text-white text-sm transition-colors flex items-center gap-2"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    {SITE_EMAIL}
                  </a>
                </li>
                <li>
                  <a
                    href={`tel:${SITE_PHONE}`}
                    className="text-white/60 hover:text-white text-sm transition-colors flex items-center gap-2"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    {SITE_PHONE}
                  </a>
                </li>
                <li className="text-white/60 text-sm flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                  Available Worldwide — Online
                </li>
              </ul>

              {/* Newsletter */}
              <div>
                <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
                  Newsletter
                </p>
                <NewsletterForm dark />
              </div>
            </div>
          </div>
        </Container>
      </div>

      {/* Bottom Bar */}
      <Container className="py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/40">
          <p>
            © {currentYear} {SITE_NAME}. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {FOOTER_LEGAL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-white transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </Container>
    </footer>
  );
}
