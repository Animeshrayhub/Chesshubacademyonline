import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { SITE_URL, SITE_NAME } from '@/constants/SITE';

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: `Read the official Terms and Conditions for ${SITE_NAME}.`,
  alternates: {
    canonical: `${SITE_URL}/terms-and-conditions`,
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function TermsRedirectPage() {
  redirect('/terms-and-conditions');
}
