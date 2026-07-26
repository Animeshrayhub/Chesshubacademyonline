'use client';

import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';

export default function IntegrationsSettingsPage() {
  const [provider, setProvider] = useState('gemini');
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Fetch current API configuration
  useEffect(() => {
    async function loadConfig() {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/config');
        if (res.ok) {
          const data = await res.json();
          setProvider(data.provider || 'gemini');
          setGeminiKey(data.geminiKey || data.apiKey || '');
          setOpenaiKey(data.openaiKey || '');
          setGroqKey(data.groqKey || '');
        }
      } catch (err) {
        console.error('Failed to load settings config', err);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          geminiKey,
          openaiKey,
          groqKey,
          apiKey: provider === 'gemini' ? geminiKey : provider === 'openai' ? openaiKey : provider === 'groq' ? groqKey : '',
        }),
      });

      if (res.ok) {
        setMessage({ text: 'API configuration saved successfully!', type: 'success' });
      } else {
        const data = await res.json();
        setMessage({ text: data.error || 'Failed to save config.', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Network connection failed.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* AI Explanation Config */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-6">
        <h3 className="text-base font-bold text-text-primary mb-1">AI Coach Settings</h3>
        <p className="text-xs text-text-secondary mb-4">
          Configure the API credentials used to explain blunders and mistake patterns to students.
        </p>

        {loading ? (
          <div className="py-4 text-xs text-slate-400 italic">Loading configuration settings...</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            {message && (
              <div className={`p-3 rounded-xl border font-semibold ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 border-green-150'
                  : 'bg-red-50 text-red-700 border-red-150'
              }`}>
                {message.text}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-text-primary mb-2">
                Active AI Coach Provider
              </label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-slate-50 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="gemini">Google Gemini (Model: gemini-1.5-flash)</option>
                <option value="openai">OpenAI (Model: gpt-4o-mini)</option>
                <option value="groq">Groq (Model: llama3-8b-8192)</option>
                <option value="mock">Mock AI Coach (Free - Offline Mode)</option>
              </select>
              <p className="text-[10px] text-text-secondary mt-1.5 leading-relaxed">
                Choose which large language model powers the blunder explanations for students on the Daily Puzzle Board.
              </p>
            </div>

            {provider === 'gemini' && (
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-2">
                  Gemini API Key
                </label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-slate-50 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                />
                <p className="text-[10px] text-text-secondary mt-1.5 leading-relaxed">
                  Provide a Google Gemini API Key. Power the board speech bubbles with Gemini 1.5 Flash.
                </p>
              </div>
            )}

            {provider === 'openai' && (
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-2">
                  OpenAI API Key
                </label>
                <input
                  type="password"
                  placeholder="sk-proj-..."
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-slate-50 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                />
                <p className="text-[10px] text-text-secondary mt-1.5 leading-relaxed">
                  Provide an OpenAI API Key. Explain mistakes using GPT-4o-mini.
                </p>
              </div>
            )}

            {provider === 'groq' && (
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-2">
                  Groq API Key
                </label>
                <input
                  type="password"
                  placeholder="gsk_..."
                  value={groqKey}
                  onChange={(e) => setGroqKey(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-slate-50 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                />
                <p className="text-[10px] text-text-secondary mt-1.5 leading-relaxed">
                  Provide a Groq API Key. Explain mistakes using Groq&apos;s high-speed Llama 3 8B model.
                </p>
              </div>
            )}

            {provider === 'mock' && (
              <div className="p-4 border border-blue-150 bg-blue-50/50 rounded-xl">
                <p className="text-blue-700 leading-relaxed font-bold">
                  🤖 Mock AI Coach is active (Offline - Free).
                </p>
                <p className="text-[10px] text-blue-600 mt-1.5 leading-relaxed">
                  Daily Puzzle Board will generate high-quality FIDE Coach explanations offline without calling any external APIs. No credentials required!
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-semibold shadow-md transition-all"
              >
                {saving ? 'Saving Config...' : 'Save Config Credentials'}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Static Integrations list */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-6">
        <h3 className="text-base font-bold text-text-primary mb-4">External Integrations</h3>

        <div className="space-y-4">
          {/* Zoom */}
          <div className="flex items-center justify-between p-4 border border-border rounded-xl bg-slate-50/40">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center font-bold text-blue-600 text-xs border border-blue-100">Z</div>
              <div>
                <h4 className="text-sm font-semibold text-text-primary">Zoom Meetings API</h4>
                <p className="text-xs text-text-secondary mt-0.5">Used for scheduling and opening live classroom classrooms.</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-text-secondary">Disconnected</span>
          </div>

          {/* Lichess */}
          <div className="flex items-center justify-between p-4 border border-border rounded-xl bg-slate-50/40">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-155 flex items-center justify-center font-bold text-slate-800 text-xs border border-slate-200">L</div>
              <div>
                <h4 className="text-sm font-semibold text-text-primary">Lichess OAuth Service</h4>
                <p className="text-xs text-text-secondary mt-0.5">Enable puzzle trackers and check classroom homework ratings.</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-text-secondary">Disconnected</span>
          </div>

          {/* Google Drive */}
          <div className="flex items-center justify-between p-4 border border-border rounded-xl bg-slate-50/40">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center font-bold text-green-600 text-xs border border-green-100">G</div>
              <div>
                <h4 className="text-sm font-semibold text-text-primary">Google Drive Storage</h4>
                <p className="text-xs text-text-secondary mt-0.5">Synchronize PDF workbooks and recordings with Drive sheets.</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-text-secondary">Disconnected</span>
          </div>
        </div>
      </div>
    </div>
  );
}
