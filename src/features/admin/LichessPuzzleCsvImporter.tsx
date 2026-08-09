'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Chess } from 'chess.js';
import type { PuzzleData } from '@/lib/puzzles/types';
import { bulkImportPuzzlesAction } from '@/actions/puzzles';

import { wrapChessboard } from '@/components/dashboard/ui/ChessboardWrapper';

const ChessboardComponent = dynamic(
  () =>
    import('react-chessboard').then((mod) => wrapChessboard(mod.Chessboard)),
  { ssr: false }
) as any;

interface LichessPuzzleCsvImporterProps {
  onImportComplete?: (puzzles: PuzzleData[]) => void;
}

const SAMPLE_CSV = `PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl
00008,r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K2R w KQkq - 4 4,f3f7,800,75,98,1500,mate mateIn1 opening,https://lichess.org/training/00008
0000d,r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4,c4f7 e8f7 f3e5 c6e5,1250,70,95,1200,sacrifice opening fork,https://lichess.org/training/0000d
0001a,r5k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1,a1a8,600,80,99,2000,mate mateIn1 endgame backRankMate,https://lichess.org/training/0001a
0002b,r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 2 6,c4f7,850,72,94,900,tactics advantage fork pin,https://lichess.org/training/0002b
0003c,8/8/p7/1P6/8/8/8/k6K w - - 0 1,b5b6 a6a5 b6b7,1400,68,92,800,endgame pawnPromotion zugzwang,https://lichess.org/training/0003c`;

