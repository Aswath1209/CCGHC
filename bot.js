require('dotenv').config();
const { Bot, session, InlineKeyboard } = require('grammy');
const gameManager = require('./game/gameManager');
const tourManager = require('./game/tourManager');
const sb = require('./db/supabase');
const tourBotUI = require('./game/tourBotUI');

const sleep = ms => new Promise(r => setTimeout(r, ms));

const GIF_EVENTS = ["0", "4", "6", "out", "50", "100"];
const CCL_GIFS = {
    "0": [
        "https://media4.giphy.com/media/v1.Y2lkPTZjMDliOTUybHM4N29ib3ZkY3JxNDhjbXlkeDAycnFtYWYyM3QxajF2eXltZ2Z4ayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/QtipHdYxYopX3W6vMs/giphy.gif"
    ],
    "4": [
        "https://media0.giphy.com/media/3o7btXfjIjTcU64YdG/giphy.gif"
    ],
    "6": [
        "https://media3.giphy.com/media/v1.Y2lkPTZjMDliOTUya3R1eHhuaW85Mno1OTlycmJ2OXFibnA5NW5qc3Vid3djbXZkMjZ0NyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oKIPoelgPeRrfqKlO/giphy.gif"
    ],
    "out": [
        "https://media3.giphy.com/media/Wq3WRGe9N5HkSqjITT/giphy.gif"
    ],
    "50": [
        "https://media0.giphy.com/media/v1.Y2lkPTZjMDliOTUyYm5ueGVod2Z0MHcxNTF1dWVvY2EzOXo5bGxhcXdxMWFsOWl5Z3d6YyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/LRsCOm65R3NHVwqiml/giphy.gif"
    ],
    "100": [
        "https://media3.giphy.com/media/v1.Y2lkPTZjMDliOTUya3EyMXE1dzY1dXE0Y3cwMDVzb2p6c3QxbTZ0MTR6aWdvY242ZnRzdyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l1ugo9PYts0eHIRDG/giphy.gif"
    ]
};

const COMMENTARY = {
    "0": ["😶 Dot ball! Pressure builds...", "🎯 Tight delivery, no run.", "🛑 No run, good fielding!"],
    "1": ["🏃 Quick single taken.", "👟 Running hard for one.", "⚡ One run added."],
    "2": ["🏃‍♂️ Two runs!", "💨 Good running between wickets.", "🔥 Two runs scored."],
    "3": ["🏃‍♂️ Three runs! Great running!", "💨 Three runs added.", "🔥 Three runs scored."],
    "4": ["🔥 Cracking four! What a shot!", "💥 The ball races to the boundary!", "🏏 Beautiful timing for four runs!"],
    "6": ["🚀 Massive six! Into the stands!", "🎉 What a smash! Six runs!", "🔥 Smoked it for a sixer! 🔥"],
    "out": ["💥 Bowled him! What a delivery!", "😢 Caught out! End of the innings!", "🚫 Out! The crowd goes silent..."],
    "50": ["🎉 Half-century! What a milestone!", "🏆 50 runs scored! Keep it up!", "🔥 Fifty up! Player is on fire!"],
    "100": ["🏅 CENTURY! What a magnificent innings!", "🎊 100 runs! A true champion!", "🔥 Century scored! The crowd erupts!"]
};

process.on('unhandledRejection', (reason) => console.error("Unhandled Rejection:", reason));
process.on('uncaughtException', (error) => console.error("Uncaught Exception:", error));

const bot = new Bot(process.env.BOT_TOKEN);
bot.use(session({ initial: () => ({}) }));

tourBotUI(bot, sleep, sendEventUpdate);

bot.api.setMyCommands([
  { command: 'start', description: 'Welcome message' },
  { command: 'register', description: 'Create account & get coins' },
  { command: 'ccl', description: 'Start a 1v1 CCL match' },
  { command: 'tour', description: 'Start a Team Tour match (group only)' },
  { command: 'tourconfig', description: 'Configure tour: /tourconfig overs 5' },
  { command: 'profile', description: 'View your stats' },
  { command: 'daily', description: 'Claim daily reward' },
  { command: 'leaderboard', description: 'Top players' },
  { command: 'endmatch', description: 'End active match (Admin only)' },
  { command: 'help', description: 'Commands list' }
]).catch(console.error);

