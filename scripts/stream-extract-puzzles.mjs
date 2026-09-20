/**
 * scripts/stream-extract-puzzles.mjs
 * Streams lichess_db_puzzle.csv directly from Google Drive without storing 1.1GB on disk.
 * Extracts ~20,000 high-quality, curated tactical puzzles across all rating bands and themes.
 *
 * Run: node scripts/stream-extract-puzzles.mjs
 */
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'puzzles');

const FILE_ID = '1GZxLGPTWsqCG3_Sb7oKIiWDhwXp28CWG';
const STREAM_URL = `https://drive.usercontent.google.com/download?id=${FILE_ID}&export=download&confirm=t`;

const MIN_RATING = 500;
const MAX_RATING = 2600;
const MIN_POPULARITY = 70; // High quality threshold
const MIN_NB_PLAYS = 40;
const TARGET_TOTAL = 20000;
const MAX_PER_BAND = 3200;

const RATING_BANDS = [
  { min: 500,  max: 900,  label: '800',  name: 'Beginner' },
  { min: 900,  max: 1100, label: '1000', name: 'Easy' },
  { min: 1100, max: 1300, label: '1200', name: 'Intermediate' },
  { min: 1300, max: 1500, label: '1400', name: 'Medium' },
  { min: 1500, max: 1800, label: '1600', name: 'Hard' },
  { min: 1800, max: 2100, label: '1900', name: 'Expert' },
  { min: 2100, max: 2600, label: '2200', name: 'Master' },
];

const TOP_THEMES = [
  'mate', 'mateIn1', 'mateIn2', 'mateIn3', 'fork', 'pin', 'skewer',
  'discoveredAttack', 'sacrifice', 'deflection', 'attraction',
  'endgame', 'opening', 'middlegame', 'hangingPiece', 'backRankMate',
  'queenEndgame', 'rookEndgame', 'pawnEndgame', 'advantage', 'crushing',
  'equality', 'long', 'short',
];

function ensureDir(d) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

function difficulty(r) {
  if (r < 900)  return 'Beginner';
  if (r < 1100) return 'Easy';
  if (r < 1300) return 'Intermediate';
  if (r < 1500) return 'Medium';
  if (r < 1800) return 'Hard';
  if (r < 2100) return 'Expert';
  return 'Master';
}

function compact(p) {
  return {
    id: p.id,
    fen: p.fen,
    moves: p.moves,
    rating: p.rating,
    themes: p.themes,
    difficulty: difficulty(p.rating),
    gameUrl: p.gameUrl,
  };
}

function parseLine(line) {
  const p = line.split(',');
  if (p.length < 9) return null;
  const rating = parseInt(p[3], 10);
  const popularity = parseInt(p[5], 10);
  const nbPlays = parseInt(p[6], 10);
  if (isNaN(rating) || isNaN(popularity) || isNaN(nbPlays)) return null;

  return {
    id: p[0],
    fen: p[1],
    moves: p[2],
    rating,
    popularity,
    nbPlays,
    themes: p[7] ? p[7].split(' ').filter(Boolean) : [],
    gameUrl: p[8] || '',
  };
}

