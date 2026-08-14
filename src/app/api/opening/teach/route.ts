import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/opening/teach
 * AI Teaching endpoint — generates Socratic teaching responses.
 *
 * Architecture:
 * ┌──────────────────┐
 * │ Client (browser) │
 * └────────┬─────────┘
 *          │ POST (student message + context)
 *          ▼
 * ┌──────────────────┐
 * │  This API Route  │  ← Keys NEVER exposed to browser
 * └────────┬─────────┘
 *          │
 *          ▼
 * ┌──────────────────┐
 * │  AI Provider     │  ← OPENING_TEACHER_AI_KEY (env var, server-only)
 * │  (configurable)  │
 * └──────────────────┘
 *
 * Supports any AI provider via env var:
 * - Set AI_PROVIDER=openai, gemini, anthropic, or none
 * - Set OPENING_TEACHER_AI_KEY=<your-key>
 * - If neither is set, uses rule-based teaching responses (free, no AI needed)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const {
      student_message,
      context,
      current_fen,
      move_result,
      language = 'en',
    } = body;

    const provider = process.env.AI_PROVIDER || 'none';
    const aiKey = process.env.OPENING_TEACHER_AI_KEY;

    // ── Dispatch to the right provider ──────────────────────────────────────

    if (provider !== 'none' && aiKey) {
      try {
        const aiResponse = await callAIProvider(provider, aiKey, {
          student_message,
          context,
          current_fen,
          move_result,
          language,
        });

        return NextResponse.json(aiResponse);
      } catch (aiErr) {
        console.warn('[AI Teaching] Provider failed, falling back to rule-based:', aiErr);
        // Fall through to rule-based
      }
    }

    // ── Rule-based fallback (free, always works) ─────────────────────────────
    const ruleBasedResponse = generateRuleBasedResponse({
      student_message,
      context,
      move_result,
      language,
    });

    return NextResponse.json(ruleBasedResponse);
  } catch (err) {
    console.error('[POST /api/opening/teach]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RULE-BASED TEACHING (no AI required — always free)
// ─────────────────────────────────────────────────────────────────────────────

function generateRuleBasedResponse({
  student_message,
  context,
  move_result,
  language,
}: {
  student_message?: string;
  context?: any;
  move_result?: any;
  language: string;
}): any {
  const isHindi = language === 'hi';

  // If student just made a move
  if (move_result) {
    if (!move_result.isLegal) {
      return {
        message: "That move isn't legal. Check the rules for how that piece moves and try again!",
        message_hindi: "यह चाल कानूनी नहीं है। जांचें कि वह पीस कैसे चलता है!",
        is_question: false,
        advance_position: false,
      };
    }

    if (move_result.isCorrect) {
      const encouragement = [
        "Excellent! That's the correct move. ",
        "Well done! You found it. ",
        "Perfect! Great thinking. ",
        "Yes! That's exactly right. ",
      ];
      const base = encouragement[Math.floor(Math.random() * encouragement.length)];
      return {
        message: base + (move_result.explanation || ''),
        message_hindi: "बहुत बढ़िया! यह सही चाल है। " + (move_result.explanation_hindi || ''),
        is_question: true,
        advance_position: true,
      };
    }

    // Wrong move — Socratic approach
    return {
      message: `${move_result.explanation || 'This move creates a problem.'} Before I tell you the answer — can you find what's wrong with this move?`,
      message_hindi: `${move_result.explanation_hindi || 'यह चाल एक समस्या पैदा करती है।'} मैं आपको जवाब बताने से पहले — क्या आप इस चाल में गड़बड़ी ढूंढ सकते हैं?`,
      is_question: true,
      advance_position: false,
    };
  }

  // If student sent a text message
  if (student_message) {
    const msg = student_message.toLowerCase();

    // Hint request
    if (msg.includes('hint') || msg.includes('help') || msg.includes('clue')) {
      return {
        message: "Here's a hint: think about which of your pieces isn't developed yet, and where it would be most active. Every move in the opening should serve a purpose!",
        message_hindi: "यहाँ एक संकेत है: सोचें कि आपके किस पीस का अभी विकास नहीं हुआ है।",
        is_question: false,
        advance_position: false,
      };
    }

    // Why question
    if (msg.startsWith('why') || msg.includes('why')) {
      return {
        message: "Good question! Before I explain — what do YOU think? Tell me your reasoning first, then I'll add to it.",
        message_hindi: "अच्छा सवाल! लेकिन पहले — आप क्या सोचते हैं? पहले अपना तर्क बताएं।",
        is_question: true,
        advance_position: false,
      };
    }

    // Explanation request
    if (msg.includes('explain') || msg.includes('what') || msg.includes('how')) {
      return {
        message: "Let me guide you through this position. Look at the board carefully: which pieces are developed? Which squares are controlled? Which weaknesses can you spot?",
        message_hindi: "मुझे इस स्थिति के माध्यम से आपका मार्गदर्शन करने दें। बोर्ड को ध्यान से देखें।",
        is_question: true,
        advance_position: false,
      };
    }

    // Correct-sounding answer (contains chess keywords)
    const positiveKeywords = ['center', 'develop', 'castle', 'attack', 'control', 'king', 'pawn', 'knight', 'bishop', 'queen', 'rook'];
    if (positiveKeywords.some(kw => msg.includes(kw))) {
      return {
        message: "You're on the right track! You noticed an important chess concept. Now let's apply that idea — what move would put that plan into action?",
        message_hindi: "आप सही रास्ते पर हैं! आपने एक महत्वपूर्ण शतरंज अवधारणा देखी।",
        is_question: true,
        advance_position: false,
      };
    }

    // Default coaching response
    return {
      message: "Interesting thought! In chess, every decision should consider three things: Does it develop a piece? Does it control the center? Does it improve king safety? Which of these does your idea address?",
      message_hindi: "दिलचस्प विचार! शतरंज में, हर निर्णय तीन चीजें सोचना चाहिए: क्या यह पीस विकसित करता है? केंद्र नियंत्रित करता है? राजा की सुरक्षा बढ़ाता है?",
      is_question: true,
      advance_position: false,
    };
  }

  // Chapter introduction
  return {
    message: "Let's get started! Look at the position carefully. What do you notice? Tell me anything you observe about the pieces, pawns, or important squares.",
    message_hindi: "चलिए शुरू करते हैं! स्थिति को ध्यान से देखें। आप क्या देखते हैं?",
    is_question: true,
    advance_position: false,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AI PROVIDER DISPATCHER (add your provider here)
// ─────────────────────────────────────────────────────────────────────────────

async function callAIProvider(
  provider: string,
  apiKey: string,
  payload: {
    student_message?: string;
    context?: any;
    current_fen?: string;
    move_result?: any;
    language: string;
  }
) {
  const systemPrompt = buildSystemPrompt(payload.context, payload.language);
  const userMessage = buildUserMessage(payload);

  switch (provider.toLowerCase()) {
    case 'gemini': {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userMessage }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
          }),
        }
      );
      if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
      const json = await res.json();
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      return parseAIResponse(text, payload.language);
    }

    case 'openai': {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          max_tokens: 300,
          temperature: 0.7,
        }),
      });
      if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
      const json = await res.json();
      const text = json.choices?.[0]?.message?.content ?? '';
      return parseAIResponse(text, payload.language);
    }

    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}