bot.command('start', async (ctx) => {
  await ctx.reply("🏏 Welcome to HandCricket!\nUse /register to get 4000🪙 coins.");
});

bot.command('register', async (ctx) => {
  const result = await sb.registerUser(ctx.from.id, ctx.from.first_name);
  if (result.success) {
    await ctx.reply(`Registered! 4000🪙 added to your account.`);
  } else {
    await ctx.reply(`⚠️ ${result.error}`);
  }
});

bot.command('profile', async (ctx) => {
  try {
      const user = await sb.getUser(ctx.from.id);
      if (!user) return ctx.reply("⚠️ You need to register first! Send /register");
      
      await ctx.reply(
        `👤 <b>${user.first_name}'s Profile</b>\n\n` +
        `🆔 ID: <code>${user.user_id}</code>\n` +
        `💰 Purse: ${user.coins}🪙\n\n` +
        `📊 <b>Performance:</b>\n` +
        `✅ Wins: ${user.wins || 0}\n` +
        `❌ Losses: ${user.losses || 0}\n` +
        `📈 Matches Played: ${(user.wins || 0) + (user.losses || 0)}`,
        { parse_mode: 'HTML' }
      );
  } catch (e) {
      console.error(e);
      await ctx.reply("⚠️ Error loading profile");
  }
});

bot.command('leaderboard', async (ctx) => {
  try {
      const text = "📊 <b>Leaderboards</b>\nSelect which to view:";
      const kb = new InlineKeyboard().text("💰 Coins", "lb_coins").text("🏆 Wins", "lb_wins");
      await ctx.reply(text, { reply_markup: kb, parse_mode: 'HTML' });
  } catch (e) {
      console.error(e);
      await ctx.reply("⚠️ Config error in leaderboard menu");
  }
});

bot.command('help', async (ctx) => {
  await ctx.reply(
    "📜 <b>CCG HandCricket Commands:</b>\n\n" +
    "🏏 /start - Welcome message\n" +
    "💰 /register - Get 4000 coins\n" +
    "🎮 /ccl - Start a 1v1 match\n" +
    "🏆 /tour - Start a Team Tour match (Multiplayer)\n" +
    "⚙️ /tourconfig - Configure Tour Match\n" +
    "👤 /profile - Your stats\n" +
    "🔄 /daily - Claim 2000 coins\n" +
    "🏆 /leaderboard - Top players\n\n" +
    "<i>Admin Commands:</i>\n" +
    "➕ /add [id] [amount] - Give coins",
    { parse_mode: 'HTML' }
  );
});

bot.command('ccl', async (ctx) => {
  if (ctx.chat.type === 'private') {
      return ctx.reply("CCL matches can only be started in groups.");
  }
  
  const user = await sb.getUser(ctx.from.id);
  if (!user) return ctx.reply(`You must /register first.`);

  const args = ctx.message.text.split(' ');
  let bet = 0;
  if (args[1]) {
    bet = parseInt(args[1]);
    if (isNaN(bet) || bet < 0) return ctx.reply("Bet amount cannot be negative.");
    if (user.coins < bet) return ctx.reply(`You don't have enough coins to bet ${bet}🪙.`);
  }

  const res = gameManager.createGame(ctx.chat.id, null, { id: ctx.from.id, first_name: ctx.from.first_name }, bet);
  if (!res.success) return ctx.reply("❌ " + res.error);
  const game = res.game;
  
  const keyboard = new InlineKeyboard()
      .text("Join ✅", `ccl_join_${game.id}`).row()
      .text("Cancel ❌", `ccl_cancel_${game.id}`);
      
  const betText = bet > 0 ? ` with a bet of ${bet}🪙` : "";
  const sent = await ctx.reply(
    `🏏 CCL Match started by ${ctx.from.first_name}${betText}!\nWaiting for an opponent to join.`,
    { reply_markup: keyboard }
  );
  game.messageId = sent.message_id;
});

