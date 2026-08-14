import type { Metadata } from 'next';
import Container from '@/components/ui/Container';
import JsonLd from '@/components/seo/JsonLd';
import NewsletterForm from '@/components/ui/NewsletterForm';
import { getPublicBlogPosts } from '@/lib/blog/service';
import { SITE_URL, SITE_OG_IMAGE } from '@/constants/SITE';
import BlogClientView from './BlogClientView';
import type { BlogPost } from '@/types';

export const metadata: Metadata = {
  title: 'Chess Insights, Opening Traps & Grandmaster Coaching Blog — ChessHub Academy',
  description:
    'Explore high-impact chess opening traps, grandmaster training techniques, parent tournament guides, and student success stories at ChessHub Academy.',
  keywords: [
    'chess opening traps',
    'grandmaster chess blog',
    'chess coaching for kids',
    'fide rating guide',
    'scholars mate refutation',
    'fried liver defense',
    'chesshub academy blog',
  ],
  alternates: { canonical: `${SITE_URL}/blog` },
  openGraph: {
    title: 'Chess Insights & Grandmaster Knowledge — ChessHub Academy Blog',
    description: 'Master proven chess opening traps, calculation blueprints, and FIDE tournament strategies.',
    url: `${SITE_URL}/blog`,
    type: 'website',
    images: [{ url: SITE_OG_IMAGE, width: 1200, height: 630, alt: 'ChessHub Academy Blog' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chess Insights & Grandmaster Knowledge — ChessHub Academy Blog',
    description: 'Master proven chess opening traps, calculation blueprints, and FIDE tournament strategies.',
    images: [SITE_OG_IMAGE],
  },
};

export default async function BlogPage() {
  const posts: BlogPost[] = await getPublicBlogPosts();

  const blogSchema = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'ChessHub Academy Official Blog',
    url: `${SITE_URL}/blog`,
    description: 'Grandmaster tactics, opening traps, parent guides, and chess coaching insights.',
    publisher: {
      '@type': 'EducationalOrganization',
      name: 'ChessHub Academy',
      url: SITE_URL,
      logo: `${SITE_URL}/logo/logo.jpg`,
    },
    blogPost: posts.map((post) => ({
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.excerpt,
      url: `${SITE_URL}/blog/${post.slug}`,
      datePublished: post.publishedAt,
      author: {
        '@type': 'Person',
        name: post.author,
      },
      image: post.imageUrl,
    })),
  };

  return (
    <>
      <JsonLd data={blogSchema} />

      {/* Hero */}
      <section
        className="pt-32 pb-16 bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-white overflow-hidden relative"
        aria-label="Blog header"
      >
        <div className="absolute inset-0 chess-bg opacity-30" aria-hidden="true" />
        <Container className="relative z-10 text-center">
          <span className="inline-block mb-3 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-purple-900/60 text-purple-300 border border-purple-500/30 backdrop-blur-md">
            🏆 Official Grandmaster Insights
          </span>
          <h1 className="font-heading text-4xl lg:text-6xl font-extrabold text-white mb-4 tracking-tight">
            Chess Insights &{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-200">
              Expert Knowledge
            </span>
          </h1>
          <p className="text-slate-300 text-base lg:text-xl max-w-3xl mx-auto font-medium leading-relaxed">
            Proven opening traps, cognitive development research, FIDE rating guides, and tactical blueprints written by FIDE Grandmasters.
          </p>
        </Container>
      </section>

      {/* Interactive Blog List & Filtering */}
      <section className="py-16 bg-slate-50 min-h-[600px]" aria-label="Blog posts">
        <Container>
          <BlogClientView initialPosts={posts} />
        </Container>
      </section>

      {/* Newsletter */}
      <section
        className="py-20 bg-gradient-to-br from-purple-950 via-slate-900 to-slate-950 text-white relative overflow-hidden"
        aria-label="Newsletter subscription"
      >
        <Container className="relative z-10 text-center">
          <div className="max-w-2xl mx-auto space-y-4">
            <span className="text-xs font-black uppercase tracking-widest text-amber-400">
              ⚡ Weekly Masterclass Newsletter
            </span>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white">
              Get Grandmaster Insights <span className="text-amber-400">Directly In Your Inbox</span>
            </h2>
            <p className="text-slate-300 text-sm">
              Subscribe to receive weekly opening traps, tactical puzzle breakdowns, and tournament preparation tips.
            </p>
            <div className="max-w-md mx-auto pt-2">
              <NewsletterForm dark />
            </div>
            <p className="text-slate-400 text-[11px]">
              No spam. 100% educational content. Unsubscribe anytime.
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}
