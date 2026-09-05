'use client';

import React, { useState, useEffect } from 'react';
import { speakCheer, playVictoryFanfare } from '@/utils/kidAudio';
import { getStudentPuzzleStats } from '@/lib/puzzles/progress';

export interface PetConfig {
  id: string;
  name: string;
  emoji: string;
  title: string;
  tagline: string;
  cardBg: string;
  cardBorder: string;
  glowEffect: string;
  avatarRing: string;
  textAccent: string;
  badgeBg: string;
  progressBar: string;
  dialogue: string;
}

export const PETS: PetConfig[] = [
  {
    id: 'dragon',
    name: 'Ignis the Fire Dragon',
    emoji: '🐉',
    title: 'The Center Dominator',
    tagline: 'Breathes tactical fire across the Sicilian Dragon center!',
    cardBg: 'from-slate-950 via-rose-950/60 to-slate-950',
    cardBorder: 'border-rose-500/40 hover:border-rose-400/70',
    glowEffect: 'rgba(244, 63, 94, 0.25)',
    avatarRing: 'border-rose-400/60 shadow-[0_0_25px_rgba(244,63,94,0.45)] bg-rose-950/50',
    textAccent: 'text-rose-400',
    badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    progressBar: 'from-rose-500 via-amber-500 to-orange-500',
    dialogue: 'Roar! Burn through the center and unleash tactical fireworks!',
  },
  {
    id: 'lion',
    name: 'Leo the Golden Lion',
    emoji: '🦁',
    title: 'The Royal Monarch',
    tagline: 'Roars through open files & guards the Royal Court!',
    cardBg: 'from-slate-950 via-amber-950/60 to-slate-950',
    cardBorder: 'border-amber-500/40 hover:border-amber-400/70',
    glowEffect: 'rgba(245, 158, 11, 0.25)',
    avatarRing: 'border-amber-400/60 shadow-[0_0_25px_rgba(245,158,11,0.45)] bg-amber-950/50',
    textAccent: 'text-amber-400',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    progressBar: 'from-amber-500 via-yellow-400 to-orange-500',
    dialogue: 'A true king never retreats! Guard your kingdom with courage!',
  },
  {
    id: 'falcon',
    name: 'Zephyr the Storm Falcon',
    emoji: '🦅',
    title: 'The Diagonal Sniper',
    tagline: 'Spots hidden pins & long-range diagonal snipes from above!',
    cardBg: 'from-slate-950 via-sky-950/60 to-slate-950',
    cardBorder: 'border-sky-500/40 hover:border-sky-400/70',
    glowEffect: 'rgba(14, 165, 233, 0.25)',
    avatarRing: 'border-sky-400/60 shadow-[0_0_25px_rgba(14,165,233,0.45)] bg-sky-950/50',
    textAccent: 'text-sky-400',
    badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    progressBar: 'from-sky-500 via-cyan-400 to-blue-500',
    dialogue: 'My sharp eyes see every fork and skewer across the sky!',
  },
  {
    id: 'fox',
    name: 'Sly the Crimson Fox',
    emoji: '🦊',
    title: 'The Master Tactician',
    tagline: 'Outsmarts opponents with cunning forks & sneaky discoveries!',
    cardBg: 'from-slate-950 via-orange-950/60 to-slate-950',
    cardBorder: 'border-orange-500/40 hover:border-orange-400/70',
    glowEffect: 'rgba(249, 115, 22, 0.25)',
    avatarRing: 'border-orange-400/60 shadow-[0_0_25px_rgba(249,115,22,0.45)] bg-orange-950/50',
    textAccent: 'text-orange-400',
    badgeBg: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    progressBar: 'from-orange-500 via-amber-400 to-red-500',
    dialogue: 'Hehe! One little trap and the opponent’s Queen is ours!',
  },
  {
    id: 'wolf',
    name: 'Shadow the Midnight Wolf',
    emoji: '🐺',
    title: 'The Endgame Stalker',
    tagline: 'Hunts king safety and coordinates piece packs in the endgame!',
    cardBg: 'from-slate-950 via-indigo-950/60 to-slate-950',
    cardBorder: 'border-indigo-500/40 hover:border-indigo-400/70',
    glowEffect: 'rgba(99, 102, 241, 0.25)',
    avatarRing: 'border-indigo-400/60 shadow-[0_0_25px_rgba(99,102,241,0.45)] bg-indigo-950/50',
    textAccent: 'text-indigo-400',
    badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    progressBar: 'from-indigo-500 via-purple-500 to-blue-600',
    dialogue: 'Pieces together are unstoppable! We hunt as a pack!',
  },
  {
    id: 'bear',
    name: 'Barnaby the Iron Bear',
    emoji: '🐻',
    title: 'The Fortress Guardian',
    tagline: 'Builds unbreakable pawn fortresses that crush enemy attacks!',
    cardBg: 'from-slate-950 via-amber-950/40 to-slate-950',
    cardBorder: 'border-yellow-600/40 hover:border-yellow-500/70',
    glowEffect: 'rgba(202, 138, 4, 0.25)',
    avatarRing: 'border-yellow-500/60 shadow-[0_0_25px_rgba(202,138,4,0.45)] bg-amber-950/50',
    textAccent: 'text-yellow-400',
    badgeBg: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    progressBar: 'from-yellow-600 via-amber-500 to-orange-600',
    dialogue: 'Stand firm like a mountain! No enemy piece shall pass!',
  },
  {
    id: 'unicorn',
    name: 'Sparkle the Astral Unicorn',
    emoji: '🦄',
    title: 'The Magic Combinator',
    tagline: 'Finds dazzling queen sacrifices & sparkling checkmates!',
    cardBg: 'from-slate-950 via-fuchsia-950/60 to-slate-950',
    cardBorder: 'border-fuchsia-500/40 hover:border-fuchsia-400/70',
    glowEffect: 'rgba(217, 70, 239, 0.25)',
    avatarRing: 'border-fuchsia-400/60 shadow-[0_0_25px_rgba(217,70,239,0.45)] bg-fuchsia-950/50',
    textAccent: 'text-fuchsia-400',
    badgeBg: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30',
    progressBar: 'from-fuchsia-500 via-pink-400 to-purple-500',
    dialogue: 'Believe in chess magic! Sparkling moves lead to glorious wins!',
  },
  {
    id: 'owl',
    name: 'Archimedes the Mystic Owl',
    emoji: '🦉',
    title: 'The Grandmaster Sage',
    tagline: 'Calculates 5 moves ahead and masters every opening book!',
    cardBg: 'from-slate-950 via-emerald-950/60 to-slate-950',
    cardBorder: 'border-emerald-500/40 hover:border-emerald-400/70',
    glowEffect: 'rgba(16, 185, 129, 0.25)',
    avatarRing: 'border-emerald-400/60 shadow-[0_0_25px_rgba(16,185,129,0.45)] bg-emerald-950/50',
    textAccent: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    progressBar: 'from-emerald-500 via-teal-400 to-green-500',
    dialogue: 'Hoo-hoo! Think before you move, and victory will be yours!',
  },
  {
    id: 'cheetah',
    name: 'Flash the Lightning Cheetah',
    emoji: '🐆',
    title: 'The Blitz Dynamo',
    tagline: 'Strikes with lightning speed in time-trouble blitz games!',
    cardBg: 'from-slate-950 via-yellow-950/60 to-slate-950',
    cardBorder: 'border-yellow-400/40 hover:border-yellow-300/70',
    glowEffect: 'rgba(250, 204, 21, 0.25)',
    avatarRing: 'border-yellow-400/60 shadow-[0_0_25px_rgba(250,204,21,0.45)] bg-yellow-950/50',
    textAccent: 'text-yellow-300',
    badgeBg: 'bg-yellow-400/20 text-yellow-200 border-yellow-400/30',
    progressBar: 'from-yellow-400 via-amber-400 to-lime-400',
    dialogue: 'Fast hands, sharper mind! Speed up the attack!',
  },
  {
    id: 'octopus',
    name: 'Kraken the Ocean Octopus',
    emoji: '🐙',
    title: 'The Multi-Forker',
    tagline: 'Reaches eight tentacles across the board to fork pieces at once!',
    cardBg: 'from-slate-950 via-teal-950/60 to-slate-950',
    cardBorder: 'border-teal-500/40 hover:border-teal-400/70',
    glowEffect: 'rgba(20, 184, 166, 0.25)',
    avatarRing: 'border-teal-400/60 shadow-[0_0_25px_rgba(20,184,166,0.45)] bg-teal-950/50',
    textAccent: 'text-teal-400',
    badgeBg: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    progressBar: 'from-teal-500 via-cyan-400 to-emerald-500',
    dialogue: 'Eight arms, eight directions! Total board control!',
  },
  {
    id: 'panda',
    name: 'Po the Bamboo Panda',
    emoji: '🐼',
    title: 'The Zen Master',
    tagline: 'Calm and patient, waiting for the perfect counter-strike moment!',
    cardBg: 'from-slate-950 via-slate-900 to-slate-950',
    cardBorder: 'border-slate-400/40 hover:border-slate-300/70',
    glowEffect: 'rgba(148, 163, 184, 0.25)',
    avatarRing: 'border-slate-300/60 shadow-[0_0_25px_rgba(148,163,184,0.45)] bg-slate-900/80',
    textAccent: 'text-slate-200',
    badgeBg: 'bg-slate-500/20 text-slate-200 border-slate-400/30',
    progressBar: 'from-slate-400 via-emerald-400 to-slate-200',
    dialogue: 'Inner peace brings outer strength. Stay calm on the board.',
  },
  {
    id: 'tiger',
    name: 'Thor the Royal Tiger',
    emoji: '🐯',
    title: 'The King Hunter',
    tagline: 'Leaps past enemy defenses with ferocious king attacks!',
    cardBg: 'from-slate-950 via-amber-950/70 to-slate-950',
    cardBorder: 'border-amber-600/50 hover:border-amber-500/80',
    glowEffect: 'rgba(217, 119, 6, 0.3)',
    avatarRing: 'border-amber-500/70 shadow-[0_0_25px_rgba(217,119,6,0.5)] bg-amber-950/60',
    textAccent: 'text-amber-500',
    badgeBg: 'bg-amber-600/20 text-amber-300 border-amber-600/30',
    progressBar: 'from-amber-600 via-orange-500 to-red-500',
    dialogue: 'Raaar! The enemy King has nowhere to run!',
  },
];

