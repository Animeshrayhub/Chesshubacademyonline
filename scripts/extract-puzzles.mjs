/**
 * scripts/extract-puzzles.mjs
 * Processes lichess_db_puzzle.csv.zst in streaming chunks to avoid RAM limits.
 * Run: node scripts/extract-puzzles.mjs
 */
import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const INPUT_FILE = path.join(ROOT, 'lichess_db_puzzle.csv.zst');
const OUT_DIR    = path.join(ROOT, 'public', 'puzzles');

const MIN_RATING     = 600;
const MAX_RATING     = 2500;
const MIN_POPULARITY = 40;
const MIN_NB_PLAYS   = 30;
const MAX_TOTAL      = 15000;

const RATING_BANDS = [
  { min: 600,  max: 900,  label: '800',  name: 'Beginner' },
  { min: 900,  max: 1100, label: '1000', name: 'Easy' },
  { min: 1100, max: 1300, label: '1200', name: 'Intermediate' },
  { min: 1300, max: 1500, label: '1400', name: 'Medium' },
  { min: 1500, max: 1800, label: '1600', name: 'Hard' },
  { min: 1800, max: 2100, label: '1900', name: 'Expert' },
  { min: 2100, max: 2500, label: '2200', name: 'Master' },
];
const TOP_THEMES = [
  'mate','mateIn1','mateIn2','mateIn3','fork','pin','skewer',
  'discoveredAttack','sacrifice','deflection','attraction',
  'endgame','opening','middlegame','hangingPiece','backRankMate',
  'queenEndgame','rookEndgame','pawnEndgame','advantage','crushing',
  'equality','long','short',
];

function ensureDir(d) { if (!existsSync(d)) mkdirSync(d, { recursive: true }); }

function parseLine(line) {
  const p = line.split(',');
  if (p.length < 9) return null;
  const rating = parseInt(p[3], 10), popularity = parseInt(p[5], 10), nbPlays = parseInt(p[6], 10);
  if (isNaN(rating)||isNaN(popularity)||isNaN(nbPlays)) return null;
  return { id:p[0], fen:p[1], moves:p[2], rating, popularity, nbPlays,
           themes: p[7]?p[7].split(' '):[], gameUrl: p[8]||'' };
}

function difficulty(r) {
  if (r<900)  return 'Beginner';
  if (r<1100) return 'Easy';
  if (r<1300) return 'Intermediate';
  if (r<1500) return 'Medium';
  if (r<1800) return 'Hard';
  if (r<2100) return 'Expert';
  return 'Master';
}

function compact(p) {
  return { id:p.id, fen:p.fen, moves:p.moves, rating:p.rating,
           themes:p.themes, difficulty:difficulty(p.rating), gameUrl:p.gameUrl };
}

