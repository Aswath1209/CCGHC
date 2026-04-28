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
        "https://media0.giphy.com/media/3o7btXfjIjTcU64YdG/giphy.gif",
        "https://media.giphy.com/media/ANpwXNVebeJ0TK9bTL/giphy.gif"
    ],
    "6": [
        "https://media3.giphy.com/media/v1.Y2lkPTZjMDliOTUya3R1eHhuaW85Mno1OTlycmJ2OXFibnA5NW5qc3Vid3djbXZkMjZ0NyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oKIPoelgPeRrfqKlO/giphy.gif",
        "https://media.giphy.com/media/kDXtscxqmTgm9XIWXk/giphy.gif",
        "https://media.giphy.com/media/3DHe8wnmz5VKpyucJt/giphy.gif",
        "https://media.giphy.com/media/tBfzeRunuQrP2kuTEb/giphy.gif"
    ],
    "out": [
        "https://media3.giphy.com/media/Wq3WRGe9N5HkSqjITT/giphy.gif",
        "https://media.giphy.com/media/trVKor40BRBF649Wad/giphy.gif",
        "https://media.giphy.com/media/fXcP4RuOgAah2g9dOb/giphy.gif",
        "https://media.giphy.com/media/DYbTfb0Gqe148AAcMP/giphy.gif"
    ],
    "50": [
        "https://media0.giphy.com/media/v1.Y2lkPTZjMDliOTUyYm5ueGVod2Z0MHcxNTF1dWVvY2EzOXo5bGxhcXdxMWFsOWl5Z3d6YyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/LRsCOm65R3NHVwqiml/giphy.gif",
        "https://media.giphy.com/media/uoakmctOIA3ibVo6bZ/giphy.gif",
        "https://media.giphy.com/media/PjSaG1p15sRtBQCTW7/giphy.gif"
    ],
    "100": [
        "https://media3.giphy.com/media/v1.Y2lkPTZjMDliOTUya3EyMXE1dzY1dXE0Y3cwMDVzb2p6c3QxbTZ0MTR6aWdvY242ZnRzdyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l1ugo9PYts0eHIRDG/giphy.gif",
        "https://media.giphy.com/media/1bbvNisg9SBccNc3tx/giphy.gif"
    ]
};

