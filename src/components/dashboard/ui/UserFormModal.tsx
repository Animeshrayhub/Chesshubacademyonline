'use client';

import React, { useState, useEffect } from 'react';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import DashboardIcon from '@/components/dashboard/ui/DashboardIcon';

const LANGUAGE_OPTIONS = [
  { value: 'English', label: 'English' },
  { value: 'Spanish', label: 'Spanish' },
  { value: 'French', label: 'French' },
  { value: 'German', label: 'German' },
  { value: 'Hindi', label: 'Hindi' },
  { value: 'Russian', label: 'Russian' },
];

const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC (GMT)' },
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
  { value: 'America/New_York', label: 'Eastern Standard Time (EST)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AEST)' },
];

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Academy Admin' },
  { value: 'COACH', label: 'FIDE Coach' },
  { value: 'STUDENT', label: 'Student' },
];

const STUDENT_LEVEL_OPTIONS = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
];

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<{ success: boolean; error?: any }>;
  initialData?: any;
  title?: string;
  coaches?: any[];
}

export default function UserFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  title,
  coaches,
}: UserFormModalProps) {
  const isEdit = !!initialData;
  const [role, setRole] = useState<'ADMIN' | 'COACH' | 'STUDENT'>('STUDENT');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    language: 'English',
    timezone: 'UTC',
    avatarUrl: '',
    title: 'Coach',
    experienceYears: '0',
    bio: '',
    age: '10',
    level: 'BEGINNER',
    parentName: '',
    parentWhatsapp: '',
    notes: '',
    // Extended fields
    fideId: '',
    fideRating: '',
    country: '',
    emergencyContact: '',
    lichessUsername: '',
    assignedCoachId: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setRole(initialData.role);

        // Safe JSON parsing of notes / bio
        let notesText = initialData.profile?.notes || '';
        let studentFideRating = '';
        let studentCountry = '';
        let emergencyContactVal = '';
        let studentPhone = '';
        let studentLichessUsername = '';

        if (initialData.profile?.notes) {
          try {
            const parsed = JSON.parse(initialData.profile.notes);
            notesText = parsed.text || '';
            studentFideRating = parsed.fideRating ? String(parsed.fideRating) : '';
            studentCountry = parsed.country || '';
            emergencyContactVal = parsed.emergencyContact || '';
            studentPhone = parsed.phone || '';
            studentLichessUsername = parsed.lichessUsername || '';
          } catch (e) {
            notesText = initialData.profile.notes;
          }
        }

        let bioText = initialData.profile?.bio || '';
        let coachFideId = '';
        let coachFideRating = '';
        let coachCountry = '';

        if (initialData.profile?.bio) {
          try {
            const parsed = JSON.parse(initialData.profile.bio);
            bioText = parsed.text || '';
            coachFideId = parsed.fideId || '';
            coachFideRating = parsed.fideRating ? String(parsed.fideRating) : '';
            coachCountry = parsed.country || '';
          } catch (e) {
            bioText = initialData.profile.bio;
          }
        }

        setFormData({
          firstName: initialData.first_name || '',
          lastName: initialData.last_name || '',
          email: initialData.email || '',
          phone: initialData.profile?.whatsapp || initialData.profile?.parent_whatsapp || studentPhone || '',
          password: '',
          confirmPassword: '',
          language: initialData.profile?.languages?.[0] || 'English',
          timezone: initialData.timezone || 'UTC',
          avatarUrl: initialData.profile?.photo_url || '',
          title: initialData.profile?.title || 'Coach',
          experienceYears: String(initialData.profile?.experience_years ?? 0),
          bio: bioText,
          age: String(initialData.profile?.age ?? 10),
          level: initialData.profile?.level || 'BEGINNER',
          parentName: initialData.profile?.parent_name || '',
          parentWhatsapp: initialData.profile?.parent_whatsapp || '',
          notes: notesText,
          fideId: coachFideId,
          fideRating: coachFideRating || studentFideRating,
          country: coachCountry || studentCountry,
          emergencyContact: emergencyContactVal,
          lichessUsername: studentLichessUsername,
          assignedCoachId: initialData.assigned_coach?.id || '',
        });
      } else {
        setRole('STUDENT');
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          password: '',
          confirmPassword: '',
          language: 'English',
          timezone: 'Asia/Kolkata',
          avatarUrl: '',
          title: 'Coach',
          experienceYears: '0',
          bio: '',
          age: '10',
          level: 'BEGINNER',
          parentName: '',
          parentWhatsapp: '',
          notes: '',
          fideId: '',
          fideRating: '',
          country: '',
          emergencyContact: '',
          lichessUsername: '',
          assignedCoachId: '',
        });
      }
      setErrors({});
    }
  }, [isOpen, initialData]);

  // Escape key and background scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalStyle;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.firstName.trim()) errs.firstName = 'First name is required';
    if (!formData.lastName.trim()) errs.lastName = 'Last name is required';
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
      errs.email = 'Valid email is required';
    }
    if (!isEdit) {
      if (!formData.password) errs.password = 'Password is required';
      else if (formData.password.length < 6) errs.password = 'Password must be at least 6 characters';
      if (formData.password !== formData.confirmPassword) {
        errs.confirmPassword = 'Passwords do not match';
      }
    }
    if (role === 'COACH') {
      if (!formData.title.trim()) errs.title = 'Coach title is required (e.g. GM, IM)';
      if (!formData.phone.trim()) errs.phone = 'WhatsApp number is required';
      if (!formData.bio.trim()) errs.bio = 'Bio is required';
    }
    if (role === 'STUDENT') {
      if (!formData.parentName.trim()) errs.parentName = 'Parent name is required';
      if (!formData.parentWhatsapp.trim()) errs.parentWhatsapp = 'Parent WhatsApp is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleTextChange = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((f) => ({ ...f, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    const parsedData: any = {
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      username: formData.email.split('@')[0],
      role,
      timezone: formData.timezone,
      languages: [formData.language],
      phone: formData.phone,
      avatarUrl: formData.avatarUrl || null,
    };

    if (!isEdit) {
      parsedData.password = formData.password;
    }

    if (role === 'COACH') {
      parsedData.title = formData.title;
      parsedData.whatsapp = formData.phone;
      parsedData.experienceYears = parseInt(formData.experienceYears, 10) || 0;
      // Serialize bio as JSON to store fideId, fideRating, country alongside raw text bio
      parsedData.bio = JSON.stringify({
        text: formData.bio,
        fideId: formData.fideId || null,
        fideRating: formData.fideRating ? parseInt(formData.fideRating, 10) : null,
        country: formData.country || null,
      });
      parsedData.photoUrl = formData.avatarUrl || null;
      // Also pass fields as root level if backend schemas dynamically unpack them
      parsedData.fideId = formData.fideId || null;
      parsedData.fideRating = formData.fideRating ? parseInt(formData.fideRating, 10) : null;
      parsedData.country = formData.country || null;
    } else if (role === 'STUDENT') {
      parsedData.age = parseInt(formData.age, 10) || 10;
      parsedData.level = formData.level;
      parsedData.parentName = formData.parentName;
      parsedData.parentWhatsapp = formData.parentWhatsapp;
      parsedData.phone = formData.phone;
      parsedData.lichessUsername = formData.lichessUsername || null;
      parsedData.assignedCoachId = formData.assignedCoachId || null;
      parsedData.country = formData.country || null;

      // Serialize notes as JSON
      parsedData.notes = JSON.stringify({
        text: formData.notes,
        fideRating: formData.fideRating ? parseInt(formData.fideRating, 10) : null,
        country: formData.country || null,
        emergencyContact: formData.emergencyContact || null,
        phone: formData.phone || null,
        lichessUsername: formData.lichessUsername || null,
      });
      parsedData.fideRating = formData.fideRating ? parseInt(formData.fideRating, 10) : null;
      parsedData.emergencyContact = formData.emergencyContact || null;
    }

    const res = await onSubmit(parsedData);
    setLoading(false);

    if (res.success) {
      onClose();
    } else {
      setErrors({ apiError: res.error?.message || 'Something went wrong' });
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-surface-dark/45 backdrop-blur-xs" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-55 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4">
        <div className="bg-white rounded-2xl border border-border shadow-card-hover overflow-hidden">
          <div className="flex items-center justify-between border-b border-border p-6">
            <h3 className="text-lg font-bold text-text-primary">
              {title || (isEdit ? 'Edit User Profile' : 'Onboard New Academy Member')}
            </h3>
            <button onClick={onClose} className="p-1 rounded-lg text-text-secondary hover:bg-surface-light">
              <DashboardIcon iconKey="x" className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {errors.apiError && (
              <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-600">
                {errors.apiError}
              </div>
            )}

            {/* Basic Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input id="ufm-firstName" label="First Name" placeholder="e.g. John" value={formData.firstName} onChange={handleTextChange('firstName')} error={errors.firstName} required />
              <Input id="ufm-lastName" label="Last Name" placeholder="e.g. Doe" value={formData.lastName} onChange={handleTextChange('lastName')} error={errors.lastName} required />
              <Input id="ufm-email" label="Email Address" type="email" placeholder="john.doe@example.com" value={formData.email} onChange={handleTextChange('email')} error={errors.email} required disabled={isEdit} />
              <Select id="ufm-role" label="Academy Role" options={ROLE_OPTIONS} value={role} onChange={(e) => setRole(e.target.value as any)} disabled={isEdit} />
            </div>

            {!isEdit && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
                <Input id="ufm-password" label="Password" type="password" placeholder="Min 6 characters" value={formData.password} onChange={handleTextChange('password')} error={errors.password} required />
                <Input id="ufm-confirmPassword" label="Confirm Password" type="password" placeholder="Repeat password" value={formData.confirmPassword} onChange={handleTextChange('confirmPassword')} error={errors.confirmPassword} required />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
              <Select id="ufm-language" label="Language Preference" options={LANGUAGE_OPTIONS} value={formData.language} onChange={handleTextChange('language')} />
              <Select id="ufm-timezone" label="Preferred Timezone" options={TIMEZONE_OPTIONS} value={formData.timezone} onChange={handleTextChange('timezone')} />
              <div className="md:col-span-2">
                <Input id="ufm-avatarUrl" label="Avatar URL (Optional)" placeholder="https://example.com/avatar.jpg" value={formData.avatarUrl} onChange={handleTextChange('avatarUrl')} />
              </div>
            </div>

            {role === 'COACH' && (
              <div className="space-y-4 pt-4 border-t border-border">
                <h4 className="text-sm font-bold text-text-primary">FIDE Coach Profile Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input id="ufm-title" label="FIDE Title (e.g. GM, IM, Coach)" placeholder="GM" value={formData.title} onChange={handleTextChange('title')} error={errors.title} required />
                  <Input id="ufm-expYears" label="Years of Chess Experience" type="number" value={formData.experienceYears} onChange={handleTextChange('experienceYears')} />
                  <Input id="ufm-phone" label="WhatsApp / Phone" placeholder="+1 (555) 000-0000" value={formData.phone} onChange={handleTextChange('phone')} error={errors.phone} required />
                  
                  {/* Extended coach fields */}
                  <Input id="ufm-fideId" label="FIDE ID (optional)" placeholder="e.g. 12503111" value={formData.fideId} onChange={handleTextChange('fideId')} />
                  <Input id="ufm-fideRating" label="FIDE Rating (optional)" type="number" placeholder="2100" value={formData.fideRating} onChange={handleTextChange('fideRating')} />
                  <Input id="ufm-coachCountry" label="Country (optional)" placeholder="Germany" value={formData.country} onChange={handleTextChange('country')} />

                  <div className="md:col-span-2">
                    <Textarea id="ufm-bio" label="Biography" placeholder="FIDE Grandmaster since 2015..." value={formData.bio} onChange={handleTextChange('bio')} error={errors.bio} rows={3} required />
                  </div>
                </div>
              </div>
            )}

            {role === 'STUDENT' && (
              <div className="space-y-4 pt-4 border-t border-border">
                <h4 className="text-sm font-bold text-text-primary">Student Profile Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input id="ufm-age" label="Student Age" type="number" value={formData.age} onChange={handleTextChange('age')} />
                  <Select id="ufm-level" label="Chess Skill Level" options={STUDENT_LEVEL_OPTIONS} value={formData.level} onChange={handleTextChange('level')} />
                  <Input id="ufm-parentName" label="Parent / Guardian Name" placeholder="Sarah Doe" value={formData.parentName} onChange={handleTextChange('parentName')} error={errors.parentName} required />
                  <Input id="ufm-parentPhone" label="Parent WhatsApp / Phone" placeholder="+1 (555) 111-2222" value={formData.parentWhatsapp} onChange={handleTextChange('parentWhatsapp')} error={errors.parentWhatsapp} required />
                  
                  {/* Extended student fields */}
                  <Input id="ufm-phone" label="Student WhatsApp / Phone (optional)" placeholder="+1 (555) 000-0000" value={formData.phone} onChange={handleTextChange('phone')} />
                  <Input id="ufm-studentCountry" label="Country (optional)" placeholder="India" value={formData.country} onChange={handleTextChange('country')} />
                  <Input id="ufm-studentRating" label="Current Chess Rating (optional)" type="number" placeholder="1200" value={formData.fideRating} onChange={handleTextChange('fideRating')} />
                  <Input id="ufm-lichessUsername" label="Lichess Username (optional)" placeholder="e.g. ChessPro2026" value={formData.lichessUsername} onChange={handleTextChange('lichessUsername')} />
                  
                  {/* Assigned Coach */}
                  {coaches && coaches.length > 0 && (
                    <Select
                      id="ufm-assignedCoachId"
                      label="Assigned Coach"
                      options={[
                        { value: '', label: 'Unassigned' },
                        ...coaches.map((c: any) => ({
                          value: c.id,
                          label: `${c.profile?.title || 'Coach'} ${c.first_name} ${c.last_name}`,
                        })),
                      ]}
                      value={formData.assignedCoachId}
                      onChange={handleTextChange('assignedCoachId')}
                    />
                  )}
                  <Input id="ufm-emergencyContact" label="Emergency Contact (optional)" placeholder="+1 (555) 333-4444" value={formData.emergencyContact} onChange={handleTextChange('emergencyContact')} />

                  <div className="md:col-span-2">
                    <Textarea id="ufm-notes" label="Academic Notes / Specific Goals" placeholder="Prefers tactical openings..." value={formData.notes} onChange={handleTextChange('notes')} rows={2} />
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-border">
              <button type="button" onClick={onClose} className="px-4 py-2 border border-border bg-white text-text-primary hover:bg-surface-light rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none">
                Cancel
              </button>
              <Button type="submit" variant="gold" loading={loading} className="px-6 text-sm font-bold shadow-gold">
                {isEdit ? 'Save Changes' : 'Create Account'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