async function main() {
  if (!existsSync(INPUT_FILE)) { console.error('Not found: '+INPUT_FILE); process.exit(1); }
  console.log('Lichess Puzzle Extractor (streaming mode)');

  ensureDir(OUT_DIR);
  ensureDir(path.join(OUT_DIR,'by-rating'));
  ensureDir(path.join(OUT_DIR,'by-theme'));

  const mod = await import('@mongodb-js/zstd');
  const decompress = mod.decompress ?? mod.default?.decompress;
  if (!decompress) { console.error('decompress not found'); process.exit(1); }

  const selected = [];
  let totalRead = 0;
  let isHeader = true;
  let leftover = Buffer.alloc(0);

  console.log('Streaming and decompressing...');

  await new Promise((resolve, reject) => {
    const CHUNK_SIZE = 4 * 1024 * 1024; // 4 MB read chunks
    const readStream = createReadStream(INPUT_FILE, { highWaterMark: CHUNK_SIZE });
    let compressedChunks = [];

    readStream.on('data', c => compressedChunks.push(c));
    readStream.on('error', reject);
    readStream.on('end', async () => {
      try {
        // Decompress the whole file (needed for zstd frame format)
        const compressed = Buffer.concat(compressedChunks);
        compressedChunks = null; // free memory
        console.log('Compressed: ' + (compressed.length/1024/1024).toFixed(1)+' MB');
        console.log('Decompressing (this may take 30-60 seconds)...');

        // Decompress in one call but process output in 64KB text chunks to avoid string limit
        const decompressed = await decompress(compressed);
        console.log('Decompressed buffer: ' + (decompressed.length/1024/1024).toFixed(1)+' MB');

        // Process buffer in 32MB text slices
        const SLICE = 32 * 1024 * 1024;
        let pos = 0;
        let carry = '';

        while (pos < decompressed.length) {
          const end = Math.min(pos + SLICE, decompressed.length);
          // Decode this slice
          const slice = decompressed.slice(pos, end).toString('utf8');
          pos = end;

          const text = carry + slice;
          const lines = text.split('\n');
          carry = lines.pop(); // keep partial last line

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            if (isHeader) { isHeader = false; if (trimmed.startsWith('PuzzleId')) continue; }
            totalRead++;
            if (totalRead % 1000000 === 0) console.log('  ...'+((totalRead/1e6).toFixed(1))+'M rows, accepted '+selected.length);
            if (selected.length >= MAX_TOTAL) continue;
            const p = parseLine(trimmed);
            if (!p) continue;
            if (p.rating < MIN_RATING || p.rating > MAX_RATING) continue;
            if (p.popularity < MIN_POPULARITY) continue;
            if (p.nbPlays < MIN_NB_PLAYS) continue;
            selected.push(p);
          }
        }

        // Handle last carry
        if (carry.trim() && !isHeader) {
          const p = parseLine(carry.trim());
          if (p && p.rating>=MIN_RATING && p.rating<=MAX_RATING && p.popularity>=MIN_POPULARITY && p.nbPlays>=MIN_NB_PLAYS && selected.length<MAX_TOTAL) selected.push(p);
        }

        resolve();
      } catch(e) { reject(e); }
    });
  });

  console.log('Total rows read: '+totalRead.toLocaleString());
  console.log('Accepted: '+selected.length.toLocaleString());
  if (selected.length === 0) { console.error('No puzzles accepted.'); process.exit(1); }

  // Shuffle
  for (let i=selected.length-1;i>0;i--) {
    const j=Math.floor(Math.random()*(i+1));
    [selected[i],selected[j]]=[selected[j],selected[i]];
  }

  writeFileSync(path.join(OUT_DIR,'all.json'), JSON.stringify(selected.map(compact)));
  console.log('all.json: '+selected.length+' puzzles');

  for (const band of RATING_BANDS) {
    const bp=selected.filter(p=>p.rating>=band.min&&p.rating<band.max).map(compact);
    writeFileSync(path.join(OUT_DIR,'by-rating',band.label+'.json'),JSON.stringify(bp));
    console.log('  by-rating/'+band.label+'.json: '+bp.length+' ('+band.name+')');
  }

  for (const theme of TOP_THEMES) {
    const tp=selected.filter(p=>p.themes.includes(theme)).slice(0,2000).map(compact);
    if (tp.length>0) {
      writeFileSync(path.join(OUT_DIR,'by-theme',theme+'.json'),JSON.stringify(tp));
      console.log('  by-theme/'+theme+'.json: '+tp.length);
    }
  }

  writeFileSync(path.join(OUT_DIR,'index.json'), JSON.stringify({
    generated:new Date().toISOString(), totalPuzzles:selected.length,
    source:'Lichess Open Database (CC0)', sourceUrl:'https://database.lichess.org/#puzzles',
    filters:{minRating:MIN_RATING,maxRating:MAX_RATING,minPopularity:MIN_POPULARITY,minNbPlays:MIN_NB_PLAYS},
    byRating:Object.fromEntries(RATING_BANDS.map(b=>[b.label,{name:b.name,count:selected.filter(p=>p.rating>=b.min&&p.rating<b.max).length}])),
    byTheme:Object.fromEntries(TOP_THEMES.map(t=>[t,selected.filter(p=>p.themes.includes(t)).length])),
  },null,2));

  console.log('\nDONE! Puzzle files ready in public/puzzles/');
}

main().catch(e=>{ console.error('FATAL:',e); process.exit(1); });
