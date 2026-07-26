'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';

interface MakeupClassRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MakeupClassRequestModal({ isOpen, onClose }: MakeupClassRequestModalProps) {
  const [selectedClass, setSelectedClass] = useState('');
  const [reason, setReason] = useState('School Exam');
  const [preferredDate, setPreferredDate] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl relative text-white">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-lg">
              📅
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-purple-300">
                Request Makeup / Reschedule Class
              </h3>
              <p className="text-xs text-slate-400">Select a missed or upcoming class to request a makeup slot.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              setSubmitted(false);
            }}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-sm"
          >
            ✕
          </button>
        </div>

        {submitted ? (
          <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-3">
            <div className="text-4xl">🎉</div>
            <h4 className="text-base font-bold text-emerald-300">Makeup Request Submitted!</h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Your coach and academy admin have been notified. You will receive a WhatsApp/email confirmation once your makeup slot is confirmed.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                onClose();
                setSubmitted(false);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold w-full py-2"
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Select Class to Reschedule</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="">-- Choose Class Session --</option>
                <option value="cls-1">Live Session: King & Pawn Endgames (July 20, 2026)</option>
                <option value="cls-2">Live Session: Tactical Mates in 2 (July 22, 2026)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Reason for Reschedule</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="School Exam">School Exams / Homework</option>
                <option value="Illness / Health">Medical / Health Issue</option>
                <option value="Family Travel">Family Travel / Vacation</option>
                <option value="Internet Issue">Technical / Power Outage</option>
                <option value="Other">Other Personal Reason</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Preferred Makeup Date & Time</label>
              <input
                type="datetime-local"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <Button
              type="submit"
              variant="secondary"
              size="sm"
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold w-full py-2.5 text-xs shadow-lg"
            >
              {loading ? 'Submitting Request...' : '📩 Submit Makeup Request'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
