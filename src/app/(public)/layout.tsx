// Public site layout — wraps all marketing pages with Header and Footer.
// Dashboard and auth pages are in separate route groups and do NOT inherit this.

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import FrontPageChatbot from '@/components/landing/FrontPageChatbot';
import LiveActivityTicker from '@/components/landing/LiveActivityTicker';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-[100] bg-accent text-surface-dark px-4 py-2 rounded-lg font-semibold text-sm"
      >
        Skip to main content
      </a>
      <Header />
      <main id="main-content">{children}</main>
      <Footer />
      <LiveActivityTicker />
      <FrontPageChatbot />
    </>
  );
}