function buildSystemPrompt(context: any, language: string) {
  const level = context?.student_level ?? 'Beginner';
  const opening = context?.opening_name ?? 'this opening';
  return `You are a ChessHub Academy AI coach teaching the ${opening} to a ${level}-level student. 

Your teaching style:
- Patient, encouraging, never insulting
- Use the Socratic method: ask questions before explaining
- Never invent chess moves or claim something is correct without certainty
- Keep responses under 3 sentences
- If the student is wrong: ask them to find the problem before revealing it
- If the student is right: praise specifically what they noticed, then ask a follow-up question
- Language: ${language === 'hi' ? 'Hindi (Devanagari script preferred)' : 'English'}

Format your response as JSON: {"message": "...", "is_question": true/false, "advance_position": true/false}`;
}

function buildUserMessage(payload: any) {
  const parts = [];
  if (payload.current_fen) parts.push(`Current position (FEN): ${payload.current_fen}`);
  if (payload.move_result) {
    parts.push(`Student played: ${payload.move_result.move}`);
    parts.push(`Move is ${payload.move_result.isCorrect ? 'CORRECT' : 'INCORRECT'} per opening theory`);
  }
  if (payload.student_message) parts.push(`Student said: "${payload.student_message}"`);
  return parts.join('\n');
}

function parseAIResponse(text: string, language: string) {
  try {
    // Try to parse JSON from AI response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {}

  // Fallback: treat entire text as message
  return {
    message: text.trim() || "Let's continue. What do you think about this position?",
    message_hindi: text.trim() || "चलिए जारी रखते हैं। इस स्थिति के बारे में आप क्या सोचते हैं?",
    is_question: true,
    advance_position: false,
  };
}
