'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fixGoogleDriveUrl } from '@/utils/imageUtils';

const DEFAULT_TITLE = "10 Chess Benefits for Kids: How Chess Improves Memory, Focus & Academic Performance";
const DEFAULT_EXCERPT = "Discover how learning chess helps children improve concentration, memory, critical thinking, creativity, and confidence. Learn why thousands of parents choose chess as one of the best educational activities for kids.";
const DEFAULT_CONTENT = `# 10 Chess Benefits for Kids: How Chess Improves Memory, Focus & Academic Performance

Chess is much more than a board game. It is one of the most powerful educational activities that helps children develop thinking skills, patience, creativity, and confidence.

Whether your child is 5 or 15 years old, learning chess provides lifelong benefits that extend far beyond the chessboard.

In this guide, we'll explore why chess is one of the best extracurricular activities for children.

---

## 1. Improves Concentration

Every chess move requires careful attention.
Children learn to focus for longer periods while analyzing positions and planning their next move.
Better concentration in chess often leads to improved focus in school.

---

## 2. Strengthens Memory

Chess players remember:
- Opening ideas
- Tactical patterns
- Endgame techniques
- Checkmate patterns

Regular practice naturally improves memory retention.

---

## 3. Develops Critical Thinking

Instead of guessing, children learn to ask:
- What is my opponent threatening?
- What is my best move?
- What happens if I make this move?

This develops logical thinking and decision-making skills.

---

## 4. Encourages Problem Solving

Every chess position is a puzzle waiting to be solved.
Students learn how to:
- Analyze situations
- Compare different ideas
- Find the strongest solution

These problem-solving skills transfer to mathematics, science, and everyday life.

---

## 5. Builds Patience

Success in chess rarely comes from rushing.
Children learn to:
- Stay calm
- Think before acting
- Accept mistakes
- Keep improving

Patience is a valuable life skill.

---

## 6. Boosts Confidence

Winning games, solving puzzles, and improving ratings give students a strong sense of achievement.
Every improvement builds confidence both inside and outside the classroom.

---

## 7. Improves Academic Performance

Research suggests chess training may help improve:
- Mathematical thinking
- Reading comprehension
- Logical reasoning
- Concentration

Many schools around the world include chess in their educational programs.

---

## 8. Teaches Responsibility

In chess, players cannot blame teammates.
Every decision has consequences.
Children learn accountability and become better decision-makers.

---

## 9. Develops Creativity

Chess is not only about calculation.
Players constantly create new plans, combinations, and attacking ideas.
Creative thinking becomes a natural habit.

---

## 10. Teaches Sportsmanship

Students learn:
- How to win with humility
- How to lose gracefully
- How to learn from mistakes
- How to respect opponents

These values help children throughout life.

---

## Why Learn Chess with ChessHub Academy?

At **ChessHub Academy**, we provide structured online chess coaching for beginners, intermediate, and advanced players.

Our programs include:
- Personalized 1-on-1 coaching
- Interactive online classes
- Homework and puzzle practice
- Tournament preparation
- Progress tracking
- Friendly coaches

Whether your child wants to learn the basics or compete in tournaments, we provide a learning path designed for long-term improvement.

---

## Ready to Start?

A single chess lesson can begin a lifetime of learning.
Book a free demo class today and discover how chess can help your child develop confidence, concentration, and critical thinking.

👉 Visit: https://chesshubacademy.online

---

## Frequently Asked Questions

### What is the best age to start chess?
Most children can begin learning chess between 5 and 7 years old, although motivated learners may start even earlier.

### Does chess improve IQ?
Chess develops thinking skills such as memory, concentration, planning, and logical reasoning. These skills support overall learning.

### How many days should children practice?
Practicing 20–30 minutes a day is enough for beginners to make steady progress.

### Is online chess coaching effective?
Yes. Interactive online coaching allows students to receive personalized guidance, solve puzzles, analyze games, and play practice matches from home.

---

## Final Thoughts

Chess teaches children far more than how to win games.
It builds character, discipline, confidence, and lifelong thinking skills.

If you're looking for an educational activity that combines learning with fun, chess is one of the best choices.

Start your child's chess journey today with ChessHub Academy.`;

