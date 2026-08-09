export const CHESS_DATA = {
  initialFEN: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  sampleFEN: 'r1bqk2r/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 4',
  mateInOneFEN: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
  samplePGN: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. Qxf7#',
  scholarsMateMoves: [
    { from: 'e2', to: 'e4' },
    { from: 'e7', to: 'e5' },
    { from: 'f1', to: 'c4' },
    { from: 'b8', to: 'c6' },
    { from: 'd1', to: 'f3' },
    { from: 'a7', to: 'a6' },
    { from: 'f3', to: 'f7' },
  ],
  puzzle: {
    id: 'puz-101',
    title: 'Smothered Mate Opportunity',
    fen: '6rk/5Npp/8/8/8/8/8/7K w - - 0 1',
    solutionFEN: '6rk/5Npp/8/8/8/8/8/7K w - - 0 1',
    hintText: 'Look for a knight fork checkmate move',
  },
};