const COMMENTARY = {
    "0": [
        "😶 Dot ball! Pressure builds...", 
        "🎯 Tight delivery, no run.", 
        "🛑 No run, good fielding!",
        "🤌 'The ball is red, round and weighs about five ounces.'",
        "🥱 Abey saale! Bat pakadna sikh le pehle. (Hindi Sledge)",
        "🎤 'He's looking for some runs, but finds only fresh air!'",
        "🤡 Why are you so fat? Only because every time I hit a shot, your sister gives me a biscuit!",
        "🧱 Solid defense, but the scoreboard is crying.",
        "🐢 Faster than a turtle, but slower than the score.",
        "😴 Waking up for the match? Or just watching the dots?",
        "🤐 Shhh... do you hear that? It's the sound of nothing happening.",
        "😤 Andha hai kya? (Are you blind?) Clearly missed that!",
        "🧟 Bhootnike! Bowl better than that!",
        "🧊 Ice in the veins, or just frozen at the crease?",
        "🚧 Roadblock! Can't find a way through.",
        "🏏 That bat has more holes than Swiss cheese!",
        "🤷‍♂️ Even my grandma could hit that for a single.",
        "🥶 Chilled out? You need to score, mate!",
        "💤 ZZZ... Wake me up when a run is scored."
    ],
    "1": [
        "🏃 Quick single taken.", 
        "👟 Running hard for one.", 
        "⚡ One run added.",
        "🔥 Fast feet! One run.",
        "🐕 Like a dog chasing a bone!",
        "🚶 Just a gentle stroll for a single.",
        "🔄 Rotating strike like a pro.",
        "👀 Keeping the scoreboard ticking.",
        "🏎️ Zoom! A quick single.",
        "🤝 Teamwork makes the dream work.",
        "🎯 Precision placement for a single.",
        "🤌 'Taking the easy option, one run.'",
        "🌟 Ek gaya! (One done!) Keep them coming.",
        "💨 Blink and you'll miss the single!",
        "🦊 Crafty running, snatching a run.",
        "🥇 Every run counts in this battle!",
        "🌪️ Speeding through for one.",
        "🔥 Burning up the pitch for a single."
    ],
    "2": [
        "🏃‍♂️ Two runs!", 
        "💨 Good running between wickets.", 
        "🔥 Two runs scored.",
        "✌️ Double trouble!",
        "🐆 Prowling for those two runs.",
        "🏃🏃 Two more to the tally.",
        "📈 Moving the score along nicely.",
        "🌪️ A whirlwind of running! Two runs.",
        "🛤️ Smooth as silk for a double.",
        "🚀 Pushing hard for the second!",
        "💪 Tagda running! (Strong running!) Double taken.",
        "🏹 Two runs harvested from the field.",
        "⚖️ Balancing the risk with two runs.",
        "🌊 Rolling in the runs, two at a time.",
        "🔋 Recharging the total with a double."
    ],
    "3": [
        "🏃‍♂️ Three runs! Great running!", 
        "💨 Three runs added.", 
        "🔥 Three runs scored.",
        "🦵 Fitness test! Three runs taken.",
        "🥇 A hat-trick of runs in one ball!",
        "🏁 Chasing them down... three runs!",
        "💨 The fielders are getting a workout.",
        "⚡ Blazing speed for a triple!",
        "🥵 Fielder is panting! 3 runs taken.",
        "💥 Gajab running, bhai! (Amazing running, brother!)",
        "🏃‍♂️🏃‍♂️🏃‍♂️ Non-stop action for three runs!",
        "🎯 Exploiting the gaps beautifully for 3."
    ],
    "4": [
        "🔥 Cracking four! What a shot!", 
        "💥 The ball races to the boundary!", 
        "🏏 Beautiful timing for four runs!",
        "🚀 'Like a tracer bullet!' - Ravi Shastri mode.",
        "🎸 Rocks the stadium! Four runs!",
        "🔨 Hammered away to the fence!",
        "🎯 Precision of a surgeon. Four runs.",
        "🤩 'Everything about that was class!'",
        "📣 The crowd is loving this boundary!",
        "💸 Easy money! Four runs.",
        "🏹 Shot through the covers like an arrow!",
        "🔥 Timing, no effort. 4 runs.",
        "🧨 Exploded off the bat!",
        "🥵 Maza aa gaya! (I loved it!) What a boundary!",
        "🚁 Helicopter 4? Almost!",
        "💎 A gem of a boundary. 4 runs.",
        "🐅 Roaring with power! Four!",
        "⚡ 'Absolute lightning to the fence!'"
    ],
    "6": [
        "🚀 Massive six! Into the stands!", 
        "🎉 What a smash! Six runs!", 
        "🔥 Smoked it for a sixer! 🔥",
        "🌌 'That's gone into orbit!'",
        "🏟️ 'If you're a fan in the top tier, keep your eyes open!'",
        "💣 KA-BOOM! Out of the park!",
        "🍿 Get the popcorn, this is a show! 6 runs.",
        "🤯 'He's making them look like schoolboys!'",
        "🦅 Flight 101: Destination Boundary Heights.",
        "⚡ 'Absolute carnage!'",
        "🤴 King of the crease! Huge six.",
        "🧨 Power, timing, and pure disrespect!",
        "🕺 Dance down the track and smash it!",
        "💥 DHO dala! (Washed them!) Sixer!",
        "🔱 God-level hitting! 6 runs.",
        "🌋 Eruption of power! Out of the stadium!",
        "🛰️ NASA just spotted the ball. 6 runs.",
        "🌈 Arcing beautifully into the crowd. 6!"
    ],
    "out": [
        "💥 Bowled him! What a delivery!", 
        "😢 Caught out! End of the innings!", 
        "🚫 Out! The crowd goes silent...",
        "👋 'Cheerio!' - Off you go.",
        "🚾 Mind the windows on your way out!",
        "🎤 'He's gone! The finger goes up!'",
        "🤡 'Why don't you get some runs, mate?'",
        "🚮 Trash disposal complete. Out!",
        "🚪 This way to the pavilion, please.",
        "🤫 Silence in the ground. Wicket falls.",
        "💔 Heartbreak! The batter is walking.",
        "📦 Pack your bags! You're done.",
        "🏏 'You're just a bits and pieces player!'",
        "💀 GONE! Absolutely clinical.",
        "💩 Bhai, tujhse na ho payega. (Brother, you can't do it.) OUT!",
        "💨 'Snicked it... and taken!'",
        "👻 Disappeared! Like your chances of winning. OUT!",
        "😵 Stunned! The stumps are flying.",
        "📉 Career-ending delivery? Maybe!"
    ],
    "50": [
        "🎉 Half-century! What a milestone!", 
        "🏆 50 runs scored! Keep it up!", 
        "🔥 Fifty up! Player is on fire!",
        "👑 Class is permanent. 50 runs.",
        "📊 A captain's innings! Half-century.",
        "🌟 Shining bright with a 50.",
        "🍾 Pop the champagne! 50 up.",
        "📈 The graphs are all pointing up!",
        "🦁 Sher hai tu! (You're a lion!) Magnificent 50.",
        "🏅 Quality through and through. 50 runs."
    ],
    "100": [
        "🏅 CENTURY! What a magnificent innings!", 
        "🎊 100 runs! A true champion!", 
        "🔥 Century scored! The crowd erupts!",
        "🦅 'Touching the sky!' 100 runs.",
        "🏅 Legendary status unlocked. 100!",
        "🔱 The master of the crease. 100 runs.",
        "🎂 A ton of runs! Magnificent.",
        "🙌 Bow down to the centurion!",
        "👑 Badshah of the stadium! (King of the stadium!) 100!",
        "🔱 Simply unstoppable. 100 runs."
    ]
};


process.on('unhandledRejection', (reason) => console.error("Unhandled Rejection:", reason));
process.on('uncaughtException', (error) => console.error("Uncaught Exception:", error));

