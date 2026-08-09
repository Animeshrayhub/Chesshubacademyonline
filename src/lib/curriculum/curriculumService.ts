import fs from 'fs';
import path from 'path';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import type {
  CurriculumProgram,
  CurriculumCourse,
  CurriculumChapter,
  CurriculumLesson,
  TeachingPosition,
  LessonMedia,
  TeachingTag,
  CurriculumVersionHistory,
} from '@/types/curriculum.types';
import { parsePgnImport, parseFenImport, parseCsvImport } from './importService';

const CURRICULUM_DATA_FILE = path.join(process.cwd(), 'src', 'data', 'curriculum.json');

// In-memory fallback dataset for smooth instant rendering & mock client support
let mockTags: TeachingTag[] = [
  { id: 'tag-1', name: 'Tactics', color: '#EF4444' },
  { id: 'tag-2', name: 'Fork', color: '#F59E0B' },
  { id: 'tag-3', name: 'Pin', color: '#3B82F6' },
  { id: 'tag-4', name: 'Endgame', color: '#10B981' },
  { id: 'tag-5', name: 'Opening Theory', color: '#8B5CF6' },
  { id: 'tag-6', name: 'Sacrifice', color: '#EC4899' },
  { id: 'tag-7', name: 'Checkmate', color: '#6366F1' },
];

let mockVersionHistory: CurriculumVersionHistory[] = [];

