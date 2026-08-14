'use client';

import { useState } from 'react';
import Link from 'next/link';
import SafeImage from '@/components/ui/SafeImage';
import { formatDate } from '@/utils/formatDate';
import type { BlogPost } from '@/types';

interface BlogPostClientViewProps {
  post: BlogPost;
  relatedPosts: BlogPost[];
}

export default function BlogPostClientView({ post, relatedPosts }: BlogPostClientViewProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : `https://chesshubacademy.online/blog/${post.slug}`;
  const shareTitle = encodeURIComponent(post.title);
  const shareSummary = encodeURIComponent(post.excerpt);

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Render markdown content line by line
  const renderContentLine = (line: string, index: number) => {
    const trimmed = line.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith('### ')) {
      return (
        <h3 key={index} className="text-xl lg:text-2xl font-extrabold text-slate-900 mt-8 mb-3 tracking-tight">
          {trimmed.replace('### ', '')}
        </h3>
      );
    }
    if (trimmed.startsWith('## ')) {
      return (
        <h2 key={index} className="text-2xl lg:text-3xl font-extrabold text-slate-900 mt-10 mb-4 pb-2 border-b border-slate-200">
          {trimmed.replace('## ', '')}
        </h2>
      );
    }
    if (trimmed.startsWith('---')) {
      return <hr key={index} className="my-8 border-slate-200" />;
    }
    if (trimmed.startsWith('```pgn')) {
      return null;
    }
    if (trimmed.startsWith('```')) {
      return null;
    }
    if (trimmed.startsWith('- ')) {
      return (
        <li key={index} className="text-slate-700 text-base leading-relaxed ml-6 list-disc mb-2">
          {trimmed.replace('- ', '')}
        </li>
      );
    }
    if (/^\d+\./.test(trimmed)) {
      return (
        <div key={index} className="p-4 bg-purple-50 rounded-2xl border border-purple-100 my-4 text-slate-800 text-sm font-semibold">
          {trimmed}
        </div>
      );
    }

    return (
      <p key={index} className="text-slate-700 text-base lg:text-lg leading-relaxed mb-5 font-normal">
        {trimmed}
      </p>
    );
  };

  const lines = post.content.split('\n');

  return (
    <article className="max-w-4xl mx-auto px-4 py-12">
      {/* Social Share & Author Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm mb-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-purple-200 shadow-sm flex-shrink-0">
            <SafeImage
              src={post.authorImageUrl}
              alt={post.author}
              fallbackSrc="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&q=80"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <p className="text-sm font-extrabold text-slate-900">{post.author}</p>
            <p className="text-xs text-purple-700 font-bold">{post.authorTitle}</p>
          </div>
        </div>

        {/* Viral Share Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 mr-1">Share:</span>
          <a
            href={`https://api.whatsapp.com/send?text=${shareTitle}%20${shareUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1"
            title="Share on WhatsApp"
          >
            <span>💬</span> WhatsApp
          </a>
          <a
            href={`https://twitter.com/intent/tweet?text=${shareTitle}&url=${shareUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 bg-sky-50 text-sky-600 hover:bg-sky-600 hover:text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1"
            title="Share on Twitter/X"
          >
            <span>🐦</span> Twitter
          </a>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 bg-blue-50 text-blue-700 hover:bg-blue-700 hover:text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1"
            title="Share on LinkedIn"
          >
            <span>💼</span> LinkedIn
          </a>
          <button
            type="button"
            onClick={handleCopyLink}
            className="p-2.5 bg-slate-100 text-slate-700 hover:bg-slate-800 hover:text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            {copied ? '✓ Copied!' : '🔗 Copy Link'}
          </button>
        </div>
      </div>

      {/* Main Article Body */}
      <div className="bg-white p-8 lg:p-12 rounded-3xl border border-slate-200 shadow-lg text-slate-800 mb-16">
        {lines.map((line, idx) => renderContentLine(line, idx))}

        {/* Grandmaster CTA Banner */}
        <div className="mt-12 p-8 bg-gradient-to-r from-purple-900 to-slate-900 rounded-3xl text-white shadow-xl text-center space-y-4">
          <span className="text-xs font-black uppercase tracking-widest text-amber-400">
            ♟️ Accelerated Grandmaster Coaching
          </span>
          <h3 className="text-2xl font-extrabold">Ready to Boost Your FIDE Rating?</h3>
          <p className="text-slate-300 text-sm max-w-xl mx-auto">
            Book a free 1-on-1 trial session with our FIDE Grandmasters. Get personal feedback, tactical analysis, and a custom training road map!
          </p>
          <div>
            <Link
              href="/book-demo"
              className="inline-block px-8 py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-extrabold rounded-2xl shadow-lg transition-transform hover:scale-105"
            >
              Book Free 1v1 Grandmaster Demo Class
            </Link>
          </div>
        </div>
      </div>

      {/* Related Articles */}
      {relatedPosts.length > 0 && (
        <div className="pt-8 border-t border-slate-200">
          <h3 className="font-heading text-2xl font-extrabold text-slate-900 mb-6">
            Recommended Masterclasses & Guides
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedPosts.map((rel) => (
              <Link key={rel.id} href={`/blog/${rel.slug}`} className="group block">
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all p-5 h-full flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block mb-2">
                      {rel.category}
                    </span>
                    <h4 className="font-heading font-extrabold text-slate-900 text-sm mb-2 group-hover:text-purple-700 transition-colors line-clamp-2">
                      {rel.title}
                    </h4>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 mt-4 block">
                    {rel.readingTimeMinutes} min read →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