const bot = new Bot(process.env.BOT_TOKEN);
bot.use(session({ initial: () => ({}) }));

tourBotUI(bot, sleep, sendEventUpdate);

try {
  bot.api.setMyCommands([
    { command: 'start', description: 'Welcome message' },
    { command: 'register', description: 'Create account & get coins' },
    { command: 'ccl', description: 'Start a 1v1 CCL match' },
    { command: 'tour', description: 'Initiate a Team Tour' },
    { command: 'create_team', description: 'Start Team A joining window' },
    { command: 'join_teama', description: 'Join Team A' },
    { command: 'join_teamb', description: 'Join Team B' },
    { command: 'appointa_captain', description: 'Appoint Team A Captain' },
    { command: 'appointb_captain', description: 'Appoint Team B Captain' },
    { command: 'setovers', description: 'Set match overs' },
    { command: 'teams', description: 'Show team rosters' },
    { command: 'batting', description: '/batting [index]' },
    { command: 'bowling', description: '/bowling [index]' },
    { command: 'scoreboard', description: 'View match status' },
    { command: 'endmatch', description: 'End 1v1 match (Admin/Host)' },
    { command: 'endtour', description: 'End Tour match (Admin/Host)' },
    { command: 'penalty', description: '/penalty [A/B] [runs]' },
    { command: 'bonus', description: '/bonus [A/B] [runs]' },
    { command: 'innings_switch', description: 'Switch to next innings' },
    { command: 'changehost', description: 'Transfer host permissions' },
    { command: 'profile', description: 'View your stats' },
    { command: 'help', description: 'Commands list' }
  ]).catch(e => console.error("setMyCommands error (non-blocking):", e.message));
} catch (e) {
  console.error("Critical error in setMyCommands:", e.message);
}

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
    "🛑 /endmatch - End 1v1 match\n" +
    "🛑 /endtour - End tour match\n" +
    "➕ /add [id] [amount] - Give coins",
    { parse_mode: 'HTML' }
  );
});

bot.command('daily', async (ctx) => {
  const result = await sb.claimDaily(ctx.from.id);
  if (result.success) await ctx.reply(`✅ 2000🪙 added to your account!`);
  else await ctx.reply(`⏳ ${result.error}`);
});

bot.command('ccl', async (ctx) => {
  if (ctx.chat.type === 'private') return ctx.reply("CCL matches must be played in group chats.");
  
  const args = ctx.message.text.split(' ');
  const bet = parseInt(args[1]) || 0;
  
  if (bet < 0) {
      return ctx.reply("⚠️ Bet amount cannot be negative!");
  }
  
  const user = await sb.getUser(ctx.from.id);
  if (!user) return ctx.reply("⚠️ You need to /register first!");
  if (user.coins < bet) return ctx.reply(`⚠️ Insufficient coins! You have ${user.coins}🪙`);

  const res = gameManager.createGame(ctx.chat.id, null, { id: ctx.from.id, first_name: ctx.from.first_name }, bet);
  if (!res.success) return ctx.reply("❌ " + res.error);

  const kb = new InlineKeyboard()
    .text("Join Match 🏏", `ccl_join_${res.game.id}`)
    .row()
    .text("Cancel ❌", `ccl_cancel_${res.game.id}`);

  await ctx.reply(
    `🏏 <b>CCL Match Started!</b>\n` +
    `Host: ${ctx.from.first_name}\n` +
    `Bet: ${bet}🪙\n\n` +
    `Click below to join!`,
    { reply_markup: kb, parse_mode: 'HTML' }
  );
});

async function isAdminOrHost(ctx, match) {
    if (ctx.chat.type === 'private') return true;
    if (match && match.hostId === ctx.from.id) return true;
    
    try {
        const member = await ctx.api.getChatMember(ctx.chat.id, ctx.from.id);
        return ['creator', 'administrator'].includes(member.status) || ctx.from.id.toString() === "6268846393";
    } catch (e) {
        console.error("Admin check failed:", e);
        return false;
    }
}

bot.command('endmatch', async (ctx) => {
  const match = [...gameManager.getAllGames()].find(m => m.chatId === ctx.chat.id);
  
  if (!match) return ctx.reply("No active 1v1 match found in this chat.");
  
  if (!(await isAdminOrHost(ctx, match))) {
      return ctx.reply("Only the host or an admin can end the match.");
  }

  const kb = new InlineKeyboard()
    .text("Yes, End Match ✅", `confirm_endmatch_yes_${match.id}`)
    .text("No, Continue ❌", `confirm_endmatch_no`);

  await ctx.reply("⚠️ <b>Clear Match?</b>\nAre you sure you want to end this 1v1 match?", { reply_markup: kb, parse_mode: 'HTML' });
});

