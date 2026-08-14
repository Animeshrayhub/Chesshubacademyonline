const fs = require('fs');
const path = require('path');
const { CAPTURING_PIECES_PUZZLES } = require('./seedCapturingPieces');

const curriculumPath = path.join(__dirname, 'curriculum.json');

const positions = CAPTURING_PIECES_PUZZLES.map((p) => ({
  id: `pos-cap-${p.id}`,
  lessonId: 'les-capturing-pieces-1',
  positionNumber: p.id,
  title: p.title,
  fen: p.fen,
  solution: p.solution,
  hint: p.variation ? `Hint: ${p.variation}` : 'Look for the hanging / undefended piece!',
  explanation: `Solution: ${p.solution}`,
  difficulty: 'Beginner',
  theme: 'Capturing Pieces',
  tags: ['Capturing Pieces', 'Tactics', 'Beginner'],
  orderNumber: p.id,
  boardOrientation: p.sideToMove,
  defaultBoardLock: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}));

const curriculum = [
  {
    id: 'prog-1',
    title: 'Grandmaster Tactical Foundations',
    description: 'Master essential tactical patterns: forks, pins, skewers, and checkmate motifs.',
    targetLevel: 'Beginner',
    orderNumber: 1,
    isArchived: false,
    version: 1,
    coursesCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    courses: [
      {
        id: 'crs-capturing-pieces',
        programId: 'prog-1',
        title: 'Capturing Pieces',
        description: '60 puzzles focusing on capturing undefended and tactical pieces.',
        orderNumber: 1,
        isArchived: false,
        chaptersCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        chapters: [
          {
            id: 'chp-capturing-pieces',
            courseId: 'crs-capturing-pieces',
            title: 'Chapter: Capturing Pieces',
            description: 'Master capturing free pieces, undefended targets, and material advantage.',
            orderNumber: 1,
            isArchived: false,
            lessonsCount: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lessons: [
              {
                id: 'les-capturing-pieces-1',
                chapterId: 'chp-capturing-pieces',
                title: 'Capturing Pieces (60 Puzzles)',
                description: 'Complete 60 puzzle set for classroom demonstration & practice.',
                estimatedDuration: 60,
                difficulty: 'Beginner',
                tags: ['Capturing Pieces', 'Tactics', 'Beginner'],
                orderNumber: 1,
                isArchived: false,
                version: 1,
                positionsCount: 60,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                positions: positions,
              }
            ]
          }
        ]
      }
    ]
  }
];

fs.writeFileSync(curriculumPath, JSON.stringify(curriculum, null, 2), 'utf-8');
console.log('Successfully updated src/data/curriculum.json with 60 Capturing Pieces puzzles!');