export const ACCESSORIES = [
  { id: 'none', label: 'None', icon: '✨', reqLevel: 1 },
  { id: 'tophat', label: 'Magician Hat', icon: '🎩', reqLevel: 2 },
  { id: 'cape', label: 'Hero Cape', icon: '🦸', reqLevel: 3 },
  { id: 'crown', label: 'Royal Crown', icon: '👑', reqLevel: 4 },
  { id: 'sunglasses', label: 'GM Shades', icon: '🕶️', reqLevel: 5 },
];

interface KidsPetCompanionCardProps {
  studentXp?: number;
  studentName?: string;
}

export default function KidsPetCompanionCard({
  studentXp = 0,
  studentName = 'Champion',
}: KidsPetCompanionCardProps) {
  const [selectedPetId, setSelectedPetId] = useState<string>('dragon');
  const [selectedAccessory, setSelectedAccessory] = useState('none');
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [petMood, setPetMood] = useState<'happy' | 'cheering' | 'talking'>('happy');
  const [bubbleText, setBubbleText] = useState('');
  const [displayXp, setDisplayXp] = useState(studentXp);

  // Sync displayXp when prop changes
  useEffect(() => {
    setDisplayXp(studentXp);
  }, [studentXp]);

  // Load saved companion preference & hydrate real local XP if higher
  useEffect(() => {
    try {
      const savedPet = localStorage.getItem('chesshub_kids_pet');
      const savedAcc = localStorage.getItem('chesshub_kids_accessory');
      if (savedPet && PETS.some((p) => p.id === savedPet)) {
        setSelectedPetId(savedPet);
      }
      if (savedAcc) {
        setSelectedAccessory(savedAcc);
      }

      const local = getStudentPuzzleStats();
      if (local && local.xp > displayXp) {
        setDisplayXp(local.xp);
      }
    } catch {}
  }, []);

  const activePet = PETS.find((p) => p.id === selectedPetId) || PETS[0];

  // Calculate Pet Level from real XP
  let petLevel = 1;
  let levelTitle = 'Hatchling Companion';
  let nextLevelXp = 150;
  let currentLevelBaseXp = 0;

  if (displayXp >= 1500) {
    petLevel = 5;
    levelTitle = 'Grandmaster Companion';
    nextLevelXp = 2000;
    currentLevelBaseXp = 1500;
  } else if (displayXp >= 800) {
    petLevel = 4;
    levelTitle = 'Board Champion';
    nextLevelXp = 1500;
    currentLevelBaseXp = 800;
  } else if (displayXp >= 400) {
    petLevel = 3;
    levelTitle = 'Brave Knight';
    nextLevelXp = 800;
    currentLevelBaseXp = 400;
  } else if (displayXp >= 150) {
    petLevel = 2;
    levelTitle = 'Swift Scout';
    nextLevelXp = 400;
    currentLevelBaseXp = 150;
  }

  const levelProgressPct = Math.min(
    100,
    Math.round(((displayXp - currentLevelBaseXp) / Math.max(1, nextLevelXp - currentLevelBaseXp)) * 100)
  );

  const handleSelectPet = (petId: string) => {
    setSelectedPetId(petId);
    try {
      localStorage.setItem('chesshub_kids_pet', petId);
    } catch {}
    setIsSelectorOpen(false);
    const chosen = PETS.find((p) => p.id === petId) || activePet;
    setBubbleText(chosen.dialogue);
    setPetMood('talking');
    speakCheer(`${chosen.name} is ready! ${chosen.dialogue}`);
    setTimeout(() => {
      setPetMood('happy');
      setBubbleText('');
    }, 4500);
  };

  const handleSelectAccessory = (accId: string, reqLevel: number) => {
    if (petLevel < reqLevel) return;
    setSelectedAccessory(accId);
    try {
      localStorage.setItem('chesshub_kids_accessory', accId);
    } catch {}
  };

  const handlePetClick = () => {
    setPetMood('cheering');
    setBubbleText(activePet.dialogue);
    playVictoryFanfare();
    speakCheer(`${activePet.name} says: ${activePet.dialogue}`);
    setTimeout(() => {
      setPetMood('happy');
      setBubbleText('');
    }, 4000);
  };

  const activeAccObj = ACCESSORIES.find((a) => a.id === selectedAccessory);

  return (
    <div
      className={`rounded-3xl border p-5 bg-gradient-to-br ${activePet.cardBg} ${activePet.cardBorder} shadow-2xl relative overflow-hidden transition-all duration-300`}
    >
      {/* Dynamic ambient background glow */}
      <div
        className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl pointer-events-none transition-all duration-500"
        style={{ backgroundColor: activePet.glowEffect }}
      />
      <div
        className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full blur-3xl pointer-events-none transition-all duration-500 opacity-60"
        style={{ backgroundColor: activePet.glowEffect }}
      />

      <div className="flex flex-col sm:flex-row items-center gap-5 justify-between relative z-10">
        
        {/* Left: Pet Avatar & Character Identity */}
        <div className="flex items-center gap-4 text-left">
          <div className="relative">
            <div
              onClick={handlePetClick}
              title="Click to hear your pet cheer!"
              className={`w-20 h-20 rounded-2xl border-2 ${activePet.avatarRing} flex items-center justify-center text-4xl cursor-pointer hover:scale-110 active:scale-95 transition-all select-none relative group`}
            >
              {/* Worn accessory overlay */}
              {activeAccObj && activeAccObj.id !== 'none' && (
                <span className="absolute -top-3 -right-2 text-xl filter drop-shadow-md animate-bounce">
                  {activeAccObj.icon}
                </span>
              )}
              <span className={petMood === 'cheering' ? 'animate-wiggle scale-110' : ''}>
                {activePet.emoji}
              </span>

              {/* Tap indicator badge */}
              <span className="absolute -bottom-2 px-2 py-0.5 rounded-full bg-slate-900/90 text-[9px] font-bold text-white border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow">
                🔊 Cheer!
              </span>
            </div>

            {/* Floating Dialogue Speech Bubble */}
            {bubbleText && (
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[11px] font-bold px-3 py-1 rounded-xl border border-amber-400 shadow-xl whitespace-nowrap z-20 animate-bounce">
                {bubbleText}
              </div>
            )}
          </div>

          <div className="space-y-1 text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-white text-base tracking-wide">{activePet.name}</span>
              <span className={`px-2 py-0.5 rounded-full ${activePet.badgeBg} text-[10px] font-extrabold border`}>
                Lv. {petLevel}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold border border-slate-700">
                {levelTitle}
              </span>
            </div>
            <p className={`text-xs font-bold ${activePet.textAccent}`}>{activePet.title}</p>
            <p className="text-[11px] text-slate-300 italic max-w-sm leading-snug">{activePet.tagline}</p>
          </div>
        </div>

        {/* Right: Companion XP Progress & Character Changer */}
        <div className="w-full sm:w-60 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-200">
            <span>Pet Growth</span>
            <span className="font-mono text-amber-300">{displayXp} / {nextLevelXp} XP</span>
          </div>

          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800 shadow-inner">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${activePet.progressBar} transition-all duration-500 shadow-lg`}
              style={{ width: `${levelProgressPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>{levelProgressPct}% to Lv. {petLevel + 1}</span>
            <button
              type="button"
              onClick={() => setIsSelectorOpen(!isSelectorOpen)}
              className="text-amber-400 hover:text-amber-300 font-extrabold underline flex items-center gap-1"
            >
              <span>{isSelectorOpen ? 'Close Roster' : 'Switch Companion (12)'}</span>
              <span>🐾</span>
            </button>
          </div>
        </div>

      </div>

      {/* Expandable Character Roster & Accessory Drawer */}
      {isSelectorOpen && (
        <div className="mt-5 pt-5 border-t border-slate-800/90 space-y-5 animate-fadeIn">
          
          {/* Character Grid (12 Characters) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                <span>🌟 Choose Your Chess Companion (12 Unique Champions)</span>
              </span>
              <span className="text-[10px] text-slate-400">Click any character to adopt</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {PETS.map((pet) => {
                const isSelected = selectedPetId === pet.id;
                return (
                  <button
                    key={pet.id}
                    type="button"
                    onClick={() => handleSelectPet(pet.id)}
                    className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                      isSelected
                        ? `bg-slate-900 border-2 ${pet.cardBorder} shadow-lg scale-[1.02]`
                        : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div>
                      <div className="text-3xl mb-1.5">{pet.emoji}</div>
                      <div className="text-xs font-bold text-white truncate">{pet.name}</div>
                      <div className={`text-[10px] font-semibold truncate ${pet.textAccent}`}>{pet.title}</div>
                    </div>
                    {isSelected && (
                      <span className="absolute top-1.5 right-1.5 text-xs text-amber-400">
                        ⭐
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Accessory Closet */}
          <div>
            <div className="text-xs font-extrabold text-white uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Companion Gear & Hats</span>
              <span className="text-[10px] text-amber-400 font-bold">Unlocked at Higher Pet Levels</span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {ACCESSORIES.map((acc) => {
                const isLocked = petLevel < acc.reqLevel;
                const isEquipped = selectedAccessory === acc.id;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    disabled={isLocked}
                    onClick={() => handleSelectAccessory(acc.id, acc.reqLevel)}
                    className={`p-2.5 rounded-xl border text-center transition-all relative ${
                      isEquipped
                        ? 'bg-amber-500/20 border-amber-400 text-white shadow-gold'
                        : isLocked
                        ? 'bg-slate-950/40 border-slate-800/50 opacity-40 cursor-not-allowed text-slate-600'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="text-xl mb-1">{acc.icon}</div>
                    <div className="text-[10px] font-bold truncate">{acc.label}</div>
                    {isLocked && (
                      <span className="text-[9px] text-rose-400 font-mono block font-bold">Lv.{acc.reqLevel}</span>
                    )}
                    {isEquipped && (
                      <span className="text-[9px] text-amber-400 font-bold block">Equipped</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
