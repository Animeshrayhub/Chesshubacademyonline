'use client';

import React, { useState } from 'react';
import type { ReferralInfo } from '@/lib/referrals/referralService';

interface StudentReferralWidgetProps {
  referralInfo?: ReferralInfo;
}

export default function StudentReferralWidget({
  referralInfo = {
    referralCode: 'REF-STUDENT123',
    referralLink: 'https://chesshub.academy/book-demo?ref=REF-STUDENT123',
    totalReferrals: 2,
    xpEarned: 500,
  },
}: StudentReferralWidgetProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralInfo.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          +{referralInfo.xpEarned} XP Earned
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 truncate">
            {referralInfo.referralLink}
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-gold transition-all whitespace-nowrap"
          >
            {copied ? 'Copied! ✅' : '📋 Copy Link'}
          </button>
        </div>

        <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-2xl flex items-center justify-between text-xs">
          <span className="text-slate-400">Successful Friend Invites:</span>
          <span className="font-mono text-emerald-400 font-extrabold">{referralInfo.totalReferrals} Friends Enrolled</span>
        </div>
      </div>
    </div>
  );
}
