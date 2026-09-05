'use client';

import React, { useState, useEffect } from 'react';
import { speakCheer, playVictoryFanfare } from '@/utils/kidAudio';

export interface PetConfig {
  id: 'lion' | 'falcon' | 'dragon';
  name: string;
  emoji: string;
  title: string;
  tagline: string;
  accentGradient: string;
}

export const PETS: PetConfig[] = [
  {
    id: 'lion',
    name: 'Leo the Lion',
    emoji: '🦁',
    title: 'The Fearless King',
    tagline: 'Roars through open files & guards the Royal Court!',
    accentGradient: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400',
  },
  {
    id: 'falcon',
    name: 'Zephyr the Falcon',
    emoji: '🦅',
    title: 'The Sharp-Eyed Scout',
    tagline: 'Spots hidden pins & long-range diagonals from above!',
    accentGradient: 'from-sky-500/20 to-blue-500/10 border-sky-500/30 text-sky-400',
  },
  {
    id: 'dragon',
    name: 'Ignis the Dragon',
    emoji: '🐉',
    title: 'The Center Dominator',
    tagline: 'Breathes tactical fire across the Sicilian Dragon center!',
    accentGradient: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400',
  },
];

export const ACCESSORIES = [
  { id: 'none', label: 'None', icon: '✨', reqLevel: 1 },
  { id: 'tophat', label: 'Magician Top Hat', icon: '🎩', reqLevel: 2 },
  { id: 'cape', label: 'Hero Cape', icon: '🦸', reqLevel: 3 },
  { id: 'crown', label: 'Royal Crown', icon: '👑', reqLevel: 4 },
  { id: 'sunglasses', label: 'GM Sunglasses', icon: '🕶️', reqLevel: 5 },
];

interface KidsPetCompanionCardProps {
  studentXp?: number;
  studentName?: string;
}

