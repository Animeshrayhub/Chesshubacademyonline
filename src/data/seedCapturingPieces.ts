export interface CapturingPiecePuzzle {
  id: number;
  title: string;
  fen: string;
  solution: string;
  variation?: string;
  sideToMove: 'white' | 'black';
}

export const CAPTURING_PIECES_PUZZLES: CapturingPiecePuzzle[] = [
  { id: 1, title: "Capturing Pieces - Puzzle 1", fen: "q7/p1p3kp/1p3pp1/8/8/5QP1/PPP2PKP/8 w - - 0 1", solution: "1. Qxa8 *", sideToMove: "white" },
  { id: 2, title: "Capturing Pieces - Puzzle 2", fen: "8/1k4p1/1pn3qp/8/8/5PN1/2Q3PP/6K1 w - - 0 1", solution: "1. Qxg6 *", sideToMove: "white" },
  { id: 3, title: "Capturing Pieces - Puzzle 3", fen: "8/1k4p1/1pp2p2/n7/8/1P4P1/5KP1/Q6q w - - 0 1", solution: "1. Qxh1 *", sideToMove: "white" },
  { id: 4, title: "Capturing Pieces - Puzzle 4", fen: "3q4/1kp5/1p6/7p/6r1/1P4P1/1KP5/3Q3R w - - 0 1", solution: "1. Qxd8 *", sideToMove: "white" },
  { id: 5, title: "Capturing Pieces - Puzzle 5", fen: "4r3/1q3pkp/6p1/8/1p6/5RP1/P1Q2P1P/6K1 b - - 0 1", solution: "1... Qxf3 *", sideToMove: "black" },
  { id: 6, title: "Capturing Pieces - Puzzle 6", fen: "8/kpq4R/pb3p2/4p1p1/4P3/1PQ2P2/P1K3P1/8 b - - 0 1", solution: "1... Qxh7 *", variation: "1...Qxc3+? 2.Kxc3", sideToMove: "black" },
  { id: 7, title: "Capturing Pieces - Puzzle 7", fen: "q7/p1p2ppk/1p3n1p/8/8/P5P1/1PP2P1P/2KR2NR b - - 0 1", solution: "1... Qxh1 *", sideToMove: "black" },
  { id: 8, title: "Capturing Pieces - Puzzle 8", fen: "2k1r2r/pppq1Qpp/8/8/8/2PRP3/PP4PP/2K2R2 b - - 0 1", solution: "1... Qxd3 *", variation: "1...Qxf7? 2.Rxf7", sideToMove: "black" },
  { id: 9, title: "Capturing Pieces - Puzzle 9", fen: "3rqrk1/1pp2p1p/p5p1/3p4/Q6b/3P1B2/PPP2PPP/R4RK1 w - - 0 1", solution: "1. Qxh4 *", variation: "1.Qxe8? Rfxe8", sideToMove: "white" },
  { id: 10, title: "Capturing Pieces - Puzzle 10", fen: "b3nrk1/p1p2ppp/1p3b2/8/8/5QP1/PPP2P1P/2KR3R w - - 0 1", solution: "1. Qxa8 *", sideToMove: "white" },
  { id: 11, title: "Capturing Pieces - Puzzle 11", fen: "2bnrrk1/p5pp/1p6/3p4/8/1N1P4/PPQ2bPP/R4B1K w - - 0 1", solution: "1. Qxc8 *", variation: "1.Qxf2? Rxf2", sideToMove: "white" },
  { id: 12, title: "Capturing Pieces - Puzzle 12", fen: "3r1rk1/pp3pp1/2p2q1p/4N3/3P4/b5Q1/P1P2PPP/2KR1R2 w - - 0 1", solution: "1. Qxa3 *", sideToMove: "white" },
  { id: 13, title: "Capturing Pieces - Puzzle 13", fen: "4rrk1/pppq1ppp/5n2/3p4/N2P4/7P/PPPQ1PP1/R4RK1 b - - 0 1", solution: "1... Qxa4 *", sideToMove: "black" },
  { id: 14, title: "Capturing Pieces - Puzzle 14", fen: "4r1k1/pbq2pp1/1p5p/2p5/4P3/1QP3NP/PP4P1/3R2K1 b - - 0 1", solution: "1... Qxg3 *", sideToMove: "black" },
  { id: 15, title: "Capturing Pieces - Puzzle 15", fen: "6k1/2p2ppp/ppN5/6P1/q6N/P7/1PP2PBP/1K6 b - - 0 1", solution: "1... Qxh4 *", variation: "1...Qxc6? 2.Bxc6", sideToMove: "black" },
  { id: 16, title: "Capturing Pieces - Puzzle 16", fen: "r3k2r/ppp1qppp/5n2/3p4/3Pp3/NP2P3/P1P2PPP/R2Q1RK1 b kq - 0 1", solution: "1... Qxa3 *", sideToMove: "black" },
  { id: 17, title: "Capturing Pieces - Puzzle 17", fen: "6k1/1pq2p2/2p2bpp/3p4/8/2P2N1P/PP1Q1PP1/6K1 w - - 0 1", solution: "1. Qxh6 *", sideToMove: "white" },
  { id: 18, title: "Capturing Pieces - Puzzle 18", fen: "2k4r/pp2q2p/2p3p1/4Pp2/8/P5P1/1PP2Q1P/2K1R3 w - - 0 1", solution: "1. Qxa7 *", sideToMove: "white" },
  { id: 19, title: "Capturing Pieces - Puzzle 19", fen: "1k5r/pp2qpp1/7p/3p4/8/7P/PPPQ1PP1/2KR4 w - - 0 1", solution: "1. Qxd5 *", sideToMove: "white" },
  { id: 20, title: "Capturing Pieces - Puzzle 20", fen: "5rk1/1q3pb1/p3p1p1/8/8/p5QP/P1P2PP1/3R1BK1 w - - 0 1", solution: "1. Qxa3 *", sideToMove: "white" },
  { id: 21, title: "Capturing Pieces - Puzzle 21", fen: "3r1r2/ppp2pkp/1q3np1/4N3/1PP5/P6P/3Q1PP1/R4RK1 b - - 0 1", solution: "1... Rxd2 *", sideToMove: "black" },
  { id: 22, title: "Capturing Pieces - Puzzle 22", fen: "2k5/2pn2pp/1pq2p2/8/r6Q/2N4P/1P3PP1/3R2K1 b - - 0 1", solution: "1... Rxh4 *", sideToMove: "black" },
  { id: 23, title: "Capturing Pieces - Puzzle 23", fen: "5r1k/p3qp1p/1p6/8/5P2/PQ4rP/1P6/K2R2R1 b - - 0 1", solution: "1... Rxb3 *", sideToMove: "black" },
  { id: 24, title: "Capturing Pieces - Puzzle 24", fen: "3rr1k1/1pq2pp1/p4n1p/2p5/8/1P2QPP1/PBP3KP/R2R4 b - - 0 1", solution: "1... Rxe3 *", sideToMove: "black" },
  { id: 25, title: "Capturing Pieces - Puzzle 25", fen: "8/6k1/6p1/1p5r/1r5R/1P3P2/6K1/1R6 w - - 0 1", solution: "1. Rxb4 *", variation: "1.Rxh5? gxh5", sideToMove: "white" },
  { id: 26, title: "Capturing Pieces - Puzzle 26", fen: "5k2/4rp2/3r2p1/7p/7P/6P1/3RRP2/5K2 w - - 0 1", solution: "1. Rxd6 *", variation: "1.Rxe7? fails to Kxe7 2.Rxd6 Kxd6", sideToMove: "white" },
  { id: 27, title: "Capturing Pieces - Puzzle 27", fen: "8/p3r3/1p3kp1/5p1p/2R2r2/8/P1P1RPPP/5K2 w - - 0 1", solution: "1. Rxf4 *", variation: "1.Rxe7? Rxc4", sideToMove: "white" },
  { id: 28, title: "Capturing Pieces - Puzzle 28", fen: "2r5/p4pk1/1p5p/5Pb1/6Pp/1PR1r2P/1KP3B1/3R4 w - - 0 1", solution: "1. Rxc8 *", variation: "1.Rxe3? Bxe3", sideToMove: "white" },
  { id: 29, title: "Capturing Pieces - Puzzle 29", fen: "6k1/p4pp1/1b5p/1R5b/8/6P1/P4PKP/8 w - - 0 1", solution: "1. Rxh5 *", variation: "1.Rxb6? axb6", sideToMove: "white" },
  { id: 30, title: "Capturing Pieces - Puzzle 30", fen: "4rk2/p1p2p1p/bp4p1/4b3/8/1PP2P2/1P3KPP/R3R3 w - - 0 1", solution: "1. Rxa6 *", variation: "1.Rxe5? Rxe5", sideToMove: "white" },
  { id: 31, title: "Capturing Pieces - Puzzle 31", fen: "3r2k1/1ppr1pp1/1p5p/1Pn5/R5b1/2B2N2/1PP2PPP/4R1K1 w - - 0 1", solution: "1. Rxg4 *", sideToMove: "white" },
  { id: 32, title: "Capturing Pieces - Puzzle 32", fen: "2b2R2/pk5p/1p4p1/6n1/8/1PP5/PK3bPP/3R4 w - - 0 1", solution: "1. Rxf2 *", variation: "1.Rxc8? Kxc8", sideToMove: "white" },
  { id: 33, title: "Capturing Pieces - Puzzle 33", fen: "3rr3/ppp2pk1/6p1/7p/3N4/1B5P/PPP2PP1/5RK1 b - - 0 1", solution: "1... Rxd4 *", sideToMove: "black" },
  { id: 34, title: "Capturing Pieces - Puzzle 34", fen: "2kr4/1pp3p1/1r4Np/8/pN5R/7P/PPP3PK/8 b - - 0 1", solution: "1... Rxg6 *", variation: "1...Rxb4? 2.Rxb4", sideToMove: "black" },
  { id: 35, title: "Capturing Pieces - Puzzle 35", fen: "8/6p1/1p2k1bp/1B1r4/P7/6NP/3N2P1/6K1 b - - 0 1", solution: "1... Rxd2 *", sideToMove: "black" },
  { id: 36, title: "Capturing Pieces - Puzzle 36", fen: "5k2/N3r1b1/p4n2/2p4p/7P/8/P3NP2/3R1K2 b - - 0 1", solution: "1... Rxa7 *", variation: "1...Rxe2? 2.Kxe2", sideToMove: "black" },
  { id: 37, title: "Capturing Pieces - Puzzle 37", fen: "7r/3k2pp/4p3/p3Rp2/5K2/5P2/PP4PP/8 w - - 0 1", solution: "1. Rxa5 *", sideToMove: "white" },
  { id: 38, title: "Capturing Pieces - Puzzle 38", fen: "2r5/1k3p2/4p3/p6r/R5p1/K1P5/1P3PP1/4R3 w - - 0 1", solution: "1. Rxg4 *", sideToMove: "white" },
  { id: 39, title: "Capturing Pieces - Puzzle 39", fen: "3r2k1/pbp3pp/1p6/8/5N2/1PR2pP1/PKP2P1P/8 w - - 0 1", solution: "1. Rxc7 *", variation: "1.Rxf3? Bxf3", sideToMove: "white" },
  { id: 40, title: "Capturing Pieces - Puzzle 40", fen: "3r3r/6kp/1p4p1/p7/2P1P1P1/1P5P/R4p1K/2R5 w - - 0 1", solution: "1. Rxf2 *", sideToMove: "white" },
  { id: 41, title: "Capturing Pieces - Puzzle 41", fen: "3rr3/pbp2pkp/1p3bp1/8/8/PPQ4P/2P2PP1/R4RK1 b - - 0 1", solution: "1... Bxc3 *", sideToMove: "black" },
  { id: 42, title: "Capturing Pieces - Puzzle 42", fen: "Q4bk1/2p2pp1/1p5p/7N/8/2P2bP1/1P3P1P/6K1 b - - 0 1", solution: "1... Bxa8 *", sideToMove: "black" },
  { id: 43, title: "Capturing Pieces - Puzzle 43", fen: "5Q2/kp6/p5q1/2b4p/8/R5PP/6PK/8 b - - 0 1", solution: "1... Bxf8 *", sideToMove: "black" },
  { id: 44, title: "Capturing Pieces - Puzzle 44", fen: "1Q6/1p3pk1/p5p1/8/8/PP5b/K6b/5B2 b - - 0 1", solution: "1... Bxb8 *", sideToMove: "black" },
  { id: 45, title: "Capturing Pieces - Puzzle 45", fen: "4R3/1p3pkp/p1r2bpp/8/8/1P2RBP1/P4PKP/3r4 w - - 0 1", solution: "1. Bxd1 *", variation: "1.Bxc6? bxc6", sideToMove: "white" },
  { id: 46, title: "Capturing Pieces - Puzzle 46", fen: "6k1/2p2p1p/1p3npQ/2n1r3/8/1PB2B1P/2P2PP1/r1K5 w - - 0 1", solution: "1. Bxa1 *", sideToMove: "white" },
  { id: 47, title: "Capturing Pieces - Puzzle 47", fen: "k7/p7/1pp2np1/1B5p/7P/PKN3P1/1P3P2/5r2 w - - 0 1", solution: "1. Bxf1 *", sideToMove: "white" },
  { id: 48, title: "Capturing Pieces - Puzzle 48", fen: "1r4k1/5pb1/p5p1/7p/n7/P5BP/2B2PP1/3R2K1 w - - 0 1", solution: "1. Bxb8 *", sideToMove: "white" },
  { id: 49, title: "Capturing Pieces - Puzzle 49", fen: "3q4/1kp2ppp/1pb5/p7/Q7/5BP1/PPP2P1P/6K1 b - - 0 1", solution: "1... Bxf3 *", sideToMove: "black" },
  { id: 50, title: "Capturing Pieces - Puzzle 50", fen: "4r2k/pp3p2/5Bp1/7p/8/1P4P1/Pb3PKP/2R5 b - - 0 1", solution: "1... Bxf6 *", sideToMove: "black" },
  { id: 51, title: "Capturing Pieces - Puzzle 51", fen: "8/1pk3p1/2pb4/5b2/8/1PNP1P1P/7B/5K2 b - - 0 1", solution: "1... Bxh2 *", sideToMove: "black" },
  { id: 52, title: "Capturing Pieces - Puzzle 52", fen: "1k3b2/1pp2p1p/p5pP/8/8/BA4P1/P1P2PK1/8 b - - 0 1", solution: "1... Bxa3 *", sideToMove: "black" },
  { id: 53, title: "Capturing Pieces - Puzzle 53", fen: "6k1/pp4p1/2p2n1p/4B3/1P6/5B1P/Pn3PPK/8 w - - 0 1", solution: "1. Bxb2 *", variation: "1.Bxf6? gxf6", sideToMove: "white" },
  { id: 54, title: "Capturing Pieces - Puzzle 54", fen: "1b6/1p2k1pp/p3p3/6P1/3n1nBP/P1N1B3/1PP5/2K5 w - - 0 1", solution: "1. Bxd4 *", variation: "1.Bxf4? Bxf4+", sideToMove: "white" },
  { id: 55, title: "Capturing Pieces - Puzzle 55", fen: "6k1/p2b2p1/1p4np/4p3/n4P6/P4NP1/2BN1PKP/8 w - - 0 1", solution: "1. Bxg6 *", sideToMove: "white" },
  { id: 56, title: "Capturing Pieces - Puzzle 56", fen: "1B6/4kpp1/p1p1p2p/1n6/K7/1P3PnP/P5P1/5B2 w - - 0 1", solution: "1. Bxg3 *", variation: "1.Bxb5? axb5+", sideToMove: "white" },
  { id: 57, title: "Capturing Pieces - Puzzle 57", fen: "8/ppk3p1/2pb3p/8/1P6/P1N2P2/1K4PP/8 b - - 0 1", solution: "1... Bxh2 *", sideToMove: "black" },
  { id: 58, title: "Capturing Pieces - Puzzle 58", fen: "8/ppb1k1pp/2p1b3/8/5P2/2N2NPP/PP2K3/8 b - - 0 1", solution: "1... Bxh3 *", sideToMove: "black" },
  { id: 59, title: "Capturing Pieces - Puzzle 59", fen: "6k1/2p2p1p/ppn2bp1/8/6PP/P2N1P2/1PP3B1/6K1 b - - 0 1", solution: "1... Bxh4 *", variation: "1...Bxb2? 2.Nxb2", sideToMove: "black" },
  { id: 60, title: "Capturing Pieces - Puzzle 60", fen: "2k5/p1p3p1/1pP4p/8/6P1/P1N2b1P/1P6/6K1 b - - 0 1", solution: "1... Bxc6 *", sideToMove: "black" }
];

export function getCapturingPiecesPgn(): string {
  return CAPTURING_PIECES_PUZZLES.map((p) => {
    let pgn = `[Event "${p.title}"]\n[Site "ChessHub Academy"]\n[FEN "${p.fen}"]\n\n${p.solution}`;
    if (p.variation) {
      pgn += ` { ${p.variation} }`;
    }
    return pgn;
  }).join('\n\n');
}