export default function CreatePostPage() {
  const router = useRouter();
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [category, setCategory] = useState('Parent Guide');
  const [readingTime, setReadingTime] = useState(6);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [excerpt, setExcerpt] = useState(DEFAULT_EXCERPT);
  const [content, setContent] = useState(DEFAULT_CONTENT);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Computed preview URL (converts Google Drive sharing link if provided)
  const convertedImageUrl = fixGoogleDriveUrl(imageUrlInput);

  const handleSubmit = async (status: 'published' | 'draft') => {
    if (!title.trim() || !content.trim()) {
      setMessage({ type: 'error', text: 'Please fill in both the Title and Content Body.' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          category,
          readingTimeMinutes: readingTime,
          imageUrl: convertedImageUrl,
          excerpt,
          content,
          status,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({
          type: 'success',
          text: status === 'published'
            ? '🎉 Article published successfully! Redirecting to All Posts...'
            : '💾 Draft saved successfully! Redirecting to Drafts...',
        });

        setTimeout(() => {
          if (status === 'published') {
            router.push('/dashboard/admin/blog');
          } else {
            router.push('/dashboard/admin/blog/drafts');
          }
        }, 1200);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save article.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'An unexpected error occurred.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-border shadow-card p-6 md:p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
        <div>
          <h3 className="text-xl font-bold text-text-primary">Draft New Blog Article</h3>
          <p className="text-text-secondary text-sm mt-0.5">
            Write or edit marketing articles, study guides, and academy updates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-accent/15 text-accent-dark font-bold text-xs rounded-full uppercase tracking-wider">
            Admin CMS
          </span>
        </div>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-xl text-sm font-semibold flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <span>{message.type === 'success' ? '✅' : '⚠️'}</span>
          <span>{message.text}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-text-primary mb-2">
            Article Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. 10 Chess Benefits for Kids"
            className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text-primary text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />
        </div>

        {/* Category & Read time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold text-text-primary mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text-primary text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            >
              <option value="Parent Guide">Parent Guide</option>
              <option value="Chess Strategy">Chess Strategy</option>
              <option value="Tournament Prep">Tournament Prep</option>
              <option value="Academy News">Academy News</option>
              <option value="Chess Tips">Chess Tips</option>
              <option value="Student Stories">Student Stories</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-text-primary mb-2">
              Estimated Read Time (Minutes)
            </label>
            <input
              type="number"
              min={1}
              max={60}
              value={readingTime}
              onChange={(e) => setReadingTime(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text-primary text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
          </div>
        </div>

        {/* Image / Google Drive Link Input */}
        <div className="p-4 rounded-2xl bg-surface-light border border-border space-y-3">
          <label className="block text-sm font-semibold text-text-primary">
            Cover Image URL or Google Drive Link 🖼️
          </label>
          <p className="text-xs text-text-secondary">
            Paste any direct image URL (Unsplash, CDN) OR a Google Drive sharing link (e.g. <code className="bg-white px-1.5 py-0.5 rounded border border-border font-mono text-[11px]">drive.google.com/file/d/...</code>). Google Drive links will automatically convert to viewable images!
          </p>
          <input
            type="url"
            value={imageUrlInput}
            onChange={(e) => setImageUrlInput(e.target.value)}
            placeholder="https://drive.google.com/file/d/... or https://images.unsplash.com/..."
            className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />

          {/* Live Image Preview */}
          {convertedImageUrl ? (
            <div className="mt-3">
              <div className="text-xs font-semibold text-text-secondary mb-1">Image Preview:</div>
              <div className="relative w-full h-48 rounded-xl overflow-hidden border border-border bg-slate-100 flex items-center justify-center">
                <img
                  src={convertedImageUrl}
                  alt="Cover preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="text-xs text-text-secondary italic">
              Optional default thumbnail will be used if left empty.
            </div>
          )}
        </div>

        {/* Excerpt */}
        <div>
          <label className="block text-sm font-semibold text-text-primary mb-2">Excerpt Summary</label>
          <textarea
            rows={2}
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="Provide a short summary of the article..."
            className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text-primary text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />
        </div>

        {/* Content Body */}
        <div>
          <label className="block text-sm font-semibold text-text-primary mb-2">
            Content Body (Markdown Supported) <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={16}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write article content using markdown formatting..."
            className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text-primary text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-4 border-t border-border">
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit('draft')}
            className="w-full sm:w-auto px-6 py-3 border border-border bg-white text-text-primary hover:bg-surface-light rounded-xl text-sm font-bold transition-all duration-150 disabled:opacity-50"
          >
            {submitting ? 'Saving Draft...' : '💾 Save Draft'}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit('published')}
            className="w-full sm:w-auto px-8 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all duration-150 disabled:opacity-50"
          >
            {submitting ? 'Publishing Article...' : '🚀 Publish Article'}
          </button>
        </div>
      </div>
    </div>
  );
}
