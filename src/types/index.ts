// ─── Navigation ──────────────────────────────────────────────────────────────

export interface NavLink {
  label: string;
  href: string;
}

// ─── Programs ─────────────────────────────────────────────────────────────────

export interface Program {
  id: string;
  title: string;
  subtitle: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Tournament';
  ageRange: string;
  duration: string;
  sessionsPerWeek: number;
  sessionDuration: string;
  price: string;
  features: string[];
  description: string;
  color: string;
  featured: boolean;
}

// ─── Coaches ─────────────────────────────────────────────────────────────────

export interface Coach {
  id: string;
  name: string;
  title: string;
  fideRating?: number;
  specialization: string;
  experience: string;
  students: number;
  imageUrl: string;
  bio: string;
  achievements: string[];
  country: string;
  flag: string;
  fideId?: string;
  languages?: string[];
  coachingMode?: string;
}



// ─── Testimonials ─────────────────────────────────────────────────────────────

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  childAge?: number;
  location: string;
  rating: number;
  quote: string;
  imageUrl: string;
  result?: string;
}

// ─── Blog Posts ───────────────────────────────────────────────────────────────

export type BlogCategory =
  | 'Chess Tips'
  | 'Tournament Prep'
  | 'Student Stories'
  | 'Academy News'
  | 'Parent Guide'
  | 'Chess Strategy';

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: BlogCategory;
  author: string;
  authorTitle: string;
  authorImageUrl: string;
  imageUrl: string;
  publishedAt: string;
  featured: boolean;
  readingTimeMinutes: number;
  tags: string[];
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

// ─── Statistics ───────────────────────────────────────────────────────────────

export interface Stat {
  id: string;
  value: number;
  suffix: string;
  label: string;
  description: string;
}

// ─── Success Stories ──────────────────────────────────────────────────────────

export interface SuccessStory {
  id: string;
  studentName: string;
  age: number;
  country: string;
  imageUrl: string;
  story: string;
  achievement: string;
  ratingImprovement?: string;
  tournament?: string;
  duration: string;
}

// ─── Learning Step ────────────────────────────────────────────────────────────

export interface LearningStep {
  step: number;
  title: string;
  description: string;
  icon: string;
}

// ─── Trust Item ───────────────────────────────────────────────────────────────

export interface TrustItem {
  label: string;
  value: string;
  icon: string;
}

// ─── SEO / Metadata ───────────────────────────────────────────────────────────

export interface PageSEO {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
}

// ─── Contact Form ─────────────────────────────────────────────────────────────

export interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

// ─── Book Demo Form ───────────────────────────────────────────────────────────

export interface BookDemoFormData {
  parentName: string;
  email: string;
  phone: string;
  childName: string;
  childAge: string;
  experience: string;
  preferredTime: string;
  referralSource: string;
  message: string;
}

// ─── Program Card Variant ─────────────────────────────────────────────────────

export type ProgramCardVariant = 'featured' | 'standard';

// ─── Button Variant ───────────────────────────────────────────────────────────

export type ButtonVariant = 'primary' | 'secondary' | 'gold' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';
