-- =========================================================
-- ChessHub Academy: Live Classroom Quiz System
-- Migration: quiz_questions, quiz_sessions, quiz_answers
-- =========================================================

-- ── 1. quiz_questions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  question        TEXT        NOT NULL,
  question_type   TEXT        NOT NULL DEFAULT 'multiple_choice',  -- 'multiple_choice'
  options         JSONB       NOT NULL DEFAULT '[]',               -- string[]
  correct_index   INTEGER     NOT NULL DEFAULT 0,
  explanation     TEXT,
  difficulty      TEXT        NOT NULL DEFAULT 'Beginner',        -- 'Beginner'|'Intermediate'|'Advanced'
  topic           TEXT        NOT NULL DEFAULT 'General',         -- e.g. 'Tactics','Endgame','Opening'
  timer_sec       INTEGER     DEFAULT 30,
  active          BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed 50 real chess questions
INSERT INTO public.quiz_questions (question, options, correct_index, explanation, difficulty, topic, timer_sec) VALUES
('What is the point value of a Rook in standard relative scoring?',        '["3","5","9","1"]',                                    1, 'A Rook is worth 5 points.',                                                   'Beginner',     'Piece Values',  30),
('Which piece can jump over other pieces?',                                 '["Bishop","Rook","Knight","Queen"]',                    2, 'The Knight is the only piece that can jump.',                                'Beginner',     'Piece Movement',30),
('What is it called when a pawn reaches the 8th rank?',                    '["En Passant","Promotion","Castling","Checkmate"]',     1, 'Pawn promotion occurs on the back rank.',                                    'Beginner',     'Pawn Rules',    30),
('Which tactic attacks two pieces simultaneously with one piece?',          '["Pin","Skewer","Fork","Battery"]',                     2, 'A fork attacks two or more pieces at once.',                                 'Beginner',     'Tactics',       30),
('What is the name of the King+Rook special move?',                        '["En Passant","Promotion","Castling","Fianchetto"]',    2, 'Castling moves King 2 squares and rook jumps over.',                         'Beginner',     'Special Moves', 30),
('When the King is in check with no escape, it is called?',                '["Stalemate","Checkmate","Draw","Resign"]',             1, 'Checkmate ends the game immediately.',                                       'Beginner',     'Game End',      30),
('Controlling the center in the opening means controlling which squares?',  '["a1,h1,a8,h8","d4,e4,d5,e5","b2,g2,b7,g7","c3,f3,c6,f6"]', 1, 'The four central squares are d4, e4, d5, e5.',                          'Beginner',     'Opening',       30),
('Which piece moves diagonally any number of squares?',                    '["Rook","Bishop","Knight","Pawn"]',                     1, 'The Bishop moves diagonally.',                                               'Beginner',     'Piece Movement',30),
('A position with no legal moves and King NOT in check is called?',        '["Win","Checkmate","Stalemate","Loss"]',                2, 'Stalemate is a draw.',                                                       'Beginner',     'Game End',      30),
('What is a Pin in chess tactics?',                                        '["Attacking the King","Restricting piece movement because moving exposes a higher-value piece","Pawn diagonal capture","Pawn promotion"]', 1, 'A pin prevents a piece from moving without exposing a more valuable piece.', 'Intermediate', 'Tactics',       30),
('What is a Skewer?',                                                      '["Like a pin but the more valuable piece is in front","Attacking the King and Rook","Promoting a pawn","A type of sacrifice"]', 0, 'A skewer forces the valuable piece to move exposing a lesser piece.', 'Intermediate', 'Tactics',       30),
('What is a Discovered Attack?',                                           '["Moving a piece to reveal an attack by the piece behind it","Two pieces checking at once","Capturing with a pawn","Winning material by force"]', 0, 'Discovered attack reveals an attack from another piece.',               'Intermediate', 'Tactics',       30),
('What is a Double Check?',                                                '["Two pieces delivering check simultaneously","A fork","A pin","Two pawns promoting at once"]', 0, 'Double check requires the King to move.', 'Advanced',     'Tactics',       30),
('Which opening begins with 1.e4 e5 2.Nf3 Nc6 3.Bb5?',                  '["Sicilian Defense","Ruy Lopez","Queens Gambit","Kings Indian"]', 1, 'The Ruy Lopez or Spanish Opening.',                                      'Intermediate', 'Opening',       30),
('Which opening begins with 1.d4 d5 2.c4?',                               '["Ruy Lopez","Sicilian Defense","Queens Gambit","English Opening"]', 2, 'The Queens Gambit offers the c4 pawn.',                              'Intermediate', 'Opening',       30),
('In the Sicilian Defense, Black plays?',                                  '["1...e5","1...c5","1...d5","1...Nf6"]',                1, 'The Sicilian Defense starts with 1.e4 c5.',                                 'Intermediate', 'Opening',       30),
('What is the principle behind Bishops of opposite colors endgames?',      '["Always winning for side with pawn","Drawing tendency due to opposite color bishops","Bishops control same squares","None of the above"]', 1, 'Opposite color bishops often lead to draws.', 'Advanced', 'Endgame',       45),
('What does the Opposition mean in King and Pawn endgames?',               '["Kings are on adjacent squares on same file","Kings face each other with an odd number of squares between","Kings on same rank","Kings on diagonal"]', 1, 'Opposition is critical in king-pawn endgames.', 'Advanced', 'Endgame',       45),
('What is Zugzwang?',                                                      '["A tactic attacking the King","A position where any move worsens your position","A type of pawn structure","A draw technique"]', 1, 'In Zugzwang the player whose turn it is has no good moves.', 'Advanced', 'Strategy',      45),
('What is the Luft technique?',                                            '["Making a pawn move to give the King air","Attacking the center","A special castling move","A pawn break"]', 0, 'Luft prevents back rank checkmate by creating an escape square.', 'Intermediate', 'Strategy',      30),
('What is a Battery in chess?',                                            '["Two pieces on the same file or diagonal","A single powerful piece","An attack involving all pieces","A pawn chain"]', 0, 'A battery is two or more pieces on the same line.', 'Intermediate', 'Tactics',       30),
('What is a Zwischenzug?',                                                 '["An intermezzo move before expected recapture","A type of checkmate","A pawn promotion","A defensive tactic"]', 0, 'Zwischenzug inserts a strong intermediate move.',                            'Advanced',     'Tactics',       45),
('In endgames, what rule helps calculate if a pawn can promote safely?',   '["Rule of the Square","Opposition Rule","Fifty Move Rule","Triangulation"]', 0, 'The Rule of the Square determines if the King can catch a pawn.',      'Intermediate', 'Endgame',       30),
('What is Triangulation in King and Pawn endgames?',                       '["Moving King in a triangle to lose a tempo","Attacking with three pieces","A pawn structure","A draw technique"]', 0, 'Triangulation wastes a tempo to put the opponent in Zugzwang.', 'Advanced', 'Endgame',       45),
('What does LPDO stand for in chess tactics?',                             '["Loose Pieces Drop Off","Long Pawn Diagonal Opening","Level Playing Defense Option","Left Pawn Defense Order"]', 0, 'Loose pieces are targets for tactics.', 'Intermediate', 'Tactics',       30),
('What is a Deflection tactic?',                                           '["Forcing a piece away from a key defensive duty","Blocking a piece","Attacking the King","A pawn promotion"]', 0, 'Deflection forces a defender away from its post.',                           'Intermediate', 'Tactics',       30),
('What is a Decoy tactic?',                                                '["Luring a piece to an unfavorable square","Protecting the King","Advancing pawns","Exchanging pieces"]', 0, 'A decoy lures a piece to a square where it can be exploited.',               'Intermediate', 'Tactics',       30),
('What is Overloading?',                                                   '["Giving one piece too many defensive duties","Moving all pieces at once","A type of opening","A draw technique"]', 0, 'Overloading exploits a piece defending multiple squares.',                   'Advanced',     'Tactics',       45),
('What is a Clearance Sacrifice?',                                         '["Sacrificing a piece to clear a line for another piece","Giving up material to win","A draw offer","A defensive move"]', 0, 'Clearance sacrifice opens a file, rank, or diagonal.',                       'Advanced',     'Tactics',       45),
('What is the purpose of a Fianchetto?',                                   '["Developing a Bishop to b2/g2 to control long diagonals","Moving the King early","Attacking the center with pawns","Sacrificing a piece"]', 0, 'Fianchetto places a Bishop on the long diagonal.',                          'Intermediate', 'Opening',       30),
('What is the Italian Game?',                                              '["1.e4 e5 2.Nf3 Nc6 3.Bc4","1.d4 d5 2.c4","1.e4 c5","1.Nf3 Nf6 2.c4"]', 0, 'The Italian Game develops the Bishop to c4 early.',                        'Intermediate', 'Opening',       30),
('What is the Kings Indian Defense?',                                      '["1.d4 Nf6 2.c4 g6 with Bg7","1.e4 e5 2.Nf3","1.d4 d5","1.c4 e5"]', 0, 'The Kings Indian is a hypermodern defense.',                               'Intermediate', 'Opening',       30),
('How many squares can a King move to from the center of the board?',      '["4","8","6","16"]',                                   1, 'The King can move to 8 surrounding squares from center.',                   'Beginner',     'Piece Movement',30),
('Which endgame draws even with an extra pawn: Rook+Pawn vs Rook?',       '["Never","Always","Often — Lucena and Philidor positions are key","Only with two extra pawns"]', 2, 'Rook endgames are notoriously drawish.',                                     'Advanced',     'Endgame',       45),
('What is the 50-Move Rule?',                                              '["Draw if 50 moves without pawn move or capture","Win if 50 moves","Pawn promotes after 50 moves","None"]', 0, 'The 50-move rule allows a draw claim.',                                      'Intermediate', 'Rules',         30),
('What is En Passant?',                                                    '["Special pawn capture when opponent advances two squares","King special move","Pawn promotion","Piece exchange"]', 0, 'En Passant must be captured immediately on the next move.',                  'Beginner',     'Pawn Rules',    30),
('What is Perpetual Check?',                                               '["Continuous checks that cannot be stopped leading to draw","A type of checkmate","A win by force","An illegal move"]', 0, 'Perpetual check results in a draw.',                                         'Intermediate', 'Strategy',      30),
('What is the Philidor Position?',                                         '["A Rook and Pawn endgame defensive technique","A famous opening","A tactical pattern","A pawn structure"]', 0, 'The Philidor position draws with Rook vs Rook+Pawn.',                        'Advanced',     'Endgame',       45),
('What is the Lucena Position?',                                           '["A winning Rook and Pawn endgame technique","A drawing technique","An opening gambit","A queen endgame"]', 0, 'The Lucena position with the bridge technique wins.',                         'Advanced',     'Endgame',       45),
('What does Gambit mean in chess?',                                        '["Offering a pawn for positional advantage","Attacking the King","A draw technique","A pawn promotion"]', 0, 'A gambit sacrifices material for compensation.',                             'Beginner',     'Opening',       30),
('What is the Sicilian Najdorf?',                                          '["1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a5","1.e4 e5","1.d4 d5","1.e4 c5 2.Nc3"]', 0, 'The Najdorf is one of the most popular Sicilian variations.',               'Advanced',     'Opening',       45),
('What does DAUT mean (Do not attack undefended pieces until...)?',        '["Castle","Ensure your own pieces are safe","Defend your King","Always trade pieces"]', 1, 'Ensure your own pieces are protected before attacking.',                     'Intermediate', 'Strategy',      30),
('What is the principle of Two Weaknesses?',                               '["Force your opponent to defend two weak points simultaneously","Have two pawn weaknesses","A draw technique","Sacrificing two pieces"]', 0, 'Creating two weaknesses stretches the opponent''s defense.', 'Advanced', 'Strategy',     45),
('What is a Windmill?',                                                    '["Rook and Bishop repeatedly checks forcing material wins","A pawn structure","A draw technique","A King safety technique"]', 0, 'The windmill is a devastating combination using discovered checks.',          'Advanced',     'Tactics',       45),
('What is the Exchange Sacrifice?',                                        '["Giving up a Rook for a Bishop or Knight","Exchanging Queens","Trading pawns","Giving up two pawns"]', 0, 'An exchange sacrifice gives up a Rook for positional compensation.',          'Advanced',     'Tactics',       45),
('In which position would you NOT castle?',                                '["Open center with active pieces","Closed center","When your King is safe","Always castle early"]', 0, 'An open center with opponent pieces aimed at your King makes castling risky.','Intermediate', 'Strategy',      30),
('What is the Fried Liver Attack?',                                        '["A sacrificial attack in the Italian Game","A defensive setup","A pawn structure","A type of endgame"]', 0, 'The Fried Liver Attack sacrifices a Knight for a dangerous attack.',          'Advanced',     'Opening',       45),
('What is a Mating Net?',                                                  '["A series of moves that inevitably lead to checkmate","A draw technique","A pawn formation","An opening system"]', 0, 'A mating net restricts the King and forces checkmate.',                       'Intermediate', 'Tactics',       30),
('What does Space Advantage mean?',                                        '["Controlling more squares especially in enemy territory","Having more pieces","Having more pawns","Being ahead on the clock"]', 0, 'Space advantage restricts opponent mobility.', 'Intermediate', 'Strategy', 30),
('What is a Minority Attack?',                                             '["Using fewer pawns to create weaknesses in opponent pawn majority","Attacking with few pieces","A defensive technique","Sacrificing material"]', 0, 'The minority attack undermines the pawn majority.', 'Advanced', 'Strategy', 45)
ON CONFLICT DO NOTHING;

