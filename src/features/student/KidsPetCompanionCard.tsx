'use client';

import React, { useState, useEffect } from 'react';
import { speakCheer, playVictoryFanfare, playBoingSound } from '@/utils/kidAudio';
import { getStudentPuzzleStats, saveStudentPuzzleStats } from '@/lib/puzzles/progress';
import {
  buyCompanionGearAction,
  equipCompanionGearAction,
  equipCompanionPetAction,
} from '@/actions/students';

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

export interface CompanionGear {
  id: string;
  label: string;
  icon: string;
  costXp: number;
  category: 'hat' | 'cape' | 'special';
  tagline: string;
  glowBorder: string;
  glowBg: string;
}

export const COMPANION_GEAR: CompanionGear[] = [
  {
    id: 'none',
    label: 'Natural Look',
    icon: '✨',
    costXp: 0,
    category: 'special',
    tagline: 'Pure natural champion style with no accessories.',
    glowBorder: 'border-slate-700',
    glowBg: 'bg-slate-900',
  },
  {
    id: 'tophat',
    label: 'Magician Top Hat',
    icon: '🎩',
    costXp: 30,
    category: 'hat',
    tagline: 'Dazzle opponents with tactical magic & disappearing pawns!',
    glowBorder: 'border-purple-500/40',
    glowBg: 'bg-purple-950/40',
  },
  {
    id: 'partyhat',
    label: 'Party Fiesta Cone',
    icon: '🎉',
    costXp: 40,
    category: 'hat',
    tagline: 'Throws colorful confetti after every checkmate!',
    glowBorder: 'border-pink-500/40',
    glowBg: 'bg-pink-950/40',
  },
  {
    id: 'sunglasses',
    label: 'GM Shades',
    icon: '🕶️',
    costXp: 50,
    category: 'special',
    tagline: 'Ice-cold calculation under severe clock time pressure!',
    glowBorder: 'border-cyan-500/40',
    glowBg: 'bg-cyan-950/40',
  },
  {
    id: 'goggles',
    label: 'Cyber Neon Goggles',
    icon: '🥽',
    costXp: 60,
    category: 'special',
    tagline: 'Night-vision laser lenses to spot back-rank blunders!',
    glowBorder: 'border-emerald-400/40',
    glowBg: 'bg-emerald-950/40',
  },
  {
    id: 'viking',
    label: 'Viking Battle Horns',
    icon: '⚔️',
    costXp: 75,
    category: 'hat',
    tagline: 'Storm the center fearlessly with warrior courage!',
    glowBorder: 'border-amber-500/40',
    glowBg: 'bg-amber-950/40',
  },
  {
    id: 'holmes',
    label: 'Detective Holmes Cap',
    icon: '🕵️',
    costXp: 85,
    category: 'hat',
    tagline: 'Deduce hidden opponent blunders with brilliant precision!',
    glowBorder: 'border-amber-600/40',
    glowBg: 'bg-amber-950/40',
  },
  {
    id: 'ninja',
    label: 'Shinobi Shadow Mask',
    icon: '🥷',
    costXp: 90,
    category: 'special',
    tagline: 'Strike silently from the diagonals when least expected!',
    glowBorder: 'border-emerald-500/40',
    glowBg: 'bg-emerald-950/40',
  },
  {
    id: 'pirate',
    label: 'Pirate Captain Tricorn',
    icon: '🏴‍☠️',
    costXp: 100,
    category: 'hat',
    tagline: 'Plunder enemy queens and take all open files!',
    glowBorder: 'border-red-500/40',
    glowBg: 'bg-red-950/40',
  },
  {
    id: 'chef',
    label: "Chef's Gourmet Toque",
    icon: '👨‍🍳',
    costXp: 110,
    category: 'hat',
    tagline: 'Cooking up spicy fried-liver attacks and king feasts!',
    glowBorder: 'border-orange-400/40',
    glowBg: 'bg-orange-950/40',
  },
  {
    id: 'astronaut',
    label: 'Cosmic Space Helmet',
    icon: '🚀',
    costXp: 125,
    category: 'hat',
    tagline: 'Calculations that soar beyond gravity into the galaxy!',
    glowBorder: 'border-indigo-500/40',
    glowBg: 'bg-indigo-950/40',
  },
  {
    id: 'knighthelm',
    label: 'Royal Knight Visor',
    icon: '🪖',
    costXp: 135,
    category: 'hat',
    tagline: 'Ironclad defenses that deflect all enemy checks and forks!',
    glowBorder: 'border-slate-400/40',
    glowBg: 'bg-slate-900',
  },
  {
    id: 'cape',
    label: 'Golden Hero Cape',
    icon: '🦸',
    costXp: 150,
    category: 'cape',
    tagline: 'Swoops across the rank to shield endangered pieces!',
    glowBorder: 'border-yellow-500/40',
    glowBg: 'bg-yellow-950/40',
  },
  {
    id: 'headphones',
    label: 'Neon Blitz Headset',
    icon: '🎧',
    costXp: 175,
    category: 'special',
    tagline: 'Groove to high-speed tactical blitz beats!',
    glowBorder: 'border-fuchsia-500/40',
    glowBg: 'bg-fuchsia-950/40',
  },
  {
    id: 'wizard',
    label: "Merlin's Spellbound Hat",
    icon: '🧙',
    costXp: 200,
    category: 'hat',
    tagline: 'Conjures unstoppable mating nets and mystical forks!',
    glowBorder: 'border-violet-500/40',
    glowBg: 'bg-violet-950/40',
  },
  {
    id: 'boxing',
    label: 'World Champion Belt',
    icon: '🥊',
    costXp: 220,
    category: 'special',
    tagline: 'Deliver knockout tactical blows in the first 10 moves!',
    glowBorder: 'border-rose-500/50',
    glowBg: 'bg-rose-950/50',
  },
  {
    id: 'angelwings',
    label: 'Celestial Angel Wings',
    icon: '🪽',
    costXp: 250,
    category: 'cape',
    tagline: 'Hover peacefully over dangerous traps and pawn pins!',
    glowBorder: 'border-sky-400/40',
    glowBg: 'bg-sky-950/40',
  },
  {
    id: 'phoenixwings',
    label: 'Phoenix Fire Wings',
    icon: '🪶',
    costXp: 280,
    category: 'cape',
    tagline: 'Rise from lost positions into glorious checkmate turnarounds!',
    glowBorder: 'border-orange-500/50',
    glowBg: 'bg-orange-950/50',
  },
  {
    id: 'crown',
    label: 'Imperial Monarch Crown',
    icon: '👑',
    costXp: 300,
    category: 'hat',
    tagline: 'Worn only by grandmasters and undisputed kings!',
    glowBorder: 'border-amber-400/50',
    glowBg: 'bg-amber-950/50',
  },
  {
    id: 'pharaoh',
    label: "Pharaoh's Golden Nemes",
    icon: '🏺',
    costXp: 320,
    category: 'hat',
    tagline: 'Ancient dynasty secrets guarding center pawn chains!',
    glowBorder: 'border-yellow-500/50',
    glowBg: 'bg-yellow-950/50',
  },
  {
    id: 'dragonhelm',
    label: 'Dragon Flame Aura',
    icon: '🔥',
    costXp: 350,
    category: 'special',
    tagline: 'Ignites furious counter-attacks and kingside storms!',
    glowBorder: 'border-orange-500/50',
    glowBg: 'bg-orange-950/50',
  },
  {
    id: 'trophy',
    label: 'World Cup Trophy Hat',
    icon: '🏆',
    costXp: 400,
    category: 'special',
    tagline: 'The ultimate symbol of ChessHub Academy mastery!',
    glowBorder: 'border-yellow-400/60',
    glowBg: 'bg-yellow-950/60',
  },
  {
    id: 'lightning',
    label: 'Lightning Speed Visor',
    icon: '⚡',
    costXp: 450,
    category: 'special',
    tagline: 'Spots brilliant sacrifices with lightning speed!',
    glowBorder: 'border-amber-300/60',
    glowBg: 'bg-amber-950/60',
  },
  {
    id: 'halo',
    label: 'Cosmic Grandmaster Halo',
    icon: '🌌',
    costXp: 500,
    category: 'special',
    tagline: 'Radiates cosmic chess wisdom and enlightenment!',
    glowBorder: 'border-indigo-300/60',
    glowBg: 'bg-indigo-950/60',
  },
];

