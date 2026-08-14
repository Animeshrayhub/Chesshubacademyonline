'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { AiMessage, AiMessageRole } from '@/types/opening-teacher';

// ─── CSS Coach Avatar (no API needed) ─────────────────────────────────────────
// Animated chess coach avatar using pure CSS/SVG — free, no API key required

interface AICoachAvatarProps {
  isSpeaking: boolean;
  isThinking: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AICoachAvatar({ isSpeaking, isThinking, size = 'md', className = '' }: AICoachAvatarProps) {
  const sizeMap = { sm: 80, md: 120, lg: 160 };
  const px = sizeMap[size];

  return (
    <div
      className={`relative flex-shrink-0 ${className}`}
      style={{ width: px, height: px }}
      aria-hidden="true"
    >
      {/* Animated ring */}
      <div
        className={`absolute inset-0 rounded-full border-2 transition-all duration-300 ${
          isSpeaking
            ? 'border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.5)] animate-pulse'
            : isThinking
            ? 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.4)]'
            : 'border-blue-700/40'
        }`}
      />

      {/* Coach illustration */}
      <div
        className="absolute inset-1 rounded-full overflow-hidden bg-gradient-to-br from-blue-900 via-slate-800 to-indigo-900 flex items-center justify-center"
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Background gradient */}
          <circle cx="50" cy="50" r="50" fill="url(#bgGrad)" />
          <defs>
            <radialGradient id="bgGrad" cx="40%" cy="35%" r="70%">
              <stop offset="0%" stopColor="#1e3a8a" />
              <stop offset="100%" stopColor="#0f172a" />
            </radialGradient>
          </defs>

          {/* Chess board pattern subtle bg */}
          <rect x="0" y="55" width="100" height="45" fill="rgba(255,255,255,0.03)" />

          {/* Head */}
          <ellipse cx="50" cy="32" rx="18" ry="20" fill="#c4956a" />

          {/* Hair */}
          <ellipse cx="50" cy="15" rx="18" ry="10" fill="#1e293b" />
          <rect x="32" y="14" width="36" height="8" fill="#1e293b" />

          {/* Eyes */}
          <ellipse cx="43" cy="30" rx="4" ry="4.5" fill="white" />
          <ellipse cx="57" cy="30" rx="4" ry="4.5" fill="white" />
          <circle cx="44" cy="31" r="2.5" fill="#1e293b" />
          <circle cx="58" cy="31" r="2.5" fill="#1e293b" />
          <circle cx="44.8" cy="30.2" r="0.8" fill="white" />
          <circle cx="58.8" cy="30.2" r="0.8" fill="white" />

          {/* Eyebrows */}
          <path d="M39 25 Q43 23 47 25" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M53 25 Q57 23 61 25" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" />

          {/* Nose */}
          <path d="M49 34 Q50 37 51 34" stroke="#a0785a" strokeWidth="1.2" strokeLinecap="round" />

          {/* Mouth — changes based on state */}
          {isSpeaking ? (
            <ellipse cx="50" cy="42" rx="5" ry="3" fill="#7c3d3d" stroke="#a0785a" strokeWidth="0.5" />
          ) : (
            <path d="M45 41 Q50 44 55 41" stroke="#a0785a" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          )}

          {/* Collar / shirt */}
          <path d="M32 55 L38 50 L45 58 L50 52 L55 58 L62 50 L68 55 L72 80 L28 80 Z" fill="#1e40af" />

          {/* ChessHub badge on shirt */}
          <rect x="44" y="60" width="12" height="8" rx="2" fill="#d4af37" />
          <text x="50" y="66.5" textAnchor="middle" fontSize="4" fill="#0f172a" fontWeight="bold">♔</text>

          {/* Tie */}
          <path d="M48 52 L50 72 L52 52 L51 50 L49 50 Z" fill="#d4af37" />

          {/* Thinking dots animation */}
          {isThinking && (
            <g>
              <circle cx="40" cy="12" r="2" fill="#d4af37" opacity="0.8">
                <animate attributeName="opacity" values="0.2;1;0.2" dur="1s" repeatCount="indefinite" begin="0s" />
              </circle>
              <circle cx="48" cy="8" r="2" fill="#d4af37" opacity="0.8">
                <animate attributeName="opacity" values="0.2;1;0.2" dur="1s" repeatCount="indefinite" begin="0.3s" />
              </circle>
              <circle cx="56" cy="12" r="2" fill="#d4af37" opacity="0.8">
                <animate attributeName="opacity" values="0.2;1;0.2" dur="1s" repeatCount="indefinite" begin="0.6s" />
              </circle>
            </g>
          )}
        </svg>
      </div>

      {/* Equalizer animation when speaking */}
      {isSpeaking && (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-0.5 items-end h-3 bg-slate-900/90 px-1.5 py-0.5 rounded-full border border-emerald-500/50 shadow-md">
          <span className="w-0.5 bg-emerald-400 rounded-full animate-[bounce_0.5s_infinite_0.1s] h-2" />
          <span className="w-0.5 bg-emerald-400 rounded-full animate-[bounce_0.5s_infinite_0.3s] h-3" />
          <span className="w-0.5 bg-emerald-400 rounded-full animate-[bounce_0.5s_infinite_0.2s] h-1.5" />
          <span className="w-0.5 bg-emerald-400 rounded-full animate-[bounce_0.5s_infinite_0.4s] h-2.5" />
        </div>
      )}

      {/* Status badge */}
      <div
        className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-900 transition-colors ${
          isSpeaking ? 'bg-emerald-400' : isThinking ? 'bg-amber-400' : 'bg-blue-500'
        }`}
      />
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

interface AIMessageBubbleProps {
  message: AiMessage;
  language: 'en' | 'hi';
}

export function AIMessageBubble({ message, language }: AIMessageBubbleProps) {
  const isCoach = message.role === 'coach';
  const content = language === 'hi' && message.content_hindi
    ? message.content_hindi
    : message.content;

  return (
    <div className={`flex gap-2 ${isCoach ? '' : 'flex-row-reverse'} items-end`}>
      {isCoach && (
        <div className="w-7 h-7 rounded-full bg-blue-900 border border-blue-700 flex items-center justify-center text-xs flex-shrink-0">
          ♔
        </div>
      )}

      <div
        className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isCoach
            ? 'bg-slate-800 text-slate-100 rounded-bl-sm border border-slate-700/60'
            : 'bg-blue-600 text-white rounded-br-sm'
        }`}
      >
        {content}
        {message.is_question && isCoach && (
          <div className="mt-1.5 flex items-center gap-1 text-xs text-blue-300">
            <span>💬</span>
            <span>Your turn to answer</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Voice Button ─────────────────────────────────────────────────────────────
// Uses browser SpeechRecognition (free) and SpeechSynthesis (free)

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  onVoiceCommand?: (command: 'hint' | 'explain' | 'why' | 'next' | 'show') => void;
  coachMessage?: string;
  language: 'en' | 'hi';
  speechRate?: number;
  disabled?: boolean;
}

export function VoiceButton({
  onTranscript,
  onVoiceCommand,
  coachMessage,
  language,
  speechRate = 0.9,
  disabled,
}: VoiceButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);

  const langCode = language === 'hi' ? 'hi-IN' : 'en-US';

  // Speak the coach message
  const speakMessage = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.rate = speechRate;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  // Start voice input
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice recognition is not supported in this browser. Try Chrome.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = langCode;
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase().trim();

      // Check for hands-free voice command shortcuts
      if (onVoiceCommand) {
        if (transcript.includes('hint') || transcript.includes('clue') || transcript.includes('संकेत')) {
          onVoiceCommand('hint');
          setIsListening(false);
          return;
        }
        if (transcript.includes('explain') || transcript.includes('समझाएं')) {
          onVoiceCommand('explain');
          setIsListening(false);
          return;
        }
        if (transcript.includes('why') || transcript.includes('क्यों')) {
          onVoiceCommand('why');
          setIsListening(false);
          return;
        }
        if (transcript.includes('next') || transcript.includes('अगला')) {
          onVoiceCommand('next');
          setIsListening(false);
          return;
        }
        if (transcript.includes('show') || transcript.includes('दिखाएं')) {
          onVoiceCommand('show');
          setIsListening(false);
          return;
        }
      }

      onTranscript(event.results[0][0].transcript);
      setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Speak coach message button */}
      {coachMessage && (
        <button
          type="button"
          onClick={() => speakMessage(coachMessage)}
          disabled={isSpeaking || disabled}
          title="Hear the coach"
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all border ${
            isSpeaking
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 animate-pulse'
              : 'bg-slate-700 border-slate-600 text-slate-300 hover:text-white hover:border-slate-500'
          }`}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
          </svg>
        </button>
      )}

      {/* Voice input button */}
      <button
        type="button"
        onClick={isListening ? stopListening : startListening}
        disabled={isSpeaking || disabled}
        title={isListening ? 'Stop listening' : 'Speak your answer'}
        aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all border ${
          isListening
            ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.4)]'
            : 'bg-slate-700 border-slate-600 text-slate-300 hover:text-white hover:border-slate-500'
        }`}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          {isListening ? (
            <rect x="6" y="6" width="12" height="12" rx="2" />
          ) : (
            <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
          )}
        </svg>
      </button>

      {isListening && (
        <div className="flex items-center gap-1">
          <div className="flex gap-0.5 items-center h-4">
            <span className="w-0.5 bg-red-400 rounded-full animate-[bounce_0.6s_infinite_0.1s] h-3" />
            <span className="w-0.5 bg-red-400 rounded-full animate-[bounce_0.6s_infinite_0.3s] h-4" />
            <span className="w-0.5 bg-red-400 rounded-full animate-[bounce_0.6s_infinite_0.2s] h-2" />
            <span className="w-0.5 bg-red-400 rounded-full animate-[bounce_0.6s_infinite_0.4s] h-3.5" />
          </div>
          <span className="text-xs text-red-400 animate-pulse font-medium">Listening...</span>
        </div>
      )}
    </div>
  );
}
