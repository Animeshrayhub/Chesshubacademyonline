'use client';

import React, { useState, useEffect } from 'react';
import type { ReferralInfo } from '@/lib/referrals/referralService';
import { getStudentReferralAction } from '@/actions/referrals';

interface StudentReferralWidgetProps {
  referralInfo?: ReferralInfo;
}

export default function StudentReferralWidget({
  referralInfo: initialReferralInfo,
}: StudentReferralWidgetProps) {
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | undefined>(initialReferralInfo);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(!initialReferralInfo);

  useEffect(() => {
    if (initialReferralInfo) {
      setReferralInfo(initialReferralInfo);
      setLoading(false);
      return;
    }

    async function loadReferralData() {
      try {
        const res = await getStudentReferralAction();
        if (res.success && res.data) {
          setReferralInfo(res.data);
        }
      } catch (err) {
        console.error('Failed to load student referral data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadReferralData();
  }, [initialReferralInfo]);

  const displayData = referralInfo || {
    referralCode: 'REF-STUDENT',
    referralLink: 'https://chesshub.academy/book-demo?ref=REF-STUDENT',
    totalReferrals: 0,
    xpEarned: 0,
  };

  const handleCopyLink = () => {
    if (displayData.referralLink) {
      navigator.clipboard.writeText(displayData.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-lg shadow-gold">
            🎁
          </div>
          <div>
            <h3 className="font-heading font-bold text-sm text-white">
              Refer-a-Friend &amp; Earn Rewards
            </h3>
            <p className="text-xs text-slate-400">
              Invite friends to ChessHub Academy and earn +250 XP per enrollment!
            </p>
          </div>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold self-start sm:self-auto">
          {loading ? '...' : `+${displayData.xpEarned} XP Earned`}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 truncate">
            {loading ? 'Generating your unique referral link...' : displayData.referralLink}
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs shadow-gold transition-all whitespace-nowrap"
          >
            {copied ? 'Copied! ✅' : '📋 Copy Link'}
          </button>
        </div>

        <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-2xl flex items-center justify-between text-xs">
          <span className="text-slate-400">Successful Friend Invites:</span>
          <span className="font-mono text-emerald-400 font-extrabold">
            {loading ? '...' : `${displayData.totalReferrals} Friends Enrolled`}
          </span>
        </div>
      </div>
    </div>
  );
}