bot.command('endmatch', async (ctx) => {
  const userId = ctx.from.id;
  const chatId = ctx.chat.id;
  
  // Check if there is a match in this chat
  let activeGame = null;
  let matches = [...gameManager.getAllGames()].concat([...tourManager.getAllTours()]);
  activeGame = matches.find(m => m.chatId === chatId);
  
  if (!activeGame) return ctx.reply("❌ No active match found in this group.");
  
  // Check permissions: Admin or Host
  const member = await ctx.getChatMember(userId);
  const isAdmin = ['creator', 'administrator'].includes(member.status);
  const isHost = activeGame.hostId === userId || (activeGame.players && activeGame.players[0].id === userId);
  
  if (!isAdmin && !isHost) return ctx.reply("❌ Only Group Admins or the Match Host can end the match.");
  
  const type = activeGame.players ? 'ccl' : 'tour';
  const kb = new InlineKeyboard()
    .text("✅ Confirm End", `endmatch_yes_${type}_${activeGame.id}`)
    .text("❌ Cancel", `endmatch_no`);
    
  await ctx.reply(`⚠️ Are you sure you want to end the current match? This cannot be undone.`, { reply_markup: kb });
});

// Inline Callbacks for Group Chat
bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const userId = ctx.from.id;

  if (data === 'lb_coins' || data === 'lb_wins') {
    try {
        const type = data === 'lb_coins' ? 'coins' : 'wins';
        const lb = await sb.getLeaderboard(type);
        
        let text = type === 'coins' ? '🏆 <b>Top 10 by Coins</b> 🏆\n\n' : '🏆 <b>Top 10 by Wins</b> 🏆\n\n';
        if (lb && lb.length > 0) {
            lb.forEach((u, i) => {
               text += `${i+1}. <b>${u.first_name || 'Player'}</b> - ${u[type]}${type === 'coins' ? '🪙' : ' W'}\n`;
            });
        } else {
            text += "No records found!";
        }
        
        const kb = new InlineKeyboard().text("💰 Coins", "lb_coins").text("🏆 Wins", "lb_wins");
        await ctx.editMessageText(text, { reply_markup: kb, parse_mode: 'HTML' });
    } catch(e) {
        console.error("Leaderboard Error:", e);
    }
    return;
  }

  if (data.startsWith('ccl_join_')) {
    const gameId = data.split('_')[2];
    const user = await sb.getUser(userId);
    if (!user) return ctx.answerCallbackQuery({ text: "Register first using /register", show_alert: true });
    
    const tmpGame = gameManager.getGame(gameId);
    if (tmpGame && tmpGame.bet > 0 && user.coins < tmpGame.bet) {
      return ctx.answerCallbackQuery({ text: `Not enough coins! You need ${tmpGame.bet}🪙`, show_alert: true });
    }

    const { success, error, game } = gameManager.joinGame(gameId, { id: userId, first_name: ctx.from.first_name });
    if (!success) return ctx.answerCallbackQuery({ text: error, show_alert: true });
    
    ctx.answerCallbackQuery("Joined!");
    
    const kb = new InlineKeyboard()
        .text("Heads", `ccl_toss_${gameId}_heads`)
        .text("Tails", `ccl_toss_${gameId}_tails`);
        
    await ctx.editMessageText(
        `Match between ${game.players[0].first_name} and ${game.players[1].first_name}!\n${game.players[0].first_name}, choose Heads or Tails for the toss.`,
        { reply_markup: kb }
    );
  }
  else if (data.startsWith('ccl_cancel_')) {
      const gameId = data.split('_')[2];
      const game = gameManager.getGame(gameId);
      if (!game) return ctx.answerCallbackQuery({ text: "Match not found or already ended.", show_alert: true });
      if (userId !== game.players[0].id) return ctx.answerCallbackQuery({ text: "Only the initiator can cancel.", show_alert: true });
      
      gameManager.deleteGame(gameId);
      await ctx.editMessageText("The CCL match has been cancelled by the initiator.");
      ctx.answerCallbackQuery("Match cancelled.");
  }
  else if (data.startsWith('ccl_toss_')) {
    const parts = data.split('_');
    const gameId = parts[2];
    const choice = parts[3]; 
    
    const res = gameManager.handleToss(gameId, userId, choice);
    if (!res) return ctx.answerCallbackQuery({ text: "Invalid toss state or not your turn.", show_alert: true });
    
    ctx.answerCallbackQuery("Tossed!");
    const { game, tossResult, winner } = res;
    
    const kb = new InlineKeyboard()
        .text("Bat 🏏", `ccl_batbowl_${gameId}_bat`)
        .text("Bowl ⚾", `ccl_batbowl_${gameId}_bowl`);
        
    await ctx.editMessageText(
      `The coin landed on ${tossResult}!\n${winner.first_name} won the toss! Choose to Bat or Bowl first.`,
      { reply_markup: kb }
    );
  }
  else if (data.startsWith('ccl_batbowl_')) {
    const parts = data.split('_');
    const gameId = parts[2];
    const choice = parts[3]; 
    
    const game = gameManager.chooseBatBowl(gameId, userId, choice);
    if (!game) return ctx.answerCallbackQuery({ text: "Invalid state or not your choice.", show_alert: true });
    ctx.answerCallbackQuery("Decision made!");
    
    const batP = game.players.find(p => p.id === game.batsmanId);
    const bowlP = game.players.find(p => p.id === game.bowlerId);
    
    await ctx.editMessageText(
      `Match started!\n🏏 Batter: ${batP.first_name}\n🧤 Bowler: ${bowlP.first_name}\n\nBoth players have been sent instructions via DM.`,
      { reply_markup: undefined }
    );
    
    await sendDMInstructions(ctx, game, batP, bowlP);
  }
  else if (data.startsWith('endmatch_')) {
      const parts = data.split('_');
      if (parts[1] === 'no') return await ctx.editMessageText("End match request cancelled.");
      
      const type = parts[2];
      const gameId = parts[3];
      
      if (type === 'ccl') gameManager.deleteGame(gameId);
      else tourManager.deleteTour(gameId);
      
      await ctx.editMessageText("🛑 Match has been forcefully ended by an administrator.");
      ctx.answerCallbackQuery("Match ended.");
  }
});

