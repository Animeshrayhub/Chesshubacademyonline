'use client';

import React, { useState, useTransition } from 'react';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import StatusBadge from '@/components/dashboard/ui/StatusBadge';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import TableActions, { type TableActionItem } from '@/components/dashboard/ui/TableActions';
import Link from 'next/link';

import { updateCoachProfileAction, removeCoachAssignmentAction } from '@/actions/coaches';

import type { AdminCoachRow } from '@/types/dashboard';

const FIDE_TITLE_OPTIONS = [
  { value: 'GM', label: 'GM — Grandmaster' },
  { value: 'IM', label: 'IM — International Master' },
  { value: 'WGM', label: 'WGM — Woman Grandmaster' },
  { value: 'WIM', label: 'WIM — Woman International Master' },
  { value: 'FM', label: 'FM — FIDE Master' },
  { value: 'WFM', label: 'WFM — Woman FIDE Master' },
  { value: 'CM', label: 'CM — Candidate Master' },
  { value: 'WCM', label: 'WCM — Woman Candidate Master' },
  { value: 'Coach', label: 'Coach — Academy Instructor' },
];

interface CoachProfileDetailProps {
  coach: AdminCoachRow & { students: Array<{ id: string; first_name: string; last_name: string; email: string }> };
}

export default function CoachProfileDetail({ coach }: CoachProfileDetailProps) {
  const [, startTransition] = useTransition();

  // Extract JSON configuration from coach bio
  const getBioData = () => {
    try {
      const parsed = JSON.parse(coach.profile?.bio || '');
      return {
        text: parsed.text || '',
        fideId: parsed.fideId || '',
        fideRating: parsed.fideRating ? String(parsed.fideRating) : '',
        country: parsed.country || '',
      };
    } catch (e) {
      return {
        text: coach.profile?.bio || '',
        fideId: '',
        fideRating: '',
        country: '',
      };
    }
  };

  const bioData = getBioData();

  const [title, setTitle] = useState(coach.profile?.title ?? 'GM');
  const [whatsapp, setWhatsapp] = useState(coach.profile?.whatsapp ?? '');
  const [experienceYears, setExperienceYears] = useState(String(coach.profile?.experience_years ?? 10));
  const [languages, setLanguages] = useState(coach.profile?.languages?.join(', ') ?? 'English');
  
  // Custom metadata fields
  const [bio, setBio] = useState(bioData.text);
  const [fideId, setFideId] = useState(bioData.fideId);
  const [fideRating, setFideRating] = useState(bioData.fideRating);
  const [country, setCountry] = useState(bioData.country);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setMessage(null);

    const serializedBio = JSON.stringify({
      text: bio,
      fideId: fideId || null,
      fideRating: fideRating ? parseInt(fideRating, 10) : null,
      country: country || null,
    });

    const res = await updateCoachProfileAction(coach.id, {
      title,
      whatsapp,
      experienceYears: parseInt(experienceYears, 10) || 0,
      languages: languages.split(',').map((l) => l.trim()).filter(Boolean),
      bio: serializedBio,
    });

    setSaveLoading(false);
    if (res.success) {
      setMessage({ type: 'success', text: 'Coach registry details updated successfully.' });
    } else {
      setMessage({ type: 'error', text: res.error?.message || 'Failed to update details.' });
    }
  };

  const handleRemoveStudent = (studentId: string) => {
    startTransition(async () => {
      const res = await removeCoachAssignmentAction(studentId, coach.id);
      if (res.success) {
        setMessage({ type: 'success', text: 'Student assignment removed.' });
      } else {
        setMessage({ type: 'error', text: res.error?.message || 'Failed to remove assignment.' });
      }
    });
  };

  const columns = [
    { key: 'name', label: 'Student' },
    { key: 'email', label: 'Email' },
    { key: 'actions', label: 'Actions', width: 'w-10' },
  ];

  const rows = coach.students.map((s) => {
    const actions: TableActionItem[] = [
      {
        label: 'View Profile',
        iconKey: 'eye',
        onClick: () => { window.location.href = `/dashboard/admin/students/${s.id}`; },
      },
      {
        label: 'Remove Assignment',
        iconKey: 'x',
        variant: 'danger',
        onClick: () => handleRemoveStudent(s.id),
      },
    ];

    return {
      name: (
        <Link href={`/dashboard/admin/students/${s.id}`} className="font-bold text-text-primary hover:text-primary transition-colors">
          {s.first_name} {s.last_name}
        </Link>
      ),
      email: <span className="text-xs text-text-secondary">{s.email}</span>,
      actions: <TableActions actions={actions} />,
    };
  });

  let status = 'active';
  if (coach.archived_at) status = 'archived';
  else if (!coach.is_active) status = 'disabled';

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Coach Profile: ${coach.first_name} ${coach.last_name}`}
        subtitle="Track title, chess credentials, contact profiles, and manage student assignments."
      />

      {message && (
        <div className={`p-4 rounded-xl border text-xs font-semibold ${message.type === 'success' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-border p-6 space-y-6 h-fit">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-24 h-24 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 text-3xl font-bold font-heading">
              {coach.first_name.charAt(0)}{coach.last_name.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-text-primary text-lg">Coach {coach.first_name} {coach.last_name}</h3>
              <p className="text-xs text-text-secondary">{coach.email}</p>
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              <StatusBadge status={status} />
              <span className="text-xs font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 border border-purple-100 rounded-full">{title}</span>
            </div>
          </div>

          <div className="pt-6 border-t border-border space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-text-secondary font-semibold">Active Students:</span>
              <span className="text-text-primary font-bold">{coach.students.length} Learners</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary font-semibold">Experience:</span>
              <span className="text-text-primary font-bold">{experienceYears} Years</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary font-semibold">Languages:</span>
              <span className="text-text-primary font-bold">{languages}</span>
            </div>
            {fideId && (
              <div className="flex justify-between">
                <span className="text-text-secondary font-semibold">FIDE ID:</span>
                <span className="text-text-primary font-bold">{fideId}</span>
              </div>
            )}
            {fideRating && (
              <div className="flex justify-between">
                <span className="text-text-secondary font-semibold">FIDE Rating:</span>
                <span className="text-text-primary font-bold">{fideRating}</span>
              </div>
            )}
            {country && (
              <div className="flex justify-between">
                <span className="text-text-secondary font-semibold">Country:</span>
                <span className="text-text-primary font-bold">{country}</span>
              </div>
            )}
          </div>
        </div>

        {/* Edit Form & Students */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-border p-6">
            <h3 className="text-sm font-bold text-text-primary border-b border-border pb-3 mb-5">Coach Settings & Profile Details</h3>
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Select
                  id="cpd-title"
                  label="FIDE Title / Professional Rank"
                  options={FIDE_TITLE_OPTIONS}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <Input
                  id="cpd-experience"
                  label="Years of Professional Experience"
                  type="number"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  required
                />
                <Input
                  id="cpd-whatsapp"
                  label="Contact Phone / WhatsApp Profile"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  required
                />
                <Input
                  id="cpd-languages"
                  label="Languages Spoken (comma separated)"
                  value={languages}
                  onChange={(e) => setLanguages(e.target.value)}
                  required
                />
                
                {/* Custom Metadata Fields */}
                <Input
                  id="cpd-fideId"
                  label="FIDE ID (optional)"
                  placeholder="e.g. 12503111"
                  value={fideId}
                  onChange={(e) => setFideId(e.target.value)}
                />
                <Input
                  id="cpd-fideRating"
                  label="FIDE Rating (optional)"
                  type="number"
                  placeholder="2450"
                  value={fideRating}
                  onChange={(e) => setFideRating(e.target.value)}
                />
                <div className="sm:col-span-2">
                  <Input
                    id="cpd-country"
                    label="Country (optional)"
                    placeholder="Germany"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <Textarea
                    id="cpd-bio"
                    label="Instructor Biography"
                    placeholder="Short description of career achievements..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t border-border">
                <Button type="submit" variant="gold" loading={saveLoading} className="px-6 text-sm font-bold shadow-gold">
                  Save Profile Settings
                </Button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
            <h3 className="text-sm font-bold text-text-primary border-b border-border pb-3">Assigned Students Registry</h3>
            <DashboardTable
              columns={columns}
              rows={rows}
              emptyTitle="No Students Assigned"
              emptyDescription="Use the Student profiles registry to assign students to this coach."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
