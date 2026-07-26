// Auth route group layout
// - No Header, no Footer — completely isolated from the public site layout
// - Full-screen flex container
// - Server Component (no 'use client' needed)

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-light">
      {/* Skip to main content for keyboard users */}
      <a
        href="#main-content"
        className="
          sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50
          focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg
          focus:text-sm focus:font-semibold focus:shadow-lg
          focus:outline-none
        "
      >
        Skip to main content
      </a>
      {children}
    </div>
  );
}
