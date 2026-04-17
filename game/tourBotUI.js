// Extracting Tour Mode UI to avoid clogging bot.js

const tourManager = require('./tourManager');
const sb = require('../db/supabase');
const { InlineKeyboard } = require('grammy');

module.exports = function installTourMode(bot, sleep, sendEventUpdate) {
  bot.command('tour', async (ctx) => {
    if (ctx.chat.type === 'private') return ctx.reply("Tour matches must be in groups.");
    const user = await sb.getUser(ctx.from.id);
    if (!user) return ctx.reply("You must /register first.");
    
    // Check args or default
    const args = ctx.message.text.split(' ');
    let bet = 0;
    if (args[1]) bet = parseInt(args[1]) || 0;
    
    const hostObj = { id: ctx.from.id, first_name: ctx.from.first_name };
    const res = tourManager.createTour(ctx.chat.id, hostObj);
    if (!res.success) return ctx.reply("❌ " + res.error);
    const tour = res.tour;
    tour.config.bet = bet;
    
    await renderTourLobby(ctx, tour);
  });
  
  // Renders the Lobby message with host controls
  async function renderTourLobby(ctx, tour) {
    let txt = `🏆 <b>Grand Tour Match!</b> 🏆\n\n`;
    txt += `👑 Host: <a href="tg://user?id=${tour.hostId}">Host</a>\n`;
    txt += `⚙️ Config: ${tour.config.overs} Overs, ${tour.config.wickets} Wickets, ${tour.config.bet}🪙 Bet\n\n`;
    
    txt += `🏟 <b>Pool (Unassigned):</b>\n`;
    tour.pool.forEach(p => txt += `- ${p.first_name}\n`);
    
    txt += `\n🔴 <b>${tour.teamA.name}</b> (Cap: ${tour.teamA.captainId ? 'Assigned' : 'None'})\n`;
    tour.teamA.players.forEach(p => txt += `- ${p.first_name}\n`);
    
    txt += `\n🔵 <b>${tour.teamB.name}</b> (Cap: ${tour.teamB.captainId ? 'Assigned' : 'None'})\n`;
    tour.teamB.players.forEach(p => txt += `- ${p.first_name}\n`);
    
    const kb = new InlineKeyboard()
       .text("Join Pool 🙋", `tour_join_${tour.id}`).row();
       
    // Host buttons
    if (tour.state === 'LOBBY') {
       kb.text("⚙️ Config", `tour_config_${tour.id}`)
         .text("👥 Teams", `tour_teams_${tour.id}`)
         .text("👑 Captains", `tour_caps_${tour.id}`).row()
         .text("▶️ START MATCH", `tour_start_${tour.id}`);
    }
    
    if (tour.messageId) {
        try { await ctx.api.editMessageText(tour.chatId, tour.messageId, txt, { parse_mode: 'HTML', reply_markup: kb }); }
        catch(e) {}
    } else {
        const msg = await ctx.reply(txt, { parse_mode: 'HTML', reply_markup: kb });
        tour.messageId = msg.message_id;
    }
  }

  // Hook into bot.js main callback query flow:
  bot.on('callback_query:data', async (ctx, next) => {
      const data = ctx.callbackQuery.data;
      if (!data.startsWith('tour_')) return next();
      
      const parts = data.split('_');
      const action = parts[1];
      const tourId = parts[2];
      const userId = ctx.from.id;
      
      const tour = tourManager.getTour(tourId);
      if (!tour) return ctx.answerCallbackQuery({ text: "Tour expired or broken.", show_alert: true });
      
      if (action === 'join') {
         const user = await sb.getUser(userId);
         if (!user) return ctx.answerCallbackQuery({text:"/register first!", show_alert:true});
         const res = tourManager.joinPool(tourId, { id: userId, first_name: ctx.from.first_name });
         if (!res.success) return ctx.answerCallbackQuery({text:res.error, show_alert:true});
         ctx.answerCallbackQuery("Joined pool!");
         await renderTourLobby(ctx, tour);
      }
      else if (['config', 'teams', 'caps'].includes(action)) {
         if (userId !== tour.hostId) return ctx.answerCallbackQuery("Host only!");
         if (action === 'config') await ctx.reply(`Host menus are simplified for GC. To change Config, host types: /tourconfig overs [x] wickets [y]`);
         else if (action === 'teams') {
            // Generate roster buttons
            let kb = new InlineKeyboard();
            for (let p of tour.pool) {
                 kb.text(`${p.first_name} -> A`, `tour_add_${tourId}_A_${p.id}`)
                   .text(`${p.first_name} -> B`, `tour_add_${tourId}_B_${p.id}`).row();
            }
            await ctx.reply("Assign players:", { reply_markup: kb });
         } else if (action === 'caps') {
            await ctx.reply("To set caps, host types: /tourcap A @username and /tourcap B @username");
         }
         ctx.answerCallbackQuery();
      }
      else if (action === 'add') {
          if (userId !== tour.hostId) return ctx.answerCallbackQuery("Host only!");
          const tm = parts[3]; 
          const tgtId = parseInt(parts[4]);
          tourManager.assignPlayerCommand(tourId, userId, tgtId, tm);
          ctx.answerCallbackQuery("Assigned!");
          await renderTourLobby(ctx, tour);
          // Delete this sub-message to clean GC
          try { await ctx.deleteMessage(); } catch(e){}
      }
      else if (action === 'start') {
          if (userId !== tour.hostId) return ctx.answerCallbackQuery("Host only!");
          const res = tourManager.startTour(tourId, userId);
          if (!res.success) return ctx.answerCallbackQuery({ text: res.error, show_alert: true });
          ctx.answerCallbackQuery("Match starting!");
          
          await renderTourLobby(ctx, tour); // update to remove buttons
          
          const tKb = new InlineKeyboard().text("Heads", `tour_toss_${tourId}_heads`).text("Tails", `tour_toss_${tourId}_tails`);
          await ctx.reply(`🪙 **TOSS TIME**\n${tour.teamA.players.find(p=>p.id===tour.teamA.captainId).first_name} (Team A Cap), choose!`, { reply_markup: tKb });
      }
      else if (action === 'toss') {
          const choice = parts[3];
          const res = tourManager.handleToss(tourId, userId, choice);
          if (!res) return ctx.answerCallbackQuery("Not your turn!");
          const kb = new InlineKeyboard().text("Bat 🏏", `tour_bb_${tourId}_bat`).text("Bowl ⚾", `tour_bb_${tourId}_bowl`);
          await ctx.editMessageText(`The toss was ${res.tossResult}!\n${res.winnerTeam}'s captain won! Choose Bat or Bowl.`, { reply_markup: kb });
      }
      else if (action === 'bb') {
          const choice = parts[3];
          const res = tourManager.chooseBatBowl(tourId, userId, choice);
          if (!res) return ctx.answerCallbackQuery("Error");
          
          await ctx.editMessageText(`Team ${tour[tour.battingTeamId].name} is Batting first!\nTeam ${tour[tour.bowlingTeamId].name} is Bowling first!`);
          await promptCaptains(ctx, tour);
      }
      else if (action.startsWith('pick')) {
          // tour_pickS_TOURID_TGID  (striker)
          // tour_pickN_TOURID_TGID  (non)
          // tour_pickB_TOURID_TGID  (bowler)
          const type = action; // 'pickS'
          const tgtId = parseInt(parts[3]);
          
          if (type === 'pickS') {
              const ok = tourManager.setBatsman(tourId, userId, tgtId, 'striker');
              if(!ok) return ctx.answerCallbackQuery("Invalid");
          } else if (type === 'pickN') {
              const ok = tourManager.setBatsman(tourId, userId, tgtId, 'non-striker');
              if(!ok) return ctx.answerCallbackQuery("Invalid");
          } else if (type === 'pickB') {
              const ok = tourManager.setBowler(tourId, userId, tgtId);
              if(!ok) return ctx.answerCallbackQuery("Invalid Bowler");
          }
          
          ctx.answerCallbackQuery("Set!");
          
          // Next state processing
          if (tour.state === 'BOWLING_LINEUP' || tour.state === 'BATTING_LINEUP' || tour.state === 'WICKET_FALL') {
             await promptCaptains(ctx, tour); 
          }
          else if (tour.state === 'PLAYING') {
              // Both set! DM the active ones
              try { await ctx.deleteMessage(); } catch(e){} // remove captain prompt
              await ctx.reply(`🏏 **Lineup Set!** \nStriker: ${pName(tour, tour[tour.battingTeamId].strikerId)}\nNon-Striker: ${pName(tour, tour[tour.battingTeamId].nonStrikerId)}\nBowler: ${pName(tour, tour.activeBowlerId)}`);
              
              const bPId = tour[tour.battingTeamId].strikerId;
              const boPId = tour.activeBowlerId;
              await ctx.api.sendMessage(bPId, "🏏 Send shot (0,1,2,3,4,6)");
              await ctx.api.sendMessage(boPId, "⚾ Send delivery (Yorker, etc)");
          }
      }
  });
  
  function pName(tour, pId) {
      if (!pId) return 'None';
      const p = tour.pool.concat(tour.teamA.players).concat(tour.teamB.players).find(u => u.id === pId);
      return p ? p.first_name : 'Unknown';
  }

  async function promptCaptains(ctx, tour) {
       if (tour.state === 'BATTING_LINEUP' || tour.state === 'WICKET_FALL') {
           const batT = tour[tour.battingTeamId];
           if (!batT.strikerId) {
               // Prompt for striker
               const kb = new InlineKeyboard();
               batT.players.forEach(p => kb.text(p.first_name, `tour_pickS_${tour.id}_${p.id}`).row());
               await ctx.reply(`👑 Team ${batT.name} Cap: Select your new **Striker**`, { reply_markup: kb });
           } else if (!batT.nonStrikerId && batT.players.length > 1) {
               const kb = new InlineKeyboard();
               batT.players.forEach(p => kb.text(p.first_name, `tour_pickN_${tour.id}_${p.id}`).row());
               await ctx.reply(`👑 Team ${batT.name} Cap: Select your **Non-Striker**`, { reply_markup: kb });
           }
       }
       else if (tour.state === 'BOWLING_LINEUP') {
           const bowlT = tour[tour.bowlingTeamId];
           const kb = new InlineKeyboard();
           bowlT.players.forEach(p => kb.text(p.first_name, `tour_pickB_${tour.id}_${p.id}`).row());
           await ctx.reply(`👑 Team ${bowlT.name} Cap: Select your **Bowler** for this over!`, { reply_markup: kb });
       }
  }

  bot.command('tourconfig', async (ctx) => {
       const args = ctx.message.text.split(' ');
       const tour = tourManager.getUserTour(ctx.from.id);
       if (!tour || tour.hostId !== ctx.from.id || tour.state !== 'LOBBY') return;
       if (args[1] === 'overs') tour.config.overs = parseInt(args[2]);
       if (args[1] === 'wickets') tour.config.wickets = parseInt(args[2]);
       ctx.reply(`Config updated: Overs=${tour.config.overs}, Wickets=${tour.config.wickets}`);
       await renderTourLobby(ctx, tour);
  });
  
  // Public exposure to bot.js for DM processing
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
      const bPName = pName(tour, res.originalBowlerId);
      
      const over = Math.floor((res.ballsThisRound - 1) / 6);
      const ballInOver = ((res.ballsThisRound - 1) % 6) + 1;
      
      await ctx.api.sendMessage(tour.chatId, `Over ${over+1} | Ball ${ballInOver}`);
      await sleep(3500);
      await ctx.api.sendMessage(tour.chatId, `${bPName} bowls a ${bowlStr}!`);
      await sleep(3500);
      
      if (isWicket) {
          await sendEventUpdate(ctx, tour.chatId, "out");
      } else {
          await sendEventUpdate(ctx, tour.chatId, batStr);
      }
      
      // Print score
      const batT = tour[tour.battingTeamId];
      await ctx.api.sendMessage(tour.chatId, `Score: ${batT.score}/${batT.wickets} (Wickets Left: ${batT.inningsRemainingWickets})`);
      
      if (res.matchEnded) {
          if (res.tie) await ctx.api.sendMessage(tour.chatId, "🤝 Match Tied!");
          else await ctx.api.sendMessage(tour.chatId, `🏆 ${tour[res.winnerTeamId].name} WIN the Tour!`);
          tourManager.deleteTour(tour.id);
      } else if (res.inningsEnded) {
          await ctx.api.sendMessage(tour.chatId, `Innings Break! Target: ${batT.score + 1}`);
          await promptCaptains(ctx, tour);
      } else if (res.needsNewBatsman || res.needsNewBowler) {
          await promptCaptains(ctx, tour);
      } else {
          // Play continues
          try {
              await ctx.api.sendMessage(batT.strikerId, "🏏 Send shot:");
              await ctx.api.sendMessage(tour.activeBowlerId, "⚾ Send delivery:");
          } catch(e){}
      }
  }

};
