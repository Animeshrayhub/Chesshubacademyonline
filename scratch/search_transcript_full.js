const fs = require('fs');
const readline = require('readline');

async function main() {
  const fileStream = fs.createReadStream('C:\\Users\\anime\\.gemini\\antigravity-ide\\brain\\9324f4c2-8ef5-4f46-9456-a042d6cc3037\\.system_generated\\logs\\transcript_full.jsonl');
  
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.includes('run_migrations') && (line.includes('success') || line.includes('Applied') || line.includes('completed'))) {
      console.log('Match:', line.substring(0, 1000));
    }
  }
}

main();
