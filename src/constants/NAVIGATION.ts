import type { NavLink } from '@/types';

export const NAV_LINKS: NavLink[] = [
  { label: 'Home', href: '/' },
  { label: 'Programs', href: '/programs' },
  { label: 'About', href: '/about' },
  { label: 'Blog', href: '/blog' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Contact', href: '/contact' },
];

export const FOOTER_QUICK_LINKS: NavLink[] = [
  { label: 'Home', href: '/' },
  { label: 'Programs', href: '/programs' },
  { label: 'About Us', href: '/about' },
  { label: 'Blog', href: '/blog' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Contact', href: '/contact' },
];

export const FOOTER_PROGRAM_LINKS: NavLink[] = [
  { label: 'Beginner Program', href: '/programs#beginner' },
  { label: 'Intermediate Program', href: '/programs#intermediate' },
  { label: 'Advanced Program', href: '/programs#advanced' },
  { label: 'Tournament Prep', href: '/programs#tournament' },
  { label: 'Book Free Demo', href: '/book-demo' },
];

export const FOOTER_LEGAL_LINKS: NavLink[] = [
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Terms & Conditions', href: '/terms-and-conditions' },
];
