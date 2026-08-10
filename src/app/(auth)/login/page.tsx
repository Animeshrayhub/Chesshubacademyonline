import type { Metadata } from 'next';
import LoginContent from '@/features/auth/LoginContent';
import { SITE_URL } from '@/constants/SITE';

export const metadata: Metadata = {
  title: 'Sign In | ChessHub Academy',
  description:
    'Sign in to your ChessHub Academy account to access your dashboard, lessons, homework, and live chess coaching sessions.',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  alternates: {
    canonical: `${SITE_URL}/login`,
  },
  openGraph: {
    title: 'Sign In | ChessHub Academy',
    description: 'Access your ChessHub Academy member dashboard.',
    url: `${SITE_URL}/login`,
  },
};

export default function LoginPage() {
  return <LoginContent />;
}
