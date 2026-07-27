'use client';

import React, { useState, useEffect } from 'react';
import Container from '@/components/ui/Container';
import SectionTitle from '@/components/ui/SectionTitle';
import { TESTIMONIALS } from '@/constants/TESTIMONIALS';
import { submitReviewAction, fetchApprovedReviewsAction } from '@/actions/reviews';
import type { ReviewItem } from '@/lib/reviews';

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={i < rating ? '#D4AF37' : 'none'}
          stroke={i < rating ? 'none' : '#D4AF37'}
          strokeWidth="2"
          aria-hidden="true"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

export default function TestimonialsSection() {
  const [reviewsList, setReviewsList] = useState<ReviewItem[]>(
    TESTIMONIALS.map((t) => ({
      id: t.id,
      name: t.name,
      role: (t.role as 'Parent' | 'Student') || 'Parent',
      rating: t.rating,
      quote: t.quote,
      location: t.location,
      result: t.result,
      isApproved: true,
      createdAt: new Date().toISOString(),
    }))
  );

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<'Parent' | 'Student'>('Parent');
  const [rating, setRating] = useState(5);
  const [location, setLocation] = useState('');
  const [quote, setQuote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    fetchApprovedReviewsAction().then((res) => {
      if (res.success && res.reviews && res.reviews.length > 0) {
        setReviewsList(res.reviews);
      }
    });
  }, []);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !quote) return;

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const res = await submitReviewAction({
        name,
        role,
        rating,
        quote,
        location: location || 'Global Learner',
      });

      if (res.success) {
        setSubmitSuccess(true);
        setName('');
        setLocation('');
        setQuote('');
      } else {
        setSubmitError(res.error || 'Failed to submit review.');
      }
    } catch {
      setSubmitError('An error occurred submitting your review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      className="section-py bg-surface-light relative overflow-hidden"
      aria-label="Testimonials from parents and students"
    >
      <Container>
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <SectionTitle
            eyebrow="Testimonials"
            title="What Parents &"
            titleHighlight="Students Say"
            subtitle="Honest feedback from our international community of learners."
          />

          <button
            type="button"
            onClick={() => {
              setShowModal(true);
              setSubmitSuccess(false);
              setSubmitError('');
            }}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs rounded-xl shadow-gold transition-all duration-200 active:scale-95 flex items-center gap-2 self-start md:self-auto whitespace-nowrap"
          >
            <span>⭐ Share Your Review</span>
          </button>
        </div>

        {/* Testimonials grid (Clean Text - No Photos or Circle Badges) */}
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          {reviewsList.map((testimonial) => (
            <article
              key={testimonial.id}
              className="card-premium p-7 break-inside-avoid shadow-card hover:shadow-card-hover transition-all duration-200"
            >
                {/* Stars */}
                <StarRating rating={testimonial.rating} />

                {/* Quote */}
                <blockquote className="mt-4 mb-6">
                  <p className="text-text-secondary text-sm leading-relaxed italic">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                </blockquote>

                {/* Result badge */}
                {testimonial.result && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/8 text-primary rounded-lg text-xs font-semibold mb-5 border border-primary/15">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
                    </svg>
                    {testimonial.result}
                  </div>
                )}

                {/* Author Info (Clean Text - No Photos/Circles) */}
                <footer className="pt-4 border-t border-border">
                  <div className="font-semibold text-text-primary text-sm">
                    {testimonial.name}
                  </div>
                  <div className="text-text-secondary text-xs mt-0.5 font-medium">
                    {testimonial.role}
                    {testimonial.location && ` · ${testimonial.location}`}
                  </div>
                </footer>
              </article>
          ))}
        </div>

        {/* 📝 Submit Review Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-lg space-y-5 shadow-2xl relative border border-border">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-xl shadow-sm">
                    ⭐
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-base text-text-primary">
                      Write a Parent or Student Review
                    </h3>
                    <p className="text-xs text-text-secondary">
                      Your feedback will be published on our website upon team approval.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-sm"
                >
                  ✕
                </button>
              </div>

              {submitSuccess ? (
                <div className="py-6 text-center space-y-3">
                  <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-2xl mx-auto">
                    ✓
                  </div>
                  <h4 className="text-base font-bold text-text-primary">Review Submitted Successfully!</h4>
                  <p className="text-xs text-text-secondary max-w-sm mx-auto leading-relaxed">
                    Thank you for sharing your experience! Your review is currently pending moderation and will appear on our homepage as soon as accepted by our team.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-2.5 bg-primary text-white font-bold text-xs rounded-xl shadow transition-all"
                  >
                    Close Window
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-bold text-text-primary mb-1">Your Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rajesh Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-50 border border-border rounded-xl px-3.5 py-2.5 text-xs text-text-primary placeholder-slate-400 focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Role */}
                    <div>
                      <label className="block text-xs font-bold text-text-primary mb-1">I am a...</label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as 'Parent' | 'Student')}
                        className="w-full bg-slate-50 border border-border rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary"
                      >
                        <option value="Parent">Parent</option>
                        <option value="Student">Student</option>
                      </select>
                    </div>

                    {/* Star Rating */}
                    <div>
                      <label className="block text-xs font-bold text-text-primary mb-1">Rating</label>
                      <select
                        value={rating}
                        onChange={(e) => setRating(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-border rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary font-medium"
                      >
                        <option value={5}>⭐⭐⭐⭐⭐ (5 Stars)</option>
                        <option value={4}>⭐⭐⭐⭐ (4 Stars)</option>
                        <option value={3}>⭐⭐⭐ (3 Stars)</option>
                      </select>
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-xs font-bold text-text-primary mb-1">City / Country (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. London, UK or Mumbai, India"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full bg-slate-50 border border-border rounded-xl px-3.5 py-2.5 text-xs text-text-primary placeholder-slate-400 focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* Review Text */}
                  <div>
                    <label className="block text-xs font-bold text-text-primary mb-1">Your Review / Experience</label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Tell us how ChessHub Academy helped your child or improved your chess skills..."
                      value={quote}
                      onChange={(e) => setQuote(e.target.value)}
                      className="w-full bg-slate-50 border border-border rounded-xl p-3 text-xs text-text-primary placeholder-slate-400 focus:outline-none focus:border-primary leading-relaxed"
                    />
                  </div>

                  {submitError && (
                    <p className="text-xs text-red-600 font-bold text-center bg-red-50 p-2 rounded-lg">
                      {submitError}
                    </p>
                  )}

                  <div className="flex justify-end gap-3 border-t border-border pt-3">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-xl shadow transition-all disabled:opacity-50"
                    >
                      {isSubmitting ? 'Submitting...' : '🚀 Submit Review'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </Container>
    </section>
  );
}
