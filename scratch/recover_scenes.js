const fs = require('fs');

const logPath = '/home/home/.gemini/antigravity/brain/091dd317-4916-449f-96f3-b7d2bf45d588/.system_generated/logs/overview.txt';
const content = fs.readFileSync(logPath, 'utf8');
const lines = content.split('\n');

// Line 53 is 1-indexed, so index 52
const line53 = lines[52];
const parsed = JSON.parse(line53);
const toolCall = parsed.tool_calls[0];
const replacementContent = toolCall.args.ReplacementContent;

fs.writeFileSync('/home/home/ReactNative/Telegram/cricket-bot/scratch/recovered_matched_scenes.js', replacementContent);
console.log('Successfully recovered matched scenes!');