bot.command('endtour', async (ctx) => {
    const tour = [...tourManager.getAllTours()].find(t => t.chatId === ctx.chat.id);
    
    if (!tour) return ctx.reply("No active tour match found in this chat.");
    
    if (!(await isAdminOrHost(ctx, tour))) {
        return ctx.reply("Only the host or an admin can end the tour.");
    }
  
    const kb = new InlineKeyboard()
      .text("Yes, End Tour ✅", `confirm_endtour_yes_${tour.id}`)
      .text("No, Continue ❌", `confirm_endtour_no`);
  
    await ctx.reply("⚠️ <b>Clear Tour?</b>\nAre you sure you want to end this tournament match?", { reply_markup: kb, parse_mode: 'HTML' });
});

bot.command('tour', async (ctx) => {
  if (ctx.chat.type === 'private') return ctx.reply("Tour matches can only be started in groups.");
  const res = tourManager.createTour(ctx.chat.id, { id: ctx.from.id, first_name: ctx.from.first_name });
  if (!res.success) return ctx.reply("❌ " + res.error);
  
  await ctx.reply(`🏏 <b>Tour Match Initiated!</b>\nHost: ${ctx.from.first_name}\n\nHost, please start team creation by sending /create_team`, { parse_mode: 'HTML' });
});

bot.command('create_team', async (ctx) => {
  const tour = tourManager.getUserTour(ctx.from.id);
  if (!tour || tour.hostId !== ctx.from.id || tour.state !== 'INIT') return;

  tour.state = 'LOBBY_A';
  await ctx.reply("👥 <b>Team A Creation is Underway!</b>\nJoin Team A by sending /join_teama\nWindow ends in 60s.", { parse_mode: 'HTML' });

  setTimeout(async () => {
    if (tour.state !== 'LOBBY_A') return;
    tour.state = 'LOBBY_B';
    await ctx.api.sendMessage(tour.chatId, "👥 <b>Team B Creation is Underway!</b>\nJoin Team B by sending /join_teamb\nWindow ends in 60s.", { parse_mode: 'HTML' });
    
    setTimeout(async () => {
        if (tour.state !== 'LOBBY_B') return;
        tour.state = 'PRE_TOSS';
        await ctx.api.sendMessage(tour.chatId, "⏳ <b>Team joining windows closed.</b>\nHost, please appoint captains using /appointa_captain and /appointb_captain (reply to a member or mention them).", { parse_mode: 'HTML' });
    }, 60000);
  }, 60000);
});

bot.command('join_teama', async (ctx) => {
  const tour = tourManager.getUserTour(ctx.from.id) || [...tourManager.getAllTours()].find(t => t.chatId === ctx.chat.id && t.state === 'LOBBY_A');
  if (!tour) return;
  const res = tourManager.joinTeam(tour.id, { id: ctx.from.id, first_name: ctx.from.first_name }, 'teamA');
  if (res.success) await ctx.reply(`✅ ${ctx.from.first_name} joined Team A!`);
  else await ctx.reply(`❌ ${res.error}`);
});

bot.command(['appointa_captain', 'appointb_captain'], async (ctx) => {
    const isTeamA = ctx.message.text.includes('appointa');
    const tour = tourManager.getUserTour(ctx.from.id);
    if (!tour || tour.hostId !== ctx.from.id) return;

    let targetId = null;
    if (ctx.message.reply_to_message) {
        targetId = ctx.message.reply_to_message.from.id;
    } else {
        const entity = ctx.message.entities?.find(e => e.type === 'mention' || e.type === 'text_mention');
        if (entity) {
            // Mention handling is complex as we only get the offset. 
            // For now, let's assume reply is the main way, or they can use ID.
            return ctx.reply("Please reply to a team member's message with this command to appoint them as captain.");
        }
    }

    if (!targetId) return ctx.reply("Please reply to a team member's message to appoint them.");

    const teamKey = isTeamA ? 'teamA' : 'teamB';
    const success = tourManager.appointCaptain(tour.id, ctx.from.id, targetId, teamKey);
    
    if (success) {
        await ctx.reply(`👑 ${isTeamA ? 'Team A' : 'Team B'} Captain appointed!`);
        if (tour.teamA.captainId && tour.teamB.captainId) {
            await ctx.reply("🚀 Both captains appointed! Host, please set the overs using /setovers");
        }
    } else {
        await ctx.reply("❌ Error: Player not found in team or invalid host.");
    }
});

bot.command('setovers', async (ctx) => {
    const tour = tourManager.getUserTour(ctx.from.id);
    if (!tour || tour.hostId !== ctx.from.id) return;

    const kb = new InlineKeyboard();
    for (let i = 1; i <= 20; i++) {
        kb.text(`${i}`, `tour_overs_${tour.id}_${i}`);
        if (i % 5 === 0) kb.row();
    }
    await ctx.reply("📊 <b>Select Match Overs:</b>", { reply_markup: kb, parse_mode: 'HTML' });
});

// Inline Callbacks for Group Chat
bot.command('teams', async (ctx) => {
    const tour = tourManager.getUserTour(ctx.from.id) || [...tourManager.getAllTours()].find(t => t.chatId === ctx.chat.id);
    if (!tour) return;

    let text = "👥 <b>Team Rosters:</b>\n\n";
    
    text += "<b>Team A:</b>\n";
    tour.teamA.players.forEach((p, i) => {
        const cap = p.id === tour.teamA.captainId ? " (C)" : "";
        text += `${i + 1}) ${p.first_name}${cap}\n`;
    });

    text += "\n<b>Team B:</b>\n";
    tour.teamB.players.forEach((p, i) => {
        const cap = p.id === tour.teamB.captainId ? " (C)" : "";
        text += `${i + 1}) ${p.first_name}${cap}\n`;
    });

    await ctx.reply(text, { parse_mode: 'HTML' });
});

