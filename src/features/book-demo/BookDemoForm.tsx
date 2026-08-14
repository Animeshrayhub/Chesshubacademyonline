'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import type { BookDemoFormData } from '@/types';
import { createBookingAction } from '@/actions/bookings';

const EXPERIENCE_OPTIONS = [
  { value: 'none', label: 'No experience — complete beginner' },
  { value: 'basics', label: 'Knows the rules, limited play' },
  { value: 'club', label: 'Club player (no FIDE rating)' },
  { value: 'rated-below-1000', label: 'FIDE rated below 1000' },
  { value: 'rated-1000-1500', label: 'FIDE rated 1000–1500' },
  { value: 'rated-above-1500', label: 'FIDE rated above 1500' },
];

const TIME_OPTIONS = [
  { value: 'morning-weekday', label: 'Weekday Morning (9–12 PM IST)' },
  { value: 'afternoon-weekday', label: 'Weekday Afternoon (2–5 PM IST)' },
  { value: 'evening-weekday', label: 'Weekday Evening (6–9 PM IST)' },
  { value: 'weekend-morning', label: 'Weekend Morning (9–12 PM IST)' },
  { value: 'weekend-afternoon', label: 'Weekend Afternoon (2–5 PM IST)' },
  { value: 'flexible', label: 'Flexible — any time works' },
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

const CHILD_AGE_OPTIONS = Array.from({ length: 13 }, (_, i) => ({
  value: String(i + 6),
  label: `${i + 6} years old`,
}));

interface FormErrors {
  parentName?: string;
  email?: string;
  phone?: string;
  childName?: string;
  childAge?: string;
  experience?: string;
  preferredTime?: string;
}

interface BookDemoFormProps {
  onSuccess: (name: string) => void;
}

export default function BookDemoForm({ onSuccess }: BookDemoFormProps) {
  const searchParams = useSearchParams();
  const [referralCode, setReferralCode] = useState<string | undefined>(undefined);
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
    const refParam = searchParams?.get('ref');
    if (refParam) {
      setReferralCode(refParam);
      setForm((f) => ({ ...f, referralSource: 'friend' }));
    }
  }, [searchParams]);

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.parentName.trim()) e.parentName = 'Parent name is required.';
    if (!form.email.trim()) e.email = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Please enter a valid email address.';
    if (!form.phone.trim()) e.phone = 'Phone number is required.';
    if (!form.childName.trim()) e.childName = "Child's name is required.";
    if (!form.childAge) e.childAge = "Child's age is required.";
    if (!form.experience) e.experience = 'Chess experience level is required.';
    if (!form.preferredTime) e.preferredTime = 'Preferred class time is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await createBookingAction({
        parent_name: form.parentName,
        parent_email: form.email,
        parent_phone: form.phone,
        student_name: form.childName,
        student_age: Number(form.childAge),
        preferred_time: form.preferredTime,
        referral_code: referralCode,
      });

      if (!res.success) {
        setErrors({ parentName: res.error?.message || 'Failed to submit booking' });
        setLoading(false);
        return;
      }

      setLoading(false);
      onSuccess(form.parentName);
    } catch (err) {
      setErrors({ parentName: 'An unexpected error occurred. Please try again.' });
      setLoading(false);
    }
  };

  const setField = (field: keyof BookDemoFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6" aria-label="Book a demo class form">
      <div>
        <h3 className="font-heading font-bold text-lg text-text-primary mb-1">
          Parent / Guardian Information
        </h3>
        <p className="text-text-secondary text-sm mb-5">Tell us about yourself</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Input
            id="demo-parent-name"
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
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={setField('email')}
            error={errors.email}
            required
            autoComplete="email"
          />
          <Input
            id="demo-phone"
            label="WhatsApp / Phone Number"
            type="tel"
            placeholder="+1 555 123 4567"
            value={form.phone}
            onChange={setField('phone')}
            error={errors.phone}
            required
            autoComplete="tel"
          />
        </div>
      </div>

      <div className="pt-2 border-t border-border">
        <h3 className="font-heading font-bold text-lg text-text-primary mb-1 mt-4">
          Student Information
        </h3>
        <p className="text-text-secondary text-sm mb-5">Tell us about your child</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Input
            id="demo-child-name"
            label="Child's Name"
            type="text"
            placeholder="e.g. Alex Johnson"
            value={form.childName}
            onChange={setField('childName')}
            error={errors.childName}
            required
          />
          <Select
            id="demo-child-age"
            label="Child's Age"
            options={CHILD_AGE_OPTIONS}
            placeholder="Select age"
            value={form.childAge}
            onChange={setField('childAge')}
            error={errors.childAge}
            required
          />
          <div className="sm:col-span-2">
            <Select
              id="demo-experience"
              label="Chess Experience Level"
              options={EXPERIENCE_OPTIONS}
              placeholder="Select experience level"
              value={form.experience}
              onChange={setField('experience')}
              error={errors.experience}
              required
            />
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-border">
        <h3 className="font-heading font-bold text-lg text-text-primary mb-1 mt-4">
          Scheduling
        </h3>
        <p className="text-text-secondary text-sm mb-5">When works best for you?</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Select
            id="demo-time"
            label="Preferred Class Time"
            options={TIME_OPTIONS}
            placeholder="Select preferred time"
            value={form.preferredTime}
            onChange={setField('preferredTime')}
            error={errors.preferredTime}
            required
          />
          <Select
            id="demo-referral"
            label="How Did You Hear About Us?"
            options={REFERRAL_OPTIONS}
            placeholder="Select source"
            value={form.referralSource}
            onChange={setField('referralSource')}
          />
          <div className="sm:col-span-2">
            <Textarea
              id="demo-message"
              label="Any Additional Information (Optional)"
              placeholder="Any specific goals, questions, or information about your child's chess experience..."
              value={form.message}
              onChange={setField('message')}
              rows={4}
            />
          </div>
        </div>
      </div>

      <Button
        type="submit"
        variant="gold"
        size="lg"
        loading={loading}
        className="w-full text-base font-bold"
      >
        {loading ? 'Booking Your Demo...' : 'Book My Free Demo Class →'}
      </Button>

      <p className="text-center text-xs text-text-secondary">
        By submitting this form, you agree to our{' '}
        <a href="/privacy-policy" className="text-primary underline hover:text-primary-dark">
          Privacy Policy
        </a>
        . We will never share your information.
      </p>
    </form>
  );
}