export default function LichessPuzzleCsvImporter({ onImportComplete }: LichessPuzzleCsvImporterProps) {
  const [csvText, setCsvText] = useState('');
  const [importedPuzzles, setImportedPuzzles] = useState<PuzzleData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [filterTheme, setFilterTheme] = useState('ALL');
  const [minRatingFilter, setMinRatingFilter] = useState<number>(400);
  const [maxRatingFilter, setMaxRatingFilter] = useState<number>(3000);
  const [targetTrack, setTargetTrack] = useState<string>('beginner');
  const [targetChapter, setTargetChapter] = useState<string>('Chapter 1: Foundations');
  const [isSavingToDb, setIsSavingToDb] = useState(false);
  const [activeBoardPreviewId, setActiveBoardPreviewId] = useState<string | null>(null);

  // Load existing stored custom puzzles from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('custom_lichess_puzzles');
      if (stored) {
        setImportedPuzzles(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load custom puzzles:', e);
    }
  }, []);

  const parsePgnStudyData = (rawText: string): PuzzleData[] => {
    const chapters = rawText.split(/\[Event\s+/i).filter(Boolean);
    const results: PuzzleData[] = [];

    chapters.forEach((ch, idx) => {
      const fenMatch = ch.match(/\[FEN\s+"([^"]+)"\]/i);
      const chapterMatch = ch.match(/\[ChapterName\s+"([^"]+)"\]/i);
      const urlMatch = ch.match(/\[ChapterURL\s+"([^"]+)"\]/i);
      const eventMatch = ch.match(/"([^"]+)"/);

      if (!fenMatch) return;
      const initialFen = fenMatch[1].trim();

      const lines = ch.split('\n');
      const moveLines = lines.filter((l) => !l.trim().startsWith('[') && l.trim().length > 0 && l.trim() !== '*');
      const movesText = moveLines.join(' ').replace(/\{[^}]*\}/g, '').replace(/\$\d+/g, '').replace(/\*/g, '').trim();

      try {
        const chess = new Chess(initialFen);
        const playerToMove = chess.turn() === 'w' ? 'white' : 'black';
        const solutionMoves: string[] = [];

        if (movesText) {
          const tempGame = new Chess(initialFen);
          const rawTokens = movesText.split(/\s+/).filter((t) => t && !t.match(/^\d+\.$/));
          for (const token of rawTokens) {
            if (token === '*' || token === '1-0' || token === '0-1' || token === '1/2-1/2') continue;
            try {
              const moveRes = tempGame.move(token);
              if (moveRes) {
                solutionMoves.push(`${moveRes.from}${moveRes.to}${moveRes.promotion || ''}`);
              }
            } catch {}
          }
        }

        // Auto-find mate-in-1 move if solution was not specified
        if (solutionMoves.length === 0) {
          const tempGame = new Chess(initialFen);
          const legalMoves = tempGame.moves({ verbose: true });
          for (const m of legalMoves) {
            const testGame = new Chess(initialFen);
            testGame.move(m);
            if (testGame.isCheckmate() || testGame.isGameOver()) {
              solutionMoves.push(`${m.from}${m.to}${m.promotion || ''}`);
              break;
            }
          }
        }

        if (solutionMoves.length > 0) {
          const title = chapterMatch ? chapterMatch[1] : (eventMatch ? eventMatch[1] : `Chapter ${idx + 1}`);
          const isMate = title.toLowerCase().includes('mate') || solutionMoves.length === 1;
          const themes = isMate ? ['mate', 'mateIn1', 'tactics'] : ['tactics'];

          results.push({
            id: `pgn-study-${idx + 1}-${Date.now().toString(36)}`,
            source: 'lichess',
            initialFen,
            solution: solutionMoves,
            playerToMove,
            rating: 800,
            difficulty: 'Beginner',
            themes,
            numberOfMoves: Math.ceil(solutionMoves.length / 2),
            externalUrl: urlMatch ? urlMatch[1] : undefined,
          });
        }
      } catch (err) {
        console.warn(`PGN chapter ${idx + 1} parse error:`, err);
      }
    });

    return results;
  };

  const parseCsvData = (rawText: string) => {
    setError('');
    setSuccessMsg('');
    if (!rawText.trim()) {
      setError('Please paste CSV or PGN study text or select a file first.');
      return;
    }

    setIsProcessing(true);
    try {
      // Auto-detect PGN Study vs CSV
      if (rawText.includes('[Event') || rawText.includes('[FEN')) {
        const pgnPuzzles = parsePgnStudyData(rawText);
        if (pgnPuzzles.length === 0) {
          setError('No valid FEN positions or solution moves found in PGN Study text.');
          setIsProcessing(false);
          return;
        }

        const existingIds = new Set(importedPuzzles.map((p) => p.id));
        const newOnly = pgnPuzzles.filter((p) => !existingIds.has(p.id));
        const combined = [...newOnly, ...importedPuzzles];

        setImportedPuzzles(combined);
        try {
          localStorage.setItem('custom_lichess_puzzles', JSON.stringify(combined));
        } catch (e) {}

        setSuccessMsg(`🎉 Successfully imported ${pgnPuzzles.length} PGN Study Chapters into catalog!`);
        if (onImportComplete) onImportComplete(combined);
        setIsProcessing(false);
        return;
      }

      const lines = rawText.trim().split(/\r?\n/);
      if (lines.length === 0) {
        setError('Empty CSV file provided.');
        setIsProcessing(false);
        return;
      }

      // Check header row
      const headerLine = lines[0].toLowerCase();
      let fenIdx = 1;
      let movesIdx = 2;
      let ratingIdx = 3;
      let themesIdx = 7;
      let idIdx = 0;
      let openingTagsIdx = -1;

      const headers = headerLine.split(',').map((h) => h.trim());
      if (headers.includes('fen')) fenIdx = headers.indexOf('fen');
      if (headers.includes('moves')) movesIdx = headers.indexOf('moves');
      if (headers.includes('rating')) ratingIdx = headers.indexOf('rating');
      if (headers.includes('themes')) themesIdx = headers.indexOf('themes');
      if (headers.includes('puzzleid')) idIdx = headers.indexOf('puzzleid');
      if (headers.includes('openingtags')) openingTagsIdx = headers.indexOf('openingtags');

      const parsedList: PuzzleData[] = [];
      const startLine = headers.includes('fen') ? 1 : 0;

      for (let i = startLine; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.split(',').map((c) => c.trim());
        if (cols.length <= Math.max(fenIdx, movesIdx)) continue;

        const pId = cols[idIdx] || `csv-${Date.now()}-${i}`;
        const fenStr = cols[fenIdx];
        const movesStr = cols[movesIdx];
        const ratingNum = parseInt(cols[ratingIdx]) || 1200;
        
        const rawThemes = cols[themesIdx] ? cols[themesIdx].split(/\s+/).filter(Boolean) : ['tactics'];
        if (openingTagsIdx !== -1 && cols[openingTagsIdx]) {
          const tags = cols[openingTagsIdx].split(/\s+/).filter(Boolean);
          rawThemes.push(...tags);
        }
        const themesArr = Array.from(new Set(rawThemes));

        if (!fenStr || !movesStr) continue;

        try {
          const chess = new Chess(fenStr);
          const solutionMoves = movesStr.split(/\s+/).filter(Boolean);
          const playerToMove = chess.turn() === 'w' ? 'white' : 'black';

          let difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' | 'Master' = 'Intermediate';
          if (ratingNum < 1200) difficulty = 'Beginner';
          else if (ratingNum < 1600) difficulty = 'Intermediate';
          else if (ratingNum < 2000) difficulty = 'Advanced';
          else if (ratingNum < 2400) difficulty = 'Expert';
          else difficulty = 'Master';

          const puzzleObj: PuzzleData = {
            id: pId,
            source: 'lichess',
            initialFen: fenStr,
            solution: solutionMoves,
            playerToMove,
            rating: ratingNum,
            difficulty,
            themes: themesArr,
            numberOfMoves: Math.ceil(solutionMoves.length / 2),
            externalUrl: `https://lichess.org/training/${pId}`,
          };

          parsedList.push(puzzleObj);
        } catch (chessErr) {
          console.warn(`Row ${i} FEN validation error:`, chessErr);
        }
      }

      if (parsedList.length === 0) {
        setError('No valid Lichess puzzle rows were found in the provided CSV.');
        setIsProcessing(false);
        return;
      }

      // Merge with existing puzzles (avoid duplicate IDs)
      const existingIds = new Set(importedPuzzles.map((p) => p.id));
      const newOnly = parsedList.filter((p) => !existingIds.has(p.id));
      const combined = [...newOnly, ...importedPuzzles];

      setImportedPuzzles(combined);
      try {
        // Bounded save to avoid browser QuotaExceededError on multi-MB datasets
        const safeCache = combined.slice(0, 2000);
        localStorage.setItem('custom_lichess_puzzles', JSON.stringify(safeCache));
      } catch (e) {
        console.warn('LocalStorage limit reached for offline cache, keeping all in memory:', e);
      }

      setSuccessMsg(`🎉 Successfully imported ${parsedList.length} Lichess Puzzles into catalog!`);
      if (onImportComplete) onImportComplete(combined);
    } catch (err: any) {
      setError(`Failed to parse CSV: ${err.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCsvText(content);
        parseCsvData(content);
      }
    };
    reader.readAsText(file);
  };

  const clearAllPuzzles = () => {
    if (confirm('Are you sure you want to clear all imported custom puzzles?')) {
      setImportedPuzzles([]);
      localStorage.removeItem('custom_lichess_puzzles');
      setSuccessMsg('Cleared custom imported puzzles library.');
    }
  };

  // Filter list by selected theme and rating range
  const filteredList = importedPuzzles.filter((p) => {
    const matchesRating = p.rating >= minRatingFilter && p.rating <= maxRatingFilter;
    if (!matchesRating) return false;
    if (filterTheme === 'ALL') return true;
    return p.themes.some((t) => t.toLowerCase() === filterTheme.toLowerCase());
  });

  const handleBulkSaveToDb = async () => {
    if (filteredList.length === 0) {
      setError('No matching puzzles to save in current filter.');
      return;
    }

    setIsSavingToDb(true);
    setError('');
    setSuccessMsg('');

    const formattedPayload = filteredList.map((p, idx) => ({
      title: `Puzzle #${p.id} (${p.themes[0] || 'tactics'})`,
      fen: p.initialFen,
      solution: p.solution,
      theme: p.themes.join(' '),
      difficulty: (p.difficulty.toLowerCase().replace(/\s+/g, '_') as any) || 'beginner',
      rating: p.rating,
      track: targetTrack,
      chapterId: targetChapter.trim() || undefined,
      source: 'lichess_csv',
      sourceId: p.id,
    }));

    const res = await bulkImportPuzzlesAction(formattedPayload);
    setIsSavingToDb(false);

    if (res.success) {
      setSuccessMsg(`🎉 Successfully saved ${res.insertedCount} puzzles to Track "${targetTrack.toUpperCase()}" -> Chapter "${targetChapter}" in Database & Disk Backup!`);
    } else {
      setError(res.error || 'Failed to save bulk puzzles to database.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Importer Controls Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold font-heading text-white flex items-center gap-2">
              <span>📊 Lichess Puzzle Database CSV Importer</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Upload or paste <code className="text-amber-400 font-mono">lichess_db_puzzle.csv</code> to import puzzles with FEN, moves, ratings & themes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setCsvText(SAMPLE_CSV);
              parseCsvData(SAMPLE_CSV);
            }}
            className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold rounded-xl text-xs border border-amber-500/40 transition-colors"
          >
            ⚡ Load Sample CSV
          </button>
        </div>

        {error && (
          <div className="bg-red-950/60 border border-red-500/40 text-red-300 p-3 rounded-2xl text-xs font-bold">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 p-3 rounded-2xl text-xs font-bold">
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* File Upload Option */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 space-y-2">
            <label className="block text-xs font-bold text-slate-300">
              Option 1: Upload CSV File
            </label>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary file:text-white hover:file:bg-primary-dark cursor-pointer"
            />
            <p className="text-[10px] text-slate-500">
              Supports standard Lichess CSV formats (<code className="text-slate-400">PuzzleId, FEN, Moves, Rating, Themes</code>).
            </p>
          </div>

          {/* Paste CSV Text Option */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 space-y-2">
            <label className="block text-xs font-bold text-slate-300">
              Option 2: Paste Raw CSV Data
            </label>
            <textarea
              rows={3}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="PuzzleId,FEN,Moves,Rating,Themes&#10;00008,r1bqkbnr/pppp1ppp/...,f3f7,800,mateIn1 opening"
              className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2 text-xs font-mono focus:outline-none focus:border-amber-500/60"
            />
            <button
              type="button"
              onClick={() => parseCsvData(csvText)}
              disabled={isProcessing}
              className="w-full py-2 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl text-xs transition-all shadow-md"
            >
              {isProcessing ? 'Processing Puzzles...' : '🚀 Import CSV Puzzles'}
            </button>
          </div>
        </div>
      </div>

      {/* Catalog & Theme Filter View */}
      {importedPuzzles.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl">
          {/* Track & Chapter Assignment Control Panel */}
          <div className="bg-slate-950 border border-amber-500/30 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>🎯 Target Track & Chapter Auto-Assignment</span>
              </h4>
              <span className="text-[11px] font-bold text-slate-400">
                Matching Current Filters: <b className="text-amber-300 font-mono text-xs">{filteredList.length} Puzzles</b>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Target Track</label>
                <select
                  value={targetTrack}
                  onChange={(e) => setTargetTrack(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-white text-xs font-bold rounded-xl p-2.5 focus:outline-none focus:border-amber-400"
                >
                  <option value="pre_beginner">🌱 Pre-Beginner (400-800 ELO)</option>
                  <option value="beginner">☘️ Beginner (800-1200 ELO)</option>
                  <option value="intermediate">🔥 Intermediate (1200-1600 ELO)</option>
                  <option value="advanced">⚡ Advanced (1600-2000 ELO)</option>
                  <option value="master">👑 Master (2000+ ELO)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Target Chapter</label>
                <input
                  type="text"
                  value={targetChapter}
                  onChange={(e) => setTargetChapter(e.target.value)}
                  placeholder="e.g. Chapter 2: Checkmate in 1"
                  className="w-full bg-slate-900 border border-slate-800 text-white text-xs rounded-xl p-2.5 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleBulkSaveToDb}
                  disabled={isSavingToDb || filteredList.length === 0}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-gold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isSavingToDb ? (
                    <>
                      <span className="animate-spin text-sm">⏳</span>
                      <span>Saving to Chapter...</span>
                    </>
                  ) : (
                    <>
                      <span>💾 Save Filtered ({filteredList.length}) to Chapter</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Filter Bar: Min/Max Rating & Theme Tags */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>📚 Catalog Filters ({filteredList.length} / {importedPuzzles.length})</span>
              </h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Rating Range Inputs */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <span className="text-[10px] font-bold text-slate-400 px-1">Rating:</span>
                <input
                  type="number"
                  min={0}
                  max={3500}
                  step={50}
                  value={minRatingFilter}
                  onChange={(e) => setMinRatingFilter(Number(e.target.value))}
                  className="w-16 bg-slate-900 border border-slate-800 rounded-lg p-1 text-center text-xs font-mono font-bold text-amber-300 focus:outline-none"
                  title="Min Rating Filter"
                />
                <span className="text-slate-500 text-xs">-</span>
                <input
                  type="number"
                  min={0}
                  max={3500}
                  step={50}
                  value={maxRatingFilter}
                  onChange={(e) => setMaxRatingFilter(Number(e.target.value))}
                  className="w-16 bg-slate-900 border border-slate-800 rounded-lg p-1 text-center text-xs font-mono font-bold text-amber-300 focus:outline-none"
                  title="Max Rating Filter"
                />
              </div>

              <select
                value={filterTheme}
                onChange={(e) => setFilterTheme(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-amber-300 text-xs font-bold rounded-xl px-3 py-1.5"
              >
                <option value="ALL">All Themes ({importedPuzzles.length})</option>
                <option value="mateIn1">🎯 Mate in 1</option>
                <option value="mateIn2">⚡ Mate in 2</option>
                <option value="mateIn3">👑 Mate in 3</option>
                <option value="fork">🍴 Fork</option>
                <option value="pin">📌 Pin</option>
                <option value="skewer">🗡️ Skewer</option>
                <option value="sacrifice">💥 Sacrifice</option>
                <option value="discoveredAttack">🛡️ Discovered Attack</option>
                <option value="endgame">♟️ Endgame</option>
                <option value="opening">📖 Opening</option>
                <option value="middlegame">⚔️ Middlegame</option>
              </select>
              <button
                type="button"
                onClick={clearAllPuzzles}
                className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 text-red-300 text-xs font-bold rounded-xl border border-red-800/40 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto pr-1">
            {filteredList.map((puzzle) => {
              const isBoardVisible = activeBoardPreviewId === puzzle.id;
              return (
                <div
                  key={puzzle.id}
                  className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 space-y-2.5 relative hover:border-amber-500/40 transition-all"
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-white font-mono">ID: {puzzle.id}</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                      Rating: {puzzle.rating} ({puzzle.difficulty})
                    </span>
                  </div>

                  {/* FEN Position Box */}
                  <div className="text-[10px] font-mono text-amber-300 bg-slate-900 p-2.5 rounded-xl border border-slate-800 select-all overflow-x-auto break-all">
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-sans font-bold mb-0.5">
                      FEN Notation:
                    </span>
                    {puzzle.initialFen}
                  </div>

                  {/* Interactive Mini-Board Preview */}
                  {isBoardVisible && (
                    <div className="w-full aspect-square bg-slate-900 border-2 border-slate-800 rounded-xl overflow-hidden shadow-inner my-2">
                      <ChessboardComponent
                        position={puzzle.initialFen}
                        boardOrientation={puzzle.playerToMove === 'black' ? 'black' : 'white'}
                        arePiecesDraggable={false}
                        customDarkSquareStyle={{ backgroundColor: '#334155' }}
                        customLightSquareStyle={{ backgroundColor: '#94A3B8' }}
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-400">Side: <b className="text-white capitalize">{puzzle.playerToMove}</b></span>
                    <button
                      type="button"
                      onClick={() => setActiveBoardPreviewId(isBoardVisible ? null : puzzle.id)}
                      className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-[10px] font-bold transition-all"
                    >
                      {isBoardVisible ? '🙈 Hide Board' : '♟️ Preview Board'}
                    </button>
                  </div>

                  <div className="text-xs pt-1 border-t border-slate-800/80">
                    <span className="text-slate-400 text-[10px] block font-bold">Solution Moves:</span>
                    <span className="text-emerald-400 font-mono font-bold text-xs">{puzzle.solution.join(' → ')}</span>
                  </div>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {puzzle.themes.map((t, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[9px] font-bold">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
