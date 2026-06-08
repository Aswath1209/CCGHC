const fs = require('fs');

let bot = fs.readFileSync('bot.js', 'utf8');

// 1. Load generated matched scenes
const matchedScenes = fs.readFileSync('scratch/generated_matched_scenes.js', 'utf8');

// Replace COMMENTARY & CCL_GIFS block
const startIdx = bot.indexOf('const GIF_EVENTS = ["0", "4", "6", "out", "50", "100"];');
const endMarker = "process.on('unhandledRejection'";
const endIdx = bot.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
    console.error("Could not find start or end markers for commentary replacement");
    process.exit(1);
}

const replacement = `const GIF_EVENTS = ["0", "4", "6", "out", "50", "100"];\nconst CCL_GIFS = {};\nconst COMMENTARY = {};\n\n${matchedScenes}\n\n`;
bot = bot.slice(0, startIdx) + replacement + bot.slice(endIdx);

// 2. Update setMyCommands list
const oldCommands = `bot.api.setMyCommands([
    { command: 'start', description: 'Welcome message' },
    { command: 'register', description: 'Create account & get coins' },
    { command: 'ccl', description: 'Start a 1v1 CCL match' },
    { command: 'tour', description: 'Start a multiplayer Tour match' },
    { command: 'teams', description: 'Show team rosters' },
    { command: 'score', description: 'Show full match scorecard' },
    { command: 'batting', description: '/batting [index] [S/NS]' },
    { command: 'bowling', description: '/bowling [index]' },
    { command: 'remove_player', description: 'Remove player from match' },
    { command: 'adda', description: 'Add player to Team A' },
    { command: 'addb', description: 'Add player to Team B' },
    { command: 'teamname', description: 'Rename your team' },
    { command: 'endtour', description: 'Forcibly end Tour match' },
    { command: 'tourhelp', description: 'Show Tour guide' },
    { command: 'profile', description: 'View your stats' },
    { command: 'help', description: 'Commands list' }
  ])`;

const newCommands = `bot.api.setMyCommands([
    { command: 'start', description: 'Welcome message' },
    { command: 'register', description: 'Create account & get coins' },
    { command: 'ccl', description: 'Start a 1v1 CCL match' },
    { command: 'tour', description: 'Start a multiplayer Tour match' },
    { command: 'teams', description: 'Show team rosters' },
    { command: 'score', description: 'Show full match scorecard' },
    { command: 'batting', description: '/batting [index] [S/NS]' },
    { command: 'bowling', description: '/bowling [index]' },
    { command: 'remove_player', description: 'Remove player from match' },
    { command: 'adda', description: 'Add player to Team A' },
    { command: 'addb', description: 'Add player to Team B' },
    { command: 'teamname', description: 'Rename your team' },
    { command: 'set_overs', description: 'Set max overs for Tour match' },
    { command: 'set_wickets', description: 'Set max wickets for Tour match' },
    { command: 'powersurge', description: 'Toggle Power Surge (Tour mode)' },
    { command: 'endtour', description: 'Forcibly end Tour match' },
    { command: 'tourhelp', description: 'Show Tour guide' },
    { command: 'profile', description: 'View your stats' },
    { command: 'help', description: 'Commands list' }
  ])`;

const commandsStartIdx = bot.indexOf('bot.api.setMyCommands');
const commandsEndIdx = bot.indexOf('])', commandsStartIdx) + 2;
if (commandsStartIdx !== -1 && commandsEndIdx !== -1) {
    bot = bot.slice(0, commandsStartIdx) + newCommands + bot.slice(commandsEndIdx);
} else {
    console.error("Could not find setMyCommands block");
    process.exit(1);
}