bot.command('batting', async (ctx) => {
    const args = ctx.message.text.split(' ');
    const index = parseInt(args[1]);
    if (isNaN(index)) return ctx.reply("Usage: /batting [index]");

    const tour = tourManager.getUserTour(ctx.from.id);
    if (!tour) return;

    const team = tour[tour.battingTeamId];
    const position = team.strikerId === null ? 'S' : 'NS';
    
    const res = tourManager.setBatsman(tour.id, ctx.from.id, index, position);
    if (res.success) {
        await ctx.reply(`🏏 ${res.player.first_name} selected as ${position === 'S' ? 'Striker' : 'Non-Striker'}!`);
        if (team.strikerId && team.nonStrikerId) {
            await ctx.reply("🔥 Both batters ready! Bowling captain, select your bowler using /bowling [index]");
            tour.state = 'SELECT_BOWLER';
        }
    } else {
        await ctx.reply(`❌ ${res.error}`);
    }
});

bot.command('bowling', async (ctx) => {
    const args = ctx.message.text.split(' ');
    const index = parseInt(args[1]);
    if (isNaN(index)) return ctx.reply("Usage: /bowling [index]");

    const tour = tourManager.getUserTour(ctx.from.id);
    if (!tour) return;

    const res = tourManager.setBowler(tour.id, ctx.from.id, index);
    if (res.success) {
        await ctx.reply(`🧤 ${res.player.first_name} is bowling! Let the over begin! 🏏🔥`);
        // Notify players
        const batTeam = tour[tour.battingTeamId];
        const striker = batTeam.players.find(p => p.id === batTeam.strikerId);
        const bowler = tour[tour.bowlingTeamId].players.find(p => p.id === tour.activeBowlerId);
        
        await ctx.api.sendMessage(striker.id, "🏏 You are Batting (Striker)! Send your shot (0,1,2,3,4,6).");
        await ctx.api.sendMessage(bowler.id, "🧤 You are Bowling! Send your delivery:\nRS, Bouncer, Yorker, Short, Slower, Knuckle");
    } else {
        await ctx.reply(`❌ ${res.error}`);
    }
});
bot.command(['adda', 'addb'], async (ctx) => {
    const isTeamA = ctx.message.text.toLowerCase().includes('adda');
    const tour = tourManager.getUserTour(ctx.from.id);
    if (!tour || (tour.hostId !== ctx.from.id && tour.teamA.captainId !== ctx.from.id && tour.teamB.captainId !== ctx.from.id)) return;

    if (!ctx.message.reply_to_message) return ctx.reply("Please reply to the user's message you want to add.");
    const user = ctx.message.reply_to_message.from;
    
    const teamKey = isTeamA ? 'teamA' : 'teamB';
    const res = tourManager.joinTeam(tour.id, { id: user.id, first_name: user.first_name }, teamKey);
    if (res.success) await ctx.reply(`✅ ${user.first_name} added to ${isTeamA ? 'Team A' : 'Team B'}!`);
    else await ctx.reply(`❌ ${res.error}`);
});

bot.command('remove_player', async (ctx) => {
    const tour = tourManager.getUserTour(ctx.from.id);
    if (!tour || (tour.hostId !== ctx.from.id && tour.teamA.captainId !== ctx.from.id && tour.teamB.captainId !== ctx.from.id)) return;

    if (!ctx.message.reply_to_message) return ctx.reply("Please reply to the user's message you want to remove.");
    const targetId = ctx.message.reply_to_message.from.id;

    const findAndRemove = (team) => {
        const idx = team.players.findIndex(p => p.id === targetId);
        if (idx !== -1) {
            const p = team.players.splice(idx, 1)[0];
            return p;
        }
        return null;
    };

    const removed = findAndRemove(tour.teamA) || findAndRemove(tour.teamB);
    if (removed) await ctx.reply(`🚪 ${removed.first_name} removed from the match.`);
    else await ctx.reply("❌ Player not found in any team.");
});

bot.command('penalty', async (ctx) => {
    const args = ctx.message.text.split(' ');
    const team = args[1]; 
    const runs = parseInt(args[2]);
    if (!team || isNaN(runs)) return ctx.reply("Usage: /penalty [A/B] [runs]");
    const tour = tourManager.getUserTour(ctx.from.id);
    const res = tourManager.adjustRuns(tour?.id, ctx.from.id, team, runs, true);
    if (res) await ctx.reply(`🚫 <b>Penalty!</b> ${res.teamName} penalized by ${runs} runs.`, { parse_mode: 'HTML' });
});

