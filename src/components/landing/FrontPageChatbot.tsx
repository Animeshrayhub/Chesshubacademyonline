'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  actionButton?: {
    label: string;
    href: string;
  };
  time: string;
}

const REVIEWS = [
  { text: "⭐ My 8-year-old son gained +220 ELO in 3 months! FIDE coaches are amazing.", author: "Priya S., Parent (Mumbai)" },
  { text: "⭐ Best online chess academy. The interactive board & Stockfish bot are super fun!", author: "David M., Parent (London)" },
];

export default function FrontPageChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isReturningVisitor, setIsReturningVisitor] = useState(false);
  const [reviewIdx, setReviewIdx] = useState(0);

  // Collision & Keyboard state
  const [isShiftedUp, setIsShiftedUp] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm1',
      sender: 'bot',
      text: "👋 Welcome to ChessHub Academy! I am your 24/7 AI Concierge. How can I help you today?",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

  // Returning visitor memory
  useEffect(() => {
    try {
      const visited = localStorage.getItem('chesshub_visited');
      if (visited) {
        setIsReturningVisitor(true);
        setMessages([
          {
            id: 'rv1',
            sender: 'bot',
            text: "👋 Welcome back to ChessHub Academy! Ready to book your free 1v1 demo class with a FIDE Coach?",
            actionButton: {
              label: '📅 Book Free Demo Now',
              href: '/book-demo',
            },
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } else {
        localStorage.setItem('chesshub_visited', 'true');
      }
    } catch (_) {
      // Ignore storage restrictions
    }
  }, []);

  // Auto scroll inside chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Smart Collision Detection via IntersectionObserver
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

    const ctaSelectors = [
      'footer',
      'a[href="/book-demo"]',
      'a[href="/login"]',
      'button[aria-label*="Book"]',
      '[data-sticky-cta]',
    ];

    const elementsToObserve: Element[] = [];
    ctaSelectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        // Exclude elements inside the chatbot itself
        if (!widgetRef.current?.contains(el)) {
          elementsToObserve.push(el);
        }
      });
    });

    if (elementsToObserve.length === 0) return;

    const intersectingElements = new Set<Element>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Check if element is in the lower 35% of the screen
            const rect = entry.boundingClientRect;
            if (rect.top < window.innerHeight && rect.bottom > window.innerHeight * 0.65) {
              intersectingElements.add(entry.target);
            } else {
              intersectingElements.delete(entry.target);
            }
          } else {
            intersectingElements.delete(entry.target);
          }
        });

        setIsShiftedUp(intersectingElements.size > 0);
      },
      {
        rootMargin: '0px 0px -15% 0px',
        threshold: 0.1,
      }
    );

    elementsToObserve.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  // Virtual Keyboard & Focus Detection on Mobile
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        window.innerWidth < 640 &&
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') &&
        !widgetRef.current?.contains(target)
      ) {
        setIsKeyboardOpen(true);
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') &&
        !widgetRef.current?.contains(target)
      ) {
        setIsKeyboardOpen(false);
      }
    };

    const handleVisualViewportResize = () => {
      if (window.visualViewport) {
        const isResized = window.visualViewport.height < window.innerHeight - 150;
        if (window.innerWidth < 640) {
          setIsKeyboardOpen(isResized);
        }
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportResize);
    }

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportResize);
      }
    };
  }, []);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, utmSource: 'FrontPageChatbot' }),
      });
      const data = await res.json();

      if (data.success && data.data) {
        const botMsg: Message = {
          id: `b-${Date.now()}`,
          sender: 'bot',
          text: data.data.responseText,
          actionButton: data.data.actionButton,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, botMsg]);
      }
    } catch (_) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'bot',
          text: "Connect directly with Admin on WhatsApp (+91 70086 65245) for instant answers!",
          actionButton: {
            label: '📲 WhatsApp Admin Instant Booking',
            href: 'https://wa.me/917008665245?text=Hi%20ChessHub%20Admin%2C%20I%20have%20an%20inquiry.',
          },
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const suggestionChips = [
    { label: '🚀 Book Free Demo', query: 'How do I book a free demo class?' },
    { label: '♟️ Beginner Skill Level', query: 'My child is a beginner' },
    { label: '🏆 Intermediate Level', query: 'My child plays intermediate chess' },
    { label: '💰 Fees & Pricing', query: 'What are the fees and pricing?' },
  ];

  // Calculate dynamic bottom offset considering safe-area and collision
  const bottomOffsetClass = isShiftedUp
    ? 'bottom-[calc(88px+env(safe-area-inset-bottom,0px))]'
    : 'bottom-[calc(20px+env(safe-area-inset-bottom,0px))]';

  return (
    <div
      ref={widgetRef}
      className={`fixed right-[calc(16px+env(safe-area-inset-right,0px))] z-40 font-sans transition-all duration-300 ease-out ${bottomOffsetClass} ${
        isKeyboardOpen && !isOpen ? 'opacity-0 pointer-events-none translate-y-4' : 'opacity-100 translate-y-0'
      }`}
    >
      {/* Chatbot Window */}
      {isOpen && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-[calc(100vw-32px)] sm:w-[380px] max-w-[400px] h-[min(540px,78vh)] flex flex-col overflow-hidden mb-3 animate-fadeIn backdrop-blur-xl">
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-amber-500 via-yellow-600 to-slate-900 text-slate-950 flex items-center justify-between shadow-md shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-9 h-9 rounded-2xl bg-black/10 border border-black/20 flex items-center justify-center text-lg shadow-inner">
                  🤖
                </div>
                <span className="w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-900 rounded-full absolute -bottom-0.5 -right-0.5 animate-pulse"></span>
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-xs sm:text-sm text-slate-950 flex items-center gap-1.5">
                  <span>ChessHub AI Concierge</span>
                  <span className="text-[8px] sm:text-[9px] bg-slate-950 text-amber-300 font-bold px-1.5 py-0.2 rounded-full uppercase">
                    {isReturningVisitor ? 'VIP Returning' : 'AI Online'}
                  </span>
                </h3>
                <p className="text-[10px] sm:text-[11px] text-slate-900 font-semibold">24/7 Guidance • Admin: +91 70086 65245</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close AI Chess Assistant"
              className="w-8 h-8 rounded-xl bg-black/10 hover:bg-black/20 text-slate-950 font-bold flex items-center justify-center text-sm transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Parent Review Banner inside Chat */}
          <div className="px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-[11px] shrink-0">
            <p className="text-amber-300 font-semibold truncate text-[10px] sm:text-[11px]">
              {REVIEWS[reviewIdx].text}
            </p>
            <button
              type="button"
              onClick={() => setReviewIdx((prev) => (prev + 1) % REVIEWS.length)}
              className="text-[10px] text-amber-400 font-bold hover:underline shrink-0 ml-2"
            >
              Next ➔
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-slate-950/90 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] p-3 rounded-2xl leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-amber-500 text-slate-950 font-semibold rounded-br-none shadow-md'
                      : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none shadow-inner'
                  }`}
                >
                  <p className="whitespace-pre-line text-xs">{m.text}</p>

                  {m.actionButton && (
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80">
                      <a
                        href={m.actionButton.href}
                        target={m.actionButton.href.startsWith('http') ? '_blank' : '_self'}
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-extrabold text-[11px] rounded-xl shadow-md transition-all active:scale-95 w-full"
                      >
                        {m.actionButton.label}
                      </a>
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-slate-500 mt-1 px-1">{m.time}</span>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-1.5 text-slate-400 text-xs p-2 bg-slate-900/60 rounded-xl w-fit border border-slate-800">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                <span>AI is typing response...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="p-2 bg-slate-900 border-t border-slate-800 overflow-x-auto flex gap-1.5 scrollbar-none shrink-0">
            {suggestionChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(chip.query)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-amber-300 rounded-full text-[10px] font-bold whitespace-nowrap transition-all hover:border-amber-500/50"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Direct WhatsApp Admissions Bar */}
          <div className="px-3 py-1.5 bg-slate-950 border-t border-slate-850 flex items-center justify-between text-[10px] sm:text-[11px] shrink-0">
            <span className="text-slate-400 font-medium">Direct Admin Chat:</span>
            <a
              href="https://wa.me/917008665245?text=Hi%20ChessHub%20Admin%2C%20I%20want%20to%20know%20more%20about%20classes."
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 font-bold hover:underline flex items-center gap-1"
            >
              <span>📲 WhatsApp +91 70086 65245</span>
            </a>
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              placeholder="Ask about demo classes, levels, fees..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-medium"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-9 h-9 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 disabled:opacity-50 text-slate-950 rounded-xl font-bold flex items-center justify-center transition-all shadow-md shrink-0 text-sm"
            >
              ➔
            </button>
          </form>
        </div>
      )}

      {/* Floating Launcher Button with 48x48px Touch Target */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-expanded={false}
          aria-label="Open Chat with ChessHub AI Concierge"
          className="min-h-[48px] min-w-[48px] px-4.5 py-3 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-extrabold text-xs rounded-full shadow-2xl transition-all active:scale-95 flex items-center gap-2.5 border-2 border-amber-300/60 group"
        >
          <div className="relative">
            <span className="text-base sm:text-lg">💬</span>
            <span className="w-2.5 h-2.5 bg-emerald-400 border border-slate-950 rounded-full absolute -top-0.5 -right-0.5 animate-pulse"></span>
          </div>
          <span className="hidden sm:inline">Chat with ChessHub AI</span>
          <span className="inline sm:hidden font-bold">AI Chat</span>
        </button>
      )}
    </div>
  );
}
