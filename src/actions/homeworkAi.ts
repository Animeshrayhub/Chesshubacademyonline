'use server';

import { createSupabaseAdmin } from '@/lib/supabase/admin';

export interface AiHintResult {
  success: boolean;
  hint?: string;
  targetSquare?: string;
  sourceSquare?: string;
  error?: string;
}

export async function requestAiHintAction(fen: string, bestMove: string, title?: string): Promise<AiHintResult> {
  try {
    if (!fen || !bestMove) {
      return { success: false, error: 'Missing position parameters.' };
    }

    const sourceSquare = bestMove.substring(0, 2);
    const targetSquare = bestMove.substring(2, 4);

    // Fetch active AI key from system config
    const { getSystemConfig } = await import('@/utils/systemConfig');
    const configMap = await getSystemConfig();

    const activeKey = configMap['AI_GEMINI_KEY'] || configMap['AI_API_KEY'] || process.env.GEMINI_API_KEY || '';

    const fallbackHints = [
      `💡 Look closely at your piece on square ${sourceSquare.toUpperCase()}! Can it move towards ${targetSquare.toUpperCase()} to create a winning threat?`,
      `♟️ Focus on square ${targetSquare.toUpperCase()}. The opponent's position is vulnerable right there!`,
      `💥 Spot the tactic! Moving to ${targetSquare.toUpperCase()} will force a decisive advantage!`,
    ];

    if (!activeKey) {
      return {
        success: true,
        hint: fallbackHints[Math.floor(Math.random() * fallbackHints.length)],
        sourceSquare,
        targetSquare,
      };
    }

    const prompt = `You are a friendly FIDE Chess Coach. In the puzzle position FEN: "${fen}" titled "${title || 'Chess Tactics'}", the target winning move starts from ${sourceSquare} to ${targetSquare}.
Give a short 1-sentence hint for a student WITHOUT revealing the exact move notation directly. Focus on the tactical pattern (e.g. pin, fork, skewer, mate threat). Keep it under 20 words with fun chess emojis!`;

    try {
      const candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash', 'gemini-1.5-pro'];
      for (const model of candidateModels) {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`;
        const res = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (text) {
            return {
              success: true,
              hint: text,
              sourceSquare,
              targetSquare,
            };
          }
        }
      }
    } catch (e) {
      console.warn('Gemini AI Hint fetch failed, using fallback:', e);
    }

    return {
      success: true,
      hint: fallbackHints[Math.floor(Math.random() * fallbackHints.length)],
      sourceSquare,
      targetSquare,
    };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to fetch AI hint.' };
  }
}
