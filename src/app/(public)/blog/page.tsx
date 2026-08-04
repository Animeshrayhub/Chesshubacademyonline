import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import Container from '@/components/ui/Container';
import SectionTitle from '@/components/ui/SectionTitle';
import Badge from '@/components/ui/Badge';
import JsonLd from '@/components/seo/JsonLd';
import NewsletterForm from '@/components/ui/NewsletterForm';
import SafeImage from '@/components/ui/SafeImage';
import { getPublicBlogPosts } from '@/lib/blog/service';
import { SITE_URL, SITE_OG_IMAGE } from '@/constants/SITE';
import { formatDate } from '@/utils/formatDate';
import type { BlogCategory, BlogPost } from '@/types';

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Chess tips, coaching insights, student success stories, parent guides, and academy news from ChessHub Academy\'s expert coaching team.',
  alternates: { canonical: `${SITE_URL}/blog` },
  openGraph: {
    title: 'Chess Blog | ChessHub Academy',
    description: 'Expert chess tips, student stories, and coaching insights.',
    url: `${SITE_URL}/blog`,
    images: [{ url: SITE_OG_IMAGE, width: 1200, height: 630, alt: 'ChessHub Academy Blog' }],
  },
};

const CATEGORIES: BlogCategory[] = [
  'Chess Tips',
  'Tournament Prep',
  'Student Stories',
  'Academy News',
  'Parent Guide',
  'Chess Strategy',
];

