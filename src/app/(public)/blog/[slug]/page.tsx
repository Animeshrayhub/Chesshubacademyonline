import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Container from '@/components/ui/Container';
import Badge from '@/components/ui/Badge';
import JsonLd from '@/components/seo/JsonLd';
import BookDemoCTASection from '@/features/home/BookDemoCTASection';
import { BLOG_POSTS } from '@/constants/BLOG_POSTS';
import { SITE_URL, SITE_OG_IMAGE } from '@/constants/SITE';
import { formatDate } from '@/utils/formatDate';
import BlogChessboard from '@/components/ui/BlogChessboard';

interface Props {
  params: { slug: string };
}

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = BLOG_POSTS.find((p) => p.slug === params.slug);
  if (!post) return { title: 'Post Not Found' };

  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `${SITE_URL}/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `${SITE_URL}/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.publishedAt,
      authors: [post.author],
      images: [{ url: post.imageUrl, width: 1200, height: 600, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [post.imageUrl],
    },
  };
}

export default function BlogPostPage({ params }: Props) {
  const post = BLOG_POSTS.find((p) => p.slug === params.slug);
  if (!post) notFound();

  const related = BLOG_POSTS.filter(
    (p) => p.id !== post.id && p.category === post.category
  ).slice(0, 3);

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: post.imageUrl,
    datePublished: post.publishedAt,
    author: {
      '@type': 'Person',
      name: post.author,
      jobTitle: post.authorTitle,
    },
    publisher: {
      '@type': 'EducationalOrganization',
      name: 'ChessHub Academy',
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/blog/${post.slug}` },
  };

  // Convert plain text content to paragraphs (simple markdown-like rendering)
  const paragraphs = post.content
    .trim()
    .split('\n')
    .filter((line) => line.trim());

  return (
    <>
      <JsonLd data={articleSchema} />

      {/* Article Hero */}
      <section className="pt-28 pb-0 bg-surface-dark relative overflow-hidden" aria-label="Article header">
        <Container className="relative z-10 pb-16">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="primary" className="mb-6">
              {post.category}
            </Badge>
            <h1 className="font-heading text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
              {post.title}
            </h1>
            <p className="text-white/60 text-xl mb-8 leading-relaxed">{post.excerpt}</p>
            <div className="flex items-center justify-center gap-4">
              <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white/20">
                <Image
                  src={post.authorImageUrl}
                  alt={post.author}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              </div>
              <div className="text-left">
                <div className="text-white font-semibold text-sm">{post.author}</div>
                <div className="text-white/50 text-xs">
                  {post.authorTitle} · {formatDate(post.publishedAt)} · {post.readingTimeMinutes} min read
                </div>
              </div>
            </div>
          </div>
        </Container>

        {/* Cover image */}
        <div className="relative h-72 lg:h-[480px] w-full overflow-hidden">
          <Image
            src={post.imageUrl}
            alt={post.title}
            fill
            className="object-cover opacity-70"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-dark via-surface-dark/20 to-transparent" />
        </div>
      </section>

      {/* Article Body */}
      <section className="py-16 bg-white" aria-label="Article content">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-12 max-w-5xl mx-auto">
            {/* Content */}
            <article aria-label={post.title}>
              <div className="prose-chess">
                {paragraphs.map((line, i) => {
                  if (line.includes('[chess')) {
                    const fenMatch = line.match(/FEN="([^"]+)"/);
                    const fenVal = fenMatch ? fenMatch[1] : undefined;
                    return <BlogChessboard key={i} fen={fenVal} />;
                  }
                  if (line.startsWith('## ')) {
                    return (
                      <h2 key={i} className="font-heading text-2xl font-bold text-primary-dark mt-10 mb-4">
                        {line.replace('## ', '')}
                      </h2>
                    );
                  }
                  if (line.startsWith('### ')) {
                    return (
                      <h3 key={i} className="font-heading text-xl font-bold text-text-primary mt-8 mb-3">
                        {line.replace('### ', '')}
                      </h3>
                    );
                  }
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return (
                      <p key={i} className="font-semibold text-text-primary mb-4">
                        {line.replace(/\*\*/g, '')}
                      </p>
                    );
                  }
                  if (line.startsWith('- ')) {
                    return (
                      <li key={i} className="text-text-secondary mb-2 ml-5 list-disc">
                        {line.replace('- ', '')}
                      </li>
                    );
                  }
                  return (
                    <p key={i} className="text-text-secondary leading-relaxed mb-6">
                      {line}
                    </p>
                  );
                })}
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mt-12 pt-8 border-t border-border">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1.5 bg-surface-light text-text-secondary rounded-lg text-xs font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              {/* Social share */}
              <div className="mt-8 pt-8 border-t border-border">
                <p className="text-sm font-semibold text-text-primary mb-4">Share this article</p>
                <div className="flex gap-3">
                  {['Twitter', 'LinkedIn', 'Facebook'].map((platform) => (
                    <a
                      key={platform}
                      href="#"
                      className="px-4 py-2.5 rounded-xl border border-border text-text-secondary text-sm font-medium hover:border-primary hover:text-primary transition-colors"
                      aria-label={`Share on ${platform}`}
                    >
                      {platform}
                    </a>
                  ))}
                </div>
              </div>
            </article>

            {/* Sidebar */}
            <aside aria-label="Article sidebar">
              {/* Author card */}
              <div className="card-premium p-6 mb-6 sticky top-24">
                <h3 className="font-heading font-bold text-text-primary mb-4">About the Author</h3>
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0">
                    <Image
                      src={post.authorImageUrl}
                      alt={post.author}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  </div>
                  <div>
                    <div className="font-semibold text-text-primary">{post.author}</div>
                    <div className="text-text-secondary text-xs">{post.authorTitle}</div>
                  </div>
                </div>
                <Link
                  href="/about#team"
                  className="block text-center py-2.5 bg-primary/8 text-primary text-sm font-semibold rounded-xl hover:bg-primary/15 transition-colors"
                >
                  View Profile
                </Link>
              </div>

              {/* CTA */}
              <div className="bg-gradient-to-br from-primary-dark to-primary rounded-3xl p-6 text-white text-center chess-bg">
                <div className="text-3xl mb-3" aria-hidden="true">♟️</div>
                <h3 className="font-heading font-bold text-white text-lg mb-2">
                  Ready to learn?
                </h3>
                <p className="text-white/60 text-sm mb-5">
                  Book a free demo class with one of our grandmasters today.
                </p>
                <Link
                  href="/book-demo"
                  className="block py-3 bg-accent hover:bg-accent-hover text-surface-dark font-bold rounded-xl transition-all duration-200 text-sm"
                >
                  Book Free Demo
                </Link>
              </div>
            </aside>
          </div>
        </Container>
      </section>

      {/* Related Articles */}
      {related.length > 0 && (
        <section className="py-16 bg-surface-light" aria-label="Related articles">
          <Container>
            <h2 className="font-heading text-3xl font-bold text-text-primary mb-10 text-center">
              More From the Blog
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {related.map((p) => (
                <Link key={p.id} href={`/blog/${p.slug}`} className="group block">
                  <article className="card-premium overflow-hidden">
                    <div className="relative h-48 overflow-hidden">
                      <Image
                        src={p.imageUrl}
                        alt={p.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    </div>
                    <div className="p-5">
                      <Badge variant="primary" className="mb-3">{p.category}</Badge>
                      <h3 className="font-heading font-bold text-text-primary text-base leading-snug mb-2 group-hover:text-primary transition-colors">
                        {p.title}
                      </h3>
                      <div className="text-xs text-text-secondary">
                        {formatDate(p.publishedAt)} · {p.readingTimeMinutes} min read
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
            <div className="text-center mt-10">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 px-8 py-4 border-2 border-primary text-primary hover:bg-primary hover:text-white font-semibold rounded-xl transition-all duration-200"
              >
                View All Articles
              </Link>
            </div>
          </Container>
        </section>
      )}

      <BookDemoCTASection />
    </>
  );
}