async function sendDMInstructions(ctx, game, batP, bowlP) {
    try {
        await ctx.api.sendMessage(batP.id, "🏏 You're batting! Send your shot number as text (0,1,2,3,4,6).");
        await ctx.api.sendMessage(bowlP.id, "⚾ You're bowling! Send your delivery as text:\nRS, Bouncer, Yorker, Short, Slower, Knuckle");
    } catch(e) {
        console.error("Failed to push DM instructions", e.message);
    }
}

// DM Text Message Handlers
bot.on('message:text', async (ctx) => {
    if (ctx.chat.type !== 'private') return; 
    
    const userId = ctx.from.id;
    const txt = ctx.message.text.trim();

    const tour = tourManager.getUserTour(userId);
    if (tour && tour.state === 'PLAYING' && bot.tourTextHook) {
        const handled = await bot.tourTextHook(ctx, tour, txt);
        if (handled) return;
    }
    
    const game = gameManager.getUserGame(userId);
    if (!game || game.state !== 'PLAYING') return; 
    
    const res = gameManager.submitPlay(game.id, userId, txt);
    if (userId === game.batsmanId) {
        await ctx.reply(`✅ You played: ${res.batStr || txt}`);
    } else {
        await ctx.reply(`✅ You bowled: ${res.bowlStr || game.bowlChoice}`); 
    }
    
    if (res.waiting) {
        const batDone = game.batChoice !== null;
        const bowlDone = game.bowlChoice !== null;
        if (!batDone) {
            try { await ctx.api.sendMessage(game.batsmanId, "🏏 Please send your shot number (0,1,2,3,4,6)."); } catch(e){}
        }
        if (!bowlDone) {
            try { await ctx.api.sendMessage(game.bowlerId, "⚾ Please send your delivery as one of:\nRS, Bouncer, Yorker, Short, Slower, Knuckle"); } catch(e){}
        }
        return;
    }
    
    await handleRoundResult(ctx, res);
});