const initialMockPrograms: CurriculumProgram[] = [
  {
    id: 'prog-1',
    title: 'Grandmaster Tactical Foundations',
    description: 'Master essential tactical patterns: forks, pins, skewers, and checkmate motifs.',
    targetLevel: 'Beginner',
    orderNumber: 1,
    isArchived: false,
    version: 1,
    coursesCount: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    courses: [
      {
        id: 'crs-piece-movements',
        programId: 'prog-1',
        title: 'Piece Movements & Dynamics',
        description: 'Comprehensive beginner study on legal movement, geometry, and captures for Rook, Bishop, Queen, King, and Knight.',
        orderNumber: 1,
        isArchived: false,
        chaptersCount: 5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        chapters: [
          {
            id: 'chp-rook',
            courseId: 'crs-piece-movements',
            title: 'Chapter 1: Movement of Rook',
            description: 'Vertical and horizontal rank and file movement patterns.',
            orderNumber: 1,
            isArchived: false,
            lessonsCount: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lessons: [
              {
                id: 'les-rook-1',
                chapterId: 'chp-rook',
                title: 'Rook Movement & Captures',
                description: 'Practice moving and capturing targets with the Rook across ranks and files.',
                estimatedDuration: 30,
                difficulty: 'Beginner',
                tags: ['Rook', 'Piece Movement', 'Beginner'],
                orderNumber: 1,
                isArchived: false,
                version: 1,
                positionsCount: 11,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                positions: [
                  { id: 'pos-rk-1', lessonId: 'les-rook-1', positionNumber: 1, title: 'Rook Central Control', fen: '8/8/8/8/4R3/8/8/8 w - - 0 1', solution: '1. Rd4 (1. Ra4)', difficulty: 'Beginner', theme: 'Rook Movement', tags: ['Rook'], orderNumber: 1, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-rk-2', lessonId: 'les-rook-1', positionNumber: 2, title: 'Rook Pawn Sweeper', fen: '8/4p3/8/8/pP2R1p1/8/4P3/8 b - - 0 4', solution: '4... a3 (4... e5 5. Rxe5 g3 6. Re3 a3 7. Rxg3 a2 8. Ra3 a1=Q 9. Ra2 9... Qb2 10. b5 Qxe2 11. Ra1 Qxb5 12. Rb1 Qb8 13. Rxb8) (4... g3) 5. Rxe7', difficulty: 'Beginner', theme: 'Rook Movement', tags: ['Rook'], orderNumber: 2, boardOrientation: 'black', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-rk-3', lessonId: 'les-rook-1', positionNumber: 3, title: 'Rook Rank Target', fen: '7k/3p3p/1p4p1/5p2/2p3p1/5p2/1R6/8 w - - 0 1', solution: '1. Rd2', difficulty: 'Beginner', theme: 'Rook Movement', tags: ['Rook'], orderNumber: 3, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-rk-4', lessonId: 'les-rook-1', positionNumber: 4, title: 'Rook Piece Capture', fen: '5n2/8/4pP2/2r5/q7/1b3R2/8/6k1 w - - 0 1', solution: '1. Rxb3', difficulty: 'Beginner', theme: 'Rook Movement', tags: ['Rook'], orderNumber: 4, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-rk-5', lessonId: 'les-rook-1', positionNumber: 5, title: 'Rook Open File Attack', fen: '1k2n3/8/8/1q2R2p/8/8/7r/4b3 w - - 0 1', difficulty: 'Beginner', theme: 'Rook Movement', tags: ['Rook'], orderNumber: 5, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-rk-6', lessonId: 'les-rook-1', positionNumber: 6, title: 'Rook Barrier Defense', fen: '8/6n1/8/1r6/pR4q1/8/8/1b4k1 w - - 0 1', difficulty: 'Beginner', theme: 'Rook Movement', tags: ['Rook'], orderNumber: 6, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-rk-7', lessonId: 'les-rook-1', positionNumber: 7, title: 'Doubled Rooks Target', fen: '8/r4r2/8/8/8/8/5R2/8 w - - 0 1', difficulty: 'Beginner', theme: 'Rook Movement', tags: ['Rook'], orderNumber: 7, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-rk-8', lessonId: 'les-rook-1', positionNumber: 8, title: 'Rook 7th Rank Invasion', fen: 'rR6/r7/8/8/8/8/R7/8 w - - 0 1', difficulty: 'Beginner', theme: 'Rook Movement', tags: ['Rook'], orderNumber: 8, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-rk-9', lessonId: 'les-rook-1', positionNumber: 9, title: 'Rook Battery Alignment', fen: 'R7/r3r2R/8/8/8/8/8/8 w - - 0 1', difficulty: 'Beginner', theme: 'Rook Movement', tags: ['Rook'], orderNumber: 9, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-rk-10', lessonId: 'les-rook-1', positionNumber: 10, title: 'Rook Infiltration', fen: '8/pp3R1p/8/8/8/8/p1p5/1p3p2 w - - 0 1', difficulty: 'Beginner', theme: 'Rook Movement', tags: ['Rook'], orderNumber: 10, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-rk-11', lessonId: 'les-rook-1', positionNumber: 11, title: 'Rook Perimeter Infiltration', fen: 'p1p4p/8/8/8/2pp3R/8/2p4p/2p3p1 w - - 0 1', difficulty: 'Beginner', theme: 'Rook Movement', tags: ['Rook'], orderNumber: 11, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                ]
              }
            ]
          },
          {
            id: 'chp-bishop',
            courseId: 'crs-piece-movements',
            title: 'Chapter 2: Movement of Bishop',
            description: 'Diagonal color-complex movement patterns.',
            orderNumber: 2,
            isArchived: false,
            lessonsCount: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lessons: [
              {
                id: 'les-bishop-1',
                chapterId: 'chp-bishop',
                title: 'Bishop Movement & Diagonal Slicing',
                description: 'Master long diagonal scope and pawn obstruction rules.',
                estimatedDuration: 30,
                difficulty: 'Beginner',
                tags: ['Bishop', 'Piece Movement', 'Beginner'],
                orderNumber: 1,
                isArchived: false,
                version: 1,
                positionsCount: 11,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                positions: [
                  { id: 'pos-bp-1', lessonId: 'les-bishop-1', positionNumber: 1, title: 'Bishop Central Diagonal Scope', fen: '8/8/8/8/4B3/8/8/8 w - - 0 1', difficulty: 'Beginner', theme: 'Bishop Movement', tags: ['Bishop'], orderNumber: 1, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-bp-2', lessonId: 'les-bishop-1', positionNumber: 2, title: 'Dark-Square Bishop Scope', fen: '8/8/8/8/3B4/8/8/8 w - - 0 1', difficulty: 'Beginner', theme: 'Bishop Movement', tags: ['Bishop'], orderNumber: 2, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-bp-3', lessonId: 'les-bishop-1', positionNumber: 3, title: 'Bishop Pawn Target Capture', fen: '8/7p/8/5p2/8/1P6/2B5/8 w - - 0 1', difficulty: 'Beginner', theme: 'Bishop Movement', tags: ['Bishop'], orderNumber: 3, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-bp-4', lessonId: 'les-bishop-1', positionNumber: 4, title: 'Fianchettoed Long Diagonal', fen: 'k7/7P/2P1P3/1P5P/4P3/1P3P2/8/1B6 w - - 0 1', difficulty: 'Beginner', theme: 'Bishop Movement', tags: ['Bishop'], orderNumber: 4, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-bp-5', lessonId: 'les-bishop-1', positionNumber: 5, title: 'Pair of Bishops Coordination', fen: '4n3/8/1B6/3q2kp/8/8/4Br2/6b1 w - - 0 1', difficulty: 'Beginner', theme: 'Bishop Movement', tags: ['Bishop'], orderNumber: 5, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-bp-6', lessonId: 'les-bishop-1', positionNumber: 6, title: 'Bishop Pawn Chain Obstruction', fen: '1p6/8/3p4/4p3/1p6/B7/1p6/8 w - - 0 1', difficulty: 'Beginner', theme: 'Bishop Movement', tags: ['Bishop'], orderNumber: 6, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-bp-7', lessonId: 'les-bishop-1', positionNumber: 7, title: 'Bishop Rook Target Pin', fen: '2r5/8/8/8/2P5/8/4B3/8 w - - 0 1', difficulty: 'Beginner', theme: 'Bishop Movement', tags: ['Bishop'], orderNumber: 7, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-bp-8', lessonId: 'les-bishop-1', positionNumber: 8, title: 'Bishop Long Range Skewer', fen: '8/1r6/8/8/8/5r2/2B5/8 w - - 0 1', difficulty: 'Beginner', theme: 'Bishop Movement', tags: ['Bishop'], orderNumber: 8, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-bp-9', lessonId: 'les-bishop-1', positionNumber: 9, title: 'Central Bishop Outpost', fen: '5p1p/8/8/2p5/3B4/p3p3/1p6/8 w - - 0 1', difficulty: 'Beginner', theme: 'Bishop Movement', tags: ['Bishop'], orderNumber: 9, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-bp-10', lessonId: 'les-bishop-1', positionNumber: 10, title: 'Bishop Diagonal Clearance', fen: '6p1/5B2/6p1/1p6/8/1p1p4/4p3/3p4 w - - 0 1', difficulty: 'Beginner', theme: 'Bishop Movement', tags: ['Bishop'], orderNumber: 10, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-bp-11', lessonId: 'les-bishop-1', positionNumber: 11, title: 'Bishop Pawn Wall Infiltration', fen: '8/1p6/4p3/1p5p/p7/6p1/2B1p3/8 w - - 0 1', difficulty: 'Beginner', theme: 'Bishop Movement', tags: ['Bishop'], orderNumber: 11, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                ]
              }
            ]
          },
          {
            id: 'chp-queen',
            courseId: 'crs-piece-movements',
            title: 'Chapter 3: Movement of Queen',
            description: 'Combined Rook + Bishop multi-directional power.',
            orderNumber: 3,
            isArchived: false,
            lessonsCount: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lessons: [
              {
                id: 'les-queen-1',
                chapterId: 'chp-queen',
                title: 'Queen Dominance & Multi-Directional Scope',
                description: 'Practice legal queen moves across lines, ranks, and diagonals.',
                estimatedDuration: 30,
                difficulty: 'Beginner',
                tags: ['Queen', 'Piece Movement', 'Beginner'],
                orderNumber: 1,
                isArchived: false,
                version: 1,
                positionsCount: 11,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                positions: [
                  { id: 'pos-qn-1', lessonId: 'les-queen-1', positionNumber: 1, title: 'Central Queen Radiance', fen: '8/8/8/8/4Q3/8/8/8 w - - 0 1', difficulty: 'Beginner', theme: 'Queen Movement', tags: ['Queen'], orderNumber: 1, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-qn-2', lessonId: 'les-queen-1', positionNumber: 2, title: 'Queen Pawn Fork Geometry', fen: '8/3P2P1/4p1p1/8/1pP3Q1/8/4P3/8 w - - 0 1', difficulty: 'Beginner', theme: 'Queen Movement', tags: ['Queen'], orderNumber: 2, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-qn-3', lessonId: 'les-queen-1', positionNumber: 3, title: 'Queen King Back-Rank Target', fen: '4k3/1ppppppp/8/p7/8/1b6/Q4b2/8 w - - 0 1', difficulty: 'Beginner', theme: 'Queen Movement', tags: ['Queen'], orderNumber: 3, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-qn-4', lessonId: 'les-queen-1', positionNumber: 4, title: 'Queen Rook Alignment', fen: '8/6r1/8/8/8/2P5/8/2Q5 w - - 0 1', difficulty: 'Beginner', theme: 'Queen Movement', tags: ['Queen'], orderNumber: 4, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-qn-5', lessonId: 'les-queen-1', positionNumber: 5, title: 'Queen Bishop Diagonal Laser', fen: '8/2b1P3/2P5/8/8/8/5Q2/8 w - - 0 1', difficulty: 'Beginner', theme: 'Queen Movement', tags: ['Queen'], orderNumber: 5, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-qn-6', lessonId: 'les-queen-1', positionNumber: 6, title: 'Queen Central Dominance', fen: '1p6/8/8/1p2Q2p/8/6p1/8/6p1 w - - 0 1', difficulty: 'Beginner', theme: 'Queen Movement', tags: ['Queen'], orderNumber: 6, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-qn-7', lessonId: 'les-queen-1', positionNumber: 7, title: 'Queen vs Queen Battle', fen: '8/4q3/8/8/8/8/2Q5/8 w - - 0 1', difficulty: 'Beginner', theme: 'Queen Movement', tags: ['Queen'], orderNumber: 7, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-qn-8', lessonId: 'les-queen-1', positionNumber: 8, title: 'Multiple Queens Geometry', fen: '3Q4/8/Q7/2Q5/5Q2/3Q4/7Q/4Q3 w - - 0 1', difficulty: 'Beginner', theme: 'Queen Movement', tags: ['Queen'], orderNumber: 8, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-qn-9', lessonId: 'les-queen-1', positionNumber: 9, title: 'Queen Pin on Major Pieces', fen: '8/8/3r4/8/8/3Q2b1/8/8 w - - 0 1', difficulty: 'Beginner', theme: 'Queen Movement', tags: ['Queen'], orderNumber: 9, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-qn-10', lessonId: 'les-queen-1', positionNumber: 10, title: 'Queen Diagonal Infiltration', fen: '4p2Q/8/8/1p2p2p/8/7p/8/4p3 w - - 0 1', difficulty: 'Beginner', theme: 'Queen Movement', tags: ['Queen'], orderNumber: 10, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-qn-11', lessonId: 'les-queen-1', positionNumber: 11, title: 'Queen Pawn Barrier Breaker', fen: 'p7/8/1p2p3/2p5/p7/1Q6/p5p1/8 w - - 0 1', difficulty: 'Beginner', theme: 'Queen Movement', tags: ['Queen'], orderNumber: 11, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                ]
              }
            ]
          },
          {
            id: 'chp-king',
            courseId: 'crs-piece-movements',
            title: 'Chapter 4: Movement of King',
            description: 'One-square step rule, safety, and check constraints.',
            orderNumber: 4,
            isArchived: false,
            lessonsCount: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lessons: [
              {
                id: 'les-king-1',
                chapterId: 'chp-king',
                title: 'King Step & Shield Geometry',
                description: 'Understand king movement restrictions and guarding friendly pawns.',
                estimatedDuration: 25,
                difficulty: 'Beginner',
                tags: ['King', 'Piece Movement', 'Beginner'],
                orderNumber: 1,
                isArchived: false,
                version: 1,
                positionsCount: 6,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                positions: [
                  { id: 'pos-kg-1', lessonId: 'les-king-1', positionNumber: 1, title: 'King Center Step', fen: '8/8/8/8/4K3/8/8/8 w - - 0 1', difficulty: 'Beginner', theme: 'King Movement', tags: ['King'], orderNumber: 1, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-kg-2', lessonId: 'les-king-1', positionNumber: 2, title: 'King Corner Step', fen: '8/8/8/8/8/8/6K1/8 w - - 0 1', difficulty: 'Beginner', theme: 'King Movement', tags: ['King'], orderNumber: 2, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-kg-3', lessonId: 'les-king-1', positionNumber: 3, title: 'King Pawn Shield Wall', fen: '8/8/8/8/8/4P3/4PPP1/5K2 w - - 0 1', difficulty: 'Beginner', theme: 'King Movement', tags: ['King'], orderNumber: 3, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-kg-4', lessonId: 'les-king-1', positionNumber: 4, title: 'King Castle Shield Fortress', fen: '8/8/4P2P/4PPP1/8/8/2PP4/2K5 w - - 0 1', difficulty: 'Beginner', theme: 'King Movement', tags: ['King'], orderNumber: 4, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-kg-5', lessonId: 'les-king-1', positionNumber: 5, title: 'King Escort & Pawn Advance', fen: '8/8/3r4/3P4/3KPr2/8/8/8 w - - 0 1', difficulty: 'Beginner', theme: 'King Movement', tags: ['King'], orderNumber: 5, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-kg-6', lessonId: 'les-king-1', positionNumber: 6, title: 'King Rank Step Practice', fen: '8/8/8/8/8/8/3K4/8 w - - 0 1', difficulty: 'Beginner', theme: 'King Movement', tags: ['King'], orderNumber: 6, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                ]
              }
            ]
          },
          {
            id: 'chp-knight',
            courseId: 'crs-piece-movements',
            title: 'Chapter 5: Movement of Knight',
            description: 'L-shape jumping geometry, color swapping, and outposts.',
            orderNumber: 5,
            isArchived: false,
            lessonsCount: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lessons: [
              {
                id: 'les-knight-1',
                chapterId: 'chp-knight',
                title: 'Knight L-Shape Jumping & Fork Geometry',
                description: 'Master knight L-jumps over obstacles and dual target forks.',
                estimatedDuration: 35,
                difficulty: 'Beginner',
                tags: ['Knight', 'Piece Movement', 'Beginner'],
                orderNumber: 1,
                isArchived: false,
                version: 1,
                positionsCount: 11,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                positions: [
                  { id: 'pos-kt-1', lessonId: 'les-knight-1', positionNumber: 1, title: 'Knight Center Octagon Jump', fen: '8/8/8/8/4N3/8/8/8 w - - 0 1', difficulty: 'Beginner', theme: 'Knight Movement', tags: ['Knight'], orderNumber: 1, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-kt-2', lessonId: 'les-knight-1', positionNumber: 2, title: 'Knight Jump Over Pawn Ring', fen: '8/8/8/3PPP2/3PNP2/3PPP2/8/8 w - - 0 1', difficulty: 'Beginner', theme: 'Knight Movement', tags: ['Knight'], orderNumber: 2, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-kt-3', lessonId: 'les-knight-1', positionNumber: 3, title: 'Knight Wall Leaping', fen: '8/8/PPPPPPPP/8/PPPPPPPP/8/PPPPPPPP/1N6 w - - 0 1', difficulty: 'Beginner', theme: 'Knight Movement', tags: ['Knight'], orderNumber: 3, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-kt-4', lessonId: 'les-knight-1', positionNumber: 4, title: 'Knight vs Knight Central Outpost', fen: '8/8/8/4n3/2n5/2N5/8/8 w - - 0 1', difficulty: 'Beginner', theme: 'Knight Movement', tags: ['Knight'], orderNumber: 4, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-kt-5', lessonId: 'les-knight-1', positionNumber: 5, title: 'Multiple Knights Geometry', fen: '8/8/6N1/4nn2/8/8/8/8 w - - 0 1', difficulty: 'Beginner', theme: 'Knight Movement', tags: ['Knight'], orderNumber: 5, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-kt-6', lessonId: 'les-knight-1', positionNumber: 6, title: 'Knight Triangle Hop', fen: '8/8/8/8/3n4/8/4N3/2n5 w - - 0 1', difficulty: 'Beginner', theme: 'Knight Movement', tags: ['Knight'], orderNumber: 6, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-kt-7', lessonId: 'les-knight-1', positionNumber: 7, title: 'Knight Pawn Outpost Infiltration', fen: '8/8/8/5p2/3p4/4Npp1/8/5p2 w - - 0 1', difficulty: 'Beginner', theme: 'Knight Movement', tags: ['Knight'], orderNumber: 7, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-kt-8', lessonId: 'les-knight-1', positionNumber: 8, title: 'Knight Leaping Barrier', fen: '8/8/8/3Np3/2p2p2/4p3/6p1/8 w - - 0 1', difficulty: 'Beginner', theme: 'Knight Movement', tags: ['Knight'], orderNumber: 8, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-kt-9', lessonId: 'les-knight-1', positionNumber: 9, title: 'Knight Corner to Center Hop', fen: '7n/3N4/8/8/8/8/8/8 w - - 0 1', difficulty: 'Beginner', theme: 'Knight Movement', tags: ['Knight'], orderNumber: 9, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-kt-10', lessonId: 'les-knight-1', positionNumber: 10, title: 'Knight Pawn Outpost Target', fen: '8/2N2p2/3pp3/1p4p1/5p2/8/8/8 w - - 0 1', difficulty: 'Beginner', theme: 'Knight Movement', tags: ['Knight'], orderNumber: 10, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                  { id: 'pos-kt-11', lessonId: 'les-knight-1', positionNumber: 11, title: 'Knight Sequence Calculation', fen: '8/8/4p3/8/3p4/1Np5/p3p3/2p5 w - - 0 1', solution: '1. Nxd4 c2 2. Nxe6 e1=B 3. Nd4 a1=Q 4. Ne2 Qe5 5. Nxc1 Qa1 6. Nb3 c1=Q 7. Nd2 Qac3 8. Ne4 Bd2 9. Nxc3 Qd1 10. Ne4 Qe2 11. Nxd2 Qe8 12. Ne4 Qe7 13. Nd6 Qe8 14. Nxe8', difficulty: 'Beginner', theme: 'Knight Movement', tags: ['Knight'], orderNumber: 11, boardOrientation: 'white', defaultBoardLock: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'crs-1',
        programId: 'prog-1',
        title: 'Tactical Motifs Level 1',
        description: 'Basic forks, pins, and back-rank checkmates.',
        orderNumber: 2,
        isArchived: false,
        chaptersCount: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        chapters: [
          {
            id: 'chp-1',
            courseId: 'crs-1',
            title: 'Chapter 1: The Knight Fork',
            description: 'Learn to exploit the unique L-shape geometry of the knight.',
            orderNumber: 1,
            isArchived: false,
            lessonsCount: 2,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lessons: [
              {
                id: 'les-1',
                chapterId: 'chp-1',
                title: 'Lesson 1.1: King & Queen Royal Forks',
                description: 'Forking king and queen simultaneously on c7/f7.',
                objectives: 'Identify weak square defense; calculation of knight jump geometry.',
                coachNotes: 'Ensure students calculate Black knight defending f6 before jumping.',
                estimatedDuration: 45,
                difficulty: 'Beginner',
                tags: ['Fork', 'Knight', 'Tactics'],
                orderNumber: 1,
                isArchived: false,
                version: 1,
                positionsCount: 3,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                media: [
                  {
                    id: 'med-1',
                    lessonId: 'les-1',
                    type: 'pdf',
                    title: 'Knight Fork Practice PDF Workbook',
                    url: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/pdf/tactics.pdf',
                    sizeBytes: 1048576,
                    createdAt: new Date().toISOString(),
                  },
                ],
                positions: [
                  {
                    id: 'pos-1',
                    lessonId: 'les-1',
                    positionNumber: 1,
                    title: 'Classic c7 Royal Fork Sacrifice',
                    fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/4n3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 4',
                    solution: 'Nxe5 Nxe5 d4',
                    alternativeSolution: '1. d4 exd4 2. Nxe5',
                    hint: 'Look for the centralized knight fork on c7!',
                    explanation: 'By sacrificing the central knight, White creates a winning double attack on queen and rook.',
                    difficulty: 'Beginner',
                    theme: 'Fork',
                    tags: ['Fork', 'Knight', 'Tactics'],
                    orderNumber: 1,
                    boardOrientation: 'white',
                    defaultBoardLock: true,
                    stockfishEval: '+2.4',
                    coachNotes: 'Emphasize controlling c7 square before jumping with Knight.',
                    isArchived: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  },
                  {
                    id: 'pos-2',
                    lessonId: 'les-1',
                    positionNumber: 2,
                    title: 'Back-Rank Mate Threat & Fork',
                    fen: '6k1/5ppp/8/8/8/8/5PPP/1R4K1 w - - 0 1',
                    solution: 'Rb8#',
                    hint: 'The opponent king has no escape squares on the 8th rank.',
                    explanation: 'Classic back-rank checkmate because Black pawns block their own king.',
                    difficulty: 'Beginner',
                    theme: 'Checkmate',
                    tags: ['Back-Rank', 'Checkmate'],
                    orderNumber: 2,
                    boardOrientation: 'white',
                    defaultBoardLock: false,
                    stockfishEval: '#1',
                    coachNotes: 'Show students the difference between back-rank checkmate and queen pin.',
                    isArchived: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  },
                  {
                    id: 'pos-3',
                    lessonId: 'les-1',
                    positionNumber: 3,
                    title: 'Pin & Sacrifice on h7',
                    fen: 'r2q1rk1/ppp2ppp/2n5/3p4/3P4/2PB1Q2/P1P2PPP/R4RK1 w - - 0 1',
                    solution: 'Bxh7+ Kxh7 Qh5+ Kg8',
                    hint: 'Sacrifice the bishop on h7 to tear open the black king castle!',
                    explanation: 'The Greek Gift Sacrifice opening the h-file for a fatal queen attack.',
                    difficulty: 'Intermediate',
                    theme: 'Sacrifice',
                    tags: ['Greek Gift', 'Sacrifice', 'Attacking King'],
                    orderNumber: 3,
                    boardOrientation: 'white',
                    defaultBoardLock: true,
                    stockfishEval: '+4.8',
                    coachNotes: 'Ensure students calculate Black knight defending f6.',
                    isArchived: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'prog-2',
    title: 'Master Opening Repertoire',
    description: 'Deep opening theory: Ruy Lopez, Italian Game, and Sicilian Defense.',
    targetLevel: 'Intermediate',
    orderNumber: 2,
    isArchived: false,
    version: 1,
    coursesCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    courses: [
      {
        id: 'crs-2',
        programId: 'prog-2',
        title: 'Ruy Lopez Championship Lines',
        description: 'Classical lines for White against e5.',
        orderNumber: 1,
        isArchived: false,
        chaptersCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        chapters: [
          {
            id: 'chp-2',
            courseId: 'crs-2',
            title: 'Chapter 1: Main Line Morphy Defense',
            description: '3. Bb5 a6 4. Ba4 Nf6 5. O-O',
            orderNumber: 1,
            isArchived: false,
            lessonsCount: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lessons: [
              {
                id: 'les-2',
                chapterId: 'chp-2',
                title: 'Lesson 1.1: Controlling the Central Pawn Structure',
                description: 'Using c3 and d4 to establish central pawn dominance.',
                objectives: 'Establish strong pawn center on d4; maintain bishop line on b3.',
                coachNotes: 'Explain why d4 is delayed until c3 and Re1 are played.',
                estimatedDuration: 65,
                difficulty: 'Intermediate',
                tags: ['Opening Theory', 'Ruy Lopez'],
                orderNumber: 1,
                isArchived: false,
                version: 1,
                positionsCount: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                positions: [
                  {
                    id: 'pos-4',
                    lessonId: 'les-2',
                    positionNumber: 1,
                    title: 'Ruy Lopez Main Line Setup',
                    fen: 'r1bqkb1r/1ppp1ppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 4',
                    solution: 'O-O Be7 Re1 b5 Bb3 d6 c3',
                    hint: 'Castle early and prepare the c3-d4 pawn push.',
                    explanation: 'White secures the king and prepares to contest the center with d4.',
                    difficulty: 'Intermediate',
                    theme: 'Opening Theory',
                    tags: ['Ruy Lopez', 'Opening Theory'],
                    orderNumber: 1,
                    boardOrientation: 'white',
                    defaultBoardLock: true,
                    stockfishEval: '+0.5',
                    coachNotes: 'Explain why d4 is delayed until c3 and Re1 are played.',
                    isArchived: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

function loadCurriculumFromDisk(): CurriculumProgram[] {
  try {
    if (fs.existsSync(CURRICULUM_DATA_FILE)) {
      const content = fs.readFileSync(CURRICULUM_DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('[curriculumService] Failed to load curriculum.json:', e);
  }
  return initialMockPrograms;
}

function saveCurriculumToDisk(programs: CurriculumProgram[]) {
  try {
    const dir = path.dirname(CURRICULUM_DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CURRICULUM_DATA_FILE, JSON.stringify(programs, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[curriculumService] Failed to save curriculum.json:', e);
  }
}

let mockPrograms: CurriculumProgram[] = loadCurriculumFromDisk();

function filterHierarchy(programs: CurriculumProgram[], includeArchived: boolean): CurriculumProgram[] {
  return programs
    .filter((p) => includeArchived || !p.isArchived)
    .map((p) => ({
      ...p,
      courses: (p.courses || [])
        .filter((c) => includeArchived || !c.isArchived)
        .map((c) => ({
          ...c,
          chapters: (c.chapters || [])
            .filter((ch) => includeArchived || !ch.isArchived)
            .map((ch) => ({
              ...ch,
              lessons: (ch.lessons || [])
                .filter((les) => includeArchived || !les.isArchived)
                .map((les) => ({
                  ...les,
                  positions: (les.positions || []).filter((pos) => includeArchived || !pos.isArchived),
                })),
            })),
        })),
    }));
}

/**
 * Returns full curriculum hierarchy (Programs -> Courses -> Chapters -> Lessons -> Positions).
 */
export async function getCurriculumHierarchy(includeArchived = false): Promise<CurriculumProgram[]> {
  try {
    const admin = createSupabaseAdmin();
    const { data: dbPrograms, error } = await admin
      .from('curriculum_programs')
      .select('*, courses:curriculum_courses(*, chapters:curriculum_chapters(*, lessons:curriculum_lessons(*, media:lesson_media(*), positions:teaching_positions(*))))')
      .order('order_number', { ascending: true });

    if (!error && dbPrograms && dbPrograms.length > 0) {
      return dbPrograms
        .filter((p: any) => includeArchived || !p.is_archived)
        .map((p: any) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          targetLevel: p.target_level || 'Beginner',
          orderNumber: p.order_number || 1,
          isArchived: p.is_archived || false,
          version: p.version || 1,
          coursesCount: p.courses?.length || 0,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
          courses: (p.courses || [])
            .filter((c: any) => includeArchived || !c.is_archived)
            .map((c: any) => ({
              id: c.id,
              programId: c.program_id,
              title: c.title,
              description: c.description,
              orderNumber: c.order_number || 1,
              isArchived: c.is_archived || false,
              chaptersCount: c.chapters?.length || 0,
              createdAt: c.created_at,
              updatedAt: c.updated_at,
              chapters: (c.chapters || [])
                .filter((ch: any) => includeArchived || !ch.is_archived)
                .map((ch: any) => ({
                  id: ch.id,
                  courseId: ch.course_id,
                  title: ch.title,
                  description: ch.description,
                  orderNumber: ch.order_number || 1,
                  isArchived: ch.is_archived || false,
                  lessonsCount: ch.lessons?.length || 0,
                  createdAt: ch.created_at,
                  updatedAt: ch.updated_at,
                  lessons: (ch.lessons || [])
                    .filter((les: any) => includeArchived || !les.is_archived)
                    .map((les: any) => ({
                      id: les.id,
                      chapterId: les.chapter_id,
                      title: les.title,
                      description: les.description,
                      objectives: les.objectives,
                      coachNotes: les.coach_notes,
                      estimatedDuration: les.estimated_duration || 30,
                      difficulty: les.difficulty || 'Beginner',
                      tags: les.tags || [],
                      orderNumber: les.order_number || 1,
                      isArchived: les.is_archived || false,
                      version: les.version || 1,
                      positionsCount: les.positions?.length || 0,
                      createdAt: les.created_at,
                      updatedAt: les.updated_at,
                      media: (les.media || []).map((m: any) => ({
                        id: m.id,
                        lessonId: m.lesson_id,
                        type: m.media_type,
                        title: m.title,
                        url: m.url,
                        sizeBytes: m.size_bytes,
                        createdAt: m.created_at,
                      })),
                      positions: (les.positions || [])
                        .filter((pos: any) => includeArchived || !pos.is_archived)
                        .map((pos: any) => ({
                          id: pos.id,
                          lessonId: pos.lesson_id,
                          positionNumber: pos.position_number || pos.order_number || 1,
                          title: pos.title,
                          fen: pos.fen,
                          solution: pos.solution,
                          alternativeSolution: pos.alternative_solution,
                          hint: pos.hint,
                          explanation: pos.explanation,
                          difficulty: pos.difficulty || 'Beginner',
                          theme: pos.theme,
                          tags: pos.tags || [],
                          orderNumber: pos.order_number || 1,
                          boardOrientation: pos.board_orientation || 'white',
                          defaultBoardLock: pos.default_board_lock ?? true,
                          stockfishEval: pos.stockfish_eval,
                          coachNotes: pos.coach_notes,
                          isArchived: pos.is_archived || false,
                          createdAt: pos.created_at,
                          updatedAt: pos.updated_at,
                        })),
                    })),
                })),
            })),
        }));
    }
  } catch (e) {
    console.warn('[curriculumService] Supabase fallback to mock dataset:', e);
  }

  return filterHierarchy(mockPrograms, includeArchived);
}

/**
 * Completely clears all fake data from the curriculum database.
 */
export async function clearAllFakeData(): Promise<boolean> {
  mockPrograms = [];
  saveCurriculumToDisk(mockPrograms);
  return true;
}

/**
 * Creates a Program.
 */
export async function createProgram(data: Partial<CurriculumProgram>): Promise<CurriculumProgram> {
  const newProgram: CurriculumProgram = {
    id: `prog-${Date.now()}`,
    title: data.title || 'New Program Track',
    description: data.description || '',
    targetLevel: data.targetLevel || 'Beginner',
    orderNumber: mockPrograms.length + 1,
    isArchived: false,
    version: 1,
    coursesCount: 0,
    courses: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    const admin = createSupabaseAdmin();
    const { data: dbProg, error } = await admin
      .from('curriculum_programs')
      .insert({
        title: newProgram.title,
        description: newProgram.description,
        target_level: newProgram.targetLevel,
        order_number: newProgram.orderNumber,
      })
      .select()
      .single();

    if (!error && dbProg) {
      newProgram.id = dbProg.id;
    }
  } catch (e) {
    console.warn('Fallback to local memory for createProgram:', e);
  }

  mockPrograms.push(newProgram);
  saveCurriculumToDisk(mockPrograms);
  return newProgram;
}

/**
 * Updates a Program.
 */
export async function updateProgram(programId: string, data: Partial<CurriculumProgram>): Promise<CurriculumProgram> {
  const prog = mockPrograms.find((p) => p.id === programId);
  if (!prog) throw new Error('Program not found');

  if (data.title !== undefined) prog.title = data.title;
  if (data.description !== undefined) prog.description = data.description;
  if (data.targetLevel !== undefined) prog.targetLevel = data.targetLevel;
  if (data.isArchived !== undefined) prog.isArchived = data.isArchived;
  prog.version = (prog.version || 1) + 1;
  prog.updatedAt = new Date().toISOString();

  try {
    const admin = createSupabaseAdmin();
    await admin.from('curriculum_programs').update({
      title: prog.title,
      description: prog.description,
      target_level: prog.targetLevel,
      is_archived: prog.isArchived,
      version: prog.version,
      updated_at: prog.updatedAt,
    }).eq('id', programId);
  } catch {}

  saveCurriculumToDisk(mockPrograms);
  return prog;
}

/**
 * Creates a Course.
 */
export async function createCourse(programId: string, data: Partial<CurriculumCourse>): Promise<CurriculumCourse> {
  const program = mockPrograms.find((p) => p.id === programId);
  const newCourse: CurriculumCourse = {
    id: `crs-${Date.now()}`,
    programId,
    title: data.title || 'New Course',
    description: data.description || '',
    orderNumber: (program?.courses?.length || 0) + 1,
    isArchived: false,
    chaptersCount: 0,
    chapters: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    const admin = createSupabaseAdmin();
    const { data: dbCourse, error } = await admin
      .from('curriculum_courses')
      .insert({
        program_id: programId,
        title: newCourse.title,
        description: newCourse.description,
        order_number: newCourse.orderNumber,
      })
      .select()
      .single();

    if (!error && dbCourse) {
      newCourse.id = dbCourse.id;
    }
  } catch {}

  if (program) {
    if (!program.courses) program.courses = [];
    program.courses.push(newCourse);
    program.coursesCount = program.courses.length;
  }

  saveCurriculumToDisk(mockPrograms);
  return newCourse;
}

/**
 * Creates a Chapter.
 */
export async function createChapter(courseId: string, data: Partial<CurriculumChapter>): Promise<CurriculumChapter> {
  let targetCourse: CurriculumCourse | undefined;
  for (const p of mockPrograms) {
    const found = p.courses?.find((c) => c.id === courseId);
    if (found) {
      targetCourse = found;
      break;
    }
  }

  const newChapter: CurriculumChapter = {
    id: `chp-${Date.now()}`,
    courseId,
    title: data.title || 'New Chapter',
    description: data.description || '',
    orderNumber: (targetCourse?.chapters?.length || 0) + 1,
    isArchived: false,
    lessonsCount: 0,
    lessons: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    const admin = createSupabaseAdmin();
    const { data: dbChapter, error } = await admin
      .from('curriculum_chapters')
      .insert({
        course_id: courseId,
        title: newChapter.title,
        description: newChapter.description,
        order_number: newChapter.orderNumber,
      })
      .select()
      .single();

    if (!error && dbChapter) {
      newChapter.id = dbChapter.id;
    }
  } catch {}

  if (targetCourse) {
    if (!targetCourse.chapters) targetCourse.chapters = [];
    targetCourse.chapters.push(newChapter);
    targetCourse.chaptersCount = targetCourse.chapters.length;
  }

  saveCurriculumToDisk(mockPrograms);
  return newChapter;
}

/**
 * Creates a Lesson.
 */
export async function createLesson(chapterId: string, data: Partial<CurriculumLesson>): Promise<CurriculumLesson> {
  let targetChapter: CurriculumChapter | undefined;
  for (const p of mockPrograms) {
    for (const c of p.courses || []) {
      const found = c.chapters?.find((ch) => ch.id === chapterId);
      if (found) {
        targetChapter = found;
        break;
      }
    }
  }

  const newLesson: CurriculumLesson = {
    id: `les-${Date.now()}`,
    chapterId,
    title: data.title || 'New Lesson',
    description: data.description || '',
    objectives: data.objectives || '',
    coachNotes: data.coachNotes || '',
    estimatedDuration: data.estimatedDuration || 30,
    difficulty: data.difficulty || 'Beginner',
    tags: data.tags || ['Tactics'],
    orderNumber: (targetChapter?.lessons?.length || 0) + 1,
    isArchived: false,
    version: 1,
    positionsCount: 0,
    positions: [],
    media: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    const admin = createSupabaseAdmin();
    const { data: dbLesson, error } = await admin
      .from('curriculum_lessons')
      .insert({
        chapter_id: chapterId,
        title: newLesson.title,
        description: newLesson.description,
        objectives: newLesson.objectives,
        coach_notes: newLesson.coachNotes,
        estimated_duration: newLesson.estimatedDuration,
        difficulty: newLesson.difficulty,
        tags: newLesson.tags,
        order_number: newLesson.orderNumber,
      })
      .select()
      .single();

    if (!error && dbLesson) {
      newLesson.id = dbLesson.id;
    }
  } catch {}

  if (targetChapter) {
    if (!targetChapter.lessons) targetChapter.lessons = [];
    targetChapter.lessons.push(newLesson);
    targetChapter.lessonsCount = targetChapter.lessons.length;
  }

  saveCurriculumToDisk(mockPrograms);
  return newLesson;
}

/**
 * Creates or updates a Teaching Position.
 */
export async function saveTeachingPosition(lessonId: string, positionData: Partial<TeachingPosition>): Promise<TeachingPosition> {
  let targetLesson: CurriculumLesson | undefined;
  for (const p of mockPrograms) {
    for (const c of p.courses || []) {
      for (const ch of c.chapters || []) {
        const found = ch.lessons?.find((l) => l.id === lessonId);
        if (found) {
          targetLesson = found;
          break;
        }
      }
    }
  }

  if (!targetLesson) {
    throw new Error('Lesson not found');
  }

  if (!targetLesson.positions) targetLesson.positions = [];

  const existingIdx = targetLesson.positions.findIndex((pos) => pos.id === positionData.id);
  const posNumber = positionData.positionNumber || (existingIdx >= 0 ? (targetLesson.positions[existingIdx].positionNumber || existingIdx + 1) : targetLesson.positions.length + 1);

  const updatedPos: TeachingPosition = {
    id: positionData.id || `pos-${Date.now()}`,
    lessonId,
    positionNumber: posNumber,
    title: positionData.title || 'Teaching Position',
    fen: positionData.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    solution: positionData.solution || '',
    alternativeSolution: positionData.alternativeSolution || '',
    hint: positionData.hint || '',
    explanation: positionData.explanation || '',
    difficulty: positionData.difficulty || 'Beginner',
    theme: positionData.theme || 'Tactics',
    tags: positionData.tags || ['Tactics'],
    orderNumber: positionData.orderNumber || posNumber,
    boardOrientation: positionData.boardOrientation || 'white',
    defaultBoardLock: positionData.defaultBoardLock ?? true,
    stockfishEval: positionData.stockfishEval || '',
    coachNotes: positionData.coachNotes || '',
    isArchived: false,
    createdAt: positionData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    const admin = createSupabaseAdmin();
    const { data: dbPos, error } = await admin
      .from('teaching_positions')
      .upsert({
        id: updatedPos.id.startsWith('pos-') ? undefined : updatedPos.id,
        lesson_id: lessonId,
        position_number: updatedPos.positionNumber,
        title: updatedPos.title,
        fen: updatedPos.fen,
        solution: updatedPos.solution,
        alternative_solution: updatedPos.alternativeSolution,
        hint: updatedPos.hint,
        explanation: updatedPos.explanation,
        difficulty: updatedPos.difficulty,
        theme: updatedPos.theme,
        tags: updatedPos.tags,
        board_orientation: updatedPos.boardOrientation,
        default_board_lock: updatedPos.defaultBoardLock,
        stockfish_eval: updatedPos.stockfishEval,
        coach_notes: updatedPos.coachNotes,
        order_number: updatedPos.orderNumber,
      })
      .select()
      .single();

    if (!error && dbPos) {
      updatedPos.id = dbPos.id;
    }
  } catch {}

  if (existingIdx >= 0) {
    targetLesson.positions[existingIdx] = updatedPos;
  } else {
    targetLesson.positions.push(updatedPos);
  }

  targetLesson.positionsCount = targetLesson.positions.length;
  saveCurriculumToDisk(mockPrograms);
  return updatedPos;
}

/**
 * Bulk imports positions into a lesson from PGN, FEN, or CSV format.
 */
export async function bulkImportPositions(
  lessonId: string,
  importType: 'pgn' | 'fen' | 'csv',
  importText: string
): Promise<TeachingPosition[]> {
  let rawPositions: any[] = [];
  if (importType === 'pgn') {
    rawPositions = parsePgnImport(importText);
  } else if (importType === 'fen') {
    rawPositions = parseFenImport(importText);
  } else if (importType === 'csv') {
    rawPositions = parseCsvImport(importText);
  }

  const created: TeachingPosition[] = [];
  for (const item of rawPositions) {
    const pos = await saveTeachingPosition(lessonId, item);
    created.push(pos);
  }

  return created;
}

/**
 * Duplicates a Lesson with all its positions and media.
 */
export async function duplicateLesson(lessonId: string): Promise<CurriculumLesson> {
  let sourceLesson: CurriculumLesson | undefined;
  let parentChapter: CurriculumChapter | undefined;

  for (const p of mockPrograms) {
    for (const c of p.courses || []) {
      for (const ch of c.chapters || []) {
        const found = ch.lessons?.find((l) => l.id === lessonId);
        if (found) {
          sourceLesson = found;
          parentChapter = ch;
          break;
        }
      }
    }
  }

  if (!sourceLesson || !parentChapter) {
    throw new Error('Source lesson not found for duplication.');
  }

  const duplicatedLesson: CurriculumLesson = {
    id: `les-${Date.now()}`,
    chapterId: sourceLesson.chapterId,
    title: `${sourceLesson.title} (Copy)`,
    description: sourceLesson.description,
    objectives: sourceLesson.objectives,
    coachNotes: sourceLesson.coachNotes,
    estimatedDuration: sourceLesson.estimatedDuration,
    difficulty: sourceLesson.difficulty,
    tags: [...sourceLesson.tags],
    orderNumber: (parentChapter.lessons?.length || 0) + 1,
    isArchived: false,
    version: 1,
    positionsCount: sourceLesson.positions?.length || 0,
    positions: (sourceLesson.positions || []).map((pos, idx) => ({
      ...pos,
      id: `pos-${Date.now()}-${idx}`,
      lessonId: `les-${Date.now()}`,
      positionNumber: idx + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
    media: (sourceLesson.media || []).map((m, idx) => ({
      ...m,
      id: `med-${Date.now()}-${idx}`,
      lessonId: `les-${Date.now()}`,
      createdAt: new Date().toISOString(),
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!parentChapter.lessons) parentChapter.lessons = [];
  parentChapter.lessons.push(duplicatedLesson);
  parentChapter.lessonsCount = parentChapter.lessons.length;

  return duplicatedLesson;
}

/**
 * Reorders teaching positions in a lesson.
 */
export async function reorderTeachingPositions(lessonId: string, positionIds: string[]): Promise<boolean> {
  let targetLesson: CurriculumLesson | undefined;
  for (const p of mockPrograms) {
    for (const c of p.courses || []) {
      for (const ch of c.chapters || []) {
        const found = ch.lessons?.find((l) => l.id === lessonId);
        if (found) {
          targetLesson = found;
          break;
        }
      }
    }
  }

  if (targetLesson && targetLesson.positions) {
    const posMap = new Map(targetLesson.positions.map((p) => [p.id, p]));
    const reordered: TeachingPosition[] = [];
    positionIds.forEach((id, idx) => {
      const pos = posMap.get(id);
      if (pos) {
        pos.orderNumber = idx + 1;
        pos.positionNumber = idx + 1;
        reordered.push(pos);
      }
    });
    targetLesson.positions = reordered;
    return true;
  }
  return false;
}

/**
 * Adds Media item to Lesson.
 */
export async function addLessonMedia(
  lessonId: string,
  mediaData: { type: 'pdf' | 'video' | 'image'; title: string; url: string; sizeBytes?: number }
): Promise<LessonMedia> {
  const newMedia: LessonMedia = {
    id: `med-${Date.now()}`,
    lessonId,
    type: mediaData.type,
    title: mediaData.title,
    url: mediaData.url,
    sizeBytes: mediaData.sizeBytes,
    createdAt: new Date().toISOString(),
  };

  for (const p of mockPrograms) {
    for (const c of p.courses || []) {
      for (const ch of c.chapters || []) {
        const les = ch.lessons?.find((l) => l.id === lessonId);
        if (les) {
          if (!les.media) les.media = [];
          les.media.push(newMedia);
          break;
        }
      }
    }
  }

  return newMedia;
}

/**
 * Removes Media item from Lesson.
 */
export async function deleteLessonMedia(mediaId: string): Promise<boolean> {
  for (const p of mockPrograms) {
    for (const c of p.courses || []) {
      for (const ch of c.chapters || []) {
        for (const les of ch.lessons || []) {
          if (les.media) {
            les.media = les.media.filter((m) => m.id !== mediaId);
          }
        }
      }
    }
  }
  return true;
}

/**
 * Gets all Tags.
 */
export async function getTeachingTags(): Promise<TeachingTag[]> {
  return mockTags;
}

/**
 * Adds a new Tag.
 */
export async function createTeachingTag(name: string, color = '#3B82F6'): Promise<TeachingTag> {
  const existing = mockTags.find((t) => t.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing;

  const tag: TeachingTag = {
    id: `tag-${Date.now()}`,
    name,
    color,
    createdAt: new Date().toISOString(),
  };
  mockTags.push(tag);
  return tag;
}

/**
 * Archive or Delete Entity (Program, Course, Chapter, Lesson, Position).
 */
export async function archiveEntity(
  entityType: 'program' | 'course' | 'chapter' | 'lesson' | 'position',
  entityId: string
): Promise<boolean> {
  try {
    const admin = createSupabaseAdmin();
    if (entityType === 'position') {
      await admin.from('teaching_positions').delete().eq('id', entityId);
    } else if (entityType === 'lesson') {
      await admin.from('curriculum_lessons').delete().eq('id', entityId);
    } else if (entityType === 'chapter') {
      await admin.from('curriculum_chapters').delete().eq('id', entityId);
    } else if (entityType === 'course') {
      await admin.from('curriculum_courses').delete().eq('id', entityId);
    } else if (entityType === 'program') {
      await admin.from('curriculum_programs').delete().eq('id', entityId);
    }
  } catch {}

  if (entityType === 'program') {
    mockPrograms = mockPrograms.filter((p) => p.id !== entityId);
  } else if (entityType === 'course') {
    mockPrograms.forEach((p) => {
      if (p.courses) p.courses = p.courses.filter((c) => c.id !== entityId);
    });
  } else if (entityType === 'chapter') {
    mockPrograms.forEach((p) => {
      p.courses?.forEach((c) => {
        if (c.chapters) c.chapters = c.chapters.filter((ch) => ch.id !== entityId);
      });
    });
  } else if (entityType === 'lesson') {
    mockPrograms.forEach((p) => {
      p.courses?.forEach((c) => {
        c.chapters?.forEach((ch) => {
          if (ch.lessons) ch.lessons = ch.lessons.filter((les) => les.id !== entityId);
        });
      });
    });
  } else if (entityType === 'position') {
    mockPrograms.forEach((p) => {
      p.courses?.forEach((c) => {
        c.chapters?.forEach((ch) => {
          ch.lessons?.forEach((les) => {
            if (les.positions) {
              les.positions = les.positions.filter((pos) => pos.id !== entityId);
              les.positionsCount = les.positions.length;
            }
          });
        });
      });
    });
  }

  saveCurriculumToDisk(mockPrograms);
  return true;
}

/**
 * Saves a version history snapshot for an entity.
 */
export async function saveVersionSnapshot(
  entityType: 'program' | 'course' | 'chapter' | 'lesson' | 'position',
  entityId: string,
  snapshot: any
): Promise<CurriculumVersionHistory> {
  const ver: CurriculumVersionHistory = {
    id: `ver-${Date.now()}`,
    entityType,
    entityId,
    version: (snapshot.version || 1),
    snapshot,
    createdAt: new Date().toISOString(),
  };
  mockVersionHistory.unshift(ver);
  return ver;
}

/**
 * Gets Version History for an entity.
 */
export async function getVersionHistory(entityId: string): Promise<CurriculumVersionHistory[]> {
  return mockVersionHistory.filter((v) => v.entityId === entityId);
}