export default function KidsPetCompanionCard({
  studentXp = 250,
  studentName = 'Champion',
}: KidsPetCompanionCardProps) {
  const [selectedPetId, setSelectedPetId] = useState<'lion' | 'falcon' | 'dragon'>('lion');
  const [selectedAccessory, setSelectedAccessory] = useState('none');
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [petMood, setPetMood] = useState<'happy' | 'cheering' | 'sleeping'>('happy');

  // Load saved companion preference
  useEffect(() => {
    try {
      const savedPet = localStorage.getItem('chesshub_kids_pet');
      const savedAcc = localStorage.getItem('chesshub_kids_accessory');
      if (savedPet === 'lion' || savedPet === 'falcon' || savedPet === 'dragon') {
        setSelectedPetId(savedPet);
      }
      if (savedAcc) {
        setSelectedAccessory(savedAcc);
      }
    } catch {}
  }, []);

  const activePet = PETS.find((p) => p.id === selectedPetId) || PETS[0];

  // Calculate Pet Level from XP
  let petLevel = 1;
  let levelTitle = 'Hatchling Companion';
  let nextLevelXp = 150;
  let currentLevelBaseXp = 0;

  if (studentXp >= 1500) {
    petLevel = 5;
    levelTitle = 'Grandmaster Companion';
    nextLevelXp = 2000;
    currentLevelBaseXp = 1500;
  } else if (studentXp >= 800) {
    petLevel = 4;
    levelTitle = 'Board Champion';
    nextLevelXp = 1500;
    currentLevelBaseXp = 800;
  } else if (studentXp >= 400) {
    petLevel = 3;
    levelTitle = 'Brave Knight';
    nextLevelXp = 800;
    currentLevelBaseXp = 400;
  } else if (studentXp >= 150) {
    petLevel = 2;
    levelTitle = 'Swift Scout';
    nextLevelXp = 400;
    currentLevelBaseXp = 150;
  }

  const levelProgressPct = Math.min(
    100,
    Math.round(((studentXp - currentLevelBaseXp) / Math.max(1, nextLevelXp - currentLevelBaseXp)) * 100)
  );

  const handleSelectPet = (petId: 'lion' | 'falcon' | 'dragon') => {
    setSelectedPetId(petId);
    try {
      localStorage.setItem('chesshub_kids_pet', petId);
    } catch {}
    setIsSelectorOpen(false);
    speakCheer(`Hello ${studentName}! I am your chess companion! Let's win some games!`);
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
    playVictoryFanfare();
    speakCheer();
    setTimeout(() => setPetMood('happy'), 2500);
  };

  const activeAccObj = ACCESSORIES.find((a) => a.id === selectedAccessory);

  return (
    <div className={`rounded-3xl border p-5 bg-gradient-to-br from-slate-900 to-slate-950 ${activePet.accentGradient} shadow-xl relative overflow-hidden transition-all duration-300`}>
      {/* Background ambient glow */}
      <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row items-center gap-5 justify-between relative z-10">
        {/* Left: Pet Avatar with Accessories */}
        <div className="flex items-center gap-4">
          <div
            onClick={handlePetClick}
            title="Click to hear your pet cheer!"
            className="w-20 h-20 rounded-2xl bg-slate-950/80 border-2 border-slate-700/80 flex items-center justify-center text-4xl shadow-2xl cursor-pointer hover:scale-110 active:scale-95 transition-transform relative group select-none"
          >
            {/* Worn accessory overlay */}
            {activeAccObj && activeAccObj.id !== 'none' && (
              <span className="absolute -top-2.5 -right-2 text-xl filter drop-shadow-md animate-bounce">
                {activeAccObj.icon}
              </span>
            )}
            <span className={petMood === 'cheering' ? 'animate-wiggle scale-110' : ''}>
              {activePet.emoji}
            </span>

            {/* Tap indicator */}
            <span className="absolute -bottom-1.5 px-2 py-0.5 rounded-full bg-slate-800 text-[9px] font-bold text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              🔊 Tap Me!
            </span>
          </div>

          <div className="space-y-1 text-left">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-base">{activePet.name}</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-extrabold border border-amber-500/30">
                Lv. {petLevel}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">{levelTitle} • {activePet.title}</p>
            <p className="text-[10px] text-slate-500 italic max-w-xs">{activePet.tagline}</p>
          </div>
        </div>

        {/* Center: Pet Level-Up Progress Bar */}
        <div className="w-full sm:w-56 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
            <span>Pet Level Progress</span>
            <span className="font-mono text-amber-400">{studentXp} / {nextLevelXp} XP</span>
          </div>
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500 shadow-gold"
              style={{ width: `${levelProgressPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span>{levelProgressPct}% to Lv. {petLevel + 1}</span>
            <button
              type="button"
              onClick={() => setIsSelectorOpen(!isSelectorOpen)}
              className="text-amber-400 hover:text-amber-300 font-bold underline"
            >
              Change Pet & Gear
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Pet & Accessory Selector Drawer */}
      {isSelectorOpen && (
        <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-4 animate-fadeIn">
          {/* Pet Switcher */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Choose Your Chess Companion
            </div>
            <div className="grid grid-cols-3 gap-2">
              {PETS.map((pet) => (
                <button
                  key={pet.id}
                  type="button"
                  onClick={() => handleSelectPet(pet.id)}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    selectedPetId === pet.id
                      ? 'bg-slate-800 border-amber-400 shadow-lg shadow-amber-500/10'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="text-2xl mb-1">{pet.emoji}</div>
                  <div className="text-xs font-bold text-white truncate">{pet.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{pet.title}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Accessory Closet */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Companion Accessories (Unlocked by Pet Level)</span>
              <span className="text-[10px] text-amber-400 font-bold">Your Level: {petLevel}</span>
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
                    className={`p-2 rounded-xl border text-center transition-all relative ${
                      isEquipped
                        ? 'bg-amber-500/20 border-amber-400 text-white'
                        : isLocked
                        ? 'bg-slate-900/30 border-slate-800/50 opacity-40 cursor-not-allowed text-slate-600'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="text-xl mb-1">{acc.icon}</div>
                    <div className="text-[10px] font-bold truncate">{acc.label}</div>
                    {isLocked && (
                      <span className="text-[9px] text-rose-400 font-mono block">Lv.{acc.reqLevel}</span>
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
