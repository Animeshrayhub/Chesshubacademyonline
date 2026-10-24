'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import type { BookDemoFormData } from '@/types';
import { createBookingAction } from '@/actions/bookings';

const EXPERIENCE_LEVELS = [
  {
    value: 'Complete Beginner (Never played before)',
    badge: 'Beginner',
    icon: '🌱',
    title: 'Complete Beginner',
    description: 'Never played before or just starting with the board',
  },
  {
    value: 'Knows Basic Rules (Casual player)',
    badge: 'Casual',
    icon: '♞',
    title: 'Knows Basic Rules',
    description: 'Understands piece moves and basic checkmate concepts',
  },
  {
    value: 'Online Player (Chess.com / Lichess)',
    badge: 'Intermediate',
    icon: '⚔️',
    title: 'Online Player',
    description: 'Plays on Chess.com / Lichess, solves daily puzzles',
  },
  {
    value: 'Tournament / Rated Player (Club or FIDE)',
    badge: 'Advanced',
    icon: '🏆',
    title: 'Rated / Tournament Player',
    description: 'Competes in club tournaments or holds a FIDE rating',
  },
];

const TIME_OPTIONS = [
  { value: 'morning-weekday', label: 'Weekday Morning (9–12 PM IST / 7:30–10:30 AM GST)' },
  { value: 'afternoon-weekday', label: 'Weekday Afternoon (2–5 PM IST / 12:30–3:30 PM GST)' },
  { value: 'evening-weekday', label: 'Weekday Evening (6–9 PM IST / 8:30–11:30 AM EST)' },
  { value: 'weekend-morning', label: 'Weekend Morning (9–12 PM IST / 7:30–10:30 AM GST)' },
  { value: 'weekend-afternoon', label: 'Weekend Afternoon (2–5 PM IST / 4:30–7:30 AM EST)' },
  { value: 'weekend-evening', label: 'Weekend Evening (6–9 PM IST / 8:30–11:30 AM EST)' },
  { value: 'flexible', label: 'Flexible — any time works' },
];

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST, GMT+5:30)' },
  { value: 'America/New_York', label: 'US Eastern Time (EST/EDT, GMT-4/5)' },
  { value: 'America/Chicago', label: 'US Central Time (CST/CDT, GMT-5/6)' },
  { value: 'America/Los_Angeles', label: 'US Pacific Time (PST/PDT, GMT-7/8)' },
  { value: 'Europe/London', label: 'UK Time (GMT/BST)' },
  { value: 'Europe/Berlin', label: 'Central European Time (CET/CEST)' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST, GMT+4)' },
  { value: 'Asia/Singapore', label: 'Singapore / Malaysia Time (SGT, GMT+8)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AEST/AEDT)' },
];

const REFERRAL_OPTIONS = [
  { value: 'google', label: 'Google Search' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'friend', label: 'Referred by a friend' },
  { value: 'school', label: 'School / Teacher' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'other', label: 'Other' },
];

// Student age options: 3 through 100 inclusive (98 options)
const STUDENT_AGE_OPTIONS = Array.from({ length: 98 }, (_, i) => {
  const age = i + 3;
  return {
    value: String(age),
    label: `${age} years old`,
  };
});

interface FormErrors {
  parentName?: string;
  email?: string;
  phone?: string;
  childName?: string;
  childAge?: string;
  experience?: string;
  preferredTime?: string;
  timezone?: string;
  general?: string;
}

export interface BookingSuccessInfo {
  parentName: string;
  studentName: string;
  bookingRef: string;
  preferredTime: string;
}

interface BookDemoFormProps {
  onSuccess: (info: BookingSuccessInfo) => void;
}

