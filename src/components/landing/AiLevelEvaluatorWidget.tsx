'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface Question {
  question: string;
  options: { label: string; points: number }[];
}

const QUESTIONS: Question[] = [
  {
    question: "1. How often do you play or study chess?",
    options: [
      { label: "Just starting out / Complete Beginner", points: 1 },
      { label: "Casual player (know basic moves & rules)", points: 2 },
      { label: "Play regularly on Lichess / Chess.com (1000+ rating)", points: 3 },
      { label: "Tournament player with FIDE rating (1400+)", points: 4 },
    ],
  },
  {
    question: "2. Can you spot basic tactical opportunities like Forks & Pins?",
    options: [
      { label: "Not sure what Forks or Pins are yet", points: 1 },
      { label: "I know what they are but miss them during games", points: 2 },
      { label: "I regularly win pieces using tactics", points: 3 },
      { label: "I calculate 3-4 moves deep effortlessly", points: 4 },
    ],
  },
  {
    question: "3. What is your primary chess goal?",
    options: [
      { label: "Learn rules & play fun games with friends/family", points: 1 },
      { label: "Build solid opening & endgame fundamentals", points: 2 },
      { label: "Cross 1500+ rating on online platforms", points: 3 },
      { label: "Compete in official state/FIDE tournaments", points: 4 },
    ],
  },
];

export default function AiLevelEvaluatorWidget() {
  const [currentStep, setCurrentStep] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleSelectOption = (points: number) => {
    const newScore = totalScore + points;
    setTotalScore(newScore);

    if (currentStep + 1 < QUESTIONS.length) {
      setCurrentStep((prev) => prev + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setTotalScore(0);
    setIsCompleted(false);
  };

  const getRecommendation = () => {
    if (totalScore <= 4) {
      return {
        track: "Beginner Pawn Pioneer Track",
        ratingRange: "0 - 1000 Elo",
        description: "Perfect for new chess lovers! Master piece movement, board vision, checkmates, and basic tactics in a fun live group setting.",
        recommendedCourse: "1v1 Beginner Foundation",
      };
    } else if (totalScore <= 8) {
      return {
        track: "Intermediate Knight Strategist Track",
        ratingRange: "1000 - 1500 Elo",
        description: "Ideal for active players! Build a solid opening repertoire, master middle-game tactical calculation, and convert winning endgames.",
        recommendedCourse: "Intermediate Tactics & Openings",
      };
    } else {
      return {
        track: "Advanced Grandmaster Mastery Track",
        ratingRange: "1500 - 2000+ Elo",
        description: "For competitive players aiming for state/FIDE tournament success! Deep PGN analysis, Stockfish positional evaluation, and endgame theory.",
        recommendedCourse: "Mastery Tournament Prep",
      };
    }
  };

  const rec = getRecommendation();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-2xl mx-auto shadow-2xl relative select-none text-white overflow-hidden">
      <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-2xl shadow-gold">
          🤖
        </div>
        <div>
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">
            AI Skill Evaluator
          </span>
          <h3 className="font-heading font-extrabold text-base md:text-lg text-white">
            Find Your Child&apos;s Perfect Chess Track in 60 Seconds
          </h3>
        </div>
      </div>

      {!isCompleted ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>Question {currentStep + 1} of {QUESTIONS.length}</span>
            <span className="text-amber-400 font-mono">Step {currentStep + 1}/3</span>
          </div>

          <h4 className="font-heading font-extrabold text-sm md:text-base text-white">
            {QUESTIONS[currentStep].question}
          </h4>

          <div className="space-y-2.5">
            {QUESTIONS[currentStep].options.map((opt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectOption(opt.points)}
                className="w-full text-left p-3.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-400/50 rounded-2xl text-xs font-semibold text-slate-200 transition-all duration-200 flex items-center justify-between group"
              >
                <span>{opt.label}</span>
                <span className="text-slate-500 group-hover:text-amber-400 font-bold transition-colors">
                  →
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6 text-center py-2">
          <div className="inline-block px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
            🎉 Evaluation Complete!
          </div>

          <div className="space-y-2">
            <h4 className="font-heading font-extrabold text-xl text-amber-400">
              Recommended Track: {rec.track}
            </h4>
            <span className="inline-block px-3 py-1 bg-slate-950 border border-slate-800 text-amber-300 font-mono text-xs font-bold rounded-lg">
              Target Rating Range: {rec.ratingRange}
            </span>
            <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed pt-2">
              {rec.description}
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
            >
              🔄 Retake Test
            </button>
            <Link
              href="/book-demo"
              className="w-full sm:w-auto px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs shadow-gold transition-all duration-200 inline-block text-center"
            >
              🚀 Book Free Live Demo Class
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
