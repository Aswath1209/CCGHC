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

function drawOrnateBorder(ctx, x, y, w, h, radius) {
  drawRoundedRect(ctx, x, y, w, h, radius);
  ctx.stroke();

  // Inner orange/red frame line
  const offset = 8;
  ctx.save();
  ctx.strokeStyle = 'rgba(249, 115, 22, 0.4)';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 4]);
  drawRoundedRect(ctx, x + offset, y + offset, w - offset * 2, h - offset * 2, radius - 2);
  ctx.stroke();
  ctx.restore();

  // Corner decorative dots
  ctx.fillStyle = '#ef4444';
  const corners = [
    [x + offset, y + offset],
    [x + w - offset, y + offset],
    [x + offset, y + h - offset],
    [x + w - offset, y + h - offset]
  ];
  corners.forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
  });
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
      ctx.fillStyle = '#050202';
      ctx.fillRect(0, 0, width, height);
    }

    // Apply a deep cinematic fiery radial vignette over the stadium background
    const vignette = ctx.createRadialGradient(width / 2, height / 2, 80, width / 2, height / 2, width / 2 + 200);
    vignette.addColorStop(0, 'rgba(15, 5, 5, 0.3)');
    vignette.addColorStop(0.7, 'rgba(8, 2, 2, 0.88)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.98)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    // Card dimensions
    const cardX = 60;
    const cardY = 30;
    const cardW = 904;
    const cardH = 516;

    // Velvet carbon black gradient background
    const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
    cardGrad.addColorStop(0, '#100a08');
    cardGrad.addColorStop(1, '#050302');
    ctx.fillStyle = cardGrad;
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 24);
    ctx.fill();

    // High-intensity neon fire glow border
    ctx.save();
    ctx.strokeStyle = '#f97316';
    ctx.shadowColor = 'rgba(239, 68, 68, 0.8)';
    ctx.shadowBlur = 22;
    ctx.lineWidth = 3.5;
    drawOrnateBorder(ctx, cardX, cardY, cardW, cardH, 24);
    ctx.restore();

    // Draw Custom Tournament Name Title if provided
    if (tour.name) {
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 8;
      ctx.fillText(tour.name.toUpperCase(), width / 2, 85);
      ctx.restore();
    }

    // Setup first and second batting teams
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
    const inn2Performers = getPerformers(team2, team1);

    // Columns Layout
    const col1X = 90;
    const colW = 395;
    const col2X = 539;
    const tableY = 110;

    // ================= LEFT COLUMN: TEAM 1 =================
    renderTeamColumn(ctx, col1X, colW, team1, team1Score, team1Overs, "#991b1b", "#1a0505", tableY, inn1Performers.batsmen, inn1Performers.bowlers);

    // ================= RIGHT COLUMN: TEAM 2 =================
    renderTeamColumn(ctx, col2X, colW, team2, team2Score, team2Overs, "#c2410c", "#1c0a02", tableY, inn2Performers.batsmen, inn2Performers.bowlers);

    // ================= BOTTOM SUMMARY BADGE =================
    const capX = 232;
    const capW = 560;
    const capY = 440;
    const capH = 92;

    ctx.save();
    const footerGrad = ctx.createLinearGradient(capX, capY, capX, capY + capH);
    footerGrad.addColorStop(0, '#22110a');
    footerGrad.addColorStop(1, '#0c0502');
    ctx.fillStyle = footerGrad;
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(239, 68, 68, 0.7)';
    ctx.shadowBlur = 12;

    ctx.beginPath();
    const radius = 15;
    ctx.moveTo(capX + radius, capY);
    ctx.quadraticCurveTo(capX + capW / 2, capY - 6, capX + capW - radius, capY);
    ctx.quadraticCurveTo(capX + capW, capY + capH / 2, capX + capW - radius, capY + capH);
    ctx.quadraticCurveTo(capX + capW / 2, capY + capH + 6, capX + radius, capY + capH);
    ctx.quadraticCurveTo(capX, capY + capH / 2, capX + radius, capY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // POTM Stats calculation
    let potmStatsStr = "";
    if (potmName) {
        const potmPlayer = [...team1.players, ...team2.players].find(p => p.first_name === potmName);
        if (potmPlayer) {
            let parts = [];
            if (potmPlayer.runs > 0 || potmPlayer.balls > 0) {
                parts.push(`${potmPlayer.runs || 0} Runs (${potmPlayer.balls || 0}b)`);
            }
            if (potmPlayer.ballsBowled > 0) {
                const ovs = Math.floor(potmPlayer.ballsBowled / 6) + '.' + (potmPlayer.ballsBowled % 6);
                parts.push(`${potmPlayer.wickets || 0} Wkts for ${potmPlayer.runsConceded || 0} Runs (${ovs} Ov)`);
            }
            potmStatsStr = parts.join("  |  ");
        }
    }

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(resultText.toUpperCase(), capX + capW / 2, capY + 32);
    
    if (potmName) {
        ctx.fillStyle = '#f97316';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText(`🏆 ${potmName.toUpperCase()} (PLAYER OF THE MATCH)`, capX + capW / 2, capY + 58);
        if (potmStatsStr) {
            ctx.fillStyle = '#fca5a5';
            ctx.font = '13px sans-serif';
            ctx.fillText(potmStatsStr, capX + capW / 2, capY + 78);
        }
    }
    ctx.restore();

    // 8. Broadcaster Channel Logo Badge (circular overlay watermark top right)
    try {
      const logoPath = '/home/home/ReactNative/Telegram/undercover-bot/assets/logo.png';
      const logo = await loadImage(logoPath);
      ctx.drawImage(logo, 910, 15, 45, 45);
    } catch (err) {}

    return canvas.toBuffer('image/png');
  } catch (err) {
    console.error("Error generating TV scoreboard image:", err);
    return null;
  }
}

