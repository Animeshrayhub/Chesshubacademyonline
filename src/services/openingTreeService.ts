/**
 * Chess Opening Database & Master Games Service
 * Provides master move trees, opening statistics (win/draw/loss rates),
 * and master PGN game library search.
 */

export interface MasterMove {
  san: string;
  uci: string;
  whiteWins: number;
  draws: number;
  blackWins: number;
  totalGames: number;
  averageRating: number;
}

export interface MasterGame {
  id: string;
  title: string;
  white: string;
  black: string;
  result: string;
  eco: string;
  opening: string;
  year: number;
  pgn: string;
  fen: string;
}

// Built-in Curated Master Opening Library
const MASTER_GAMES_DATABASE: MasterGame[] = [
  {
    id: 'game-1',
    title: 'Immortal Game: Anderssen vs. Kieseritzky',
    white: 'Adolf Anderssen',
    black: 'Lionel Kieseritzky',
    result: '1-0',
    eco: 'C33',
    opening: "King's Gambit Accepted",
    year: 1851,
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    pgn: `[Event "London"]\n[Site "London ENG"]\n[Date "1851.06.21"]\n[White "Adolf Anderssen"]\n[Black "Lionel Kieseritzky"]\n[Result "1-0"]\n[ECO "C33"]\n\n1. e4 e5 2. f4 exf4 3. Bc4 Qh4+ 4. Kf1 b5 5. Bxb5 Nf6 6. Nf3 Qh6 7. d3 Nh5 8. Nh4 Qg5 9. Nf5 c6 10. g4 Nf6 11. Rg1 cxb5 12. h4 Qg6 13. h5 Qg5 14. Qf3 Ng8 15. Bxf4 Qf6 16. Nc3 Bc5 17. Nd5 Qxb2 18. Bd6 Bxg1 19. e5 Qxa1+ 20. Ke2 Na6 21. Nxg7+ Kd8 22. Qf6+ Nxf6 23. Be7# 1-0`,
  },
  {
    id: 'game-2',
    title: 'Opera Game: Morphy vs. Duke Karl & Count Isouard',
    white: 'Paul Morphy',
    black: 'Duke Karl / Count Isouard',
    result: '1-0',
    eco: 'C41',
    opening: 'Philidor Defense',
    year: 1858,
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
    pgn: `[Event "Paris Opera"]\n[Site "Paris FRA"]\n[Date "1858.??.??"]\n[White "Paul Morphy"]\n[Black "Duke Karl / Count Isouard"]\n[Result "1-0"]\n[ECO "C41"]\n\n1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`,
  },
  {
    id: 'game-3',
    title: 'Game of the Century: Byrne vs. Fischer',
    white: 'Donald Byrne',
    black: 'Bobby Fischer',
    result: '0-1',
    eco: 'D92',
    opening: 'Grünfeld Defense',
    year: 1956,
    fen: 'rnbqk2r/ppp1ppbp/5np1/3p4/2PP4/2N2N2/PP2PPPP/R1BQKB1R w KQkq - 2 5',
    pgn: `[Event "Third Rosenwald Trophy"]\n[Site "New York, NY USA"]\n[Date "1956.10.17"]\n[White "Donald Byrne"]\n[Black "Bobby Fischer"]\n[Result "0-1"]\n[ECO "D92"]\n\n1. Nf3 Nf6 2. c4 g6 3. Nc3 Bg7 4. d4 O-O 5. Bf4 d5 6. Qb3 dxc4 7. Qxc4 c6 8. e4 Nbd7 9. Rd1 Nb6 10. Qc5 Bg4 11. Bg5 Na4 12. Qa3 Nxc3 13. bxc3 Nxe4 14. Bxe7 Qb6 15. Bc4 Nxc3 16. Bc5 Rfe8+ 17. Kf1 Be6 18. Bxb6 Bxc4+ 19. Kg1 Ne2+ 20. Kf1 Nxd4+ 21. Kg1 Ne2+ 22. Kf1 Nc3+ 23. Kg1 axb6 24. Qb4 Ra4 25. Qxb6 Nxd1 26. h3 Rxa2 27. Kh2 Nxf2 28. Re1 Rxe1 29. Qd8+ Bf8 30. Nxe1 Bd5 31. Nf3 Ne4 32. Qb8 b5 33. h4 h5 34. Ne5 Kg7 35. Kg1 Bc5+ 36. Kf1 Ng3+ 37. Ke1 Bb4+ 38. Kd1 Bb3+ 39. Kc1 Ne2+ 40. Kb1 Nc3+ 41. Kc1 Rc2# 0-1`,
  },
  {
    id: 'game-4',
    title: 'Kasparov vs. Topalov (Pearl of Wijk aan Zee)',
    white: 'Garry Kasparov',
    black: 'Veselin Topalov',
    result: '1-0',
    eco: 'B07',
    opening: "Pirc Defense: Dragon Formation",
    year: 1999,
    fen: 'rnbqk2r/ppp1ppbp/3p1np1/8/2PPP3/2N2N2/PP3PPP/R1BQKB1R b KQkq - 0 5',
    pgn: `[Event "Hoogovens Group A"]\n[Site "Wijk aan Zee NED"]\n[Date "1999.01.20"]\n[White "Garry Kasparov"]\n[Black "Veselin Topalov"]\n[Result "1-0"]\n[ECO "B07"]\n\n1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Be3 Bg7 5. Qd2 c6 6. f3 b5 7. Nge2 Nbd7 8. Bh6 Bxh6 9. Qxh6 Bb7 10. a3 e5 11. O-O-O Qe7 12. Kb1 a6 13. Nc1 O-O-O 14. Nb3 exd4 15. Rxd4 c5 16. Rd1 Nb6 17. g3 Kb8 18. Na5 Ba8 19. Bh3 d5 20. Qf4+ Ka7 21. Rhe1 d4 22. Nd5 Nbxd5 23. exd5 Qd6 24. Rxd4 cxd4 25. Re7+ Kb6 26. Qxd4+ Kxa5 27. b4+ Ka4 28. Qc3 Qxd5 29. Ra7 Bb7 30. Rxb7 Qc4 31. Qxf6 Kxa3 32. Qxa6+ Kxb4 33. c3+ Kxc3 34. Qa1+ Kd2 35. Qb2+ Kd1 36. Bf1 Rd2 37. Rd7 Rxd7 38. Bxc4 bxc4 39. Qxh8 Rd3 40. Qa8 c3 41. Qa4+ Ke1 42. f4 f5 43. Kc1 Rd2 44. Qa7 1-0`,
  },
];