async function sendEventUpdate(ctx, chatId, eventKey) {
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
}

// 
// Process full over/ball delay sequence in GC
//
async function handleRoundResult(ctx, res) {
  const { game, batNum, bowlNum, batStr, bowlStr, isWicket, inningsEnded, matchEnded, tie, hit50, hit100 } = res;
  const batsmanP = game.players.find(p => p.id === game.batsmanId);
  const bowlerP = game.players.find(p => p.id === game.bowlerId);
  const chatId = game.chatId;

  const over = Math.floor((res.ballsThisRound - 1) / 6);
  const ballInOver = ((res.ballsThisRound - 1) % 6) + 1;

  // Consolidate "Over/Ball" and "Bowler bowls" into one message
  await ctx.api.sendMessage(chatId, `📍 <b>Over ${over + 1} | Ball ${ballInOver}</b>\n${bowlerP.first_name} bowls a <b>${bowlStr}</b> delivery!`, { parse_mode: 'HTML' });
  await sleep(2000);

  if (isWicket) {
      await sendEventUpdate(ctx, chatId, "out");
  } else {
      await sendEventUpdate(ctx, chatId, batStr);
  }
  
  await sleep(1000);
  const currentScore = game.innings === 1 ? game.score1 : game.score2;
  await ctx.api.sendMessage(chatId, `📊 Scorecard: ${currentScore}/${game.wickets} (Target: ${game.target || 'N/A'})`);

  // End conditions
  if (isWicket) {
      if (inningsEnded) {
          game.halfCenturyAnnounced = false;
          game.centuryAnnounced = false;
          await ctx.api.sendMessage(chatId, `Innings break! Target for second innings: ${game.score1 + 1}`);
          // Send instructions again
          const nBatP = game.players.find(p => p.id === game.batsmanId);
          const nBowlP = game.players.find(p => p.id === game.bowlerId);
          await sendDMInstructions(ctx, game, nBatP, nBowlP);
      }
  } else {
      if (hit50) {
          await sendEventUpdate(ctx, chatId, "50");
          await ctx.api.sendMessage(chatId, "🎉 Half-century! Keep it up!");
      }
      if (hit100) {
          await sendEventUpdate(ctx, chatId, "100");
          await ctx.api.sendMessage(chatId, "🏆 Century! Amazing innings!");
      }
  }
  
  if (matchEnded) {
      if (tie) {
          await ctx.api.sendMessage(chatId, "🤝 The match is a tie!");
      } else {
          const winnerP = game.players.find(p => p.id === res.winnerId);
          await ctx.api.sendMessage(chatId, `🏆 ${winnerP.first_name} won the match! Congratulations! 🎉`);
          if (game.bet > 0) {
              await ctx.api.sendMessage(chatId, `💰 ${game.bet}🪙 coins transferred to ${winnerP.first_name} as bet winnings!`);
          }
          await sb.recordMatchEnd(res.winnerId, res.loserId, game.bet);
      }
      gameManager.deleteGame(game.id);
  } else if (!inningsEnded) {
      // Round continuous!
      const batP = game.players.find(p => p.id === game.batsmanId);
      const bowlP = game.players.find(p => p.id === game.bowlerId);
      try {
          await ctx.api.sendMessage(batP.id, "🏏 Send your shot number (0,1,2,3,4,6):");
          await ctx.api.sendMessage(bowlP.id, "⚾ Send your delivery as one of:\nRS, Bouncer, Yorker, Short, Slower, Knuckle");
      } catch(e) {}
  }
}

const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('Cricket Bot is safely running!'));
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Dummy web server running on port ${PORT}`));

bot.start();
console.log("Cricket Bot Final Code started!");
