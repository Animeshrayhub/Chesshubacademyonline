'use client';

import React, { useState } from 'react';
import PageHeader from './PageHeader';

interface DemoLead {
  id: string;
  studentName: string;
  parentPhone: string;
  city: string;
  intent: 'Hot 🔥' | 'Warm ☀️' | 'Cold ❄️';
  status: 'Scheduled' | 'Attended' | 'Enrolled 🎓' | 'Follow-Up Needed';
  preferredTime: string;
  notes: string;
}

const INITIAL_DEMO_LEADS: DemoLead[] = [
  {
    id: 'lead-1',
    studentName: 'Aarav Sharma',
    parentPhone: '917008665245',
    city: 'Mumbai',
    intent: 'Hot 🔥',
    status: 'Scheduled',
    preferredTime: 'Today 5:00 PM IST',
    notes: 'Parent looking for FIDE certified coach for 10yr old beginner.',
  },
  {
    id: 'lead-2',
    studentName: 'Ananya Patel',
    parentPhone: '917008665245',
    city: 'London',
    intent: 'Hot 🔥',
    status: 'Attended',
    preferredTime: 'Yesterday 6:30 PM BST',
    notes: 'Attended demo with Coach Manoj. Excited to enroll in Monthly Pro Plan.',
  },
  {
    id: 'lead-3',
    studentName: 'Rohan Gupta',
    parentPhone: '917008665245',
    city: 'New York',
    intent: 'Warm ☀️',
    status: 'Follow-Up Needed',
    preferredTime: 'Tomorrow 7:00 PM EST',
    notes: 'Wants weekend slot only for 1v1 online training.',
  },
  {
    id: 'lead-4',
    studentName: 'Kabir Mehta',
    parentPhone: '917008665245',
    city: 'Dubai',
    intent: 'Hot 🔥',
    status: 'Enrolled 🎓',
    preferredTime: 'Enrolled in Cohort B',
    notes: 'Paid subscription via Stripe. Assigned to Coach Animesh Ray.',
  },
];

export default function AdminDemoLeadCrm() {
  const [leads, setLeads] = useState<DemoLead[]>(INITIAL_DEMO_LEADS);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [intentFilter, setIntentFilter] = useState('ALL');

  const filteredLeads = leads.filter((item) => {
    const statusMatch = statusFilter === 'ALL' || item.status === statusFilter;
    const intentMatch = intentFilter === 'ALL' || item.intent === intentFilter;
    return statusMatch && intentMatch;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Demo Booking CRM & Lead Tracker"
        subtitle="Track free demo bookings, student intent scores, follow-ups, and direct WhatsApp chats."
      />

      {/* Filter Toolbar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-white">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Lead Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
            >
              <option value="ALL">All Statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Attended">Attended</option>
              <option value="Follow-Up Needed">Follow-Up Needed</option>
              <option value="Enrolled 🎓">Enrolled 🎓</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Lead Intent
            </label>
            <select
              value={intentFilter}
              onChange={(e) => setIntentFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
            >
              <option value="ALL">All Intent Scores</option>
              <option value="Hot 🔥">Hot 🔥</option>
              <option value="Warm ☀️">Warm ☀️</option>
              <option value="Cold ❄️">Cold ❄️</option>
            </select>
          </div>
        </div>

        <span className="text-xs font-bold text-slate-400">
          Showing {filteredLeads.length} Demo Leads
        </span>
      </div>

      {/* CRM Lead Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl text-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
              <tr>
                <th className="p-4">Student & Location</th>
                <th className="p-4">Intent</th>
                <th className="p-4">Status</th>
                <th className="p-4">Time Slot</th>
                <th className="p-4">Notes</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 font-medium">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-950/60 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-white text-sm">{lead.studentName}</div>
                    <div className="text-[11px] text-slate-400">{lead.city} • +{lead.parentPhone}</div>
                  </td>

                  <td className="p-4">
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                        lead.intent === 'Hot 🔥'
                          ? 'bg-red-500/10 text-red-400 border-red-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {lead.intent}
                    </span>
                  </td>

                  <td className="p-4">
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                        lead.status === 'Enrolled 🎓'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : lead.status === 'Scheduled'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      }`}
                    >
                      {lead.status}
                    </span>
                  </td>

                  <td className="p-4 font-mono text-slate-300">{lead.preferredTime}</td>
                  <td className="p-4 text-slate-400 max-w-xs truncate">{lead.notes}</td>

                  <td className="p-4 text-right">
                    <a
                      href={`https://wa.me/${lead.parentPhone}?text=Hello%20parent%20of%20${encodeURIComponent(
                        lead.studentName
                      )}%2C%20welcome%20to%20ChessHub%20Academy!`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-extrabold rounded-xl transition-all"
                    >
                      <span>💬 WhatsApp Chat</span>
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
