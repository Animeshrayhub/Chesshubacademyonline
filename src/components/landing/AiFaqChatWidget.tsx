'use client';

import React, { useState } from 'react';

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
}

export default function AiFaqChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'bot',
      text: '👋 Hi! I am the ChessHub AI Assistant. Ask me anything about our online chess coaching, class schedules, fees, or age groups!',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || inputText;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = { sender: 'user', text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          { sender: 'bot', text: data.reply || data.response || 'Thank you for asking! Please feel free to book a free demo class to get started.' },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { sender: 'bot', text: 'We offer 1v1 and group live online coaching for kids & adults! Click "Book Demo" to reserve a free trial session.' },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: 'We offer 1v1 and group live online coaching for kids & adults! Click "Book Demo" to reserve a free trial session.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 select-none">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="px-4 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-full shadow-gold flex items-center gap-2 text-xs transition-transform active:scale-95"
        >
          <span className="text-base">🤖</span>
          <span>Ask AI Coach 24/7</span>
        </button>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl w-80 sm:w-96 h-[460px] shadow-2xl flex flex-col justify-between overflow-hidden text-white">
          {/* Header */}
          <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-lg">🤖</span>
              <div>
                <h4 className="font-heading font-bold text-xs text-white">
                  ChessHub AI Assistant
                </h4>
                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Online 24/7
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-xs"
            >
              ✕
            </button>
          </div>

          {/* Messages list */}
          <div className="p-4 space-y-3 overflow-y-auto flex-1 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-amber-500 text-slate-950 font-semibold'
                      : 'bg-slate-950 border border-slate-800 text-slate-200'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="text-[10px] text-amber-400 font-bold animate-pulse">
                AI is typing...
              </div>
            )}
          </div>

          {/* Quick FAQ Pills */}
          <div className="px-3 py-2 bg-slate-950/60 border-t border-slate-800 flex gap-1.5 overflow-x-auto text-[10px]">
            <button
              type="button"
              onClick={() => handleSend('What are the course fees?')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg whitespace-nowrap"
            >
              💰 Fees?
            </button>
            <button
              type="button"
              onClick={() => handleSend('How do live classes work?')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg whitespace-nowrap"
            >
              📹 Live Classes?
            </button>
            <button
              type="button"
              onClick={() => handleSend('What age groups do you teach?')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg whitespace-nowrap"
            >
              🧒 Age Groups?
            </button>
          </div>

          {/* Input box */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask a question..."
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
            />
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={loading || !inputText.trim()}
              className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