function renderTeamColumn(ctx, colX, colW, team, score, overs, startColor, endColor, tableY, batsmen, bowlers) {
  // Curved header
  ctx.save();
  const hGrad = ctx.createLinearGradient(colX, tableY, colX, tableY + 38);
  hGrad.addColorStop(0, startColor);
  hGrad.addColorStop(1, endColor);
  ctx.fillStyle = hGrad;
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  const radius = 8;
  const width = colW;
  const height = 38;
  ctx.moveTo(colX + radius, tableY);
  ctx.lineTo(colX + width - radius, tableY);
  ctx.quadraticCurveTo(colX + width, tableY, colX + width, tableY + radius);
  ctx.lineTo(colX + width, tableY + height);
  ctx.lineTo(colX, tableY + height);
  ctx.lineTo(colX, tableY + radius);
  ctx.quadraticCurveTo(colX, tableY, colX + radius, tableY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(team.name.toUpperCase(), colX + 12, tableY + 24);
  ctx.textAlign = 'right';
  ctx.fillText(`${score}/${team.wickets || 0} (${overs})`, colX + colW - 12, tableY + 24);
  ctx.restore();

  // Batting Title
  ctx.fillStyle = '#f97316';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('BATTING', colX + 12, tableY + 62);

  for (let i = 0; i < 3; i++) {
    const y = tableY + 84 + i * 22;
    const p = batsmen[i] || { name: '-', runs: '', balls: '' };
    ctx.fillStyle = '#fca5a5';
    ctx.font = '14px sans-serif';
    ctx.fillText(p.name, colX + 15, y);

    if (p.runs !== '') {
        ctx.save();
        ctx.textAlign = 'right';
        ctx.fillStyle = '#f97316';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(p.runs, colX + colW - 55, y);
        ctx.fillStyle = '#fca5a5';
        ctx.font = '12px sans-serif';
        ctx.fillText(`(${p.balls})`, colX + colW - 15, y);
        ctx.restore();
    }
  }

  // Bowling Title
  ctx.fillStyle = '#f87171';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('BOWLING', colX + 12, tableY + 172);

  for (let i = 0; i < 3; i++) {
    const y = tableY + 194 + i * 22;
    const p = bowlers[i] || { name: '-', wickets: '', runsConceded: '', ballsBowled: '' };
    ctx.fillStyle = '#fca5a5';
    ctx.font = '14px sans-serif';
    ctx.fillText(p.name, colX + 15, y);

    if (p.wickets !== '') {
        ctx.save();
        ctx.textAlign = 'right';
        ctx.fillStyle = '#f87171';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(`${p.wickets}-${p.runsConceded}`, colX + colW - 55, y);
        ctx.fillStyle = '#fca5a5';
        ctx.font = '12px sans-serif';
        const ovs = Math.floor(p.ballsBowled / 6) + '.' + (p.ballsBowled % 6);
        ctx.fillText(`${ovs}`, colX + colW - 15, y);
        ctx.restore();
    }
  }

  // Footer / Extras
  ctx.fillStyle = '#fca5a5';
  ctx.font = '13px sans-serif';
  const ext = (team.bonusRuns || 0) - (team.penaltyRuns || 0);
  ctx.fillText(`Extras: ${ext}`, colX + 15, tableY + 315);
}

module.exports = {
  generateScoreboardImage
};
