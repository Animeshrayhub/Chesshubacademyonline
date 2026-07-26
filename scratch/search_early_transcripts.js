const fs = require('fs');
const readline = require('readline');

async function main() {
  const fileStream = fs.createReadStream('C:\\Users\\anime\\.gemini\\antigravity-ide\\brain\\9324f4c2-8ef5-4f46-9456-a042d6cc3037\\.system_generated\\logs\\transcript_full.jsonl');
  
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineCount = 0;
  for await (const line of rl) {
    lineCount++;
    if (lineCount >= 1610 && lineCount <= 1642) {
      console.log(`Line ${lineCount}:`);
      try {
        const obj = JSON.parse(line);
        console.log('Type:', obj.type, 'Source:', obj.source, 'Status:', obj.status);
        if (obj.content) {
          console.log('Content:', obj.content);
        }
      } catch (e) {
        console.log(line);
      }
    }
  }
}

main();
