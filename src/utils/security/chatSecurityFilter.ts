/**
 * Real-Time Chat Profanity & Abuse Filter
 * Masks offensive terms, abusive language, and personal phone numbers/emails with ***.
 */

const BLOCKED_WORDS = [
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'crap', 'dumb', 'stupid',
  'idiot', 'scam', 'cheat', 'nude', 'sex', 'porn', 'kill', 'hate',
];

const PHONE_REGEX = /\b(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

export interface SanitizedChatResult {
  cleanText: string;
  isFlagged: boolean;
  reason?: string;
}

export function sanitizeChatMessage(message: string): SanitizedChatResult {
  if (!message || typeof message !== 'string') {
    return { cleanText: '', isFlagged: false };
  }

  let text = message;
  let flagged = false;

  // 1. Mask phone numbers
  if (PHONE_REGEX.test(text)) {
    text = text.replace(PHONE_REGEX, '[Phone Number Masked]');
    flagged = true;
  }

  // 2. Mask emails
  if (EMAIL_REGEX.test(text)) {
    text = text.replace(EMAIL_REGEX, '[Email Masked]');
    flagged = true;
  }

  // 3. Mask profanity & toxic terms
  for (const word of BLOCKED_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    if (regex.test(text)) {
      text = text.replace(regex, '***');
      flagged = true;
    }
  }

  return {
    cleanText: text,
    isFlagged: flagged,
    reason: flagged ? 'Contains sensitive or inappropriate content' : undefined,
  };
}
