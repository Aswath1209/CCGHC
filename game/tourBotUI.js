const tourManager = require('./tourManager');

module.exports = function installTourMode(bot, sleep, sendEventUpdate) {
  
  // Renders the highly aligned scoreboard
  function renderScoreboard(tour) {
    const batT = tour[tour.battingTeamId];
    const bowlT = tour[tour.bowlingTeamId];
    const totalS = tourManager.totalScore(batT);
    const bowlS = tourManager.totalScore(bowlT);

    const striker = batT.players.find(p => p.id === batT.strikerId);
    const nonStriker = batT.players.find(p => p.id === batT.nonStrikerId);
    const bowler = bowlT.players.find(p => p.id === tour.activeBowlerId);

    const over = Math.floor(tour.balls / 6);
    const ball = tour.balls % 6;

    let text = `📊 <b>Match Scorecard</b>\n`;
    text += `<pre>`;
    text += `${batT === tour.teamA ? 'Team A' : 'Team B'} (Bat): ${totalS}/${batT.wickets}\n`;
    text += `${bowlT === tour.teamA ? 'Team A' : 'Team B'} (Bowl): ${bowlS}\n`;
    text += `Overs: ${over}.${ball}/${tour.config.overs}\n`;
    if (tour.innings === 2) text += `Target: ${bowlS + 1}\n`;
    text += `------------------\n`;
    text += `🏏 Striker: ${striker ? striker.first_name : '---'}\n`;
    text += `🏏 Non-Str: ${nonStriker ? nonStriker.first_name : '---'}\n`;
    text += `🧤 Bowler : ${bowler ? bowler.first_name : '---'}\n`;
    text += `</pre>`;
    
    return text;
  }

  // Tag players in GC with a button to redirect to DM
  async function tagActivePlayers(ctx, tour) {
    const batTeam = tour[tour.battingTeamId];
    const striker = batTeam.players.find(p => p.id === batTeam.strikerId);
    const bowler = tour[tour.bowlingTeamId].players.find(p => p.id === tour.activeBowlerId);

    if (!striker || !bowler) return;

    const kb = new InlineKeyboard()
        .url("Send Play 🎮", `https://t.me/${bot.botInfo.username}`);
    
    await ctx.api.sendMessage(tour.chatId, 
        `🔔 <b>Next Ball!</b>\n` +
        `👤 Batter: <a href="tg://user?id=${striker.id}">${striker.first_name}</a>\n` +
        `👤 Bowler: <a href="tg://user?id=${bowler.id}">${bowler.first_name}</a>\n\n` +
        `<i>Click below to send your play!</i>`, 
        { reply_markup: kb, parse_mode: 'HTML' }
    );
  }

  bot.tourTextHook = async (ctx, tour, txt) => {
    const res = tourManager.submitPlay(tour.id, ctx.from.id, txt);
    if (!res.success) {
        if (res.error === 'Not currently playing.') return false;
        return ctx.reply("❌ " + res.error);
    }
    
    const batT = tour[tour.battingTeamId];
    if (ctx.from.id === batT.strikerId) ctx.reply(`✅ You played: ${res.batStr || txt}`);
    else ctx.reply(`✅ You bowled: ${res.bowlStr || tour.choices.bowlChoice}`);
    
    if (res.waiting) return true;
    
    await handleTourResult(ctx, res);
    return true; 
  };

  async function handleTourResult(ctx, res) {
      const { tour, batStr, bowlStr, isWicket } = res;
      const batT = tour[tour.battingTeamId];
      const bowlT = tour[tour.bowlingTeamId];
      
      const bowler = bowlT.players.find(p => p.id === res.originalBowlerId);
      
      const over = Math.floor((res.ballsThisRound - 1) / 6);
      const ballInOver = ((res.ballsThisRound - 1) % 6) + 1;
      
      await ctx.api.sendMessage(tour.chatId, `⚾ <b>Over ${over+1} | Ball ${ballInOver}</b>`, { parse_mode: 'HTML' });
      await sleep(1500); // Back to shorter delays as it's team match
      await ctx.api.sendMessage(tour.chatId, `👉 ${bowler.first_name} bowls a <b>${bowlStr}</b>!`, { parse_mode: 'HTML' });
      await sleep(1500);
      
      if (isWicket) {
          await sendEventUpdate(ctx, tour.chatId, "out");
      } else {
          await sendEventUpdate(ctx, tour.chatId, batStr);
      }
      await sleep(1000);
      
      await ctx.api.sendMessage(tour.chatId, renderScoreboard(tour), { parse_mode: 'HTML' });

      if (res.matchEnded) {
          let msg = res.tie ? "🤝 <b>The match is a tie!</b>" : `🏆 <b>${tour[res.winnerTeamId].name} WON the match!</b> 🎉`;
          if (res.motm) msg += `\n🎖 <b>MOTM:</b> ${res.motm.first_name}`;
          await ctx.api.sendMessage(tour.chatId, msg, { parse_mode: 'HTML' });
          tourManager.deleteTour(tour.id);
      } else if (res.inningsEnded) {
          await ctx.api.sendMessage(tour.chatId, `🏁 <b>Innings Over!</b>\nTarget: ${tourManager.totalScore(batT) + 1}\n\nHost/Captain, use /innings_switch to proceed.`, { parse_mode: 'HTML' });
      } else if (res.needsNewBatsman) {
          const batT = tour[tour.battingTeamId];
          const available = batT.players.filter(p => !batT.outPlayers.includes(p.id) && p.id !== batT.strikerId && p.id !== batT.nonStrikerId);
          
          if (available.length > 0) {
              const kb = new InlineKeyboard();
              available.forEach(p => kb.text(p.first_name, `tour_pickS_${tour.id}_${batT.players.indexOf(p) + 1}`).row());
              await ctx.api.sendMessage(tour.chatId, `☝️ <b>Wicket!</b>\nCaptain, select new batsman:`, { reply_markup: kb, parse_mode: 'HTML' });
          } else {
              // LMS handled by engine, but if no one to pick then just tag active
              await tagActivePlayers(ctx, tour);
          }
      } else if (res.needsNewBowler) {
          const bowlT = tour[tour.bowlingTeamId];
          const kb = new InlineKeyboard();
          bowlT.players.forEach(p => {
              if (p.id !== tour.previousBowlerId || bowlT.players.length === 1) {
                  kb.text(p.first_name, `tour_pickB_${tour.id}_${bowlT.players.indexOf(p) + 1}`).row();
              }
          });
          await ctx.api.sendMessage(tour.chatId, `🔚 <b>Over Over!</b>\nCaptain, select new bowler:`, { reply_markup: kb, parse_mode: 'HTML' });
      } else {
          // Ball by ball follow up
          await tagActivePlayers(ctx, tour);
      }
  }

  bot.tourTagActive = async (ctx, tour) => {
      await tagActivePlayers(ctx, tour);
  };
};
