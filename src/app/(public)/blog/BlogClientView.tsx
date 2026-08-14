'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import SafeImage from '@/components/ui/SafeImage';
import { formatDate } from '@/utils/formatDate';
import type { BlogPost, BlogCategory } from '@/types';

interface BlogClientViewProps {
  initialPosts: BlogPost[];
}

const CATEGORIES: string[] = [
  'All Posts',
  'Opening Traps',
  'Parent Guide',
  'Tournament Prep',
  'Grandmaster Tips',
  'Chess Strategy',
];

export default function BlogClientView({ initialPosts }: BlogClientViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All Posts');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredPosts = useMemo(() => {
    return initialPosts.filter((post) => {
      const matchesCategory =
        selectedCategory === 'All Posts' ||
        post.category.toLowerCase() === selectedCategory.toLowerCase();

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        post.title.toLowerCase().includes(q) ||
        post.excerpt.toLowerCase().includes(q) ||
        (post.tags && post.tags.some((t) => t.toLowerCase().includes(q)));

      return matchesCategory && matchesSearch;
    });
  }, [initialPosts, selectedCategory, searchQuery]);

  const featured = useMemo(() => {
    return filteredPosts.find((p) => p.featured) || filteredPosts[0];
  }, [filteredPosts]);

  const otherPosts = useMemo(() => {
    if (!featured) return filteredPosts;
    return filteredPosts.filter((p) => p.id !== featured.id);
  }, [filteredPosts, featured]);

  return (
    <div className="space-y-12">
      {/* Category Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-6 border-b border-border">
        {/* Category Pills */}
        <div className="flex flex-wrap gap-2" role="navigation" aria-label="Blog categories">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 shadow-sm ${
                  isActive
                    ? 'bg-purple-700 text-white shadow-purple-200'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chess insights, traps..."
            className="w-full px-4 py-2.5 pl-10 text-xs rounded-full border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent bg-slate-50 text-slate-900 placeholder-slate-400"
          />
          <svg
            className="w-4 h-4 absolute left-3.5 top-3 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Featured Article Banner */}
      {featured && (
        <div className="mb-10">
          <div className="text-xs font-black text-purple-700 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span>🔥</span> FEATURED VIRAL ARTICLE
          </div>
          <Link href={`/blog/${featured.slug}`} className="group block">
            <article className="grid grid-cols-1 lg:grid-cols-12 gap-0 rounded-3xl overflow-hidden border border-slate-200 shadow-xl hover:shadow-2xl transition-all duration-300 bg-white">
              <div className="lg:col-span-7 relative min-h-[320px] overflow-hidden bg-slate-900">
                <SafeImage
                  src={featured.imageUrl}
                  alt={featured.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-4 left-4 bg-purple-900/80 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full border border-purple-400/30">
                  {featured.category}
                </div>
              </div>
              <div className="lg:col-span-5 p-8 lg:p-10 flex flex-col justify-between">
                <div>
                  <h2 className="font-heading text-2xl lg:text-3xl font-extrabold text-slate-900 mb-4 leading-tight group-hover:text-purple-700 transition-colors">
                    {featured.title}
                  </h2>
                  <p className="text-slate-600 text-sm leading-relaxed mb-6">
                    {featured.excerpt}
                  </p>
                </div>

                <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2 border-purple-200 shadow-sm">
                      <SafeImage
                        src={featured.authorImageUrl}
                        alt={featured.author}
                        fallbackSrc="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&q=80"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{featured.author}</p>
                      <p className="text-[11px] font-medium text-slate-500">
                        {formatDate(featured.publishedAt)} · {featured.readingTimeMinutes} min read
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 group-hover:translate-x-1 transition-transform">
                    Read Article →
                  </span>
                </div>
              </div>
            </article>
          </Link>
        </div>
      )}

      {/* Grid of Other Articles */}
      {otherPosts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {otherPosts.map((post) => (
            <Link key={post.id} href={`/blog/${post.slug}`} className="group block">
              <article className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 h-full flex flex-col">
                <div className="relative h-48 overflow-hidden bg-slate-900">
                  <SafeImage
                    src={post.imageUrl}
                    alt={post.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/20">
                    {post.category}
                  </div>
                </div>

                <div className="p-6 flex flex-col flex-1 justify-between">
                  <div>
                    <h3 className="font-heading text-lg font-extrabold text-slate-900 mb-2.5 leading-snug group-hover:text-purple-700 transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-slate-600 text-xs leading-relaxed mb-4 line-clamp-3">
                      {post.excerpt}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{post.author}</span>
                    </div>
                    <span>{post.readingTimeMinutes} min read</span>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center bg-slate-50 rounded-3xl border border-slate-200">
          <p className="text-sm font-bold text-slate-700">No articles match your search query.</p>
          <button
            type="button"
            onClick={() => { setSelectedCategory('All Posts'); setSearchQuery(''); }}
            className="mt-3 text-xs font-bold text-purple-700 hover:underline"
          >
            Clear Filters & View All Posts
          </button>
        </div>
      )}
    </div>
  );
}
