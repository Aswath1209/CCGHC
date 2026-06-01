const path = require('path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

async function generateScoreboardImage(tour, resultText, potmName) {
  try {
    const width = 1024;
    const height = 576;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. Draw blurred stadium backdrop
    const bgPath = '/home/home/ReactNative/Telegram/undercover-bot/assets/stadium_bg.png';
    try {
      const bg = await loadImage(bgPath);
      ctx.drawImage(bg, 0, 0, width, height);
    } catch (err) {
      console.error("Failed to load stadium background, using color fallback:", err);
      ctx.fillStyle = '#0a0505';
      ctx.fillRect(0, 0, width, height);
    }

    // Apply a deep cinematic fiery radial vignette over the stadium background
    const vignette = ctx.createRadialGradient(width / 2, height / 2, 80, width / 2, height / 2, width / 2 + 200);
    vignette.addColorStop(0, 'rgba(25, 6, 6, 0.45)');
    vignette.addColorStop(0.65, 'rgba(8, 2, 2, 0.90)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.98)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    // 2. Glowing Glassmorphic Card Container
    const cardX = 112;
    const cardY = 38;
    const cardW = 800;
    const cardH = 500;

    // Dark carbon-fiber gradient background
    const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
    cardGrad.addColorStop(0, 'rgba(18, 12, 12, 0.92)');
    cardGrad.addColorStop(1, 'rgba(8, 5, 5, 0.96)');
    ctx.fillStyle = cardGrad;
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 16);
    ctx.fill();

    // High-intensity neon fire glow border
    ctx.save();
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
    ctx.shadowColor = 'rgba(249, 115, 22, 0.8)';
    ctx.shadowBlur = 20;
    ctx.lineWidth = 4;
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 16);
    ctx.stroke();
    ctx.restore();

    // 3. Top Title Bar (MATCH SUMMARY) - Premium Orange/Crimson gradient
    const headerGrad = ctx.createLinearGradient(130, 55, 130, 97);
    headerGrad.addColorStop(0, '#f97316');
    headerGrad.addColorStop(0.5, '#ef4444');
    headerGrad.addColorStop(1, '#991b1b');
    
    ctx.fillStyle = headerGrad;
    drawRoundedRect(ctx, 130, 55, 764, 42, 6);
    ctx.fill();

    ctx.save();
    ctx.strokeStyle = 'rgba(251, 146, 60, 0.4)';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, 130, 55, 764, 42, 6);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 23px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 2;
    ctx.fillText('MATCH SUMMARY', 512, 84);
    ctx.restore();

    const totalScore = (team) => Math.max(0, (team.score || 0) + (team.bonusRuns || 0) - (team.penaltyRuns || 0));
    
    const team1Key = tour.firstBattingTeamId || 'teamA';
    const team2Key = team1Key === 'teamA' ? 'teamB' : 'teamA';
    
    const team1 = tour[team1Key];
    const team2 = tour[team2Key];

    const team1Score = totalScore(team1);
    const team2Score = totalScore(team2);

    const getOversStr = (balls) => {
        if (balls === undefined) return "0.0";
        const ov = Math.floor(balls / 6);
        const bl = balls % 6;
        return `${ov}.${bl}`;
    };

    const team1Overs = getOversStr(tour.innings1Balls !== undefined ? tour.innings1Balls : (tour.innings === 1 ? tour.balls : tour.config.overs * 6));
    const team2Overs = getOversStr(tour.innings2Balls !== undefined ? tour.innings2Balls : (tour.innings === 2 ? tour.balls : 0));

    // 4. Innings 1 Ribbon (Fiery Crimson Red Gradient)
    const redGrad = ctx.createLinearGradient(130, 107, 130, 143);
    redGrad.addColorStop(0, '#dc2626');
    redGrad.addColorStop(0.5, '#ef4444');
    redGrad.addColorStop(1, '#7f1d1d');
    ctx.fillStyle = redGrad;
    drawRoundedRect(ctx, 130, 107, 764, 36, 4);
    ctx.fill();

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 2;
    ctx.fillText(team1.name.toUpperCase(), 145, 131);

    ctx.textAlign = 'right';
    ctx.font = 'bold 19px sans-serif';
    ctx.fillText(`${team1Overs} Overs  |  ${team1Score}/${team1.wickets || 0}`, 879, 131);
    ctx.restore();

    const getPerformers = (batT, bowlT) => {
        const batsmen = batT.players
            .map(p => ({ name: p.first_name, runs: p.runs || 0, balls: p.balls || 0 }))
            .filter(p => p.balls > 0 || p.runs > 0)
            .sort((a, b) => b.runs - a.runs);
            
        const bowlers = bowlT.players
            .map(p => ({ name: p.first_name, wickets: p.wickets || 0, runsConceded: p.runsConceded || 0, ballsBowled: p.ballsBowled || 0 }))
            .filter(p => p.ballsBowled > 0)
            .sort((a, b) => {
                if (b.wickets !== a.wickets) return b.wickets - a.wickets;
                return a.runsConceded - b.runsConceded;
            });
            
        return { batsmen, bowlers };
    };

    const inn1Performers = getPerformers(team1, team2);

    // Innings 1 Divider Line
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(512, 150);
    ctx.lineTo(512, 265);
    ctx.stroke();

    // Draw Innings 1 Batsmen (Left column)
    for (let i = 0; i < 4; i++) {
      const y = 168 + i * 23;
      const p = inn1Performers.batsmen[i] || { name: '-', runs: '', balls: '' };
      ctx.fillStyle = '#f3f4f6';
      ctx.font = '15px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(p.name, 145, y);

      if (p.runs !== '') {
        ctx.textAlign = 'right';
        ctx.fillStyle = '#fbbf24'; // Fiery Gold for runs
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText(p.runs, 420, y);
        ctx.fillStyle = '#9ca3af';
        ctx.font = '13px sans-serif';
        ctx.fillText(`(${p.balls})`, 460, y);
      }
    }

    // Draw Innings 1 Bowlers (Right column)
    for (let i = 0; i < 4; i++) {
      const y = 168 + i * 23;
      const p = inn1Performers.bowlers[i] || { name: '-', wickets: '', runsConceded: '', ballsBowled: '' };
      ctx.fillStyle = '#f3f4f6';
      ctx.font = '15px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(p.name, 545, y);

      if (p.wickets !== '') {
        const overs = Math.floor(p.ballsBowled / 6) + '.' + (p.ballsBowled % 6);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#f87171'; // Fiery Orange-Red for bowling stats
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText(`${p.wickets}-${p.runsConceded}`, 820, y);
        ctx.fillStyle = '#9ca3af';
        ctx.font = '13px sans-serif';
        ctx.fillText(`${overs}`, 865, y);
      }
    }

    // 5. Innings 2 Ribbon (Fiery Gold Amber Gradient)
    const goldGrad = ctx.createLinearGradient(130, 275, 130, 311);
    goldGrad.addColorStop(0, '#fbbf24');
    goldGrad.addColorStop(0.5, '#f59e0b');
    goldGrad.addColorStop(1, '#b45309');
    ctx.fillStyle = goldGrad;
    drawRoundedRect(ctx, 130, 275, 764, 36, 4);
    ctx.fill();

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 2;
    ctx.fillText(team2.name.toUpperCase(), 145, 299);

    ctx.textAlign = 'right';
    ctx.font = 'bold 19px sans-serif';
    ctx.fillText(`${team2Overs} Overs  |  ${team2Score}/${team2.wickets || 0}`, 879, 299);
    ctx.restore();

    const inn2Performers = getPerformers(team2, team1);

    // Innings 2 Divider Line
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.2)';
    ctx.beginPath();
    ctx.moveTo(512, 318);
    ctx.lineTo(512, 433);
    ctx.stroke();

    // Draw Innings 2 Batsmen (Left column)
    for (let i = 0; i < 4; i++) {
      const y = 336 + i * 23;
      const p = inn2Performers.batsmen[i] || { name: '-', runs: '', balls: '' };
      ctx.fillStyle = '#f3f4f6';
      ctx.font = '15px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(p.name, 145, y);

      if (p.runs !== '') {
        ctx.textAlign = 'right';
        ctx.fillStyle = '#fbbf24'; // Fiery Gold
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText(p.runs, 420, y);
        ctx.fillStyle = '#9ca3af';
        ctx.font = '13px sans-serif';
        ctx.fillText(`(${p.balls})`, 460, y);
      }
    }

    // Draw Innings 2 Bowlers (Right column)
    for (let i = 0; i < 4; i++) {
      const y = 336 + i * 23;
      const p = inn2Performers.bowlers[i] || { name: '-', wickets: '', runsConceded: '', ballsBowled: '' };
      ctx.fillStyle = '#f3f4f6';
      ctx.font = '15px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(p.name, 545, y);

      if (p.wickets !== '') {
        const overs = Math.floor(p.ballsBowled / 6) + '.' + (p.ballsBowled % 6);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#f87171'; // Fiery Red
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText(`${p.wickets}-${p.runsConceded}`, 820, y);
        ctx.fillStyle = '#9ca3af';
        ctx.font = '13px sans-serif';
        ctx.fillText(`${overs}`, 865, y);
      }
    }

    // 6. Bottom Winner Announcement Bar
    ctx.fillStyle = headerGrad;
    drawRoundedRect(ctx, 130, 443, 764, 42, 6);
    ctx.fill();

    ctx.save();
    ctx.strokeStyle = 'rgba(251, 146, 60, 0.4)';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, 130, 443, 764, 42, 6);
    ctx.stroke();
    ctx.restore();

    let footerLine = resultText.toUpperCase();
    if (potmName) {
        footerLine += `   |   POTM - ${potmName.toUpperCase()}`;
    }
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 17px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillText(footerLine, 512, 471);
    ctx.restore();

    // 7. Broadcaster Channel Logo Badge (circular overlay)
    const logoPath = '/home/home/ReactNative/Telegram/undercover-bot/assets/logo.png';
    try {
      const logo = await loadImage(logoPath);
      const circleX = 145;
      const circleY = 75;
      const radius = 30;

      const ringGrad = ctx.createLinearGradient(circleX - radius, circleY - radius, circleX + radius, circleY + radius);
      ringGrad.addColorStop(0, '#f97316');
      ringGrad.addColorStop(1, '#ef4444');
      ctx.fillStyle = ringGrad;
      ctx.beginPath();
      ctx.arc(circleX, circleY, radius + 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.arc(circleX, circleY, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(logo, circleX - radius, circleY - radius, radius * 2, radius * 2);
      ctx.restore();
    } catch (err) {
      console.error("Failed to draw channel logo badge:", err);
    }

    return canvas.toBuffer('image/png');
  } catch (err) {
    console.error("Error generating TV scoreboard image:", err);
    return null;
  }
}

module.exports = {
  generateScoreboardImage
};
