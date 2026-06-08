const fs = require('fs');

const logPath = '/home/home/.gemini/antigravity/brain/091dd317-4916-449f-96f3-b7d2bf45d588/.system_generated/logs/overview.txt';
const content = fs.readFileSync(logPath, 'utf8');
const lines = content.split('\n');

const line51 = lines[50]; // Line 51 (1-indexed) is index 50
const parsed51 = JSON.parse(line51);
const toolCall51 = parsed51.tool_calls[0];
console.log('Type of ReplacementContent:', typeof toolCall51.args.ReplacementContent);
console.log('Starts with:', toolCall51.args.ReplacementContent.slice(0, 100));
console.log('Ends with:', toolCall51.args.ReplacementContent.slice(-100));
console.log('Length:', toolCall51.args.ReplacementContent.length);

const line53 = lines[52]; // Line 53 (1-indexed) is index 52
const parsed53 = JSON.parse(line53);
const toolCall53 = parsed53.tool_calls[0];
console.log('Line 53 Starts with:', toolCall53.args.ReplacementContent.slice(0, 100));
console.log('Line 53 Length:', toolCall53.args.ReplacementContent.length);
