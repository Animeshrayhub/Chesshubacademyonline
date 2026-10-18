/**
 * lichessEvents.ts
 *
 * Server-side Lichess tournament API integration for ChessHub Events Phase 1.
 * Handles: URL parsing, API fetching, response normalization.
 *
 * Endpoint: GET https://lichess.org/api/tournament/:tournamentId
 * Auth: none required (public tournaments)
 * Rate limit: generous for public access
 *
 * DO NOT call this from the browser. Only invoke from server actions / API routes.
 */

import type {
  LichessTournamentApiResponse,
  LichessImportPreview,
} from '@/types/events';
import { formatLichessClock } from '@/types/events';

// ─── URL Parsing ──────────────────────────────────────────────────────────────

/**
 * Extracts the tournament ID from a Lichess tournament URL.
 * Accepts: https://lichess.org/tournament/RjKXaR5C
 *          https://lichess.org/tournament/RjKXaR5C/join
 *          RjKXaR5C (raw ID)
 *
 * Returns the tournament ID string, or null if invalid.
 */
export function parseLichessTournamentUrl(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();

  // Check if it's a full URL
  if (trimmed.includes('lichess.org')) {
    try {
      const url = new URL(
        trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
      );
      // Path: /tournament/{id} or /tournament/{id}/join etc.
      const match = url.pathname.match(/^\/tournament\/([A-Za-z0-9]+)/);
      if (match && match[1]) return match[1];
    } catch {
      // Fall through to regex
    }

    // Regex fallback for malformed URLs
    const match = trimmed.match(/tournament\/([A-Za-z0-9]+)/);
    if (match && match[1]) return match[1];
    return null;
  }

  // Assume it's a raw ID: 8-char alphanumeric
  if (/^[A-Za-z0-9]{8}$/.test(trimmed)) return trimmed;

  return null;
}

// ─── Lichess API Fetch ────────────────────────────────────────────────────────

/**
 * Fetches public tournament data from the Lichess API.
 * Always called server-side (API route or server action).
 *
 * Returns the raw Lichess API response, or throws on error.
 */
export async function fetchLichessTournamentById(
  tournamentId: string
): Promise<LichessTournamentApiResponse> {
  const url = `https://lichess.org/api/tournament/${encodeURIComponent(tournamentId)}`;

  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
    // No caching — admin is importing fresh data
    cache: 'no-store',
  });

  if (res.status === 404) {
    throw new Error(`Tournament "${tournamentId}" not found on Lichess. Please verify the URL.`);
  }

  if (!res.ok) {
    throw new Error(
      `Lichess API returned status ${res.status}. Please try again shortly.`
    );
  }

  const data = await res.json();
  return data as LichessTournamentApiResponse;
}

// ─── Response Normalization ────────────────────────────────────────────────────

/**
 * Converts a raw Lichess API response into a structured import preview
 * that is shown to the admin before they choose to save or publish.
 *
 * Maps:
 *   data.startsAt         → startAt (ISO UTC string)
 *   data.minutes          → endAt  (startAt + minutes)
 *   data.clock            → timeControl ('8+0 Rapid')
 *   data.variant          → variant
 *   data.system           → format ('arena' or 'swiss')
 *   data.rated            → isRated
 *   data.fullName         → title
 *   data.description      → description (may be absent)
 */
export function normalizeLichessResponse(
  tournamentId: string,
  data: LichessTournamentApiResponse
): LichessImportPreview {
  // Compute end time: startAt + minutes
  let endAt: string | null = null;
  if (data.startsAt && data.minutes) {
    const start = new Date(data.startsAt);
    const end = new Date(start.getTime() + data.minutes * 60 * 1000);
    endAt = end.toISOString();
  }

  const timeControl = formatLichessClock(
    data.clock?.limit ?? 0,
    data.clock?.increment ?? 0,
    data.perf?.name ?? ''
  );

  return {
    tournamentId,
    externalUrl: `https://lichess.org/tournament/${tournamentId}`,
    title: data.fullName ?? `Lichess Tournament ${tournamentId}`,
    description: data.description ?? null,
    startAt: data.startsAt ?? null,
    endAt,
    timeControl,
    variant: data.variant ?? 'standard',
    format: data.system ?? 'arena',
    isRated: data.rated ?? false,
    nbPlayers: data.nbPlayers ?? 0,
    rawData: data,
  };
}

// ─── Full Import Flow ─────────────────────────────────────────────────────────

/**
 * High-level: parse URL → fetch Lichess API → return normalized preview.
 * Called by the admin import API route.
 *
 * Returns { preview } on success, or { error } on failure.
 */
export async function importLichessTournamentFromUrl(
  urlOrId: string
): Promise<
  | { success: true; preview: LichessImportPreview }
  | { success: false; error: string }
> {
  const tournamentId = parseLichessTournamentUrl(urlOrId);

  if (!tournamentId) {
    return {
      success: false,
      error:
        'Invalid Lichess tournament URL. Expected format: https://lichess.org/tournament/ABC12345',
    };
  }

  try {
    const data = await fetchLichessTournamentById(tournamentId);
    const preview = normalizeLichessResponse(tournamentId, data);
    return { success: true, preview };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch tournament from Lichess.',
    };
  }
}
