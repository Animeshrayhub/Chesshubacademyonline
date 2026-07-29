export interface ChessStudy {
  id: string;
  title: string;
  category: 'Openings' | 'Endgames' | 'Tactics' | 'Master Games';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  author: string;
  pgn: string;
  description: string;
  movesCount: number;
}

const SAMPLE_STUDIES: ChessStudy[] = [
  {
    id: 'study-1',
    title: 'Ruy Lopez Opening Mastery',
    category: 'Openings',
    difficulty: 'Intermediate',
    author: 'GM Alexander',
    description: 'Master the classical Ruy Lopez opening lines and central pawn control for White.',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O',
    movesCount: 16,
  },
  {
    id: 'study-2',
    title: 'Essential Rook & Pawn Endgames',
    category: 'Endgames',
    difficulty: 'Intermediate',
    author: 'IM Sarah',
    description: 'Learn the Lucena & Philidor positions for winning single-rook endgames.',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+',
    movesCount: 12,
  },
  {
    id: 'study-3',
    title: 'Bobby Fischer\'s Greatest Tactical Hits',
    category: 'Master Games',
    difficulty: 'Advanced',
    author: 'FIDE Coach Dave',
    description: 'Deep dive into Fischer\'s iconic queen sacrifice against Donald Byrne.',
    pgn: '1. Nf3 Nf6 2. c4 g6 3. Nc3 Bg7 4. d4 O-O 5. Bf4 d5 6. Qb3 dxc4 7. Qxc4 c6',
    movesCount: 14,
  },
];

/**
 * Returns list of available annotated chess studies.
 */
export async function getChessStudies(): Promise<ChessStudy[]> {
  return SAMPLE_STUDIES;
}