/**
 * Searches master database games by keyword, opening name, player, or ECO code.
 */
export async function searchMasterGames(query: string): Promise<MasterGame[]> {
  if (!query || !query.trim()) return MASTER_GAMES_DATABASE;

  const q = query.toLowerCase().trim();
  return MASTER_GAMES_DATABASE.filter(
    (g) =>
      g.title.toLowerCase().includes(q) ||
      g.white.toLowerCase().includes(q) ||
      g.black.toLowerCase().includes(q) ||
      g.opening.toLowerCase().includes(q) ||
      g.eco.toLowerCase().includes(q)
  );
}

/**
 * Fetches opening tree candidate moves for a FEN position.
 * Attempts Lichess Masters API with local fallback if offline.
 */
export async function fetchOpeningTree(fen: string): Promise<MasterMove[]> {
  try {
    const encodedFen = encodeURIComponent(fen);
    const res = await fetch(`https://explorer.lichess.ovh/masters?fen=${encodedFen}&moves=8`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.moves && Array.isArray(data.moves)) {
        return data.moves.map((m: any) => ({
          san: m.san,
          uci: m.uci,
          whiteWins: m.white,
          draws: m.draws,
          blackWins: m.black,
          totalGames: m.white + m.draws + m.black,
          averageRating: m.averageRating || 2400,
        }));
      }
    }
  } catch (err) {
    console.warn('Lichess opening API fallback to local cache:', err);
  }

  // Local fallback move candidate suggestions
  return [
    { san: 'e4', uci: 'e2e4', whiteWins: 45000, draws: 32000, blackWins: 23000, totalGames: 100000, averageRating: 2550 },
    { san: 'd4', uci: 'd2d4', whiteWins: 42000, draws: 36000, blackWins: 22000, totalGames: 100000, averageRating: 2560 },
    { san: 'Nf3', uci: 'g1f3', whiteWins: 38000, draws: 41000, blackWins: 21000, totalGames: 100000, averageRating: 2540 },
    { san: 'c4', uci: 'c2c4', whiteWins: 37000, draws: 39000, blackWins: 24000, totalGames: 100000, averageRating: 2530 },
  ];
}
