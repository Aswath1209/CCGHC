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
    vignette.addColorStop(0, 'rgba(25, 6, 6, 0.40)');
    vignette.addColorStop(0.65, 'rgba(8, 2, 2, 0.88)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.98)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    // Card dimensions
    const cardX = 80;
    const cardY = 38;
    const cardW = 864;
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

    // ================= LEFT COLUMN: TEAM 1 =================
    const col1X = 100;
    const colW = 310;
    const redGrad = ctx.createLinearGradient(col1X, 60, col1X, 105);
    redGrad.addColorStop(0, '#dc2626');
    redGrad.addColorStop(1, '#7f1d1d');
    ctx.fillStyle = redGrad;
    drawRoundedRect(ctx, col1X, 60, colW, 45, 6);
    ctx.fill();

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 2;
    ctx.fillText(team1.name.toUpperCase(), col1X + 12, 88);

    ctx.textAlign = 'right';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`${team1Score}/${team1.wickets || 0} (${team1Overs})`, col1X + colW - 12, 88);
    ctx.restore();

    // Team 1 Batting Performers
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('BATTING', col1X + 12, 135);

    for (let i = 0; i < 3; i++) {
        const y = 162 + i * 22;
        const p = inn1Performers.batsmen[i] || { name: '-', runs: '', balls: '' };
        ctx.fillStyle = '#e5e7eb';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(p.name, col1X + 15, y);

        if (p.runs !== '') {
            ctx.textAlign = 'right';
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 14px sans-serif';
            ctx.fillText(p.runs, col1X + colW - 60, y);
            ctx.fillStyle = '#9ca3af';
            ctx.font = '12px sans-serif';
            ctx.fillText(`(${p.balls})`, col1X + colW - 15, y);
        }
    }

    // Team 1 Bowling Performers
    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('BOWLING', col1X + 12, 255);

    for (let i = 0; i < 3; i++) {
        const y = 282 + i * 22;
        const p = inn1Performers.bowlers[i] || { name: '-', wickets: '', runsConceded: '', ballsBowled: '' };
        ctx.fillStyle = '#e5e7eb';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(p.name, col1X + 15, y);

        if (p.wickets !== '') {
            const ovs = Math.floor(p.ballsBowled / 6) + '.' + (p.ballsBowled % 6);
            ctx.textAlign = 'right';
            ctx.fillStyle = '#f87171';
            ctx.font = 'bold 14px sans-serif';
            ctx.fillText(`${p.wickets}-${p.runsConceded}`, col1X + colW - 60, y);
            ctx.fillStyle = '#9ca3af';
            ctx.font = '12px sans-serif';
            ctx.fillText(`${ovs}`, col1X + colW - 15, y);
        }
    }

    // Captain and Extras
    ctx.fillStyle = '#9ca3af';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left';
    const c1 = team1.players.find(p => p.id === team1.captainId);
    ctx.fillText(`Captain: ${c1 ? c1.first_name : '-'}`, col1X + 15, 385);
    ctx.fillText(`Extras: ${team1.bonusRuns - team1.penaltyRuns}`, col1X + 15, 405);


    // ================= RIGHT COLUMN: TEAM 2 =================
    const col2X = 614;
    const goldGrad = ctx.createLinearGradient(col2X, 60, col2X, 105);
    goldGrad.addColorStop(0, '#fbbf24');
    goldGrad.addColorStop(1, '#b45309');
    ctx.fillStyle = goldGrad;
    drawRoundedRect(ctx, col2X, 60, colW, 45, 6);
    ctx.fill();

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 2;
    ctx.fillText(team2.name.toUpperCase(), col2X + 12, 88);

    ctx.textAlign = 'right';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`${team2Score}/${team2.wickets || 0} (${team2Overs})`, col2X + colW - 12, 88);
    ctx.restore();

    // Team 2 Batting Performers
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('BATTING', col2X + 12, 135);

    for (let i = 0; i < 3; i++) {
        const y = 162 + i * 22;
        const p = inn2Performers.batsmen[i] || { name: '-', runs: '', balls: '' };
        ctx.fillStyle = '#e5e7eb';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(p.name, col2X + 15, y);

        if (p.runs !== '') {
            ctx.textAlign = 'right';
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 14px sans-serif';
            ctx.fillText(p.runs, col2X + colW - 60, y);
            ctx.fillStyle = '#9ca3af';
            ctx.font = '12px sans-serif';
            ctx.fillText(`(${p.balls})`, col2X + colW - 15, y);
        }
    }

    // Team 2 Bowling Performers
    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('BOWLING', col2X + 12, 255);

    for (let i = 0; i < 3; i++) {
        const y = 282 + i * 22;
        const p = inn2Performers.bowlers[i] || { name: '-', wickets: '', runsConceded: '', ballsBowled: '' };
        ctx.fillStyle = '#e5e7eb';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(p.name, col2X + 15, y);

        if (p.wickets !== '') {
            const ovs = Math.floor(p.ballsBowled / 6) + '.' + (p.ballsBowled % 6);
            ctx.textAlign = 'right';
            ctx.fillStyle = '#f87171';
            ctx.font = 'bold 14px sans-serif';
            ctx.fillText(`${p.wickets}-${p.runsConceded}`, col2X + colW - 60, y);
            ctx.fillStyle = '#9ca3af';
            ctx.font = '12px sans-serif';
            ctx.fillText(`${ovs}`, col2X + colW - 15, y);
        }
    }

    // Captain and Extras
    ctx.fillStyle = '#9ca3af';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left';
    const c2 = team2.players.find(p => p.id === team2.captainId);
    ctx.fillText(`Captain: ${c2 ? c2.first_name : '-'}`, col2X + 15, 385);
    ctx.fillText(`Extras: ${team2.bonusRuns - team2.penaltyRuns}`, col2X + 15, 405);


    // ================= CENTER COLUMN: POTM GOLD SHOWCASE =================
    const potmX = 430;
    const potmW = 164;
    const potmH = 360;

    // Draw Gold Card Card Background
    const potmBgGrad = ctx.createLinearGradient(potmX, 60, potmX, 60 + potmH);
    potmBgGrad.addColorStop(0, '#1c120c');
    potmBgGrad.addColorStop(1, '#0c0705');
    ctx.fillStyle = potmBgGrad;
    drawRoundedRect(ctx, potmX, 60, potmW, potmH, 12);
    ctx.fill();

    // Glowing Gold Border
    ctx.save();
    ctx.strokeStyle = '#fbbf24';
    ctx.shadowColor = '#d97706';
    ctx.shadowBlur = 15;
    ctx.lineWidth = 3.5;
    drawRoundedRect(ctx, potmX, 60, potmW, potmH, 12);
    ctx.stroke();
    ctx.restore();

    // POTM Mini Ribbon Header
    const potmHeaderGrad = ctx.createLinearGradient(potmX + 10, 72, potmX + 10, 102);
    potmHeaderGrad.addColorStop(0, '#d97706');
    potmHeaderGrad.addColorStop(1, '#78350f');
    ctx.fillStyle = potmHeaderGrad;
    drawRoundedRect(ctx, potmX + 10, 72, potmW - 20, 30, 4);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PLAYER OF THE MATCH', potmX + potmW / 2, 91);

    // Draw a Beautiful Vector Star Icon
    const cx = potmX + potmW / 2;
    const cy = 160;
    ctx.fillStyle = '#fbbf24';
    ctx.save();
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    const spikes = 5;
    const outerRadius = 25;
    const innerRadius = 10;
    let rot = Math.PI / 2 * 3;
    const step = Math.PI / spikes;
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
        let sx = cx + Math.cos(rot) * outerRadius;
        let sy = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(sx, sy);
        rot += step;
        sx = cx + Math.cos(rot) * innerRadius;
        sy = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(sx, sy);
        rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Name text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(potmName ? potmName.toUpperCase() : 'N/A', cx, 230);

    // Display POTM stats inside Gold Card
    const potmPlayer = [...team1.players, ...team2.players].find(p => p.first_name === potmName);
    if (potmPlayer) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText('MATCH PERFORMANCE', cx, 270);

        ctx.fillStyle = '#e5e7eb';
        ctx.font = '14px sans-serif';
        
        let statsCount = 0;
        if (potmPlayer.runs > 0 || potmPlayer.balls > 0) {
            ctx.fillText(`${potmPlayer.runs || 0} Runs (${potmPlayer.balls || 0}b)`, cx, 300);
            statsCount++;
        }
        if (potmPlayer.ballsBowled > 0) {
            const ovs = Math.floor(potmPlayer.ballsBowled / 6) + '.' + (potmPlayer.ballsBowled % 6);
            ctx.fillText(`${potmPlayer.wickets || 0} Wkts / ${potmPlayer.runsConceded || 0} Runs`, cx, 300 + statsCount * 22);
            ctx.font = '12px sans-serif';
            ctx.fillStyle = '#9ca3af';
            ctx.fillText(`in ${ovs} Overs`, cx, 300 + statsCount * 22 + 15);
        }
    }


    // ================= BOTTOM WINNER ANNOUNCEMENT BAR =================
    const bottomBarGrad = ctx.createLinearGradient(100, 440, 100, 485);
    bottomBarGrad.addColorStop(0, '#f97316');
    bottomBarGrad.addColorStop(0.5, '#ef4444');
    bottomBarGrad.addColorStop(1, '#991b1b');
    ctx.fillStyle = bottomBarGrad;
    drawRoundedRect(ctx, 100, 440, 824, 45, 6);
    ctx.fill();

    ctx.save();
    ctx.strokeStyle = 'rgba(251, 146, 60, 0.4)';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, 100, 440, 824, 45, 6);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 2;
    ctx.fillText(resultText.toUpperCase(), 512, 469);
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

module.exports = {
  generateScoreboardImage
};
