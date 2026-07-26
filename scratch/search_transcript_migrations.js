const fs = require('fs');
const readline = require('readline');

async function main() {
  const fileStream = fs.createReadStream('C:\\Users\\anime\\.gemini\\antigravity-ide\\brain\\9324f4c2-8ef5-4f46-9456-a042d6cc3037\\.system_generated\\logs\\transcript.jsonl');
  
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.toLowerCase().includes('run_migrations.js')) {
      try {
        const obj = JSON.parse(line);
        if (obj.tool_calls) {
          for (const tc of obj.tool_calls) {
            if (tc.args && tc.args.CommandLine) {
              console.log('CommandLine:', tc.args.CommandLine);
            }
          }
        }
      } catch (err) {}
    }
  }
}

main();
