const fs = require('fs');
const readline = require('readline');

async function main() {
  const fileStream = fs.createReadStream('C:\\Users\\anime\\.gemini\\antigravity-ide\\brain\\9324f4c2-8ef5-4f46-9456-a042d6cc3037\\.system_generated\\logs\\transcript_full.jsonl');
  
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineCount = 0;
  let matches = [];
  
  for await (const line of rl) {
    lineCount++;
    if (line.toLowerCase().includes('run_migrations.js')) {
      matches.push({ lineNum: lineCount, text: line });
    }
  }
  
  console.log(`Found ${matches.length} matches:`);
  for (const m of matches) {
    console.log(`Line ${m.lineNum}:`);
    const parsed = JSON.parse(m.text);
    console.log('  Type:', parsed.type);
    console.log('  Source:', parsed.source);
    if (parsed.tool_calls) {
      console.log('  Tool Calls:', JSON.stringify(parsed.tool_calls, null, 2));
    }
    if (parsed.content) {
      console.log('  Content length:', parsed.content.length);
      if (parsed.content.length < 500) {
        console.log('  Content:', parsed.content);
      } else {
        console.log('  Content snippet:', parsed.content.substring(0, 500));
      }
    }
  }
}

main();