export default function BookDemoForm({ onSuccess }: BookDemoFormProps) {
  const searchParams = useSearchParams();
  const [referralCode, setReferralCode] = useState<string | undefined>(undefined);
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [form, setForm] = useState<BookDemoFormData>({
    parentName: '',
    email: '',
    phone: '',
    childName: '',
    childAge: '',
    experience: '',
    preferredTime: '',
    referralSource: '',
    message: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Detect user's local timezone if available
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) {
        setTimezone(detected);
      }
    } catch {
      // Fallback stays Asia/Kolkata
    }

    const refParam = searchParams?.get('ref');
    if (refParam) {
      setReferralCode(refParam);
      setForm((f) => ({ ...f, referralSource: 'friend' }));
    }
  }, [searchParams]);

  const validate = (): boolean => {
    const e: FormErrors = {};

    // Parent name
    if (!form.parentName.trim()) {
      e.parentName = 'Parent or guardian name is required.';
    }

    // Email
    if (!form.email.trim()) {
      e.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      e.email = 'Please enter a valid email address.';
    }

    // Phone with country code
    if (!form.phone.trim()) {
      e.phone = 'WhatsApp or phone number with country code is required.';
    } else if (!/^\+?[0-9\s\-()]{7,20}$/.test(form.phone.trim())) {
      e.phone = 'Please include country code (e.g. +1 555 123 4567 or +91 98765 43210).';
    }

    // Student Name
    if (!form.childName.trim()) {
      e.childName = "Student's name is required.";
    }

    // Student Age: 3 to 100 integer validation
    if (!form.childAge || form.childAge.trim() === '') {
      e.childAge = "Student's age is required.";
    } else {
      const ageNum = Number(form.childAge);
      if (isNaN(ageNum) || !Number.isInteger(ageNum)) {
        e.childAge = "Student's age must be a whole number (no decimals).";
      } else if (ageNum < 3 || ageNum > 100) {
        e.childAge = "Student's age must be between 3 and 100 years.";
      }
    }

    // Experience
    if (!form.experience) {
      e.experience = 'Chess experience level is required.';
    }

    // Preferred time
    if (!form.preferredTime) {
      e.preferredTime = 'Preferred class time is required.';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      const ageNum = Number(form.childAge);
      const res = await createBookingAction({
        parent_name: form.parentName.trim(),
        parent_email: form.email.trim(),
        parent_phone: form.phone.trim(),
        student_name: form.childName.trim(),
        student_age: ageNum,
        preferred_time: form.preferredTime,
        experience: form.experience,
        timezone,
        message: form.message,
        referral_code: referralCode,
      });

      if (!res.success) {
        setErrors({ general: res.error?.message || 'Failed to submit demo booking request.' });
        setLoading(false);
        return;
      }

      setLoading(false);
      onSuccess({
        parentName: form.parentName.trim(),
        studentName: form.childName.trim(),
        bookingRef: res.data?.booking_reference || `CHA-${res.data?.id?.slice(0, 8).toUpperCase()}`,
        preferredTime: form.preferredTime,
      });
    } catch (err: any) {
      setErrors({ general: 'A network error occurred. Please check your connection and try again.' });
      setLoading(false);
    }
  };

  const setField = (field: keyof BookDemoFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6" aria-label="Book a demo class form">
      {errors.general && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium flex items-center gap-3"
        >
          <svg className="w-5 h-5 flex-shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <span>{errors.general}</span>
        </div>
      )}

      {/* Parent / Guardian Information */}
      <div>
        <h3 className="font-heading font-bold text-lg text-text-primary mb-1">
          Parent / Guardian Information
        </h3>
        <p className="text-text-secondary text-sm mb-5">Tell us about yourself so we can coordinate your class</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Input
            id="demo-parent-name"
            name="parentName"
            label="Parent / Guardian Name"
            type="text"
            placeholder="e.g. Sarah Johnson"
            value={form.parentName}
            onChange={setField('parentName')}
            error={errors.parentName}
            required
            autoComplete="name"
          />
          <Input
            id="demo-email"
            name="email"
            label="Email Address (for Receipt & Confirmation)"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={setField('email')}
            error={errors.email}
            required
            autoComplete="email"
          />
          <div className="sm:col-span-2">
            <Input
              id="demo-phone"
              name="phone"
              label="WhatsApp / Phone Number (Include Country Code)"
              type="tel"
              placeholder="+1 555 123 4567 or +91 98765 43210"
              value={form.phone}
              onChange={setField('phone')}
              error={errors.phone}
              required
              autoComplete="tel"
            />
            <p className="text-xs text-text-secondary mt-1">
              We send your class confirmation and reminder link via email and WhatsApp.
            </p>
          </div>
        </div>
      </div>

      {/* Student Information */}
      <div className="pt-2 border-t border-border">
        <h3 className="font-heading font-bold text-lg text-text-primary mb-1 mt-4">
          Student Information
        </h3>
        <p className="text-text-secondary text-sm mb-5">Who will be taking this 1-on-1 demo lesson?</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Input
            id="demo-child-name"
            name="studentName"
            label="Student's Full Name"
            type="text"
            placeholder="e.g. Alex Johnson"
            value={form.childName}
            onChange={setField('childName')}
            error={errors.childName}
            required
          />
          <Select
            id="demo-child-age"
            label="Student's Age"
            options={STUDENT_AGE_OPTIONS}
            placeholder="Select student's age"
            value={form.childAge}
            onChange={setField('childAge')}
            error={errors.childAge}
            required
          />
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-text-primary mb-2">
              Chess Experience Level <span className="text-error" aria-hidden="true">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Chess Experience Level">
              {EXPERIENCE_LEVELS.map((level) => {
                const isSelected = form.experience === level.value;
                return (
                  <button
                    key={level.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => {
                      setForm((prev) => ({ ...prev, experience: level.value }));
                      if (errors.experience) {
                        setErrors((prev) => ({ ...prev, experience: undefined }));
                      }
                    }}
                    className={`relative p-3.5 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-accent bg-accent/5 ring-2 ring-accent/30 shadow-sm'
                        : 'border-border bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xl" role="img" aria-hidden="true">{level.icon}</span>
                        <span className="font-heading font-bold text-sm text-text-primary">{level.title}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isSelected
                          ? 'bg-accent text-surface-dark'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {isSelected ? '✓ Selected' : level.badge}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">{level.description}</p>
                  </button>
                );
              })}
            </div>
            {errors.experience && (
              <p className="text-xs text-error mt-2 flex items-center gap-1" role="alert">
                <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.experience}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Scheduling & Availability */}
      <div className="pt-2 border-t border-border">
        <h3 className="font-heading font-bold text-lg text-text-primary mb-1 mt-4">
          Scheduling & Time Zone
        </h3>
        <p className="text-text-secondary text-sm mb-5">When works best for you? Our coaches are available 7 days a week.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Select
            id="demo-time"
            label="Preferred Class Time Window"
            options={TIME_OPTIONS}
            placeholder="Select preferred time"
            value={form.preferredTime}
            onChange={setField('preferredTime')}
            error={errors.preferredTime}
            required
          />
          <Select
            id="demo-timezone"
            label="Your Local Time Zone"
            options={TIMEZONE_OPTIONS}
            placeholder="Select time zone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          />
          <div className="sm:col-span-2">
            <Select
              id="demo-referral"
              label="How Did You Hear About Us? (Optional)"
              options={REFERRAL_OPTIONS}
              placeholder="Select source"
              value={form.referralSource}
              onChange={setField('referralSource')}
            />
          </div>
          <div className="sm:col-span-2">
            <Textarea
              id="demo-message"
              label="Learning Goals or Questions (Optional)"
              placeholder="Tell us what the student wants to improve (e.g., tactics, tournament play, opening repertoire)..."
              value={form.message}
              onChange={setField('message')}
              rows={3}
            />
          </div>
        </div>
      </div>

      <Button
        type="submit"
        variant="gold"
        size="lg"
        loading={loading}
        className="w-full text-base font-bold shadow-lg"
      >
        {loading ? 'Submitting Your Request...' : 'Book My Free Demo Class →'}
      </Button>

      <div className="text-center space-y-1">
        <p className="text-xs text-text-secondary">
          🔒 By submitting, you request a free 1-on-1 demo lesson. No credit card required.
        </p>
        <p className="text-xs text-text-secondary">
          We respect your privacy under our{' '}
          <a href="/privacy-policy" className="text-primary underline hover:text-primary-dark">
            Privacy Policy
          </a>
          . We never share personal details.
        </p>
      </div>
    </form>
  );
}
