'use client';

import React, { useState, useEffect } from 'react';
import DailyLoginCelebrationModal from './DailyLoginCelebrationModal';

interface StreakMilestone {
  days: number;
  bonusXp: number;
  bonusShields: number;
  title: string;
}

interface DailyLoginTriggerProps {
  isFirstLoginToday?: boolean;
  streak: number;
  xpEarned: number;
  shields: number;
  wasProtected?: boolean;
  unlockedMilestone?: StreakMilestone | null;
  studentName?: string;
  equippedPet?: string;
  studentProfileId: string;
}

export default function DailyLoginTrigger({
  isFirstLoginToday = false,
  streak = 1,
  xpEarned = 15,
  shields = 0,
  wasProtected = false,
  unlockedMilestone = null,
  studentName = 'Champion',
  equippedPet = 'dragon',
  studentProfileId,
}: DailyLoginTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !studentProfileId) return;

    const todayIso = new Date().toISOString().split('T')[0];
    const storageKey = `chesshub_daily_login_seen_${studentProfileId}_${todayIso}`;
    const alreadySeen = localStorage.getItem(storageKey);

    if (isFirstLoginToday && !alreadySeen) {
      setIsOpen(true);
      localStorage.setItem(storageKey, 'true');

      // Notify other components of the newly earned login XP
      try {
        window.dispatchEvent(
          new CustomEvent('chesshub_xp_updated', {
            detail: { addedXp: xpEarned },
          })
        );
      } catch {}
    }
  }, [isFirstLoginToday, studentProfileId, xpEarned]);

  return (
    <DailyLoginCelebrationModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      streak={streak}
      xpEarned={xpEarned}
      shields={shields}
      wasProtected={wasProtected}
      unlockedMilestone={unlockedMilestone}
      studentName={studentName}
      equippedPet={equippedPet}
    />
  );
}
