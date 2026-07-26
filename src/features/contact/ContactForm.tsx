'use client';

import { useState } from 'react';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';

const SUBJECT_OPTIONS = [
  { value: 'general', label: 'General Inquiry' },
  { value: 'programs', label: 'Programs & Pricing' },
  { value: 'booking', label: 'Book a Demo' },
  { value: 'technical', label: 'Technical Support' },
  { value: 'other', label: 'Other' },
];

interface FormState {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
}

export default function ContactForm() {
  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!form.name.trim()) newErrors.name = 'Your name is required.';
    if (!form.email.trim()) newErrors.email = 'Your email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      newErrors.email = 'Please enter a valid email address.';
    if (!form.message.trim() || form.message.trim().length < 10)
      newErrors.message = 'Message must be at least 10 characters.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    // Simulate network request
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="text-center py-16 px-8">
        <div className="w-20 h-20 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center mx-auto mb-6">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-green-500" aria-hidden="true">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className="font-heading text-2xl font-bold text-text-primary mb-3">
          Message Received!
        </h3>
        <p className="text-text-secondary mb-6">
          Thank you for reaching out, <strong>{form.name}</strong>. We will respond to{' '}
          <strong>{form.email}</strong> within 24 hours.
        </p>
        <button
          type="button"
          onClick={() => { setSubmitted(false); setForm({ name: '', email: '', phone: '', subject: '', message: '' }); }}
          className="text-primary font-semibold hover:text-primary-dark transition-colors"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5" aria-label="Contact form">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Input
          id="contact-name"
          label="Your Name"
          type="text"
          placeholder="e.g. Sarah Johnson"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          error={errors.name}
          required
          autoComplete="name"
        />
        <Input
          id="contact-email"
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          error={errors.email}
          required
          autoComplete="email"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Input
          id="contact-phone"
          label="Phone Number"
          type="tel"
          placeholder="+1 555 123 4567"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          autoComplete="tel"
        />
        <Select
          id="contact-subject"
          label="Subject"
          options={SUBJECT_OPTIONS}
          placeholder="Select a subject"
          value={form.subject}
          onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
        />
      </div>
      <Textarea
        id="contact-message"
        label="Message"
        placeholder="Tell us how we can help..."
        value={form.message}
        onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
        error={errors.message}
        required
        rows={6}
      />
      <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
        {loading ? 'Sending...' : 'Send Message'}
      </Button>
    </form>
  );
}
