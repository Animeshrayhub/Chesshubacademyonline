'use client';

import React, { useState, useRef, useEffect } from 'react';
import { type ChatMessage, type ParticipantInfo, type UserRole } from '@/lib/classroom-v2/types';

interface ClassroomChatProps {
  messages: ChatMessage[];
  onSendMessage: (message: string, isPrivate: boolean, recipientId?: string) => Promise<boolean>;
  currentUserId: string;
  currentUserRole: UserRole;
  participants: ParticipantInfo[];
  className?: string;
}

export default function ClassroomChat({
  messages = [],
  onSendMessage,
  currentUserId,
  currentUserRole,
  participants = [],
  className = '',
}: ClassroomChatProps) {
  const isStudent = currentUserRole === 'student';
  const [activeTab, setActiveTab] = useState<'public' | 'private'>(isStudent ? 'private' : 'public');
  const [inputVal, setInputVal] = useState('');
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter messages based on active tab and privacy
  const filteredMessages = messages.filter((m) => {
    if (isStudent) {
      // Students see coach broadcasts or their direct whisper with the coach
      if (!m.isPrivate) return m.senderRole === 'coach' || m.senderRole === 'admin';
      return m.senderId === currentUserId || m.recipientId === currentUserId;
    }

    if (activeTab === 'public') {
      return !m.isPrivate;
    }
    // Private messages tab for Coach/Admin
    if (!m.isPrivate) return false;
    if (selectedRecipientId) {
      return m.senderId === selectedRecipientId || m.recipientId === selectedRecipientId;
    }
    return true;
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredMessages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isSending) return;

    const text = inputVal.trim();
    setInputVal('');
    setIsSending(true);

    try {
      // For students, all messages are strictly private whispers to the coach
      const isPrivate = isStudent ? true : activeTab === 'private';
      const recipientId = isStudent ? undefined : (isPrivate ? selectedRecipientId || undefined : undefined);
      await onSendMessage(text, isPrivate, recipientId);
    } finally {
      setIsSending(false);
    }
  };

  const COACH_QUICK_PILLS = [
    '🔥 Brilliant find!',
    '💡 Check candidate moves',
    '🛡️ Protect your King!',
    '⚔️ Look for checks & captures',
    '⏱️ Take your time to calculate',
    '👏 Excellent technique!',
    '👀 Careful of counterplay',
  ];

  const STUDENT_QUICK_PILLS = [
    '🙋 Could you repeat that move?',
    '🤔 What about a sacrifice?',
    '💡 I see a tactic here!',
    '👍 Understood coach!',
    '⏱️ Calculating candidate moves...',
  ];

  const quickPills = isStudent ? STUDENT_QUICK_PILLS : COACH_QUICK_PILLS;

  const handleQuickSend = async (text: string) => {
    if (isSending) return;
    setIsSending(true);
    try {
      const isPrivate = isStudent ? true : activeTab === 'private';
      const recipientId = isStudent ? undefined : (isPrivate ? selectedRecipientId || undefined : undefined);
      await onSendMessage(text, isPrivate, recipientId);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className={`flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden ${className}`}>
      {/* Tab Header */}
      <div className="h-9 bg-slate-950/80 px-2.5 border-b border-slate-800 flex items-center justify-between select-none">
        {isStudent ? (
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
            <span>🔒</span>
            <span>Direct Line to Coach</span>
            <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">(Whispers only)</span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('public')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'public'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Broadcast
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('private')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                activeTab === 'private'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span>🔒</span>
              <span>Whispers</span>
            </button>
          </div>
        )}

        {!isStudent && activeTab === 'private' && (
          <select
            value={selectedRecipientId}
            onChange={(e) => setSelectedRecipientId(e.target.value)}
            className="bg-slate-800 text-slate-200 text-[10px] font-bold px-2 py-1 rounded border border-slate-700 focus:outline-none"
          >
            <option value="">All Students</option>
            {participants
              .filter((p) => p.role === 'student')
              .map((s) => (
                <option key={s.userId} value={s.userId}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
          </select>
        )}
      </div>

      {/* Message Stream */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
        {filteredMessages.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-slate-500 text-xs text-center">
            {activeTab === 'public' ? 'No messages yet. Say hello!' : 'No private messages.'}
          </div>
        ) : (
          filteredMessages.map((m) => {
            const isMe = m.senderId === currentUserId;
            const isCoachSender = m.senderRole === 'coach' || m.senderRole === 'admin';

            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-0.5 text-[10px] text-slate-400">
                  <span className={`font-bold ${isCoachSender ? 'text-amber-400' : 'text-blue-400'}`}>
                    {isMe ? 'You' : m.senderName}
                  </span>
                  <span>•</span>
                  <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {m.isPrivate && <span className="text-purple-400 font-bold">[Private]</span>}
                </div>
                <div
                  className={`px-3 py-1.5 rounded-2xl max-w-[85%] break-words leading-relaxed shadow-sm ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : isCoachSender
                      ? 'bg-slate-800 text-slate-100 border border-amber-500/20 rounded-tl-none'
                      : 'bg-slate-800 text-slate-200 rounded-tl-none'
                  }`}
                >
                  {m.message}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick-Response & Praise Pills Bar */}
      <div className="px-2 py-1.5 bg-slate-950/90 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider shrink-0 pl-0.5">Quick:</span>
        {quickPills.map((pill) => (
          <button
            key={pill}
            type="button"
            disabled={isSending}
            onClick={() => handleQuickSend(pill)}
            className="shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-850 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-750 hover:border-blue-500/50 transition-all active:scale-95 disabled:opacity-40"
          >
            {pill}
          </button>
        ))}
      </div>

      {/* Message Input Form */}
      <form onSubmit={handleSend} className="p-2 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder={activeTab === 'public' ? 'Send a message to class…' : 'Send private message…'}
          className="flex-1 bg-slate-900 border border-slate-750 focus:border-blue-500 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!inputVal.trim() || isSending}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-all shadow"
        >
          Send
        </button>
      </form>
    </div>
  );
}