async function main() {
  console.log('====================================================');
  console.log('ChessHub Academy: Lichess Puzzle Stream Extractor');
  console.log('Connecting to Google Drive streaming endpoint...');
  console.log('====================================================');

  ensureDir(OUT_DIR);
  ensureDir(path.join(OUT_DIR, 'by-rating'));
  ensureDir(path.join(OUT_DIR, 'by-theme'));

  // Preserve custom_puzzles.json if present
  let customPuzzles = [];
  const customPuzzlesPath = path.join(OUT_DIR, 'custom_puzzles.json');
  if (existsSync(customPuzzlesPath)) {
    try {
      const raw = readFileSync(customPuzzlesPath, 'utf8');
      customPuzzles = JSON.parse(raw);
    } catch {}
  }

  const controller = new AbortController();
  const res = await fetch(STREAM_URL, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    signal: controller.signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(`Failed to stream from Google Drive: ${res.statusText}`);
  }

  console.log(`Stream connected successfully! (Status: ${res.status})`);
  console.log('Streaming and filtering tactical puzzles on the fly...\n');

  const selected = [];
  const bandCounts = Object.fromEntries(RATING_BANDS.map((b) => [b.label, 0]));
  let totalRows = 0;
  let isHeader = true;

  // Convert web ReadableStream to Node.js Readable
  const nodeStream = Readable.fromWeb(res.body);
  nodeStream.on('error', (err) => {
    if (err.name === 'AbortError' || err.code === 'ABORT_ERR') return;
  });

  const rl = readline.createInterface({
    input: nodeStream,
    crlfDelay: Infinity,
  });
  rl.on('error', (err) => {
    if (err.name === 'AbortError' || err.code === 'ABORT_ERR') return;
  });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (isHeader) {
      isHeader = false;
      if (trimmed.startsWith('PuzzleId')) continue;
    }

    totalRows++;

    const p = parseLine(trimmed);
    if (!p) continue;

    if (p.rating < MIN_RATING || p.rating > MAX_RATING) continue;
    if (p.popularity < MIN_POPULARITY) continue;
    if (p.nbPlays < MIN_NB_PLAYS) continue;

    // Determine band
    const band = RATING_BANDS.find((b) => p.rating >= b.min && p.rating < b.max);
    if (!band) continue;

    if (bandCounts[band.label] >= MAX_PER_BAND) continue;

    selected.push(p);
    bandCounts[band.label]++;

    if (totalRows % 200000 === 0) {
      console.log(
        `  Processed: ${(totalRows / 1e6).toFixed(2)}M rows | Curated: ${selected.length.toLocaleString()} puzzles`
      );
    }

    if (selected.length >= TARGET_TOTAL) {
      console.log(`\n🎉 Target quota of ${TARGET_TOTAL.toLocaleString()} puzzles reached!`);
      controller.abort(); // Gracefully terminate the stream
      break;
    }
  }

  console.log('\n====================================================');
  console.log(`Total rows processed: ${totalRows.toLocaleString()}`);
  console.log(`Accepted high-quality puzzles: ${selected.length.toLocaleString()}`);
  console.log('====================================================');

  if (selected.length === 0) {
    throw new Error('No puzzles were accepted.');
  }

  // Shuffle puzzles for variety
  for (let i = selected.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selected[i], selected[j]] = [selected[j], selected[i]];
  }

  const compacted = selected.map(compact);

  // 1. Write all.json
  writeFileSync(path.join(OUT_DIR, 'all.json'), JSON.stringify(compacted));
  console.log(`\n✓ Generated public/puzzles/all.json (${compacted.length} puzzles)`);

  // 2. Write by-rating
  for (const band of RATING_BANDS) {
    const bp = selected
      .filter((p) => p.rating >= band.min && p.rating < band.max)
      .map(compact);
    writeFileSync(
      path.join(OUT_DIR, 'by-rating', `${band.label}.json`),
      JSON.stringify(bp)
    );
    console.log(`  ✓ by-rating/${band.label}.json: ${bp.length} (${band.name})`);
  }

  // 3. Write by-theme
  for (const theme of TOP_THEMES) {
    const tp = selected
      .filter((p) => p.themes.includes(theme))
      .slice(0, 2500)
      .map(compact);
    if (tp.length > 0) {
      writeFileSync(
        path.join(OUT_DIR, 'by-theme', `${theme}.json`),
        JSON.stringify(tp)
      );
      console.log(`  ✓ by-theme/${theme}.json: ${tp.length} puzzles`);
    }
  }

  // 4. Restore custom_puzzles.json if needed
  if (customPuzzles && Array.isArray(customPuzzles) && customPuzzles.length > 0) {
    writeFileSync(customPuzzlesPath, JSON.stringify(customPuzzles, null, 2));
    console.log(`  ✓ custom_puzzles.json: ${customPuzzles.length} custom puzzles retained`);
  }

  // 5. Write index.json
  const indexData = {
    generated: new Date().toISOString(),
    totalPuzzles: selected.length,
    source: 'Lichess Open Database (CC0)',
    sourceUrl: 'https://database.lichess.org/#puzzles',
    filters: {
      minRating: MIN_RATING,
      maxRating: MAX_RATING,
      minPopularity: MIN_POPULARITY,
      minNbPlays: MIN_NB_PLAYS,
    },
    byRating: Object.fromEntries(
      RATING_BANDS.map((b) => [
        b.label,
        {
          name: b.name,
          count: selected.filter((p) => p.rating >= b.min && p.rating < b.max).length,
        },
      ])
    ),
    byTheme: Object.fromEntries(
      TOP_THEMES.map((t) => [
        t,
        selected.filter((p) => p.themes.includes(t)).length,
      ])
    ),
  };

  writeFileSync(
    path.join(OUT_DIR, 'index.json'),
    JSON.stringify(indexData, null, 2)
  );
  console.log(`✓ Generated public/puzzles/index.json`);

  console.log('\n====================================================');
  console.log('ALL PUZZLE CATALOGS SUCCESSFULLY UPDATED!');
  console.log('====================================================');
}

main().catch((err) => {
  if (err.name === 'AbortError' || err.message?.includes('aborted')) {
    console.log('Stream closed cleanly after reaching quota.');
  } else {
    console.error('Fatal extraction error:', err);
    process.exit(1);
  }
});