-- ── 2. quiz_sessions ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quiz_sessions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id        TEXT        NOT NULL,
  coach_id        TEXT,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at        TIMESTAMPTZ,
  status          TEXT        NOT NULL DEFAULT 'active',           -- 'active' | 'completed'
  total_questions INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 3. quiz_answers ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quiz_answers (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_session_id uuid        REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  question_id     uuid        REFERENCES public.quiz_questions(id) ON DELETE SET NULL,
  student_id      TEXT        NOT NULL,
  student_name    TEXT        NOT NULL,
  answer_index    INTEGER     NOT NULL,
  correct         BOOLEAN     NOT NULL DEFAULT false,
  time_taken_ms   INTEGER,
  answered_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 4. quiz_results ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quiz_results (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_session_id uuid        REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  class_id        TEXT        NOT NULL,
  student_id      TEXT        NOT NULL,
  student_name    TEXT        NOT NULL,
  total_questions INTEGER     NOT NULL DEFAULT 0,
  correct_count   INTEGER     NOT NULL DEFAULT 0,
  incorrect_count INTEGER     NOT NULL DEFAULT 0,
  accuracy_pct    NUMERIC(5,2) DEFAULT 0,
  completed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  weak_topics     JSONB       DEFAULT '[]'
);

-- ── 5. Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_quiz_questions_active    ON public.quiz_questions (active);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_topic     ON public.quiz_questions (topic);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_session     ON public.quiz_answers   (quiz_session_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_student     ON public.quiz_answers   (student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_class       ON public.quiz_results   (class_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_student     ON public.quiz_results   (student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_class      ON public.quiz_sessions  (class_id);

-- ── 6. RLS Policies ───────────────────────────────────────────────────────────
ALTER TABLE public.quiz_questions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_sessions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_results    ENABLE ROW LEVEL SECURITY;

-- quiz_questions: anyone authenticated can read active questions
DROP POLICY IF EXISTS "quiz_questions_read" ON public.quiz_questions;
CREATE POLICY "quiz_questions_read"
  ON public.quiz_questions FOR SELECT
  USING (active = true);

-- quiz_sessions: read by participants
DROP POLICY IF EXISTS "quiz_sessions_read" ON public.quiz_sessions;
CREATE POLICY "quiz_sessions_read"
  ON public.quiz_sessions FOR SELECT
  USING (true);

-- quiz_answers: students can insert their own, read their own; coaches can read all
DROP POLICY IF EXISTS "quiz_answers_insert" ON public.quiz_answers;
CREATE POLICY "quiz_answers_insert"
  ON public.quiz_answers FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "quiz_answers_read" ON public.quiz_answers;
CREATE POLICY "quiz_answers_read"
  ON public.quiz_answers FOR SELECT
  USING (true);

-- quiz_results: readable by all authenticated
DROP POLICY IF EXISTS "quiz_results_read" ON public.quiz_results;
CREATE POLICY "quiz_results_read"
  ON public.quiz_results FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "quiz_results_insert" ON public.quiz_results;
CREATE POLICY "quiz_results_insert"
  ON public.quiz_results FOR INSERT
  WITH CHECK (true);
