import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabaseServer';
import { getSystemConfig } from '@/utils/systemConfig';

/**
 * POST /api/ai/explain
 * Authenticated student endpoint.
 * Explains in plain English why a move attempted in a puzzle fails compared to the best move.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { fen, moveAttempted, bestMove } = body;

    if (!fen || !moveAttempted || !bestMove) {
      return NextResponse.json(
        { error: 'Missing required parameters: fen, moveAttempted, bestMove' },
        { status: 400 }
      );
    }

    // 2. Fetch AI configuration
    const configMap = await getSystemConfig();

    const provider = configMap['AI_PROVIDER'] || 'gemini';
    let activeKey = '';
    if (provider === 'gemini') {
      activeKey = configMap['AI_GEMINI_KEY'] || configMap['AI_API_KEY'] || process.env.GEMINI_API_KEY || '';
    } else if (provider === 'openai') {
      activeKey = configMap['AI_OPENAI_KEY'] || process.env.OPENAI_API_KEY || '';
    } else if (provider === 'groq') {
      activeKey = configMap['AI_GROQ_KEY'] || process.env.GROQ_API_KEY || '';
    }

    const getMockExplanation = (moveAttempt: string, best: string) => {
      const mockExplanations = [
        `💡 Coach Tip: While your move ${moveAttempt} makes sense, playing ${best} is much stronger here! 💥 It directly attacks your opponent's weaknesses and wins material! 👑`,
        `🧠 Coach Tip: Nice try! ♟️ However, ${moveAttempt} misses a crucial tactical opportunity. Playing ${best} creates an immediate threat that is very hard for them to defend! ⚡`,
        `🔍 Coach Tip: Keep scanning! 🏆 Your move ${moveAttempt} gives your opponent time to escape. ${best} is a sharp tactical shot that wins the game on the spot! 👏`,
        `💪 Coach Tip: Active thinking! But ${moveAttempt} is a bit too slow here. ⏱️ Look how ${best} wins the file, controls key squares, and takes charge of the position! 🌟`,
      ];
      return mockExplanations[Math.floor(Math.random() * mockExplanations.length)];
    };

    if (provider === 'mock' || !activeKey) {
      return NextResponse.json({ explanation: getMockExplanation(moveAttempted, bestMove) });
    }

    // 3. Formulate Prompt
    const prompt = `You are a certified FIDE Chess Coach explaining tactics to young chess students (aged 8-14).
In the chess position FEN: "${fen}"
The student made the move: "${moveAttempted}"
But the best tactical move is: "${bestMove}"

Explain in 1 or 2 encouraging, fun sentences why the student's move fails (e.g., dropping a piece, missing a fork/pin, or allowing checkmate) and why the correct move is much stronger.
CRITICAL: Use fun chess-related emojis (e.g., 💡, ♟️, 👑, 💥, ⚡, 🔍, 🏆) to make it exciting and easy to understand! Keep it positive, brief, and visual.`;

    // 4. Send HTTP request to active provider API
    let explanation = '';
    try {
      if (provider === 'gemini') {
        const candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash', 'gemini-1.5-pro'];
        for (const model of candidateModels) {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`;
          const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (text) {
              explanation = text;
              break;
            }
          }
        }
        if (!explanation) {
          explanation = getMockExplanation(moveAttempted, bestMove);
        }
      } else if (provider === 'openai') {
        const openaiUrl = 'https://api.openai.com/v1/chat/completions';
        const response = await fetch(openaiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${activeKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are a certified FIDE Chess Coach.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error('OpenAI API Error details:', errText);
          explanation = getMockExplanation(moveAttempted, bestMove);
        } else {
          const data = await response.json();
          explanation = data?.choices?.[0]?.message?.content?.trim() || getMockExplanation(moveAttempted, bestMove);
        }
      } else if (provider === 'groq') {
        const groqUrl = 'https://api.groq.com/openai/v1/chat/completions';
        const response = await fetch(groqUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${activeKey}`,
          },
          body: JSON.stringify({
            model: 'llama3-8b-8192',
            messages: [
              { role: 'system', content: 'You are a certified FIDE Chess Coach.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error('Groq API Error details:', errText);
          explanation = getMockExplanation(moveAttempted, bestMove);
        } else {
          const data = await response.json();
          explanation = data?.choices?.[0]?.message?.content?.trim() || getMockExplanation(moveAttempted, bestMove);
        }
      } else {
        explanation = getMockExplanation(moveAttempted, bestMove);
      }
    } catch (fetchErr) {
      console.error(`Failed to fetch from API provider ${provider}, using fallback:`, fetchErr);
      explanation = getMockExplanation(moveAttempted, bestMove);
    }

    return NextResponse.json({ explanation });
  } catch (error) {
    console.error('[/api/ai/explain] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error occurred.' },
      { status: 500 }
    );
  }
}
