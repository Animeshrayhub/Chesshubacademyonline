/**
 * ChessHub Academy - Canonical Coaching Package & Pricing Registry
 *
 * CRITICAL FINANCIAL INTEGRITY RULES:
 * 1. All amounts are stored as exact integer INR values (₹7,200, ₹13,800, ₹26,400).
 * 2. Never allow client-side tampering of package prices or session counts.
 * 3. Server-side payment endpoints must perform authoritative lookups against COACHING_PACKAGES.
 */

export type PackageId = 'starter' | 'standard' | 'premium';
export type CurrencyCode = 'INR' | 'USD';

export interface CoachingPackage {
  id: PackageId;
  name: string;
  sessions: number;
  amount: number; // Stored in exact integer INR (e.g. 7200 for ₹7,200)
  amountUsd: number; // Stored in exact integer USD (e.g. 99 for $99)
  currency: 'INR';
  description: string;
  features: string[];
  featured?: boolean;
  badge?: string;
}

export const COACHING_PACKAGES: Record<PackageId, CoachingPackage> = {
  starter: {
    id: 'starter',
    name: 'Starter Package',
    sessions: 12,
    amount: 7200,
    amountUsd: 99,
    currency: 'INR',
    description: 'Perfect for beginners building solid foundational skills and early tactical awareness.',
    features: [
      '12 live interactive coaching sessions',
      'Personalized chess development roadmap',
      'Dedicated homework & tactical puzzle sets',
      'Session recordings and study material access',
      'Weekly progress tracking and feedback',
    ],
    featured: false,
  },
  standard: {
    id: 'standard',
    name: 'Standard Package',
    sessions: 24,
    amount: 13800,
    amountUsd: 189,
    currency: 'INR',
    description: 'Ideal for intermediate players seeking tournament preparation, opening depth, and deep strategic calculation.',
    features: [
      '24 live interactive coaching sessions',
      'Comprehensive opening repertoire building',
      'Deep positional analysis & endgame masterclasses',
      'FIDE-rated coach guidance and game reviews',
      'Priority scheduling & parent review sessions',
    ],
    featured: true,
    badge: 'Most Popular',
  },
  premium: {
    id: 'premium',
    name: 'Premium Package',
    sessions: 48,
    amount: 26400,
    amountUsd: 349,
    currency: 'INR',
    description: 'Intensive mastery program designed for ambitious competitors targeting high ratings and title norms.',
    features: [
      '48 live interactive coaching sessions',
      'Full tournament preparation and opponent scouting',
      'Advanced calculation and dynamic tactical drills',
      'Personalized mentor support between sessions',
      'Unlimited access to practice bots and curated study archives',
    ],
    featured: false,
    badge: 'Best Value',
  },
};

/**
 * Array format for rendering pricing grids (e.g. programs page, checkout modals)
 */
export const COACHING_PACKAGES_LIST: CoachingPackage[] = [
  COACHING_PACKAGES.starter,
  COACHING_PACKAGES.standard,
  COACHING_PACKAGES.premium,
];

/**
 * Type guard to validate whether an arbitrary string is an authorized package ID
 */
export function isValidPackageId(id: string): id is PackageId {
  return id === 'starter' || id === 'standard' || id === 'premium';
}

/**
 * Retrieve package details by ID with authoritative fallback
 */
export function getPackageById(id: string): CoachingPackage | null {
  if (isValidPackageId(id)) {
    return COACHING_PACKAGES[id];
  }
  return null;
}

/**
 * Format package price according to selected currency
 */
export function formatPackagePrice(pkg: CoachingPackage, currency: CurrencyCode = 'INR'): string {
  if (currency === 'USD') {
    return `$${pkg.amountUsd.toLocaleString('en-US')}`;
  }
  return `₹${pkg.amount.toLocaleString('en-IN')}`;
}

/**
 * Get numerical price for package in selected currency
 */
export function getPackagePriceByCurrency(pkg: CoachingPackage, currency: CurrencyCode = 'INR'): number {
  return currency === 'USD' ? pkg.amountUsd : pkg.amount;
}