bot.command('bonus', async (ctx) => {
    const args = ctx.message.text.split(' ');
    const team = args[1];
    const runs = parseInt(args[2]);
    if (!team || isNaN(runs)) return ctx.reply("Usage: /bonus [A/B] [runs]");
    const tour = tourManager.getUserTour(ctx.from.id);
    const res = tourManager.adjustRuns(tour?.id, ctx.from.id, team, runs, false);
    if (res) await ctx.reply(`✨ <b>Bonus!</b> ${res.teamName} awarded ${runs} runs.`, { parse_mode: 'HTML' });
});

bot.command('innings_switch', async (ctx) => {
    const tour = tourManager.getUserTour(ctx.from.id);
    if (!tour || tour.hostId !== ctx.from.id || tour.state !== 'INNINGS_BREAK') return;
    tour.state = 'SELECT_BATTERS';
    tour.innings = 2;
    tour.balls = 0;
    const tmp = tour.battingTeamId;
    tour.battingTeamId = tour.bowlingTeamId;
    tour.bowlingTeamId = tmp;
    tour.teamA.strikerId = null; tour.teamA.nonStrikerId = null;
    tour.teamB.strikerId = null; tour.teamB.nonStrikerId = null;
    tour.activeBowlerId = null; tour.previousBowlerId = null;
    await ctx.reply(`🔄 <b>Innings Switch!</b>\nTarget: ${tourManager.totalScore(tour[tour.bowlingTeamId]) + 1}\n\nCaptain, select your opening batters using /batting [index]`, { parse_mode: 'HTML' });
});

bot.command(['rebata', 'rebatb'], async (ctx) => {
    const isTeamA = ctx.message.text.toLowerCase().includes('rebata');
    const args = ctx.message.text.split(' ');
    const index = parseInt(args[1]);
    if (isNaN(index)) return ctx.reply("Usage: /rebat[a/b] [index]");
    const tour = tourManager.getUserTour(ctx.from.id);
    const player = tourManager.rebatPlayer(tour?.id, ctx.from.id, isTeamA ? 'A' : 'B', index);
    if (player) await ctx.reply(`🔄 ${player.first_name} added for rebatting! (Index: ${tour[isTeamA ? 'teamA' : 'teamB'].players.length})`);
});

bot.command('help', async (ctx) => {
  await ctx.reply(
    "📜 <b>Tour Mode Guide:</b>\n" +
    "1. /tour - Start Tour\n" +
    "2. /create_team - Start 60s join windows\n" +
    "3. /join_teama / /join_teamb - Join teams\n" +
    "4. /appointa_captain / /appointb_captain - (Reply to msg) Set Caps\n" +
    "5. /setovers - Set match length\n" +
    "6. /teams - View roster indices\n" +
    "7. /batting [index] - Select Striker/Non-Striker\n" +
    "8. /bowling [index] - Select Bowler\n" +
    "9. /penalty [A/B] [runs] / /bonus [A/B] [runs]\n" +
    "10. /rebata/b [index] - Assign rebatting\n" +
    "11. /changehost - Vote for new host\n\n" +
    "<i>Instructions loop in GC to guide you!</i>",
    { parse_mode: 'HTML' }
  );
});
bot.command('changehost', async (ctx) => {
    const tour = tourManager.getUserTour(ctx.from.id) || [...tourManager.getAllTours()].find(t => t.chatId === ctx.chat.id);
    if (!tour) return;

    tour.voteHost.inProgress = true;
    tour.voteHost.yesVotes.clear();
    tour.voteHost.totalNeeded = Math.ceil( (tour.teamA.players.length + tour.teamB.players.length) / 2 );

    const kb = new InlineKeyboard().text("Vote Yes ✅", `tour_votehost_${tour.id}`);
    await ctx.reply(`🗳 <b>Host Transfer Initiated!</b>\nNeed ${tour.voteHost.totalNeeded} votes to unlock "I'm Host" button.`, { reply_markup: kb, parse_mode: 'HTML' });
});

bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const userId = ctx.from.id;

  if (data.startsWith('tour_votehost_')) {
      const tourId = data.split('_')[2];
      const tour = tourManager.getTour(tourId);
      if (!tour || !tour.voteHost.inProgress) return ctx.answerCallbackQuery();
      
      tour.voteHost.yesVotes.add(userId);
      ctx.answerCallbackQuery(`Voted! (${tour.voteHost.yesVotes.size}/${tour.voteHost.totalNeeded})`);

      if (tour.voteHost.yesVotes.size >= tour.voteHost.totalNeeded) {
          tour.voteHost.inProgress = false;
          const kb = new InlineKeyboard().text("I'm Host 🙋‍♂️", `tour_claimhost_${tourId}`);
          await ctx.api.sendMessage(tour.chatId, "✅ <b>Vote Passed!</b>\nThe first person to click below becomes the new Host.", { reply_markup: kb, parse_mode: 'HTML' });
      }
      return;
  }

  if (data.startsWith('tour_claimhost_')) {
      const tourId = data.split('_')[2];
      const tour = tourManager.getTour(tourId);
      if (!tour) return ctx.answerCallbackQuery();
      tour.hostId = userId;
      await ctx.editMessageText(`🎊 <b>${ctx.from.first_name}</b> is the new Host!`, { parse_mode: 'HTML' });
      return;
  }

  if (data.startsWith('tour_overs_')) {
    const parts = data.split('_');
    const tourId = parts[2];
    const overs = parseInt(parts[3]);
    const tour = tourManager.getTour(tourId);
    if (!tour || tour.hostId !== userId) return ctx.answerCallbackQuery({ text: "Only host can set overs.", show_alert: true });
    
    tour.config.overs = overs;
    ctx.answerCallbackQuery(`Overs set to ${overs}!`);
    await ctx.editMessageText(`📊 <b>Match Overs: ${overs}</b>\n\nToss will happen in 10s...`, { parse_mode: 'HTML' });
    
    setTimeout(async () => {
        const kb = new InlineKeyboard().text("Heads", `tour_toss_${tourId}_heads`).text("Tails", `tour_toss_${tourId}_tails`);
        await ctx.api.sendMessage(tour.chatId, `🪙 <b>Toss Time!</b>\nCaptains, choose Heads or Tails!`, { reply_markup: kb, parse_mode: 'HTML' });
    }, 10000);
    return;
  }

  if (data.startsWith('tour_toss_')) {
      const parts = data.split('_');
      const tourId = parts[2];
      const choice = parts[3];
      const tour = tourManager.getTour(tourId);
      if (!tour || tour.state !== 'PRE_TOSS') return ctx.answerCallbackQuery();
      if (userId !== tour.teamA.captainId && userId !== tour.teamB.captainId) return ctx.answerCallbackQuery({ text: "Only captains can toss!", show_alert: true });

      const tossResult = Math.random() < 0.5 ? 'heads' : 'tails';
      const won = choice === tossResult;
      tour.tossWinnerId = userId;
      tour.state = 'TOSS_DECISION';

      ctx.answerCallbackQuery(`The coin landed on ${tossResult}!`);
      const kb = new InlineKeyboard().text("Bat 🏏", `tour_decide_${tourId}_bat`).text("Bowl 🧤", `tour_decide_${tourId}_bowl`);
      await ctx.editMessageText(`🪙 Match Toss: <b>${tossResult.toUpperCase()}</b>\n\n${ctx.from.first_name} won the toss! Choose Bat or Bowl:`, { reply_markup: kb, parse_mode: 'HTML' });
      return;
  }

  if (data.startsWith('tour_pickS_')) {
      const parts = data.split('_');
      const tourId = parts[2];
      const index = parseInt(parts[3]);
      const tour = tourManager.getTour(tourId);
      if (!tour) return ctx.answerCallbackQuery();
      
      const res = tourManager.setBatsman(tourId, userId, index, tour[tour.battingTeamId].strikerId ? 'N' : 'S');
      if (!res.success) return ctx.answerCallbackQuery({ text: res.error, show_alert: true });
      
      ctx.answerCallbackQuery(`Selected: ${res.player.first_name}`);
      
      if (tour.state === 'SELECT_BATTERS') {
          // Need second batter
          const batT = tour[tour.battingTeamId];
          const available = batT.players.filter(p => !batT.outPlayers.includes(p.id) && p.id !== batT.strikerId && p.id !== batT.nonStrikerId);
          const kb = new InlineKeyboard();
          available.forEach(p => kb.text(p.first_name, `tour_pickS_${tourId}_${batT.players.indexOf(p) + 1}`).row());
          await ctx.editMessageText(`🏏 <b>Match Start!</b>\nSelected Opening Batter: ${res.player.first_name}\n\nCaptain, select the <b>second batter</b>:`, { reply_markup: kb, parse_mode: 'HTML' });
      } else if (tour.state === 'SELECT_BOWLER') {
          // Both batters set, now bowler
          const bowlT = tour[tour.bowlingTeamId];
          const kb = new InlineKeyboard();
          bowlT.players.forEach(p => kb.text(p.first_name, `tour_pickB_${tourId}_${bowlT.players.indexOf(p) + 1}`).row());
          await ctx.editMessageText(`🏏 <b>Batters Set!</b>\nStriker: ${tour[tour.battingTeamId].players.find(p=>p.id===tour[tour.battingTeamId].strikerId)?.first_name}\nNon-Striker: ${tour[tour.battingTeamId].players.find(p=>p.id===tour[tour.battingTeamId].nonStrikerId)?.first_name}\n\nCaptain, select the <b>Opening Bowler</b>:`, { reply_markup: kb, parse_mode: 'HTML' });
      } else {
          try { await ctx.deleteMessage(); } catch(e){}
      }
      return;
  }

  if (data.startsWith('tour_pickB_')) {
      const parts = data.split('_');
      const tourId = parts[2];
      const index = parseInt(parts[3]);
      const tour = tourManager.getTour(tourId);
      if (!tour) return ctx.answerCallbackQuery();
      
      const res = tourManager.setBowler(tourId, userId, index);
      if (!res.success) return ctx.answerCallbackQuery({ text: res.error, show_alert: true });
      
      ctx.answerCallbackQuery(`Bowler set: ${res.player.first_name}`);
      await ctx.editMessageText(`🏟 <b>Tournament Start!</b>\nAll players ready. Let the games begin!`, { parse_mode: 'HTML' });
      
      // Trigger initial tag for the first ball
      if (bot.tourTagActive) await bot.tourTagActive(ctx, tour);
      return;
  }

  if (data.startsWith('tour_decide_')) {
      const parts = data.split('_');
      const tourId = parts[2];
      const choice = parts[3];
      const tour = tourManager.getTour(tourId);
      if (!tour || tour.state !== 'TOSS_DECISION' || tour.tossWinnerId !== userId) return ctx.answerCallbackQuery();

      const isTeamA = tour.teamA.captainId === userId;
      if (choice === 'bat') {
          tour.battingTeamId = isTeamA ? 'teamA' : 'teamB';
          tour.bowlingTeamId = isTeamA ? 'teamB' : 'teamA';
      } else {
          tour.battingTeamId = isTeamA ? 'teamB' : 'teamA';
          tour.bowlingTeamId = isTeamA ? 'teamA' : 'teamB';
      }

      tour.state = 'SELECT_BATTERS';
      ctx.answerCallbackQuery("Match starting!");
      
      const batT = tour[tour.battingTeamId];
      const kb = new InlineKeyboard();
      batT.players.forEach(p => kb.text(p.first_name, `tour_pickS_${tourId}_${batT.players.indexOf(p) + 1}`).row());
      
      await ctx.editMessageText(`🚀 <b>Match Start!</b>\nTeam Batting: ${tour.battingTeamId === 'teamA' ? 'Team A' : 'Team B'}\n\nCaptain, select your <b>first opening batter</b>:`, { reply_markup: kb, parse_mode: 'HTML' });
      return;
  }

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
  else if (data.startsWith('confirm_endmatch_')) {
      const parts = data.split('_');
      if (parts[2] === 'no') return await ctx.editMessageText("End match request cancelled.");
      
      const gameId = parts[3];
      gameManager.deleteGame(gameId);
      await ctx.editMessageText("🛑 1v1 Match has been forcefully ended.");
      ctx.answerCallbackQuery("Match ended.");
  }
  else if (data.startsWith('confirm_endtour_')) {
      const parts = data.split('_');
      if (parts[2] === 'no') return await ctx.editMessageText("End tour request cancelled.");
      
      const tourId = parts[3];
      tourManager.deleteTour(tourId);
      await ctx.editMessageText("🛑 Tour Match has been forcefully ended.");
      ctx.answerCallbackQuery("Tour ended.");
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
    if (!res.success) {
        if (res.error === 'Not in game') return;
        return await ctx.reply("❌ " + res.error);
    }

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
  const bowlerP = game.players.find(p => p.id === res.originalBowlerId);
  const chatId = game.chatId;

  const over = Math.floor((res.ballsThisRound - 1) / 6);
  const ballInOver = ((res.ballsThisRound - 1) % 6) + 1;

  await ctx.api.sendMessage(chatId, `Over ${over + 1}`);
  await ctx.api.sendMessage(chatId, `Ball ${ballInOver}`);
  await sleep(4000);
  
  await ctx.api.sendMessage(chatId, `${bowlerP.first_name} bowls a ${bowlStr} delivery!`);
  await sleep(4000);

  if (isWicket) {
      await sendEventUpdate(ctx, chatId, "out");
  } else {
      await sendEventUpdate(ctx, chatId, batStr);
  }
  await sleep(1000);
  
  // Display correct score (if innings just ended, show score1)
  if (res.inningsEnded) {
      const newBatP = game.players.find(p => p.id === game.batsmanId);
      await ctx.api.sendMessage(chatId, `☝️ <b>WICKET!</b> First innings ends.\nFinal Score: ${game.score1}\nTarget for ${newBatP.first_name}: ${game.score1 + 1}`, { parse_mode: 'HTML' });
  } else {
      const currentScore = game.innings === 1 ? game.score1 : game.score2;
      const targetText = game.target ? ` (Target: ${game.target})` : (game.innings === 2 ? ` (Target: ${game.score1 + 1})` : "");
      await ctx.api.sendMessage(chatId, `📊 Scorecard: ${currentScore}/${game.innings === 1 ? 0 : 0} ${targetText}`);
  }

  // End conditions
  if (isWicket) {
      if (inningsEnded) {
          game.halfCenturyAnnounced = false;
          game.centuryAnnounced = false;
          // Send instructions again for new innings
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
          await ctx.api.sendMessage(chatId, `🏆 <b>${winnerP.first_name} won the match!</b> 🎉`, { parse_mode: 'HTML' });
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
app.listen(PORT, () => {
  console.log(`Dummy web server running on port ${PORT}`);
  console.log("Cricket Bot is starting polling...");
});

bot.start().catch((err) => {
  console.error("FATAL: Bot failed to start polling!", err);
  process.exit(1);
});

console.log("Cricket Bot Final Code is now LIVE!");

process.once("SIGINT", () => {
  console.log("SIGINT received, stopping bot...");
  bot.stop();
});
process.once("SIGTERM", () => {
  console.log("SIGTERM received, stopping bot...");
  bot.stop();
});