export default async function BlogPage() {
  const posts: BlogPost[] = await getPublicBlogPosts();
  const featured = posts.find((p) => p.featured) || posts[0];
  const others = featured ? posts.filter((p) => p.id !== featured.id) : posts;

  const blogSchema = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'ChessHub Academy Blog',
    url: `${SITE_URL}/blog`,
    description: 'Chess coaching insights, tips, and student success stories.',
    publisher: { '@type': 'EducationalOrganization', name: 'ChessHub Academy', url: SITE_URL },
  };

  return (
    <>
      <JsonLd data={blogSchema} />

      {/* Hero */}
      <section className="pt-32 pb-16 bg-gradient-to-br from-primary-dark via-primary to-[#1a45b0] text-white overflow-hidden relative" aria-label="Blog header">
        <div className="absolute inset-0 chess-bg" aria-hidden="true" />
        <Container className="relative z-10 text-center">
          <span className="inline-block mb-4 text-sm font-semibold tracking-widest uppercase text-accent">
            ChessHub Blog
          </span>
          <h1 className="font-heading text-5xl lg:text-6xl font-bold text-white mb-5">
            Chess Insights &{' '}
            <span className="text-gradient-gold">Expert Knowledge</span>
          </h1>
          <p className="text-white/70 text-xl max-w-2xl mx-auto">
            Tips from grandmasters, student success stories, parent guides, and academy news.
          </p>
        </Container>
      </section>

      <section className="section-py bg-white" aria-label="Blog posts">
        <Container>
          {/* Featured article */}
          {featured && (
            <div className="mb-16">
              <div className="text-sm font-semibold text-accent uppercase tracking-widest mb-6">
                Featured Article
              </div>
              <Link href={`/blog/${featured.slug}`} className="group block">
                <article className="grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-3xl overflow-hidden border border-border shadow-card hover:shadow-card-hover transition-shadow duration-300">
                  <div className="relative h-72 lg:h-full min-h-[300px] overflow-hidden bg-slate-900">
                    <SafeImage
                      src={featured.imageUrl}
                      alt={featured.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-8 lg:p-10 flex flex-col justify-center">
                    <Badge variant="primary" className="self-start mb-5">
                      {featured.category}
                    </Badge>
                    <h2 className="font-heading text-2xl lg:text-3xl font-bold text-text-primary mb-4 leading-tight group-hover:text-primary transition-colors">
                      {featured.title}
                    </h2>
                    <p className="text-text-secondary leading-relaxed mb-6">{featured.excerpt}</p>
                    <div className="flex items-center gap-4 pt-6 border-t border-border">
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-border shadow-sm">
                        <SafeImage
                          src={featured.authorImageUrl}
                          alt={featured.author}
                          fallbackSrc="/coaches/animesh-ray.jpg"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-text-primary">{featured.author}</div>
                        <div className="text-xs text-text-secondary">
                          {formatDate(featured.publishedAt)} · {featured.readingTimeMinutes} min read
                        </div>
                      </div>
                      <span className="ml-auto text-primary font-semibold text-sm group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                        Read Article
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                          <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            </div>
          )}

          {/* Empty state when no blog posts exist */}
          {posts.length === 0 ? (
            <div className="py-20 text-center max-w-md mx-auto">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-5 text-3xl">
                📝
              </div>
              <h2 className="font-heading text-2xl font-bold text-text-primary mb-3">
                No Articles Published Yet
              </h2>
              <p className="text-text-secondary text-sm leading-relaxed mb-6">
                Our grandmaster coaching team and admin staff will be publishing official articles, chess insights, and academy updates here soon.
              </p>
              <Link
                href="/book-demo"
                className="inline-flex items-center justify-center px-6 py-3 bg-accent hover:bg-accent-hover text-surface-dark font-semibold text-sm rounded-xl transition-all shadow-gold"
              >
                Book Free Demo Class
              </Link>
            </div>
          ) : (
            <>
              {/* Category filter */}
              <div className="flex flex-wrap gap-3 mb-12" role="navigation" aria-label="Blog categories">
                <span className="px-5 py-2 rounded-full bg-primary text-white text-sm font-semibold">
                  All Posts
                </span>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className="px-5 py-2 rounded-full border border-border text-text-secondary text-sm font-medium hover:border-primary hover:text-primary transition-colors duration-200"
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Articles grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {others.map((post) => (
                  <Link key={post.id} href={`/blog/${post.slug}`} className="group block">
                    <article className="card-premium overflow-hidden h-full flex flex-col">
                      <div className="relative h-52 overflow-hidden bg-slate-900">
                        <SafeImage
                          src={post.imageUrl}
                          alt={post.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <div className="p-6 flex flex-col flex-1">
                        <Badge variant="primary" className="self-start mb-4">
                          {post.category}
                        </Badge>
                        <h2 className="font-heading font-bold text-text-primary text-lg mb-3 leading-tight group-hover:text-primary transition-colors line-clamp-2">
                          {post.title}
                        </h2>
                        <p className="text-text-secondary text-sm leading-relaxed mb-6 flex-1 line-clamp-3">
                          {post.excerpt}
                        </p>
                        <div className="flex items-center gap-3 pt-4 border-t border-border">
                          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-border shadow-sm">
                            <SafeImage
                              src={post.authorImageUrl}
                              alt={post.author}
                              fallbackSrc="/coaches/animesh-ray.jpg"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-text-primary truncate">{post.author}</div>
                            <div className="text-xs text-text-secondary">
                              {formatDate(post.publishedAt)} · {post.readingTimeMinutes} min
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            </>
          )}
        </Container>
      </section>

      {/* Newsletter */}
      <section className="py-20 bg-gradient-to-br from-primary-dark via-primary to-[#1a45b0] chess-bg" aria-label="Newsletter subscription">
        <Container>
          <div className="max-w-2xl mx-auto text-center">
            <SectionTitle
              eyebrow="Newsletter"
              title="Chess Insights"
              titleHighlight="In Your Inbox"
              subtitle="Get weekly tips from grandmasters, student stories, and exclusive coaching content."
              light
            />
            <div className="max-w-md mx-auto">
              <NewsletterForm dark />
            </div>
            <p className="text-white/40 text-xs mt-4">
              No spam. Unsubscribe at any time.
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}
