import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Container from '@/components/ui/Container';
import Badge from '@/components/ui/Badge';
import JsonLd from '@/components/seo/JsonLd';
import SafeImage from '@/components/ui/SafeImage';
import { getBlogPostBySlug, getPublicBlogPosts } from '@/lib/blog/service';
import { SITE_URL, SITE_OG_IMAGE } from '@/constants/SITE';
import { formatDate } from '@/utils/formatDate';
import BlogPostClientView from './BlogPostClientView';

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getBlogPostBySlug(params.slug);
  if (!post) return { title: 'Blog — ChessHub Academy' };

  return {
    title: `${post.title} | ChessHub Academy Blog`,
    description: post.excerpt,
    keywords: post.tags || ['chess', 'grandmaster coaching', 'chess tactics'],
    alternates: { canonical: `${SITE_URL}/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `${SITE_URL}/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.publishedAt,
      authors: [post.author],
      images: [{ url: post.imageUrl, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [post.imageUrl],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const post = await getBlogPostBySlug(params.slug);
  if (!post) {
    redirect('/blog');
  }

  const allPosts = await getPublicBlogPosts();
  const related = allPosts.filter((p) => p.id !== post.id).slice(0, 3);

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: post.imageUrl,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    author: {
      '@type': 'Person',
      name: post.author,
      jobTitle: post.authorTitle || 'FIDE Grandmaster & Master Coach',
    },
    publisher: {
      '@type': 'EducationalOrganization',
      name: 'ChessHub Academy',
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo/logo.jpg` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/blog/${post.slug}` },
    keywords: (post.tags || []).join(', '),
  };

  return (
    <>
      <JsonLd data={articleSchema} />

      {/* Article Header Hero */}
      <section className="pt-32 pb-16 bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 chess-bg opacity-20" aria-hidden="true" />
        <Container className="relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <span className="inline-block px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-900/80 text-purple-300 border border-purple-500/30">
              {post.category}
            </span>
            <h1 className="font-heading text-3xl lg:text-5xl font-extrabold text-white leading-tight">
              {post.title}
            </h1>
            <p className="text-slate-300 text-base lg:text-lg font-medium leading-relaxed">
              {post.excerpt}
            </p>
            <div className="flex items-center justify-center gap-3 pt-2 text-xs text-slate-400 font-semibold">
              <span>By {post.author}</span>
              <span>•</span>
              <span>{formatDate(post.publishedAt)}</span>
              <span>•</span>
              <span>⏱️ {post.readingTimeMinutes} min read</span>
            </div>
          </div>
        </Container>
      </section>

      {/* Hero Image */}
      <div className="max-w-4xl mx-auto px-4 -mt-10 relative z-20">
        <div className="h-80 lg:h-96 rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-slate-900">
          <SafeImage
            src={post.imageUrl}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Client View Body & Social Sharing */}
      <section className="bg-slate-50 min-h-screen py-8">
        <BlogPostClientView post={post} relatedPosts={related} />
      </section>
    </>
  );
}