export const ACCESSORIES = COMPANION_GEAR;

interface KidsPetCompanionCardProps {
  studentXp?: number;
  studentName?: string;
  initialPetId?: string;
  initialGearId?: string;
  initialUnlockedGear?: string[];
}

export default function KidsPetCompanionCard({
  studentXp = 0,
  studentName = 'Champion',
  initialPetId = 'dragon',
  initialGearId = 'none',
  initialUnlockedGear = ['none'],
}: KidsPetCompanionCardProps) {
  const [selectedPetId, setSelectedPetId] = useState<string>(initialPetId);
  const [selectedAccessory, setSelectedAccessory] = useState<string>(initialGearId);
  const [unlockedGear, setUnlockedGear] = useState<string[]>(initialUnlockedGear || ['none']);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'pets' | 'gear'>('gear');
  const [gearCategory, setGearCategory] = useState<'all' | 'hat' | 'cape' | 'special' | 'owned'>('all');
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [petMood, setPetMood] = useState<'happy' | 'cheering' | 'talking'>('happy');
  const [bubbleText, setBubbleText] = useState('');
  const [displayXp, setDisplayXp] = useState(studentXp);

  useEffect(() => {
    setDisplayXp(studentXp);
  }, [studentXp]);

  useEffect(() => {
    if (initialPetId && PETS.some((p) => p.id === initialPetId)) {
      setSelectedPetId(initialPetId);
    }
    if (initialGearId) {
      setSelectedAccessory(initialGearId);
    }
    if (initialUnlockedGear && initialUnlockedGear.length > 0) {
      setUnlockedGear((prev) => Array.from(new Set([...prev, ...initialUnlockedGear])));
    }
  }, [initialPetId, initialGearId, initialUnlockedGear]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.location.hash === '#pet-gear') {
        setIsSelectorOpen(true);
        setActiveTab('gear');
      }

      const handleXpUpdate = (e: any) => {
        if (e.detail?.xp != null) {
          setDisplayXp(e.detail.xp);
        }
      };
      window.addEventListener('chesshub_xp_updated', handleXpUpdate);
      return () => window.removeEventListener('chesshub_xp_updated', handleXpUpdate);
    }
  }, []);

  const activePet = PETS.find((p) => p.id === selectedPetId) || PETS[0];

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

  const handleSelectPet = async (petId: string) => {
    setSelectedPetId(petId);
    try {
      localStorage.setItem('chesshub_kids_pet', petId);
    } catch {}
    const chosen = PETS.find((p) => p.id === petId) || activePet;
    setBubbleText(chosen.dialogue);
    setPetMood('talking');
    speakCheer(`${chosen.name} is ready! ${chosen.dialogue}`);
    setTimeout(() => {
      setPetMood('happy');
      setBubbleText('');
    }, 4500);

    try {
      await equipCompanionPetAction(petId);
    } catch {}
  };

  const handleEquipGear = async (gearId: string) => {
    setSelectedAccessory(gearId);
    try {
      localStorage.setItem('chesshub_kids_accessory', gearId);
    } catch {}

    const chosen = COMPANION_GEAR.find((g) => g.id === gearId);
    if (chosen && chosen.id !== 'none') {
      setBubbleText(`Equipped ${chosen.label}!`);
      setPetMood('happy');
      speakCheer(`Equipped ${chosen.label}!`);
      setTimeout(() => setBubbleText(''), 3000);
    } else {
      setBubbleText('Equipped Natural Look!');
      setTimeout(() => setBubbleText(''), 2500);
    }

    try {
      await equipCompanionGearAction(gearId);
    } catch {}
  };

  const handleBuyGear = async (gear: CompanionGear) => {
    if (unlockedGear.includes(gear.id)) {
      handleEquipGear(gear.id);
      return;
    }

    if (displayXp < gear.costXp) {
      playBoingSound();
      setBubbleText(`Need ${gear.costXp - displayXp} more XP for ${gear.label}!`);
      setPetMood('talking');
      speakCheer(`You need ${gear.costXp - displayXp} more XP to buy the ${gear.label}! Solve puzzles or play minigames to earn XP!`);
      setTimeout(() => {
        setBubbleText('');
        setPetMood('happy');
      }, 4000);
      return;
    }

    setBuyingId(gear.id);
    const newXp = Math.max(0, displayXp - gear.costXp);
    const newUnlocked = Array.from(new Set([...unlockedGear, gear.id]));

    setDisplayXp(newXp);
    setUnlockedGear(newUnlocked);
    setSelectedAccessory(gear.id);

    try {
      localStorage.setItem('chesshub_kids_accessory', gear.id);
      localStorage.setItem('chesshub_unlocked_gear', JSON.stringify(newUnlocked));
      const localStats = getStudentPuzzleStats();
      if (localStats) {
        localStats.xp = newXp;
        saveStudentPuzzleStats(localStats);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('chesshub_xp_updated', { detail: { xp: newXp } }));
      }
    } catch {}

    playVictoryFanfare();
    setPetMood('cheering');
    setBubbleText(`🎉 Bought ${gear.label}! -${gear.costXp} XP`);
    speakCheer(`Woohoo! You unlocked the ${gear.label}! Looking magnificent!`);

    try {
      const res = await buyCompanionGearAction(gear.id, gear.costXp);
      if (!res.success) {
        setDisplayXp(displayXp);
        setUnlockedGear(unlockedGear);
        setBubbleText(res.error || 'Failed to buy gear');
      } else if (res.data?.xp != null) {
        setDisplayXp(res.data.xp);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('chesshub_xp_updated', { detail: { xp: res.data.xp } }));
        }
      }
    } catch {} finally {
      setBuyingId(null);
      setTimeout(() => {
        setBubbleText('');
        setPetMood('happy');
      }, 4500);
    }
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

  const activeAccObj = COMPANION_GEAR.find((a) => a.id === selectedAccessory) || COMPANION_GEAR[0];

  const filteredGear = COMPANION_GEAR.filter((g) => {
    if (gearCategory === 'all') return true;
    if (gearCategory === 'owned') return unlockedGear.includes(g.id);
    return g.category === gearCategory;
  });

  return (
    <div
      id="pet-gear"
      className={`rounded-3xl border p-5 bg-gradient-to-br ${activePet.cardBg} ${activePet.cardBorder} shadow-2xl relative overflow-hidden transition-all duration-300`}
    >
      <div
        className="absolute -top-12 -left-12 w-48 h-48 rounded-full blur-3xl pointer-events-none transition-all duration-500"
        style={{ background: activePet.glowEffect }}
      />

      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-4 text-left">
          <div className="relative">
            <div
              onClick={handlePetClick}
              title="Click to hear your pet cheer!"
              className={`w-20 h-20 rounded-2xl border-2 ${activePet.avatarRing} flex items-center justify-center text-4xl cursor-pointer hover:scale-110 active:scale-95 transition-all select-none relative group`}
            >
              {activeAccObj && activeAccObj.id !== 'none' && (
                <span
                  className={`absolute select-none pointer-events-none filter drop-shadow-[0_0_10px_rgba(255,255,255,0.85)] ${
                    activeAccObj.category === 'hat'
                      ? '-top-3.5 left-1/2 -translate-x-1/2 text-2xl animate-bounce'
                      : activeAccObj.category === 'cape'
                      ? '-bottom-1.5 -right-2 text-2xl animate-pulse'
                      : '-top-1.5 -right-1.5 text-2xl animate-spin-slow'
                  }`}
                  title={`Wearing: ${activeAccObj.label}`}
                >
                  {activeAccObj.icon}
                </span>
              )}
              <span className={petMood === 'cheering' ? 'animate-wiggle scale-110' : ''}>
                {activePet.emoji}
              </span>
            </div>
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
              {activeAccObj && activeAccObj.id !== 'none' && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30 flex items-center gap-1">
                  <span>{activeAccObj.icon}</span>
                  <span className="truncate max-w-[100px]">{activeAccObj.label}</span>
                </span>
              )}
            </div>
            <p className={`text-xs font-bold ${activePet.textAccent}`}>{activePet.title}</p>
            <p className="text-[11px] text-slate-300 italic max-w-sm leading-snug">{activePet.tagline}</p>
          </div>
        </div>

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
              className="text-amber-400 hover:text-amber-300 font-extrabold underline flex items-center gap-1 transition-all"
            >
              <span>{isSelectorOpen ? 'Close Closet' : '🐾 Change Pet & Gear'}</span>
              <span>{isSelectorOpen ? '▲' : '▼'}</span>
            </button>
          </div>
        </div>
      </div>

      {isSelectorOpen && (
        <div className="mt-5 pt-5 border-t border-slate-800/90 space-y-5 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('gear')}
                className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  activeTab === 'gear'
                    ? 'bg-amber-500 text-slate-950 shadow-gold'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <span>🎩</span>
                <span>Gear & Hats Shop ({COMPANION_GEAR.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('pets')}
                className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  activeTab === 'pets'
                    ? 'bg-amber-500 text-slate-950 shadow-gold'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <span>🐾</span>
                <span>Switch Pet ({PETS.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-[11px] text-slate-400 font-bold uppercase">Your Academy XP:</span>
              <span className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs font-black flex items-center gap-1 shadow">
                <span>⚡</span>
                <span>{displayXp} XP</span>
              </span>
            </div>
          </div>

          {activeTab === 'gear' && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                {(['all', 'hat', 'cape', 'special', 'owned'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setGearCategory(cat)}
                    className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all capitalize ${
                      gearCategory === cat
                        ? 'bg-indigo-600 text-white shadow'
                        : 'bg-slate-900/90 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {cat === 'all' && `All Gear (${COMPANION_GEAR.length})`}
                    {cat === 'hat' && 'Hats & Helmets 🎩'}
                    {cat === 'cape' && 'Capes & Wings 🦸'}
                    {cat === 'special' && 'Special Items ⚡'}
                    {cat === 'owned' && `My Collection (${unlockedGear.length})`}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {filteredGear.map((gear) => {
                  const isOwned = unlockedGear.includes(gear.id) || gear.id === 'none';
                  const isEquipped = selectedAccessory === gear.id;
                  const canAfford = displayXp >= gear.costXp;
                  const isBuying = buyingId === gear.id;

                  return (
                    <div
                      key={gear.id}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between relative overflow-hidden ${
                        isEquipped
                          ? 'bg-gradient-to-br from-amber-500/20 via-slate-900 to-indigo-950/80 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                          : isOwned
                          ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                          : canAfford
                          ? 'bg-slate-950/80 border-amber-500/30 hover:border-amber-400/60'
                          : 'bg-slate-950/60 border-slate-800/60 opacity-80'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="w-12 h-12 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center justify-center text-2xl shadow">
                            {gear.icon}
                          </div>
                          <div>
                            {isEquipped ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-500/40">
                                ✓ WORN
                              </span>
                            ) : isOwned ? (
                              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-500/30">
                                UNLOCKED
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono font-black border border-amber-500/30">
                                ⚡ {gear.costXp} XP
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="font-extrabold text-white text-xs mb-0.5">{gear.label}</div>
                        <p className="text-[10px] text-slate-300 leading-tight mb-3">{gear.tagline}</p>
                      </div>

                      <div>
                        {isEquipped ? (
                          <div className="w-full py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-600/50 text-emerald-300 text-[11px] font-black text-center">
                            Currently Worn
                          </div>
                        ) : isOwned ? (
                          <button
                            type="button"
                            onClick={() => handleEquipGear(gear.id)}
                            className="w-full py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-[11px] font-black transition-all shadow"
                          >
                            Equip Gear
                          </button>
                        ) : canAfford ? (
                          <button
                            type="button"
                            disabled={isBuying}
                            onClick={() => handleBuyGear(gear)}
                            className="w-full py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 active:scale-95 text-slate-950 text-[11px] font-black transition-all shadow-gold flex items-center justify-center gap-1"
                          >
                            <span>⚡</span>
                            <span>{isBuying ? 'Unlocking...' : `Buy for ${gear.costXp} XP`}</span>
                          </button>
                        ) : (
                          <div className="w-full py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 text-[10px] font-bold text-center">
                            🔒 Need {gear.costXp - displayXp} more XP
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'pets' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-extrabold text-white uppercase tracking-wider">
                  Select Companion (12 Unique Champions)
                </span>
                <span className="text-[10px] text-slate-400">Adopt any pet instantly for free</span>
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
          )}
        </div>
      )}
    </div>
  );
}
