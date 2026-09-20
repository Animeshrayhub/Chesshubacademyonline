'use client';

import React, { useEffect, useState, useRef, useTransition } from 'react';
import Link from 'next/link';
import {
  playDailyChime,
  playCoinSound,
  playWhooshSound,
  playVictoryFanfare,
  speakPetPersonality,
  isSoundMuted,
  toggleSoundMute,
} from '@/utils/kidAudio';
import { PETS } from '@/features/student/KidsPetCompanionCard';

interface StreakMilestone {
  days: number;
  bonusXp: number;
  bonusShields: number;
  title: string;
}

interface DailyLoginCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  streak: number;
  xpEarned: number;
  shields: number;
  wasProtected?: boolean;
  unlockedMilestone?: StreakMilestone | null;
  studentName?: string;
  equippedPet?: string;
}

interface CoinParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vRot: number;
  scale: number;
  type: 'coin' | 'diamond' | 'spark';
}

export default function DailyLoginCelebrationModal({
  isOpen,
  onClose,
  streak = 1,
  xpEarned = 15,
  shields = 0,
  wasProtected = false,
  unlockedMilestone = null,
  studentName = 'Champion',
  equippedPet = 'dragon',
}: DailyLoginCelebrationModalProps) {
  // 3D Card Tilt State
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const cardRef = useRef<HTMLDivElement>(null);

  // Claim State & Animated Counter
  const [isClaimed, setIsClaimed] = useState<boolean>(false);
  const [displayedXp, setDisplayedXp] = useState<number>(0);
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Particle System
  const [particles, setParticles] = useState<CoinParticle[]>([]);
  const [emberParticles, setEmberParticles] = useState<{ id: number; x: number; y: number; size: number }[]>([]);

  const pet = PETS.find((p) => p.id === equippedPet) || PETS[0];

  // 7-day week cycle index (1 to 7)
  const currentWeekDay = ((streak - 1) % 7) + 1;

  // Initialize and trigger on open
  useEffect(() => {
    if (!isOpen) {
      setIsClaimed(false);
      setIsClosing(false);
      setDisplayedXp(0);
      setParticles([]);
      return;
    }

    setSoundEnabled(!isSoundMuted());

    // Play 3D Whoosh & Daily Chime
    playWhooshSound();
    const chimeTimer = setTimeout(() => {
      playDailyChime();
    }, 180);

    // Speak companion personality line
    const speechTimer = setTimeout(() => {
      speakPetPersonality(
        equippedPet,
        `Welcome back, ${studentName}! Day ${streak} attendance locked in. Tap to claim your rewards!`
      );
    }, 450);

    // Initial ambient embers around pet stage
    const embers = Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      x: 20 + Math.random() * 60,
      y: 30 + Math.random() * 40,
      size: 3 + Math.random() * 5,
    }));
    setEmberParticles(embers);

    return () => {
      clearTimeout(chimeTimer);
      clearTimeout(speechTimer);
    };
  }, [isOpen, studentName, streak, equippedPet]);

  // Handle 3D mouse tracking tilt
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setMousePos({ x, y });

    // Tilt range: -12deg to +12deg
    const tiltX = (0.5 - y) * 16;
    const tiltY = (x - 0.5) * 16;
    setTilt({ x: tiltX, y: tiltY });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setMousePos({ x: 0.5, y: 0.5 });
  };

  // Interactive Claim Trigger
  const handleClaim = () => {
    if (isClaimed) return;
    setIsClaimed(true);

    // Sound FX: Coin clink & Victory fanfare
    playCoinSound();
    setTimeout(() => playCoinSound(), 120);
    setTimeout(() => playVictoryFanfare(), 250);

    // Companion Voice Cheer on Claim
    speakPetPersonality(
      equippedPet,
      `Reward claimed! Plus ${xpEarned} XP added to your account! Let's conquer today's puzzle!`
    );

    // Generate 3D burst particles
    const burst: CoinParticle[] = Array.from({ length: 28 }).map((_, i) => {
      const angle = (Math.PI * 2 * i) / 28 + (Math.random() * 0.4 - 0.2);
      const speed = 4 + Math.random() * 8;
      return {
        id: i,
        x: 50,
        y: 60,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        rot: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 20,
        scale: 0.8 + Math.random() * 0.6,
        type: i % 3 === 0 ? 'diamond' : i % 3 === 1 ? 'coin' : 'spark',
      };
    });
    setParticles(burst);

    // Animated XP Counter Roll-up (0 -> xpEarned)
    const duration = 800;
    const startTime = performance.now();
    const animateCounter = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayedXp(Math.round(eased * xpEarned));
      if (progress < 1) {
        requestAnimationFrame(animateCounter);
      }
    };
    requestAnimationFrame(animateCounter);
  };

  // Animated Exit with 3D Perspective Zoom
  const handleCloseModal = () => {
    setIsClosing(true);
    playWhooshSound();
    setTimeout(() => {
      onClose();
    }, 400);
  };

  const handleToggleSound = () => {
    const next = toggleSoundMute();
    setSoundEnabled(!next);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md transition-opacity duration-300 ${
        isClosing ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ perspective: '1200px' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* ─── 3D Burst Coins / XP Diamonds ─── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-700 pointer-events-none"
            style={{
              left: `${p.x + p.vx * 7}%`,
              top: `${p.y + p.vy * 5}%`,
              transform: `rotate(${p.rot + p.vRot * 15}deg) scale(${p.scale})`,
              opacity: isClaimed ? 0.95 : 0,
            }}
          >
            {p.type === 'coin' ? (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-600 border-2 border-yellow-200 shadow-[0_0_15px_rgba(251,191,36,0.8)] flex items-center justify-center text-xs font-black text-amber-950">
                🪙
              </div>
            ) : p.type === 'diamond' ? (
              <div className="w-7 h-7 bg-gradient-to-tr from-cyan-400 to-blue-500 rounded-lg rotate-45 border border-cyan-200 shadow-[0_0_15px_rgba(34,211,238,0.8)] flex items-center justify-center text-xs text-white">
                💎
              </div>
            ) : (
              <div className="w-4 h-4 rounded-full bg-amber-200 blur-[1px] shadow-[0_0_12px_#fef08a]" />
            )}
          </div>
        ))}
      </div>

      {/* ─── 3D Holographic Card ─── */}
      <div
        ref={cardRef}
        className={`relative w-full max-w-lg rounded-3xl border-2 border-amber-400/50 bg-gradient-to-b from-slate-900/95 via-indigo-950/90 to-slate-950/95 p-6 sm:p-7 shadow-[0_0_70px_rgba(245,158,11,0.4)] text-white overflow-hidden transition-transform duration-200 ease-out ${
          isClosing ? 'scale-75 translate-y-12 opacity-0 rotate-x-12' : 'scale-100'
        }`}
        style={{
          transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(10px)`,
          transformStyle: 'preserve-3d',
          boxShadow: `
            0 25px 60px -15px rgba(0, 0, 0, 0.8),
            0 0 50px rgba(245, 158, 11, 0.25),
            inset 0 1px 1px rgba(255, 255, 255, 0.15)
          `,
        }}
      >
        {/* Dynamic Holographic Glare Overlay */}
        <div
          className="absolute inset-0 pointer-events-none rounded-3xl opacity-30 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at ${mousePos.x * 100}% ${
              mousePos.y * 100
            }%, rgba(251, 191, 36, 0.35) 0%, transparent 65%)`,
          }}
        />

        {/* Ambient Cosmic Lights */}
        <div className="absolute -top-24 -right-24 w-52 h-52 bg-amber-500/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-52 h-52 bg-purple-600/30 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Bar: Sound Toggle & Close Button */}
        <div className="flex items-center justify-between relative z-30 mb-2">
          <button
            type="button"
            onClick={handleToggleSound}
            className="px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1.5 transition-all"
            title={soundEnabled ? 'Mute Sound' : 'Unmute Sound'}
          >
            <span>{soundEnabled ? '🔊' : '🔇'}</span>
            <span className="text-[10px] uppercase tracking-wider">{soundEnabled ? 'Sound On' : 'Muted'}</span>
          </button>

          <button
            type="button"
            onClick={handleCloseModal}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition-all border border-slate-700 shadow-sm"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* 3D Header Ribbon */}
        <div className="text-center relative z-20 mb-3" style={{ transform: 'translateZ(25px)' }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 via-yellow-500/30 to-amber-500/20 border border-amber-400/60 text-amber-300 text-xs font-black uppercase tracking-wider shadow-[0_0_15px_rgba(245,158,11,0.3)]">
            <span className="animate-pulse">☀️</span>
            <span>DAILY ATTENDANCE REWARD</span>
          </div>
        </div>

        {/* ─── 3D Mascot Stage with Particle Trail ─── */}
        <div
          className="relative flex flex-col items-center justify-center my-3 z-20"
          style={{ transform: 'translateZ(40px)' }}
        >
          {/* Reactive Embers */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {emberParticles.map((eb) => (
              <div
                key={eb.id}
                className="absolute rounded-full bg-amber-400/60 blur-[1px] animate-pulse"
                style={{
                  left: `${eb.x + (mousePos.x - 0.5) * 20}%`,
                  top: `${eb.y + (mousePos.y - 0.5) * 15}%`,
                  width: `${eb.size}px`,
                  height: `${eb.size}px`,
                  transition: 'transform 0.2s ease-out',
                }}
              />
            ))}
          </div>

          {/* 3D Circular Pedestal */}
          <div className="relative group">
            {/* Pedestal Base Ring Glow */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-28 h-7 bg-amber-500/40 rounded-[100%] blur-md" />
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-24 h-5 bg-gradient-to-r from-amber-400/80 via-yellow-300/90 to-amber-500/80 rounded-[100%] border border-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.6)]" />

            {/* Mascot Avatar Box */}
            <div
              className={`w-24 h-24 rounded-3xl border-2 flex items-center justify-center text-5xl shadow-2xl relative transition-transform duration-300 group-hover:scale-105 group-hover:-translate-y-1 ${pet.avatarRing}`}
              style={{
                transform: `rotateY(${(mousePos.x - 0.5) * 18}deg) rotateX(${-(mousePos.y - 0.5) * 18}deg)`,
                background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.25), rgba(15,23,42,0.95))',
              }}
            >
              <span className="drop-shadow-[0_10px_10px_rgba(0,0,0,0.6)] animate-bounce" style={{ animationDuration: '3s' }}>
                {pet.emoji}
              </span>
            </div>
          </div>

          {/* 3D Speech Bubble */}
          <div
            className="relative mt-3 px-4 py-2 rounded-2xl bg-slate-950/90 border border-amber-500/40 max-w-sm shadow-xl text-center"
            style={{ transform: 'translateZ(30px)' }}
          >
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-950 border-t border-l border-amber-500/40 rotate-45" />
            <p className="text-xs text-slate-200 font-medium italic relative z-10">
              &ldquo;Welcome back, {studentName}! Day {streak} Attendance secured! Let&apos;s conquer today&apos;s tactics!&rdquo;
            </p>
            <span className="text-[10px] text-amber-400 font-extrabold block pt-0.5 uppercase tracking-wider">
              — {pet.name}
            </span>
          </div>
        </div>

        {/* ─── 7-Day Weekly Streak Roadmap ─── */}
        <div
          className="my-4 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 relative z-20"
          style={{ transform: 'translateZ(20px)' }}
        >
          <div className="flex items-center justify-between mb-2.5 px-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
              <span>🔥</span>
              <span>7-Day Streak Roadmap</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono font-bold">
              Day {currentWeekDay} of 7
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1.5 items-center text-center">
            {Array.from({ length: 7 }).map((_, idx) => {
              const dayNum = idx + 1;
              const isPast = dayNum < currentWeekDay;
              const isToday = dayNum === currentWeekDay;
              const isDay7 = dayNum === 7;

              return (
                <div
                  key={dayNum}
                  className={`p-1.5 rounded-xl border flex flex-col items-center justify-between transition-all ${
                    isToday
                      ? 'bg-gradient-to-b from-amber-500/30 to-amber-600/10 border-amber-400 ring-2 ring-amber-400/50 scale-105 shadow-md shadow-amber-500/20'
                      : isPast
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-900/60 border-slate-800 text-slate-500'
                  }`}
                >
                  <span className="text-[9px] font-bold uppercase">
                    D{dayNum}
                  </span>
                  <div className="text-base my-0.5">
                    {isDay7 ? (
                      <span title="Day 7 Mystery Chest Reward!">🎁</span>
                    ) : isPast ? (
                      <span className="text-emerald-400 text-xs font-black">✓</span>
                    ) : isToday ? (
                      <span className="text-amber-400 animate-pulse">🔥</span>
                    ) : (
                      <span className="text-slate-600 text-xs">🔒</span>
                    )}
                  </div>
                  <span
                    className={`text-[8px] font-black ${
                      isToday
                        ? 'text-amber-300'
                        : isPast
                        ? 'text-emerald-400'
                        : 'text-slate-500'
                    }`}
                  >
                    {isDay7 ? '+50XP' : isToday ? 'TODAY' : isPast ? 'DONE' : '+15XP'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Rewards Breakdown Card & 3D Crystal Shield ─── */}
        <div
          className="p-4 rounded-2xl bg-slate-950/80 border border-amber-500/30 space-y-2.5 mb-4 text-left relative z-20 shadow-inner"
          style={{ transform: 'translateZ(25px)' }}
        >
          {/* Streak Row */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-lg">
                🔥
              </div>
              <div>
                <span className="text-xs font-black text-amber-300 block">
                  {streak} Day Daily Streak
                </span>
                <span className="text-[10px] text-slate-400">
                  Consecutive attendance locked in
                </span>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase">
              {isClaimed ? '✓ Locked In' : 'Ready to Claim'}
            </span>
          </div>

          {/* XP Row */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-lg">
                ⚡
              </div>
              <div>
                <span className="text-xs font-black text-yellow-400 block">
                  +{isClaimed ? displayedXp : xpEarned} Academy XP
                </span>
                <span className="text-[10px] text-slate-400">
                  Added to your academy total
                </span>
              </div>
            </div>
            <span
              className={`text-xs font-black font-mono transition-colors ${
                isClaimed ? 'text-emerald-400' : 'text-yellow-400'
              }`}
            >
              {isClaimed ? '✓ CLAIMED' : `+${xpEarned} XP`}
            </span>
          </div>

          {/* 3D Crystalline Shield Indicator */}
          {shields > 0 && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <span className="text-base animate-pulse">🛡️</span>
                <span>
                  <strong>Streak Shield Active:</strong> Protected from missed days
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-[10px] font-black">
                {shields} {shields === 1 ? 'Shield' : 'Shields'}
              </span>
            </div>
          )}

          {/* Shield Used Notification */}
          {wasProtected && (
            <div className="flex items-center gap-2 p-2 rounded-xl bg-indigo-950/60 border border-indigo-500/40 text-indigo-300 text-xs font-semibold">
              <span>🛡️</span>
              <span>Streak Shield Used! Your streak was preserved from yesterday.</span>
            </div>
          )}

          {/* 3D Milestone Unlocked Banner */}
          {unlockedMilestone && (
            <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/25 via-orange-500/25 to-amber-500/25 border-2 border-amber-400 text-amber-300 space-y-1 shadow-lg shadow-amber-500/10">
              <div className="flex items-center gap-1.5 font-black text-xs">
                <span className="text-base">🎁</span>
                <span>MILESTONE UNLOCKED: {unlockedMilestone.title}!</span>
              </div>
              <p className="text-[11px] text-slate-200">
                Bonus Reward: <span className="font-bold text-yellow-400">+{unlockedMilestone.bonusXp} XP</span> &amp;{' '}
                <span className="font-bold text-cyan-300">🛡️ +{unlockedMilestone.bonusShields} Streak Shield</span>!
              </p>
            </div>
          )}

          {/* Daily Puzzle Teaser */}
          <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-300">
            <span>🧩</span>
            <span>
              Today&apos;s Tactical Challenge is waiting for an extra{' '}
              <strong className="text-amber-300">+10 XP bonus</strong>!
            </span>
          </div>
        </div>

        {/* ─── Action Buttons: Claim vs. Play ─── */}
        <div className="flex flex-col gap-2.5 relative z-30" style={{ transform: 'translateZ(35px)' }}>
          {!isClaimed ? (
            /* 3D Interactive "TAP TO CLAIM" Button */
            <button
              type="button"
              onClick={handleClaim}
              className="w-full py-3.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:via-yellow-300 hover:to-amber-400 text-slate-950 font-black text-sm rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.6)] active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-wider animate-pulse"
            >
              <span>✨</span>
              <span>TAP TO CLAIM REWARDS (+{xpEarned} XP)</span>
              <span>➔</span>
            </button>
          ) : (
            /* Post-Claim Actions */
            <>
              <Link
                href="/dashboard/student/puzzles"
                onClick={handleCloseModal}
                className="w-full py-3.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-500 hover:from-amber-300 hover:via-yellow-300 hover:to-orange-400 text-slate-950 font-black text-xs rounded-2xl shadow-[0_0_25px_rgba(245,158,11,0.5)] active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-wide"
              >
                <span>🧩</span>
                <span>SOLVE TODAY&apos;S PUZZLE (+10 XP) ➔</span>
              </Link>

              <button
                type="button"
                onClick={handleCloseModal}
                className="w-full py-2.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-2xl transition-all"
              >
                Awesome, Let&apos;s Play! ➔
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
