export interface LichessCloudEvalResponse {
  fen: string;
  knodes: number;
  depth: number;
  pvs: Array<{
    moves: string;
    cp?: number;
    mate?: number;
  }>;
}

/**
 * Fetches instant Stockfish 16 cloud evaluation for any FEN position from Lichess Cloud Eval API.
 * Free, zero-latency cloud analysis (+1.5, Mate in 3, top variation line).
 */
export async function fetchLichessCloudEval(fen: string): Promise<{
  success: boolean;
  evalText?: string;
  evalScore?: number;
  bestMove?: string;
  pvLines?: string[];
  depth?: number;
  error?: string;
}> {
  try {
    const encodedFen = encodeURIComponent(fen.trim());
    const res = await fetch(`https://lichess.org/api/cloud-eval?fen=${encodedFen}`, {
      headers: {
        Accept: 'application/json',
        ...(process.env.LICHESS_API_TOKEN
          ? { Authorization: `Bearer ${process.env.LICHESS_API_TOKEN}` }
          : {}),
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return { success: false, error: 'No Lichess cloud evaluation available for this position.' };
    }

    const data: LichessCloudEvalResponse = await res.json();
    if (!data.pvs || data.pvs.length === 0) {
      return { success: false, error: 'No evaluation line returned.' };
    }

    const topPv = data.pvs[0];
    let evalText = '0.0';
    let evalScore = 0;

    if (topPv.mate !== undefined) {
      evalText = `M${topPv.mate}`;
      evalScore = topPv.mate > 0 ? 100 : -100;
    } else if (topPv.cp !== undefined) {
      evalScore = topPv.cp / 100;
      evalText = evalScore > 0 ? `+${evalScore.toFixed(2)}` : evalScore.toFixed(2);
    }

    const pvMoves = (topPv.moves || '').split(' ').filter(Boolean);
    const bestMove = pvMoves[0] || '';

    return {
      success: true,
      evalText,
      evalScore,
      bestMove,
      pvLines: pvMoves,
      depth: data.depth,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch Lichess cloud evaluation.' };
  }
}