// 3. Update sendEventUpdate function
const oldSendEventUpdate = `async function sendEventUpdate(ctx, chatId, eventKey) {
  const commentaryList = COMMENTARY[eventKey] || [];
  const text = commentaryList.length > 0 ? commentaryList[Math.floor(Math.random() * commentaryList.length)] : "";

  if (GIF_EVENTS.includes(eventKey)) {
      const gifList = CCL_GIFS[eventKey] || [];
      const gifUrl = gifList.length > 0 ? gifList[Math.floor(Math.random() * gifList.length)] : null;
      if (gifUrl) {
          try {
              await ctx.api.sendAnimation(chatId, gifUrl, { caption: text });
              return;
          } catch(e) {
              console.log("GIF send failed", e.message);
          }
      }
  }
  if (text) await ctx.api.sendMessage(chatId, text);
}`;

const newSendEventUpdate = `async function sendEventUpdate(ctx, chatId, eventKey, batsmanName = "Batsman", bowlerName = "Bowler") {
  const scenes = MATCHED_SCENES[eventKey] || [];
  if (scenes.length === 0) return;

  const scene = scenes[Math.floor(Math.random() * scenes.length)];
  let text = (scene.commentaries && scene.commentaries.length > 0)
      ? scene.commentaries[Math.floor(Math.random() * scene.commentaries.length)]
      : "";

  text = text.replace(/{batsman}/g, batsmanName).replace(/{bowler}/g, bowlerName);

  if (scene.gif) {
      try {
          await ctx.api.sendAnimation(chatId, scene.gif, { caption: text });
          return;
      } catch(e) {
          console.log("GIF send failed", e.message);
      }
  }
  if (text) await ctx.api.sendMessage(chatId, text);
}`;

const sendEventIdx = bot.indexOf('async function sendEventUpdate');
const sendEventEndIdx = bot.indexOf('if (text) await ctx.api.sendMessage(chatId, text);\n}', sendEventIdx) + 52;
if (sendEventIdx !== -1 && sendEventEndIdx !== -1) {
    bot = bot.slice(0, sendEventIdx) + newSendEventUpdate + bot.slice(sendEventEndIdx);
} else {
    console.error("Could not find sendEventUpdate function");
    process.exit(1);
}

// 4. Update sendEventUpdate calls in handleRoundResult
bot = bot.replace('await sendEventUpdate(ctx, chatId, "out");', 'await sendEventUpdate(ctx, chatId, "out", cleanBatsman, cleanBowler);');
bot = bot.replace('await sendEventUpdate(ctx, chatId, batStr);', 'await sendEventUpdate(ctx, chatId, batStr, cleanBatsman, cleanBowler);');
bot = bot.replace('await sendEventUpdate(ctx, chatId, "50");', 'await sendEventUpdate(ctx, chatId, "50", cleanBatsman, cleanBowler);');
bot = bot.replace('await sendEventUpdate(ctx, chatId, "100");', 'await sendEventUpdate(ctx, chatId, "100", cleanBatsman, cleanBowler);');

// 5. Update start command DM prompts (shots selection / bowler delivery)
const oldStartBat = `if (isStriker) {
              return ctx.reply("🏏 You are Batting! Send your shot number as text (0, 1, 2, 3, 4, 6).");
          } else if (isBowler) {
              return ctx.reply("⚾ You are Bowling! Send your delivery as text (RS, Bouncer, Yorker, Short, Slower, Knuckle).");
          }`;

const newStartBat = `if (isStriker) {
              return ctx.reply(tour.powerSurge 
                  ? "🏏 You are Batting! Send your shot number as text (0, 1, 2, 3, 4, 5, 6)."
                  : "🏏 You are Batting! Send your shot number as text (0, 1, 2, 3, 4, 6).");
          } else if (isBowler) {
              return ctx.reply(tour.powerSurge
                  ? "⚾ You are Bowling! Send your delivery as text (RS, Bouncer, Yorker, Short, Slower, Leg Cutter, Knuckle)."
                  : "⚾ You are Bowling! Send your delivery as text (RS, Bouncer, Yorker, Short, Slower, Knuckle).");
          }`;

const startBatIdx = bot.indexOf('if (isStriker) {');
if (startBatIdx !== -1) {
    bot = bot.replace(oldStartBat, newStartBat);
} else {
    console.error("Could not find start command prompts in bot.js");
    process.exit(1);
}

fs.writeFileSync('bot.js', bot);
console.log("bot.js successfully updated!");
