const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

function loadEnvFile(path) {
  try {
    if (!fs.existsSync(path)) return;
    const content = fs.readFileSync(path, 'utf8');
    const lines = content.split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
      if (match) {
        const key = match[1].trim();
        let val = match[2].trim();
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        }
        process.env[key] = val;
      }
    }
  } catch (err) {
    console.error('Error loading env file:', path, err);
  }
}

async function main() {
  loadEnvFile('.env');
  loadEnvFile('.env.local');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(url, key);

  // 1. Get a workbook ID
  const { data: wbs, error: wbErr } = await supabase
    .from('homework_workbooks')
    .select('id, title')
    .limit(1);

  if (wbErr || wbs.length === 0) {
    console.error('Could not fetch workbook:', wbErr || 'No workbooks found');
    return;
  }
  const wb = wbs[0];
  console.log(`Using workbook: "${wb.title}" (ID: ${wb.id})`);

  // 2. Perform test insert simulating createChapter
  const testPayload = {
    workbook_id: wb.id,
    chapter_number: 999, // use high number to avoid unique constraint conflict
    title: 'mate in 1',
    description: 'Test description',
    pgn_data: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    pdf_storage_path: 'chapters/test.pdf',
    module_id: null,
    video_url: 'https://drive.google.com/file/d/.../preview',
    pdf_page_range: '60-100',
    notes: 'Key patterns...',
    unlock_type: 'coach_approval',
    unlock_score: 80,
    puzzle_images: [],
    questions: []
  };

  console.log('Inserting test chapter...');
  const { data: inserted, error: insertErr } = await supabase
    .from('homework_chapters')
    .insert(testPayload)
    .select();

  if (insertErr) {
    console.error('Insert failed! Error details:', insertErr);
  } else {
    console.log('Insert succeeded! Row data:', inserted);
    
    // Clean up test insert
    await supabase.from('homework_chapters').delete().eq('id', inserted[0].id);
    console.log('Cleaned up test row.');
  }
}

main();
