const { InlineKeyboard, InputFile } = require('grammy');
const tourManager = require('./tourManager');
const { generateScoreboardImage } = require('./scoreboardGenerator');

module.exports = function installTourMode(bot, sleep, sendEventUpdate, COMMENTARY, CCL_GIFS, GIF_EVENTS) {

  function escapeHtml(str) {
      if (!str) return '';
      return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
  }


  async function isGCAdmin(ctx) {
      if (ctx.chat.type === 'private') return true;
      try {
          const member = await ctx.api.getChatMember(ctx.chat.id, ctx.from.id);
          return ['creator', 'administrator'].includes(member.status) || ctx.from.id.toString() === "6268846393";
      } catch (e) {
          console.error("GC Admin check failed:", e);
          return false;
      }
  }

  function getBasePlayerId(id) {
      if (!id) return null;
      const str = id.toString();
      if (str.includes('_rebat_')) {
          return str.split('_rebat_')[0];
      }
      return str;
  }

  // Renders the aligned scorecard
  function renderScoreboard(tour) {
    const batT = tour[tour.battingTeamId];
    const bowlT = tour[tour.bowlingTeamId];
    if (!batT || !bowlT) {
        return `⚡ <b>LIVE TOUR MATCH SCOREBOARD</b> ⚡\nMatch starting soon...`;
    }
    const totalS = tourManager.totalScore(batT);
    const bowlS = tourManager.totalScore(bowlT);

    const striker = batT.players.find(p => p.id === batT.strikerId);
    const nonStriker = batT.players.find(p => p.id === batT.nonStrikerId);
    const bowler = bowlT.players.find(p => p.id === tour.activeBowlerId);

    const over = Math.floor(tour.balls / 6);
    const ball = tour.balls % 6;

    let text = tour.name ? `⚡ <b>${escapeHtml(tour.name.toUpperCase())} SCOREBOARD</b> ⚡\n` : `⚡ <b>LIVE TOUR MATCH SCOREBOARD</b> ⚡\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🏏 <b>${escapeHtml(batT.name)}</b> (Batting)\n`;
    text += `🔹 <b>Score:</b> <code>${totalS}/${batT.wickets}</code> runs\n`;
    text += `🔹 <b>Overs:</b> <code>${over}.${ball} / ${tour.config.overs}</code> ov\n\n`;
    
    text += `🥎 <b>${escapeHtml(bowlT.name)}</b> (Bowling)\n`;
    if (tour.innings === 2) {
        text += `🔹 <b>Score:</b> <code>${bowlS}</code> runs (Completed)\n`;
        const needed = (bowlS + 1) - totalS;
        const remaining = (tour.config.overs * 6) - tour.balls;
        text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        if (needed > 0 && remaining >= 0) {
            text += `🎯 <b>Target:</b> <code>${bowlS + 1}</code> | Need <b>${needed}</b> off <b>${remaining}</b> balls\n`;
        } else {
            text += `🎯 <b>Target:</b> <code>${bowlS + 1}</code>\n`;
        }
    } else {
        text += `🔹 <b>Yet to Bat</b>\n`;
    }
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    
    const strikerStats = striker ? ` (<code>${striker.runs || 0}</code> runs, <code>${striker.balls || 0}</code> balls)` : '';
    const nonStrikerStats = nonStriker ? ` (<code>${nonStriker.runs || 0}</code> runs, <code>${nonStriker.balls || 0}</code> balls)` : '';
    let bowlerStats = '';
    if (bowler) {
        const ov = Math.floor((bowler.ballsBowled || 0) / 6);
        const bl = (bowler.ballsBowled || 0) % 6;
        bowlerStats = ` (<code>${bowler.wickets || 0}-${bowler.runsConceded || 0}</code> in <code>${ov}.${bl}</code> ov)`;
    }

    const cleanStriker = striker ? escapeHtml(striker.first_name) : '';
    const cleanNonStriker = nonStriker ? escapeHtml(nonStriker.first_name) : '';
    const cleanBowler = bowler ? escapeHtml(bowler.first_name) : '';

    text += `🏏 <b>Striker:</b> ${striker ? `<b>${cleanStriker}</b>${strikerStats}` : '<i>(Waiting...)</i>'}\n`;
    text += `🏏 <b>Non-Striker:</b> ${nonStriker ? `<b>${cleanNonStriker}</b>${nonStrikerStats}` : '<i>(Waiting...)</i>'}\n`;
    text += `🥎 <b>Bowler:</b> ${bowler ? `<b>${cleanBowler}</b>${bowlerStats}` : '<i>(Waiting...)</i>'}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━`;
    return text;
  }

  // Lobby Card rendering
  function renderLobby(tour) {
    let text = tour.name ? `🏆 <b>${escapeHtml(tour.name.toUpperCase())} LOBBY</b> 🏆\n` : `🏏 <b>Tour Match Lobby</b> 🏏\n`;
    text += `───────────────────\n`;
    text += `⚙️ <b>Settings:</b>\n`;
    text += `👉 <b>Overs:</b> ${tour.config.overs}\n`;
    text += `👉 <b>Wickets:</b> ${tour.config.wickets}\n`;
    text += `👉 <b>Bet:</b> ${tour.config.bet}🪙\n`;
    text += `───────────────────\n`;
    
    text += `🔴 <b>${escapeHtml(tour.teamA.name)}</b>:\n`;
    if (tour.teamA.players.length === 0) {
        text += `   <i>(No players yet)</i>\n`;
    } else {
        tour.teamA.players.forEach((p, idx) => {
            const isCap = p.id === tour.teamA.captainId ? " 👑" : "";
            text += `   ${idx + 1}. ${escapeHtml(p.first_name)}${isCap}\n`;
        });
    }
    
    text += `\n🔵 <b>${escapeHtml(tour.teamB.name)}</b>:\n`;
    if (tour.teamB.players.length === 0) {
        text += `   <i>(No players yet)</i>\n`;
    } else {
        tour.teamB.players.forEach((p, idx) => {
            const isCap = p.id === tour.teamB.captainId ? " 👑" : "";
            text += `   ${idx + 1}. ${escapeHtml(p.first_name)}${isCap}\n`;
        });
    }
    text += `───────────────────\n`;
    text += `Host: <a href="tg://user?id=${tour.hostId}">Host</a>\n\n`;
    text += `<i>Join either team below! Captains can rename their team using /teamname.</i>`;
    return text;
  }

  // Lobby Keyboards
  function getLobbyKeyboard(tour) {
    return new InlineKeyboard()
        .text("Join Team A 🔴", `tour_join_${tour.id}_teamA`)
        .text("Join Team B 🔵", `tour_join_${tour.id}_teamB`)
        .row()
        .text("Start Match 🚀", `tour_start_${tour.id}`)
        .text("Cancel Tour ❌", `tour_cancellobby_${tour.id}`);
  }

  // Tag players in GC with a button redirecting to DMs and overrides
  async function tagActivePlayers(ctx, tour) {
    const batTeam = tour[tour.battingTeamId];
    if (!batTeam) return;
    const bowlTeam = tour[tour.bowlingTeamId];
    if (!bowlTeam) return;

    const striker = batTeam.players.find(p => p.id === batTeam.strikerId);
    const bowler = bowlTeam.players.find(p => p.id === tour.activeBowlerId);

    if (!striker || !bowler) return;

    const kb = new InlineKeyboard()
        .url("Send Play 🎮", `https://t.me/${bot.botInfo.username}?start=tour`)
        .row()
        .text("Swap Striker 🔄", `tour_swap_striker_${tour.id}`)
        .text("Swap Bowler 🔄", `tour_swap_bowler_${tour.id}`);
    
    await ctx.api.sendMessage(tour.chatId, 
        `🔔 <b>Next Ball!</b>\n` +
        `🏏 Striker: <a href="tg://user?id=${getBasePlayerId(striker.id)}">${escapeHtml(striker.first_name)}</a>\n` +
        `🥎 Bowler: <a href="tg://user?id=${getBasePlayerId(bowler.id)}">${escapeHtml(bowler.first_name)}</a>\n\n` +
        `<i>Click below to submit your play in DMs!</i>`, 
        { reply_markup: kb, parse_mode: 'HTML' }
    );
  }

  // Prompt player selection based on state
  async function promptPlayerSelection(ctx, tour) {
      if (tour.state === 'SELECT_BATTERS' || tour.state === 'WICKET_FALL') {
          const batT = tour[tour.battingTeamId];
          const activeCount = batT.players.length - batT.outPlayers.length;
          const battingCount = (batT.strikerId ? 1 : 0) + (batT.nonStrikerId ? 1 : 0);
          
          if (battingCount < Math.min(2, activeCount)) {
              if (!batT.strikerId) {
                  const available = batT.players.filter(p => !batT.outPlayers.includes(p.id) && p.id !== batT.nonStrikerId);
                  const kb = new InlineKeyboard();
                  available.forEach(p => kb.text(p.first_name, `tour_selectbat_${tour.id}_S_${batT.players.indexOf(p) + 1}`).row());
                  await ctx.api.sendMessage(tour.chatId, `🏏 Captain of ${escapeHtml(batT.name)}, select your Striker:`, { reply_markup: kb, parse_mode: 'HTML' });
              } else if (!batT.nonStrikerId) {
                  const available = batT.players.filter(p => !batT.outPlayers.includes(p.id) && p.id !== batT.strikerId);
                  const kb = new InlineKeyboard();
                  available.forEach(p => kb.text(p.first_name, `tour_selectbat_${tour.id}_NS_${batT.players.indexOf(p) + 1}`).row());
                  kb.text("LMS (Play 1 Batter) 🏏", `tour_lms_${tour.id}`).row();
                  const striker = batT.players.find(p => p.id === batT.strikerId);
                  await ctx.api.sendMessage(tour.chatId, 
                      `🏏 Striker Set: <b>${escapeHtml(striker ? striker.first_name : '')}</b>\n\n` +
                      `👉 Captain of ${escapeHtml(batT.name)}, select your <b>second opening batter (Non-Striker)</b> or choose LMS:`, 
                      { reply_markup: kb, parse_mode: 'HTML' }
                  );
              }
          }
      } else if (tour.state === 'SELECT_BOWLER') {
          const bowlT = tour[tour.bowlingTeamId];
          const kb = new InlineKeyboard();
          bowlT.players.forEach(p => {
              if (p.id !== tour.previousBowlerId || bowlT.players.length === 1) {
                  kb.text(p.first_name, `tour_selectbowl_${tour.id}_${bowlT.players.indexOf(p) + 1}`).row();
              }
          });
          await ctx.api.sendMessage(tour.chatId, `🥎 Captain of ${escapeHtml(bowlT.name)}, select bowler:`, { reply_markup: kb, parse_mode: 'HTML' });
      }
  }

  // --- Bot Commands Definitions ---

  bot.command('tour', async (ctx) => {
    if (ctx.chat.type === 'private') return ctx.reply("Tour matches can only be started in groups.");
    const tourName = ctx.message.text.split(' ').slice(1).join(' ').trim();
    const res = tourManager.createTour(ctx.chat.id, { id: ctx.from.id, first_name: ctx.from.first_name }, tourName);
    if (!res.success) return ctx.reply("❌ " + res.error);
    
    await ctx.reply(renderLobby(res.tour), { reply_markup: getLobbyKeyboard(res.tour), parse_mode: 'HTML' });
  });

  bot.command('set_overs', async (ctx) => {
      const tour = tourManager.getUserTour(ctx.from.id) || [...tourManager.getAllTours()].find(t => t.chatId === ctx.chat.id);
      if (!tour) return ctx.reply("⚠️ No active Tour match found.");
      
      const isAllowed = ctx.from.id === tour.hostId || ctx.from.id === tour.teamA.captainId || ctx.from.id === tour.teamB.captainId;
      if (!isAllowed) return ctx.reply("❌ Only the host or captains can change settings.");
      
      const args = ctx.message.text.split(' ');
      const overs = parseInt(args[1]);
      if (isNaN(overs) || overs < 1 || overs > 20) {
          return ctx.reply("Usage: /set_overs [1-20]");
      }
      
      tour.config.overs = overs;
      tour.maxBalls = overs * 6;
      
      await ctx.reply(`⚙️ <b>Overs updated to:</b> <code>${overs}</code> overs.`, { parse_mode: 'HTML' });
  });

  bot.command('set_wickets', async (ctx) => {
      const tour = tourManager.getUserTour(ctx.from.id) || [...tourManager.getAllTours()].find(t => t.chatId === ctx.chat.id);
      if (!tour) return ctx.reply("⚠️ No active Tour match found.");
      
      const isAllowed = ctx.from.id === tour.hostId || ctx.from.id === tour.teamA.captainId || ctx.from.id === tour.teamB.captainId;
      if (!isAllowed) return ctx.reply("❌ Only the host or captains can change settings.");
      
      const args = ctx.message.text.split(' ');
      const wickets = parseInt(args[1]);
      if (isNaN(wickets) || wickets < 1 || wickets > 10) {
          return ctx.reply("Usage: /set_wickets [1-10]");
      }
      
      tour.config.wickets = wickets;
      tour.teamA.inningsRemainingWickets = wickets;
      tour.teamB.inningsRemainingWickets = wickets;
      
      await ctx.reply(`⚙️ <b>Wickets updated to:</b> <code>${wickets}</code> wickets.`, { parse_mode: 'HTML' });
  });

  bot.command('powersurge', async (ctx) => {
      const tour = tourManager.getUserTour(ctx.from.id) || [...tourManager.getAllTours()].find(t => t.chatId === ctx.chat.id);
      if (!tour) return ctx.reply("⚠️ No active Tour match found.");
      
      const isAllowed = ctx.from.id === tour.hostId || ctx.from.id === tour.teamA.captainId || ctx.from.id === tour.teamB.captainId;
      if (!isAllowed) return ctx.reply("❌ Only the host or captains can toggle Power Surge.");
      
      tour.powerSurge = !tour.powerSurge;
      
      if (tour.powerSurge) {
          await ctx.reply(
              `⚡️ <b>Power Surge Activated!</b>\n\n` +
              `🏏 Batsman can now play <b>5</b>.\n` +
              `🥎 Bowler can now bowl <b>Leg Cutter</b>!`,
              { parse_mode: 'HTML' }
          );
      } else {
          await ctx.reply(`⚡️ <b>Power Surge Deactivated!</b>`, { parse_mode: 'HTML' });
      }
  });

  bot.command('teamname', async (ctx) => {
      const txt = ctx.message.text.split(' ').slice(1).join(' ');
      if (!txt) return ctx.reply("Usage: /teamname [New Team Name]");
      
      const tour = tourManager.getUserTour(ctx.from.id);
      if (!tour) return ctx.reply("You are not in an active Tour match.");
      
      const res = tourManager.renameTeam(tour.id, ctx.from.id, txt);
      if (!res.success) return ctx.reply("❌ " + res.error);
      
      await ctx.reply(`✅ Team renamed to: <b>${res.teamName}</b>`, { parse_mode: 'HTML' });
  });

  bot.command(['appointa_captain', 'appointb_captain', 'captain'], async (ctx) => {
      const tour = tourManager.getUserTour(ctx.from.id);
      if (!tour) return ctx.reply("You are not in an active Tour match.");
      
      let targetUserId = null;
      let first_name = "";
      if (ctx.message.reply_to_message) {
          targetUserId = ctx.message.reply_to_message.from.id;
          first_name = ctx.message.reply_to_message.from.first_name;
      } else {
          const args = ctx.message.text.split(' ');
          const teamChar = args[1]?.toUpperCase();
          const index = parseInt(args[2]);
          if (teamChar && (teamChar === 'A' || teamChar === 'B') && !isNaN(index)) {
              const teamKey = teamChar === 'A' ? 'teamA' : 'teamB';
              const team = tour[teamKey];
              const player = team.players[index - 1];
              if (player) {
                  targetUserId = player.id;
                  first_name = player.first_name;
              }
          }
      }
      
      if (!targetUserId) {
          return ctx.reply("Usage: Reply to a player with this command, or use `/captain [A/B] [index]`");
      }
      
      let teamKey = null;
      if (tour.teamA.players.some(p => p.id === targetUserId)) teamKey = 'teamA';
      else if (tour.teamB.players.some(p => p.id === targetUserId)) teamKey = 'teamB';
      
      if (!teamKey) return ctx.reply("Player not found in any team.");
      
      const isHost = tour.hostId === ctx.from.id;
      const isCaptain = tour[teamKey].captainId === ctx.from.id;
      if (!isHost && !isCaptain) {
          return ctx.reply("❌ Only the host or the current captain of this team can change the captain.");
      }
      
      const success = tourManager.appointCaptain(tour.id, ctx.from.id, targetUserId, teamKey);
      if (success) {
          await ctx.reply(`👑 <b>${escapeHtml(first_name)}</b> is now the captain of <b>${escapeHtml(tour[teamKey].name)}</b>!`, { parse_mode: 'HTML' });
      } else {
          await ctx.reply("❌ Failed to appoint captain.");
      }
  });

  bot.command(['adda', 'addb'], async (ctx) => {
      const isTeamA = ctx.message.text.toLowerCase().includes('adda');
      const tour = tourManager.getUserTour(ctx.from.id);
      if (!tour) return ctx.reply("You are not in an active Tour match.");
      
      // Permission: host or captain
      const isHost = tour.hostId === ctx.from.id;
      const isCapA = tour.teamA.captainId === ctx.from.id;
      const isCapB = tour.teamB.captainId === ctx.from.id;
      
      if (!isHost && !isCapA && !isCapB) {
          return ctx.reply("Only the host or captains can add players.");
      }
      
      let targetUser = null;
      if (ctx.message.reply_to_message) {
          targetUser = ctx.message.reply_to_message.from;
      }
      
      if (!targetUser) return ctx.reply("Please reply to the user's message you want to add.");
      
      const teamKey = isTeamA ? 'teamA' : 'teamB';
      const res = tourManager.joinTeam(tour.id, { id: targetUser.id, first_name: targetUser.first_name }, teamKey);
      
      if (res.success) {
          await ctx.reply(`✅ Added <b>${escapeHtml(targetUser.first_name)}</b> to <b>${escapeHtml(tour[teamKey].name)}</b>!`, { parse_mode: 'HTML' });
          if (tour.state === 'SELECT_BATTERS' || tour.state === 'WICKET_FALL' || tour.state === 'SELECT_BOWLER') {
              await promptPlayerSelection(ctx, tour);
          }
      } else {
          await ctx.reply(`❌ ${res.error}`);
      }
  });

  bot.command('remove_player', async (ctx) => {
      const tour = tourManager.getUserTour(ctx.from.id);
      if (!tour) return ctx.reply("You are not in an active Tour match.");
      
      let targetUserId = null;
      let first_name = "";
      
      if (ctx.message.reply_to_message) {
          targetUserId = ctx.message.reply_to_message.from.id;
          first_name = ctx.message.reply_to_message.from.first_name;
      } else {
          const args = ctx.message.text.split(' ');
          const teamChar = args[1]?.toUpperCase();
          const index = parseInt(args[2]);
          if (teamChar && (teamChar === 'A' || teamChar === 'B') && !isNaN(index)) {
              const teamKey = teamChar === 'A' ? 'teamA' : 'teamB';
              const team = tour[teamKey];
              const player = team.players[index - 1];
              if (player) {
                  targetUserId = player.id;
                  first_name = player.first_name;
              }
          }
      }
      
      if (!targetUserId) {
          return ctx.reply("Usage: Reply to a player with this command, or use `/remove_player [A/B] [index]`");
      }
      
      const res = tourManager.removePlayer(tour.id, ctx.from.id, targetUserId);
      if (res.success) {
          await ctx.reply(`🚪 <b>${escapeHtml(first_name)}</b> was removed from the match.`, { parse_mode: 'HTML' });
          if (res.clearedActive) {
              await ctx.reply("⚠️ Active batsman/bowler was removed. Captains, please select replacement.");
          }
          if (tour.state === 'SELECT_BATTERS' || tour.state === 'WICKET_FALL' || tour.state === 'SELECT_BOWLER') {
              await promptPlayerSelection(ctx, tour);
          }
      } else {
          await ctx.reply(`❌ ${res.error}`);
      }
  });

  bot.command('batting', async (ctx) => {
      const tour = tourManager.getUserTour(ctx.from.id);
      if (!tour) return ctx.reply("You are not in an active Tour match.");
      
      const batT = tour[tour.battingTeamId];
      if (ctx.from.id !== tour.hostId && (!batT || ctx.from.id !== batT.captainId)) {
          return ctx.reply("Only the host or batting captain can change batting players.");
      }
      
      const args = ctx.message.text.split(' ');
      const index = parseInt(args[1]);
      const posArg = args[2]?.toUpperCase(); 
      
      if (isNaN(index)) return ctx.reply("Usage: /batting [index] [S/NS]");
      
      const position = posArg === 'NS' ? 'NS' : 'S';
      
      const res = tourManager.setBatsman(tour.id, ctx.from.id, index, position);
      if (res.success) {
          await ctx.reply(`✅ <b>${escapeHtml(res.player.first_name)}</b> is now playing as <b>${position === 'S' ? 'Striker' : 'Non-Striker'}</b>!`, { parse_mode: 'HTML' });
          if (tour.state === 'SELECT_BATTERS' || tour.state === 'WICKET_FALL' || tour.state === 'SELECT_BOWLER') {
              await promptPlayerSelection(ctx, tour);
          } else if (tour.state === 'PLAYING') {
              await tagActivePlayers(ctx, tour);
              const striker = batT.players.find(p => p.id === batT.strikerId);
              const bowler = tour[tour.bowlingTeamId].players.find(p => p.id === tour.activeBowlerId);
              if (striker) {
                  try { await ctx.api.sendMessage(striker.id, tour.powerSurge
                      ? "🔄 <b>Lineup Swapped!</b> Please submit/re-submit your shot number in DM (0, 1, 2, 3, 4, 5, 6):"
                      : "🔄 <b>Lineup Swapped!</b> Please submit/re-submit your shot number in DM (0, 1, 2, 3, 4, 6):", { parse_mode: 'HTML' }); } catch(e){}
              }
              if (bowler) {
                  try { await ctx.api.sendMessage(bowler.id, tour.powerSurge
                      ? "🔄 <b>Lineup Swapped!</b> Please submit/re-submit your delivery in DM (RS, Bouncer, Yorker, Short, Slower, Leg Cutter, Knuckle):"
                      : "🔄 <b>Lineup Swapped!</b> Please submit/re-submit your delivery in DM (RS, Bouncer, Yorker, Short, Slower, Knuckle):", { parse_mode: 'HTML' }); } catch(e){}
              }
          }
      } else {
          await ctx.reply(`❌ ${res.error}`);
      }
  });

  bot.command('bowling', async (ctx) => {
      const tour = tourManager.getUserTour(ctx.from.id);
      if (!tour) return ctx.reply("You are not in an active Tour match.");
      
      const bowlT = tour[tour.bowlingTeamId];
      if (ctx.from.id !== tour.hostId && (!bowlT || ctx.from.id !== bowlT.captainId)) {
          return ctx.reply("Only the host or bowling captain can change bowling players.");
      }
      
      const args = ctx.message.text.split(' ');
      const index = parseInt(args[1]);
      
      if (isNaN(index)) return ctx.reply("Usage: /bowling [index]");
      
      const res = tourManager.setBowler(tour.id, ctx.from.id, index);
      if (res.success) {
          await ctx.reply(`✅ <b>${escapeHtml(res.player.first_name)}</b> is bowling!`, { parse_mode: 'HTML' });
          if (tour.state === 'PLAYING') {
              await tagActivePlayers(ctx, tour);
              const batTeam = tour[tour.battingTeamId];
              const striker = batTeam.players.find(p => p.id === batTeam.strikerId);
              const bowler = bowlT.players.find(p => p.id === tour.activeBowlerId);
              if (striker) {
                  try { await ctx.api.sendMessage(striker.id, tour.powerSurge
                      ? "🔄 <b>Lineup Swapped!</b> Please submit/re-submit your shot number in DM (0, 1, 2, 3, 4, 5, 6):"
                      : "🔄 <b>Lineup Swapped!</b> Please submit/re-submit your shot number in DM (0, 1, 2, 3, 4, 6):", { parse_mode: 'HTML' }); } catch(e){}
              }
              if (bowler) {
                  try { await ctx.api.sendMessage(bowler.id, tour.powerSurge
                      ? "🔄 <b>Lineup Swapped!</b> Please submit/re-submit your delivery in DM (RS, Bouncer, Yorker, Short, Slower, Leg Cutter, Knuckle):"
                      : "🔄 <b>Lineup Swapped!</b> Please submit/re-submit your delivery in DM (RS, Bouncer, Yorker, Short, Slower, Knuckle):", { parse_mode: 'HTML' }); } catch(e){}
              }
          } else if (tour.state === 'SELECT_BOWLER') {
              await promptPlayerSelection(ctx, tour);
          }
      } else {
          await ctx.reply(`❌ ${res.error}`);
      }
  });

  bot.command(['lms', 'mls'], async (ctx) => {
      const tour = tourManager.getUserTour(ctx.from.id);
      if (!tour) return ctx.reply("You are not in an active Tour match.");
      
      const res = tourManager.triggerLMS(tour.id, ctx.from.id);
      if (res.success) {
          const batT = tour[tour.battingTeamId];
          const striker = batT.players.find(p => p.id === batT.strikerId);
          const strikerName = striker ? striker.first_name : 'None';
          await ctx.reply(`✅ <b>LMS Enabled!</b> Striker is now <b>${escapeHtml(strikerName)}</b>.`, { parse_mode: 'HTML' });
          if (tour.state === 'SELECT_BOWLER') {
              const bowlT = tour[tour.bowlingTeamId];
              const kb = new InlineKeyboard();
              bowlT.players.forEach(p => {
                  if (p.id !== tour.previousBowlerId || bowlT.players.length === 1) {
                      kb.text(p.first_name, `tour_selectbowl_${tour.id}_${bowlT.players.indexOf(p) + 1}`).row();
                  }
              });
              await ctx.reply(`👉 Captain of ${escapeHtml(bowlT.name)}, select bowler:`, { reply_markup: kb, parse_mode: 'HTML' });
          } else if (tour.state === 'PLAYING') {
              await tagActivePlayers(ctx, tour);
          }
      } else {
          await ctx.reply(`❌ ${res.error}`);
      }
  });

  bot.command('rebat', async (ctx) => {
      const tour = tourManager.getUserTour(ctx.from.id);
      if (!tour) return ctx.reply("You are not in an active Tour match.");
      
      const args = ctx.message.text.split(' ');
      const teamChar = args[1]?.toUpperCase();
      const index = parseInt(args[2]);
      
      if (!teamChar || (teamChar !== 'A' && teamChar !== 'B') || isNaN(index)) {
          return ctx.reply("Usage: /rebat [A/B] [playerIndex]");
      }
      
      const teamKey = teamChar === 'A' ? 'teamA' : 'teamB';
      const team = tour[teamKey];
      
      if (ctx.from.id !== tour.hostId && ctx.from.id !== team.captainId) {
          return ctx.reply("Only the host or team captain can allow a rebat.");
      }
      
      const res = tourManager.rebatPlayer(tour.id, tour.hostId, teamChar, index);
      if (res) {
          const cleanName = res.first_name.replace(/\s*\(rebat\)/gi, '');
          await ctx.reply(`🔄 <b>${escapeHtml(cleanName)} (rebat)</b> has been registered!`, { parse_mode: 'HTML' });
          if (tour.state === 'LOBBY') {
              await ctx.reply(renderLobby(tour), { reply_markup: getLobbyKeyboard(tour), parse_mode: 'HTML' });
          } else {
              await ctx.reply(renderScoreboard(tour), { parse_mode: 'HTML' });
              if (tour.state === 'PLAYING') {
                  await tagActivePlayers(ctx, tour);
              } else if (tour.state === 'SELECT_BATTERS' || tour.state === 'WICKET_FALL' || tour.state === 'SELECT_BOWLER') {
                  await promptPlayerSelection(ctx, tour);
              }
          }
      } else {
          await ctx.reply("❌ Failed to register rebat. Make sure player index is correct.");
      }
  });

  bot.command('teams', async (ctx) => {
      const tour = tourManager.getUserTour(ctx.from.id) || [...tourManager.getAllTours()].find(t => t.chatId === ctx.chat.id);
      if (!tour) return ctx.reply("No active tour found.");
      
      let text = `👥 <b>Roster for ${escapeHtml(tour.teamA.name)}:</b>\n`;
      tour.teamA.players.forEach((p, i) => {
          const cap = p.id === tour.teamA.captainId ? " (C)" : "";
          const active = (p.id === tour.teamA.strikerId ? " (Striker)" : "") || (p.id === tour.teamA.nonStrikerId ? " (Non-Striker)" : "");
          const out = tour.teamA.outPlayers.includes(p.id) ? " (Out)" : "";
          text += `${i + 1}. ${escapeHtml(p.first_name)}${cap}${active}${out}\n`;
      });
      
      text += `\n👥 <b>Roster for ${escapeHtml(tour.teamB.name)}:</b>\n`;
      tour.teamB.players.forEach((p, i) => {
          const cap = p.id === tour.teamB.captainId ? " (C)" : "";
          const active = (p.id === tour.activeBowlerId ? " (Bowler)" : "");
          text += `${i + 1}. ${escapeHtml(p.first_name)}${cap}${active}\n`;
      });
      
      await ctx.reply(text, { parse_mode: 'HTML' });
  });

  bot.command('canceltour', async (ctx) => {
      await ctx.reply("⚠️ The <code>/canceltour</code> command has been moved to <code>/endtour</code>.\n\nPlease type <code>/endtour confirm</code> to end the active Tour match.", { parse_mode: 'HTML' });
  });

  bot.command('score', async (ctx) => {
      const tour = tourManager.getUserTour(ctx.from.id) || [...tourManager.getAllTours()].find(t => t.chatId === ctx.chat.id);
      if (!tour) return ctx.reply("No active tour found.");
      
      const totalScore = (team) => Math.max(0, (team.score || 0) + (team.bonusRuns || 0) - (team.penaltyRuns || 0));
      
      let text = `📊 <b>Current Match Scorecard</b> 📊\n`;
      text += `───────────────────\n`;
      
      const team1Key = tour.firstBattingTeamId || 'teamA';
      const team2Key = team1Key === 'teamA' ? 'teamB' : 'teamA';
      const team1 = tour[team1Key];
      const team2 = tour[team2Key];
      
      const team1Score = totalScore(team1);
      const team2Score = totalScore(team2);
      
      const getOversStr = (balls) => {
          const ov = Math.floor((balls || 0) / 6);
          const bl = (balls || 0) % 6;
          return `${ov}.${bl}`;
      };
      
      const t1Overs = tour.innings1Balls !== undefined ? getOversStr(tour.innings1Balls) : (tour.innings === 1 ? getOversStr(tour.balls) : `${tour.config.overs}.0`);
      const t2Overs = tour.innings2Balls !== undefined ? getOversStr(tour.innings2Balls) : (tour.innings === 2 ? getOversStr(tour.balls) : `0.0`);
      
      // Team 1 Batting
      text += `🏏 <b>${escapeHtml(team1.name)}</b>: <b>${team1Score}/${team1.wickets || 0}</b> (${t1Overs} ov)\n`;
      team1.players.forEach(p => {
          if (p.balls > 0 || p.runs > 0) {
              text += `   • ${escapeHtml(p.first_name)}: ${p.runs || 0} (${p.balls || 0}b)\n`;
          }
      });
      // Team 1 Bowling
      text += `🥎 Bowlers:\n`;
      team2.players.forEach(p => {
          if (p.ballsBowled > 0) {
              const ov = Math.floor(p.ballsBowled / 6);
              const bl = p.ballsBowled % 6;
              text += `   • ${escapeHtml(p.first_name)}: ${p.wickets || 0}-${p.runsConceded || 0} (${ov}.${bl} ov)\n`;
          }
      });
      
      text += `───────────────────\n`;
      
      // Team 2 Batting
      text += `🏏 <b>${escapeHtml(team2.name)}</b>: <b>${team2Score}/${team2.wickets || 0}</b> (${t2Overs} ov)\n`;
      team2.players.forEach(p => {
          if (p.balls > 0 || p.runs > 0) {
              text += `   • ${escapeHtml(p.first_name)}: ${p.runs || 0} (${p.balls || 0}b)\n`;
          }
      });
      // Team 2 Bowling
      text += `🥎 Bowlers:\n`;
      team1.players.forEach(p => {
          if (p.ballsBowled > 0) {
              const ov = Math.floor(p.ballsBowled / 6);
              const bl = p.ballsBowled % 6;
              text += `   • ${escapeHtml(p.first_name)}: ${p.wickets || 0}-${p.runsConceded || 0} (${ov}.${bl} ov)\n`;
          }
      });
      
      text += `───────────────────`;
      await ctx.reply(text, { parse_mode: 'HTML' });
  });

  bot.command('penalty', async (ctx) => {
      const tour = tourManager.getUserTour(ctx.from.id);
      if (!tour) return ctx.reply("You are not in an active Tour match.");
      if (tour.hostId !== ctx.from.id) return ctx.reply("Only the host can issue penalties.");
      
      const args = ctx.message.text.split(' ');
      const teamChar = args[1]?.toUpperCase();
      const runs = parseInt(args[2]);
      if (!teamChar || (teamChar !== 'A' && teamChar !== 'B') || isNaN(runs)) return ctx.reply("Usage: /penalty [A/B] [runs]");
      
      const res = tourManager.adjustRuns(tour.id, ctx.from.id, teamChar, runs, true);
      if (res) {
          await ctx.reply(`🚫 <b>Penalty!</b> ${res.teamName} penalized by ${runs} runs.`, { parse_mode: 'HTML' });
      }
  });

  bot.command('bonus', async (ctx) => {
      const tour = tourManager.getUserTour(ctx.from.id);
      if (!tour) return ctx.reply("You are not in an active Tour match.");
      if (tour.hostId !== ctx.from.id) return ctx.reply("Only the host can award bonuses.");
      
      const args = ctx.message.text.split(' ');
      const teamChar = args[1]?.toUpperCase();
      const runs = parseInt(args[2]);
      if (!teamChar || (teamChar !== 'A' && teamChar !== 'B') || isNaN(runs)) return ctx.reply("Usage: /bonus [A/B] [runs]");
      
      const res = tourManager.adjustRuns(tour.id, ctx.from.id, teamChar, runs, false);
      if (res) {
          await ctx.reply(`✨ <b>Bonus!</b> ${res.teamName} awarded ${runs} runs.`, { parse_mode: 'HTML' });
      }
  });

  bot.command('endtour', async (ctx) => {
      const tour = tourManager.getUserTour(ctx.from.id) || [...tourManager.getAllTours()].find(t => t.chatId === ctx.chat.id);
      if (!tour) return ctx.reply("No active Tour match in this chat.");
      
      const isHost = tour.hostId === ctx.from.id;
      const isAdmin = await isGCAdmin(ctx);
      if (!isHost && !isAdmin) {
          return ctx.reply("❌ Only the host or a group administrator can end the tour.");
      }
      
      const text = ctx.message.text.trim().toLowerCase();
      const parts = text.split(/\s+/);
      const isConfirm = parts[1] === 'confirm';
      
      if (isConfirm) {
          tourManager.deleteTour(tour.id);
          await ctx.reply("🛑 <b>The Tour match has been ended.</b>", { parse_mode: 'HTML' });
      } else {
          await ctx.reply(
              "⚠️ <b>WARNING: Ending Tour Match</b>\n\n" +
              "Are you sure you want to end this Tour match? All current progress will be lost.\n\n" +
              "To confirm, type:\n<code>/endtour confirm</code>",
              { parse_mode: 'HTML' }
          );
      }
  });

  bot.command('tourresume', async (ctx) => {
      const tour = tourManager.getUserTour(ctx.from.id) || [...tourManager.getAllTours()].find(t => t.chatId === ctx.chat.id);
      if (!tour) return ctx.reply("No active Tour match in this chat.");
      if (tour.hostId !== ctx.from.id) return ctx.reply("Only the host can resume the tour.");
      
      tour.processingBall = false;
      tour.choices = { batChoice: null, bowlChoice: null, bowlNum: null };
      
      await ctx.reply("🔄 <b>Tour Match Resumed!</b>\nChoices reset. Active players, please submit your plays again.", { parse_mode: 'HTML' });
      await tagActivePlayers(ctx, tour);
  });

  bot.command('tourhelp', async (ctx) => {
      await ctx.reply(
          "📜 <b>Tour Mode Commands:</b>\n" +
          "1. /tour - Start interactive Tour lobby\n" +
          "2. /teamname [Name] - Rename your team (Captains)\n" +
          "3. /captain [A/B] [index] - Appoint captain (Host)\n" +
          "4. /adda / /addb - (Reply to user) Add player to team mid-game\n" +
          "5. /remove_player - (Reply or [A/B] [index]) Kick player\n" +
          "6. /batting [index] [S/NS] - Select/re-select batter\n" +
          "7. /bowling [index] - Select/re-select bowler\n" +
          "8. /teams - View roster indices\n" +
          "9. /penalty [A/B] [runs] / /bonus [A/B] [runs]\n" +
          "10. /set_overs [overs] - Set match overs (Host/Captains in lobby)\n" +
          "11. /set_wickets [wickets] - Set match wickets (Host/Captains in lobby)\n" +
          "12. /powersurge - Toggle Power Surge (Host/Captains)\n" +
          "13. /endtour - Safely cancel the Tour match\n" +
          "14. /tourresume - Resume match if stuck (Host)\n",
          { parse_mode: 'HTML' }
      );
  });

  // --- DM Hook routing logic ---

  bot.tourTextHook = async (ctx, tour, txt) => {
    const batT = tour[tour.battingTeamId];
    const isStriker = batT && ctx.from.id.toString() === getBasePlayerId(batT.strikerId);

    const res = tourManager.submitPlay(tour.id, ctx.from.id, txt);
    if (!res.success) {
        if (res.error === 'Not currently playing.') return false;
        return ctx.reply("❌ " + res.error);
    }
    
    if (isStriker) ctx.reply(`✅ You played: ${res.batStr || txt}`);
    else {
        const bowlVal = res.bowlStr || tour.choices.bowlChoice || txt;
        const DELIVERY_NAMES = {
            '0': 'RS', 'rs': 'RS',
            '1': 'Bouncer', 'bouncer': 'Bouncer',
            '2': 'Yorker', 'yorker': 'Yorker',
            '3': 'Short', 'short': 'Short',
            '4': 'Slower', 'slower': 'Slower',
            '5': 'Leg Cutter', 'leg cutter': 'Leg Cutter', 'legcutter': 'Leg Cutter',
            '6': 'Knuckle', 'knuckle': 'Knuckle'
        };
        const displayName = DELIVERY_NAMES[String(bowlVal).toLowerCase()] || bowlVal;
        ctx.reply(`✅ You bowled: ${displayName}`);
    }
    
    if (res.waiting) {
        const striker = batT.players.find(p => p.id === batT.strikerId);
        const bowler = tour[tour.bowlingTeamId].players.find(p => p.id === tour.activeBowlerId);
        const waitingForBowler = tour.choices.batChoice !== null && tour.choices.bowlChoice === null;
        const waitingForBatter = tour.choices.bowlChoice !== null && tour.choices.batChoice === null;
        
        if (waitingForBowler && ctx.from.id.toString() === getBasePlayerId(striker.id)) {
            try { await ctx.api.sendMessage(Number(getBasePlayerId(bowler.id)), tour.powerSurge
                ? "⚾ Please submit your delivery (RS, Bouncer, Yorker, Short, Slower, Leg Cutter, Knuckle) in DM!"
                : "⚾ Please submit your delivery (RS, Bouncer, Yorker, Short, Slower, Knuckle) in DM!"); } catch(e){}
        } else if (waitingForBatter && ctx.from.id.toString() === getBasePlayerId(bowler.id)) {
            try { await ctx.api.sendMessage(Number(getBasePlayerId(striker.id)), tour.powerSurge
                ? "🏏 Please submit your shot (0, 1, 2, 3, 4, 5, 6) in DM!"
                : "🏏 Please submit your shot (0, 1, 2, 3, 4, 6) in DM!"); } catch(e){}
        }
        return true;
    }
    
    handleTourResult(ctx, res).catch(err => console.error("Error in handleTourResult:", err));
    return true; 
  };

  async function handleTourResult(ctx, res) {
          const { tour, batStr, bowlStr, isWicket } = res;
      try {
          const batT = tour[tour.battingTeamId];
          const bowlT = tour[tour.bowlingTeamId];
          
          const over = Math.floor((res.ballsThisRound - 1) / 6);
          const ballInOver = ((res.ballsThisRound - 1) % 6) + 1;

          const cleanBatsmanName = escapeHtml(res.batsmanName || 'Batsman');
          const cleanBowlerName = escapeHtml(res.bowlerName || 'Bowler');
          
          await ctx.api.sendMessage(tour.chatId, `⚾ <b>Over ${over+1} | Ball ${ballInOver}</b>`, { parse_mode: 'HTML' });
          await sleep(1500); 
          await ctx.api.sendMessage(tour.chatId, `👉 ${cleanBowlerName} bowls a <b>${bowlStr}</b>!`, { parse_mode: 'HTML' });
          await sleep(1500);
          
          if (isWicket) {
              await sendEventUpdate(ctx, tour.chatId, "out", cleanBatsmanName, cleanBowlerName);
          } else {
              await sendEventUpdate(ctx, tour.chatId, batStr, cleanBatsmanName, cleanBowlerName);
          }
          await sleep(1000);

          // Milestone celebrations
          if (res.hit50) {
              await sendEventUpdate(ctx, tour.chatId, "50", cleanBatsmanName, cleanBowlerName);
              await ctx.api.sendMessage(tour.chatId, `🎉 <b>Half-Century!</b> Magnificent batting by <b>${cleanBatsmanName}</b>! 50 runs up! 👏`, { parse_mode: 'HTML' });
              await sleep(1500);
          }
          if (res.hit100) {
              await sendEventUpdate(ctx, tour.chatId, "100", cleanBatsmanName, cleanBowlerName);
              await ctx.api.sendMessage(tour.chatId, `🏆 <b>CENTURY!</b> A sensational milestone for <b>${cleanBatsmanName}</b>! 100 runs in a masterclass innings! 👑`, { parse_mode: 'HTML' });
              await sleep(1500);
          }
          if (res.hitDuck) {
              await sendEventUpdate(ctx, tour.chatId, "duck", cleanBatsmanName, cleanBowlerName);
              await sleep(1500);
          }
          if (res.hitHattrick) {
              await ctx.api.sendMessage(tour.chatId, `🔥 <b>💥 HATTRICK! 💥</b> <b>${cleanBowlerName}</b> has taken 3 wickets in 3 balls! Unbelievable scenes here! 🥳`, { parse_mode: 'HTML' });
              await sleep(1500);
          }
          if (res.hitFiveWickets) {
              await ctx.api.sendMessage(tour.chatId, `🖐️ <b>5-WICKET HAUL!</b> <b>${cleanBowlerName}</b> completes a brilliant 5-wicket haul! Absolute class bowling! 🥎`, { parse_mode: 'HTML' });
              await sleep(1500);
          }
          
          await ctx.api.sendMessage(tour.chatId, renderScoreboard(tour), { parse_mode: 'HTML' });

          // Pacing delay
          await sleep(1500);

          if (res.matchEnded) {
              const s1 = (tour.teamA.score || 0) + (tour.teamA.bonusRuns || 0) - (tour.teamA.penaltyRuns || 0);
              const s2 = (tour.teamB.score || 0) + (tour.teamB.bonusRuns || 0) - (tour.teamB.penaltyRuns || 0);
              const firstBat = tour.firstBattingTeamId || 'teamA';
              const secondBat = firstBat === 'teamA' ? 'teamB' : 'teamA';
              
              let resultText = "The match ended in a tie!";
              let winnerTeamId = null;
              if (s1 !== s2) {
                  winnerTeamId = s1 > s2 ? 'teamA' : 'teamB';
                  const winnerName = escapeHtml(tour[winnerTeamId].name);
                  if (winnerTeamId === secondBat) {
                      const wicketsLeft = tour.config.wickets - tour[secondBat].wickets;
                      resultText = `${winnerName} won by ${wicketsLeft} wicket${wicketsLeft > 1 ? 's' : ''}`;
                  } else {
                      const runsMargin = Math.abs(s1 - s2);
                      resultText = `${winnerName} won by ${runsMargin} run${runsMargin > 1 ? 's' : ''}`;
                  }
              }
              
              const potmName = res.motm ? res.motm.first_name : null;
              const potmId = res.motm ? res.motm.id : null;

              // Record player career stats
              try {
                  const careerStatsHelper = require('../db/careerStats');
                  await careerStatsHelper.recordMatchStats(tour, potmId, winnerTeamId);
              } catch (e) {
                  console.error("Failed to record career stats:", e);
              }
              
              let msg = s1 === s2 ? "🤝 <b>The match is a tie!</b>" : `🏆 <b>${resultText}!</b> 🎉`;
              if (res.motm) msg += `\n🎖 <b>POTM:</b> ${escapeHtml(res.motm.first_name)}`;
              
              try {
                  const buffer = await generateScoreboardImage(tour, resultText, potmName);
                  if (buffer) {
                      await ctx.api.sendPhoto(tour.chatId, new InputFile(buffer, 'scorecard.png'), {
                          caption: msg,
                          parse_mode: 'HTML'
                      });
                  } else {
                      await ctx.api.sendMessage(tour.chatId, msg, { parse_mode: 'HTML' });
                  }
              } catch (e) {
                  console.error("Failed to generate/send TV scorecard image:", e);
                  await ctx.api.sendMessage(tour.chatId, msg, { parse_mode: 'HTML' });
              }
              
              tourManager.deleteTour(tour.id);
          } else if (res.inningsEnded) {
              tour.innings = 2;
              tour.balls = 0;
              const temp = tour.battingTeamId;
              tour.battingTeamId = tour.bowlingTeamId;
              tour.bowlingTeamId = temp;
              
              tour.teamA.strikerId = null;
              tour.teamA.nonStrikerId = null;
              tour.teamB.strikerId = null;
              tour.teamB.nonStrikerId = null;
              tour.activeBowlerId = null;
              tour.previousBowlerId = null;
              
              tour.state = 'SELECT_BATTERS';
              
              const newBatT = tour[tour.battingTeamId];
              const newBowlT = tour[tour.bowlingTeamId];
              const target = tourManager.totalScore(newBowlT) + 1;

              const escapedNewBatTName = escapeHtml(newBatT.name);

              await ctx.api.sendMessage(tour.chatId, 
                  `🏁 <b>First Innings Over!</b>\nTarget for <b>${escapedNewBatTName}</b>: <b>${target} runs</b>`, 
                  { parse_mode: 'HTML' }
              );
              
              const kb = new InlineKeyboard();
              newBatT.players.forEach(p => kb.text(p.first_name, `tour_selectbat_${tour.id}_S_${newBatT.players.indexOf(p) + 1}`).row());
              
              await ctx.api.sendMessage(tour.chatId, 
                  `🏏 <b>${escapedNewBatTName}</b> Captain, select your <b>first opening batter (Striker)</b>:`, 
                  { reply_markup: kb, parse_mode: 'HTML' }
              );
          } else if (res.needsNewBatsman) {
              const batT = tour[tour.battingTeamId];
              const available = batT.players.filter(p => !batT.outPlayers.includes(p.id) && p.id !== batT.strikerId && p.id !== batT.nonStrikerId);
              
              if (available.length > 0) {
                  const kb = new InlineKeyboard();
                  available.forEach(p => kb.text(p.first_name, `tour_selectbat_${tour.id}_S_${batT.players.indexOf(p) + 1}`).row());
                  kb.text("LMS (Play 1 Batter) 🏏", `tour_lms_${tour.id}`).row();
                  await ctx.api.sendMessage(tour.chatId, `☝️ <b>Wicket!</b>\nCaptain, select new batsman or choose LMS:`, { reply_markup: kb, parse_mode: 'HTML' });
              } else {
                  await tagActivePlayers(ctx, tour);
              }
          } else if (res.needsNewBowler) {
              const bowlT = tour[tour.bowlingTeamId];
              const kb = new InlineKeyboard();
              bowlT.players.forEach(p => {
                  if (p.id !== tour.previousBowlerId || bowlT.players.length === 1) {
                      kb.text(p.first_name, `tour_selectbowl_${tour.id}_${bowlT.players.indexOf(p) + 1}`).row();
                  }
              });
              await ctx.api.sendMessage(tour.chatId, `🔚 <b>Over Over!</b>\nCaptain, select new bowler:`, { reply_markup: kb, parse_mode: 'HTML' });
          } else {
              await tagActivePlayers(ctx, tour);
          }
      } finally {
          if (!res.matchEnded) {
              tour.processingBall = false;
          }
      }
  }

  bot.tourTagActive = async (ctx, tour) => {
      await tagActivePlayers(ctx, tour);
  };

  // --- Callback Query handlers ---
  bot.on('callback_query:data', async (ctx, next) => {
      try {
          const data = ctx.callbackQuery.data;
          const userId = ctx.from.id;

          if (!data.startsWith('tour_')) return next();

      if (data.startsWith('tour_join_')) {
          const parts = data.split('_');
          const tourId = parts[2];
          const teamKey = parts[3];
          const res = tourManager.joinTeam(tourId, { id: userId, first_name: ctx.from.first_name }, teamKey);
          if (!res.success) return ctx.answerCallbackQuery({ text: res.error, show_alert: true });
          
          if (res.left) ctx.answerCallbackQuery("Left the team!");
          else ctx.answerCallbackQuery("Joined!");
          
          await ctx.editMessageText(renderLobby(res.tour), { reply_markup: getLobbyKeyboard(res.tour), parse_mode: 'HTML' });
          return;
      }



      if (data.startsWith('tour_start_')) {
          const tourId = data.split('_')[2];
          const res = tourManager.startTour(tourId, userId);
          if (!res.success) return ctx.answerCallbackQuery({ text: res.error, show_alert: true });
          
          ctx.answerCallbackQuery("Match Starting!");
          
          const tour = res.tour;
          const capA = tour.teamA.players.find(p => p.id === tour.teamA.captainId) || tour.teamA.players[0];
          
          const kb = new InlineKeyboard().text("Heads 🪙", `tour_tosschoice_${tourId}_heads`).text("Tails 🪙", `tour_tosschoice_${tourId}_tails`);
          await ctx.editMessageText(
              `🪙 <b>Toss Phase</b> 🪙\n\n` +
              `👉 Captain of <b>${escapeHtml(tour.teamA.name)}</b> (<a href="tg://user?id=${capA.id}">${escapeHtml(capA.first_name)}</a>), choose Heads or Tails:`,
              { reply_markup: kb, parse_mode: 'HTML' }
          );
          return;
      }

      if (data.startsWith('tour_cancellobby_')) {
          const tourId = data.split('_')[2];
          const tour = tourManager.getTour(tourId);
          if (!tour) return ctx.answerCallbackQuery();
          if (tour.hostId !== userId) return ctx.answerCallbackQuery({ text: "Only the host can cancel the lobby.", show_alert: true });
          
          tourManager.deleteTour(tourId);
          await ctx.editMessageText("❌ The Tour Match lobby has been cancelled by the host.");
          ctx.answerCallbackQuery("Lobby cancelled.");
          return;
      }

      if (data.startsWith('tour_tosschoice_')) {
          const parts = data.split('_');
          const tourId = parts[2];
          const choice = parts[3];
          const tour = tourManager.getTour(tourId);
          if (!tour || tour.state !== 'TOSS') return ctx.answerCallbackQuery();
          if (userId !== tour.teamA.captainId) return ctx.answerCallbackQuery({ text: "Only Team A Captain can choose heads/tails!", show_alert: true });
          
          const tossResult = tourManager.handleToss(tourId, userId, choice);
          if (!tossResult) return ctx.answerCallbackQuery();
          
          ctx.answerCallbackQuery(`flipped: ${tossResult.tossResult}!`);
          const winner = tour[tossResult.winnerTeam === 'A' ? 'teamA' : 'teamB'];
          const cap = winner.players.find(p => p.id === winner.captainId);
          
          const kb = new InlineKeyboard().text("Bat First 🏏", `tour_rolechoice_${tourId}_bat`).text("Bowl First 🥎", `tour_rolechoice_${tourId}_bowl`);
          await ctx.editMessageText(
              `🪙 Coin landed on: <b>${tossResult.tossResult.toUpperCase()}</b>\n` +
              `🏆 Toss won by <b>${escapeHtml(winner.name)}</b>!\n\n` +
              `👉 Captain <a href="tg://user?id=${cap.id}">${escapeHtml(cap.first_name)}</a>, elect to Bat or Bowl first:`,
              { reply_markup: kb, parse_mode: 'HTML' }
          );
          return;
      }

      if (data.startsWith('tour_rolechoice_')) {
          const parts = data.split('_');
          const tourId = parts[2];
          const role = parts[3];
          const tour = tourManager.getTour(tourId);
          if (!tour || tour.state !== 'CHOOSE') return ctx.answerCallbackQuery();
          if (userId !== tour.tossWinnerId) return ctx.answerCallbackQuery({ text: "Only the toss winner can select!", show_alert: true });
          
          const isWinnerTeamA = tour.teamA.captainId === userId;
          if (role === 'bat') {
              tour.battingTeamId = isWinnerTeamA ? 'teamA' : 'teamB';
              tour.bowlingTeamId = isWinnerTeamA ? 'teamB' : 'teamA';
          } else {
              tour.battingTeamId = isWinnerTeamA ? 'teamB' : 'teamA';
              tour.bowlingTeamId = isWinnerTeamA ? 'teamA' : 'teamB';
          }
          
          tour.firstBattingTeamId = tour.battingTeamId;
          tour.state = 'SELECT_BATTERS';
          ctx.answerCallbackQuery("Role selected!");

          const batT = tour[tour.battingTeamId];
          const kb = new InlineKeyboard();
          batT.players.forEach(p => kb.text(p.first_name, `tour_selectbat_${tourId}_S_${batT.players.indexOf(p) + 1}`).row());
          
          await ctx.editMessageText(
              `🚀 <b>Roles Decided!</b>\n` +
              `🏏 Batting: <b>${escapeHtml(tour[tour.battingTeamId].name)}</b>\n` +
              `🥎 Bowling: <b>${escapeHtml(tour[tour.bowlingTeamId].name)}</b>\n\n` +
              `👉 Captain of ${escapeHtml(tour[tour.battingTeamId].name)}, select your <b>first opening batter (Striker)</b>:`,
              { reply_markup: kb, parse_mode: 'HTML' }
          );
          return;
      }

      if (data.startsWith('tour_selectbat_')) {
          const parts = data.split('_');
          const tourId = parts[2];
          const position = parts[3]; 
          const index = parseInt(parts[4]);
          
          const tour = tourManager.getTour(tourId);
          if (!tour) return ctx.answerCallbackQuery();
          
          const batT = tour[tour.battingTeamId];
          const res = tourManager.setBatsman(tourId, userId, index, position);
          if (!res.success) return ctx.answerCallbackQuery({ text: res.error, show_alert: true });
          
          ctx.answerCallbackQuery(`Set batsman: ${res.player.first_name}`);

          const isInitialSetup = (tour.balls === 0 && (!batT.strikerId || !batT.nonStrikerId));
          const activeCount = batT.players.length - batT.outPlayers.length;
          
          if (isInitialSetup && position === 'S' && activeCount > 1) {
              const kb = new InlineKeyboard();
              batT.players.forEach(p => {
                  if (p.id !== batT.strikerId && !batT.outPlayers.includes(p.id)) {
                      kb.text(p.first_name, `tour_selectbat_${tourId}_NS_${batT.players.indexOf(p) + 1}`).row();
                  }
              });
              kb.text("LMS (Play 1 Batter) 🏏", `tour_lms_${tourId}`).row();
              await ctx.editMessageText(
                  `🏏 Selected Striker: <b>${escapeHtml(res.player.first_name)}</b>\n\n` +
                  `👉 Captain of ${escapeHtml(batT.name)}, select your <b>second opening batter (Non-Striker)</b> or choose LMS:`,
                  { reply_markup: kb, parse_mode: 'HTML' }
              );
          } else {
              const isOverEnd = (tour.balls > 0 && tour.balls % 6 === 0);
              if (tour.balls === 0 && !tour.activeBowlerId) {
                  tour.state = 'SELECT_BOWLER';
                  const bowlT = tour[tour.bowlingTeamId];
                  const kb = new InlineKeyboard();
                  bowlT.players.forEach(p => kb.text(p.first_name, `tour_selectbowl_${tourId}_${bowlT.players.indexOf(p) + 1}`).row());
                  
                  const strikerName = batT.players.find(p => p.id === batT.strikerId)?.first_name;
                  const nonStrikerName = batT.players.find(p => p.id === batT.nonStrikerId)?.first_name || 'None (LMS)';

                  await ctx.editMessageText(
                      `🏏 <b>Batters Set!</b>\n` +
                      `Striker: <b>${escapeHtml(strikerName)}</b>\n` +
                      `Non-Striker: <b>${escapeHtml(nonStrikerName)}</b>\n\n` +
                      `👉 Captain of ${escapeHtml(bowlT.name)}, select the <b>Opening Bowler</b>:`,
                      { reply_markup: kb, parse_mode: 'HTML' }
                  );
              } else if (isOverEnd) {
                  tour.state = 'SELECT_BOWLER';
                  const bowlT = tour[tour.bowlingTeamId];
                  const kb = new InlineKeyboard();
                  bowlT.players.forEach(p => {
                      if (p.id !== tour.previousBowlerId || bowlT.players.length === 1) {
                          kb.text(p.first_name, `tour_selectbowl_${tourId}_${bowlT.players.indexOf(p) + 1}`).row();
                      }
                  });
                  
                  await ctx.editMessageText(
                      `🏏 <b>Batsman Selected!</b>\n` +
                      `New Striker: <b>${escapeHtml(res.player.first_name)}</b>\n\n` +
                      `🔚 <b>Over Over!</b>\n` +
                      `👉 Captain of ${escapeHtml(bowlT.name)}, select a new bowler:`,
                      { reply_markup: kb, parse_mode: 'HTML' }
                  );
              } else {
                  tour.state = 'PLAYING';
                  await ctx.editMessageText(
                      `🏏 <b>Batsman Selected!</b>\n` +
                      `New Striker: <b>${escapeHtml(res.player.first_name)}</b>\n\n` +
                      `🟢 Play Resuming...`,
                      { parse_mode: 'HTML' }
                  );
                  await tagActivePlayers(ctx, tour);
              }
          }
          return;
      }

      if (data.startsWith('tour_lms_')) {
          const tourId = data.split('_')[2];
          const tour = tourManager.getTour(tourId);
          if (!tour) return ctx.answerCallbackQuery();
          
          const res = tourManager.triggerLMS(tourId, userId);
          if (!res.success) return ctx.answerCallbackQuery({ text: res.error, show_alert: true });
          
          ctx.answerCallbackQuery("LMS mode enabled!");
          
          const batT = tour[tour.battingTeamId];
          const striker = batT.players.find(p => p.id === batT.strikerId);
          const strikerName = striker ? striker.first_name : 'None';
          
          if (tour.state === 'SELECT_BOWLER') {
              const bowlT = tour[tour.bowlingTeamId];
              const kb = new InlineKeyboard();
              bowlT.players.forEach(p => {
                  if (p.id !== tour.previousBowlerId || bowlT.players.length === 1) {
                      kb.text(p.first_name, `tour_selectbowl_${tourId}_${bowlT.players.indexOf(p) + 1}`).row();
                  }
              });
              
              await ctx.editMessageText(
                  `🏏 <b>LMS Enabled!</b>\n` +
                  `Striker: <b>${escapeHtml(strikerName)}</b>\n\n` +
                  `👉 Captain of ${escapeHtml(bowlT.name)}, select bowler:`,
                  { reply_markup: kb, parse_mode: 'HTML' }
              );
          } else {
              await ctx.editMessageText(
                  `🏏 <b>LMS Enabled!</b>\n` +
                  `Striker: <b>${escapeHtml(strikerName)}</b>\n\n` +
                  `🟢 Play Resuming...`,
                  { parse_mode: 'HTML' }
              );
              await tagActivePlayers(ctx, tour);
          }
          return;
      }

      if (data.startsWith('tour_cancel_yes_')) {
          const tourId = data.split('_')[3];
          const tour = tourManager.getTour(tourId);
          if (!tour) return ctx.answerCallbackQuery();
          
          if (!(await isGCAdmin(ctx))) {
              return ctx.answerCallbackQuery({ text: "❌ Only group administrators can confirm cancellation.", show_alert: true });
          }
          
          tourManager.deleteTour(tourId);
          ctx.answerCallbackQuery("Tour match canceled!");
          await ctx.editMessageText("❌ <b>The Tour match has been canceled by an administrator.</b>", { parse_mode: 'HTML' });
          return;
      }
      
      if (data.startsWith('tour_cancel_no_')) {
          const tourId = data.split('_')[3];
          const tour = tourManager.getTour(tourId);
          if (!tour) return ctx.answerCallbackQuery();
          
          if (!(await isGCAdmin(ctx))) {
              return ctx.answerCallbackQuery({ text: "❌ Only group administrators can cancel this confirmation.", show_alert: true });
          }
          
          ctx.answerCallbackQuery("Cancellation aborted.");
          await ctx.editMessageText("🟢 <b>Cancellation aborted. The match will continue!</b>", { parse_mode: 'HTML' });
          return;
      }

      if (data.startsWith('tour_selectbowl_')) {
          const parts = data.split('_');
          const tourId = parts[2];
          const index = parseInt(parts[4] || parts[3]);
          const tour = tourManager.getTour(tourId);
          if (!tour) return ctx.answerCallbackQuery();
          
          const res = tourManager.setBowler(tourId, userId, index);
          if (!res.success) return ctx.answerCallbackQuery({ text: res.error, show_alert: true });
          
          ctx.answerCallbackQuery(`Set Bowler: ${res.player.first_name}`);
          
          await ctx.editMessageText(renderScoreboard(tour), { parse_mode: 'HTML' });
          await tagActivePlayers(ctx, tour);
          return;
      }

      // --- Reselection Swap Handles ---
      if (data.startsWith('tour_swap_striker_')) {
          const tourId = data.split('_')[3];
          const tour = tourManager.getTour(tourId);
          if (!tour) return ctx.answerCallbackQuery();
          const batT = tour[tour.battingTeamId];
          
          if (userId !== tour.hostId) {
              return ctx.answerCallbackQuery({ text: "Only the host can swap batters!", show_alert: true });
          }
          
          const available = batT.players.filter(p => !batT.outPlayers.includes(p.id) && p.id !== batT.strikerId);
          if (available.length === 0) {
              return ctx.answerCallbackQuery({ text: "No other players available to swap!", show_alert: true });
          }
          
          const kb = new InlineKeyboard();
          available.forEach(p => kb.text(p.first_name, `tour_swapselect_${tourId}_S_${batT.players.indexOf(p) + 1}`).row());
          kb.text("Cancel Cancel 🔙", `tour_swapcancel_${tourId}`);
          
          await ctx.editMessageText(`🔄 <b>Select new Striker:</b>`, { reply_markup: kb, parse_mode: 'HTML' });
          ctx.answerCallbackQuery();
          return;
      }

      if (data.startsWith('tour_swap_bowler_')) {
          const tourId = data.split('_')[3];
          const tour = tourManager.getTour(tourId);
          if (!tour) return ctx.answerCallbackQuery();
          const bowlT = tour[tour.bowlingTeamId];
          
          if (userId !== tour.hostId) {
              return ctx.answerCallbackQuery({ text: "Only the host can swap bowlers!", show_alert: true });
          }
          
          const available = bowlT.players.filter(p => p.id !== tour.activeBowlerId && (p.id !== tour.previousBowlerId || bowlT.players.length === 1));
          if (available.length === 0) {
              return ctx.answerCallbackQuery({ text: "No other bowler available to swap!", show_alert: true });
          }
          
          const kb = new InlineKeyboard();
          available.forEach(p => kb.text(p.first_name, `tour_swapselect_${tourId}_B_${bowlT.players.indexOf(p) + 1}`).row());
          kb.text("Cancel Cancel 🔙", `tour_swapcancel_${tourId}`);
          
          await ctx.editMessageText(`🔄 <b>Select new Bowler:</b>`, { reply_markup: kb, parse_mode: 'HTML' });
          ctx.answerCallbackQuery();
          return;
      }

      if (data.startsWith('tour_swapselect_')) {
          const parts = data.split('_');
          const tourId = parts[2];
          const role = parts[3]; 
          const index = parseInt(parts[4]);
          const tour = tourManager.getTour(tourId);
          if (!tour) return ctx.answerCallbackQuery();
          
          if (role === 'S') {
              const res = tourManager.setBatsman(tourId, userId, index, 'S');
              if (!res.success) return ctx.answerCallbackQuery({ text: res.error, show_alert: true });
              ctx.answerCallbackQuery(`Striker changed to ${res.player.first_name}`);
          } else {
              const res = tourManager.setBowler(tourId, userId, index);
              if (!res.success) return ctx.answerCallbackQuery({ text: res.error, show_alert: true });
              ctx.answerCallbackQuery(`Bowler changed to ${res.player.first_name}`);
          }
          
          await ctx.editMessageText(renderScoreboard(tour), { parse_mode: 'HTML' });
          await tagActivePlayers(ctx, tour);

          // Notify active players in DM to re-submit
          const batTeam = tour[tour.battingTeamId];
          const striker = batTeam.players.find(p => p.id === batTeam.strikerId);
          const bowler = tour[tour.bowlingTeamId].players.find(p => p.id === tour.activeBowlerId);
          
          if (striker) {
              try { await ctx.api.sendMessage(striker.id, tour.powerSurge
                  ? "🔄 <b>Lineup Swapped!</b> Please submit/re-submit your shot number in DM (0, 1, 2, 3, 4, 5, 6):"
                  : "🔄 <b>Lineup Swapped!</b> Please submit/re-submit your shot number in DM (0, 1, 2, 3, 4, 6):", { parse_mode: 'HTML' }); } catch(e){}
          }
          if (bowler) {
              try { await ctx.api.sendMessage(bowler.id, tour.powerSurge
                  ? "🔄 <b>Lineup Swapped!</b> Please submit/re-submit your delivery in DM (RS, Bouncer, Yorker, Short, Slower, Leg Cutter, Knuckle):"
                  : "🔄 <b>Lineup Swapped!</b> Please submit/re-submit your delivery in DM (RS, Bouncer, Yorker, Short, Slower, Knuckle):", { parse_mode: 'HTML' }); } catch(e){}
          }
          return;
      }

      if (data.startsWith('tour_swapcancel_')) {
          const tourId = data.split('_')[2];
          const tour = tourManager.getTour(tourId);
          if (!tour) return ctx.answerCallbackQuery();
          
          await ctx.editMessageText(renderScoreboard(tour), { parse_mode: 'HTML' });
          await tagActivePlayers(ctx, tour);
          ctx.answerCallbackQuery();
          return;
      }
      return next();
      } catch (err) {
          if (err.message && err.message.includes("message is not modified")) {
              try { await ctx.answerCallbackQuery(); } catch(e) {}
              return;
          }
          console.error("Error in callback query handler:", err);
          try { await ctx.answerCallbackQuery({ text: "⚠️ An error occurred. Please try again." }); } catch(e) {}
      }
  });

};
