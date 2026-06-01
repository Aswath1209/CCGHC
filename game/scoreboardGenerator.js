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

    const bgPath = '/home/home/ReactNative/Telegram/undercover-bot/assets/stadium_bg.png';
    try {
      const bg = await loadImage(bgPath);
      ctx.drawImage(bg, 0, 0, width, height);
    } catch (err) {
      console.error("Failed to load stadium background, using color fallback:", err);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);
    }

    const cardX = 112;
    const cardY = 38;
    const cardW = 800;
    const cardH = 500;

    const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
    cardGrad.addColorStop(0, 'rgba(10, 15, 26, 0.90)');
    cardGrad.addColorStop(1, 'rgba(5, 7, 12, 0.95)');
    ctx.fillStyle = cardGrad;
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 16);
    ctx.fill();

    const borderGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    borderGrad.addColorStop(0, '#e2e8f0');
    borderGrad.addColorStop(0.3, '#94a3b8');
    borderGrad.addColorStop(0.5, '#ffffff');
    borderGrad.addColorStop(0.7, '#475569');
    borderGrad.addColorStop(1, '#cbd5e1');
    ctx.strokeStyle = borderGrad;
    ctx.lineWidth = 4;
    ctx.stroke();

    const metalGrad = ctx.createLinearGradient(130, 55, 130, 97);
    metalGrad.addColorStop(0, '#f8fafc');
    metalGrad.addColorStop(0.4, '#e2e8f0');
    metalGrad.addColorStop(0.5, '#cbd5e1');
    metalGrad.addColorStop(1, '#94a3b8');
    ctx.fillStyle = metalGrad;
    drawRoundedRect(ctx, 130, 55, 764, 42, 6);
    ctx.fill();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MATCH SUMMARY', 512, 84);

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

    const blueGrad = ctx.createLinearGradient(130, 107, 130, 143);
    blueGrad.addColorStop(0, '#1d4ed8');
    blueGrad.addColorStop(0.5, '#2563eb');
    blueGrad.addColorStop(1, '#1e3a8a');
    ctx.fillStyle = blueGrad;
    drawRoundedRect(ctx, 130, 107, 764, 36, 4);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(team1.name.toUpperCase(), 145, 131);

    ctx.textAlign = 'right';
    ctx.fillText(`${team1Overs} Overs  |  ${team1Score}/${team1.wickets || 0}`, 879, 131);

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

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(512, 150);
    ctx.lineTo(512, 265);
    ctx.stroke();

    for (let i = 0; i < 4; i++) {
      const y = 168 + i * 23;
      const p = inn1Performers.batsmen[i] || { name: '-', runs: '', balls: '' };
      ctx.fillStyle = '#ffffff';
      ctx.font = '15px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(p.name, 145, y);

      if (p.runs !== '') {
        ctx.textAlign = 'right';
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText(p.runs, 420, y);
        ctx.fillStyle = '#9ca3af';
        ctx.font = '13px sans-serif';
        ctx.fillText(`(${p.balls})`, 460, y);
      }
    }

    for (let i = 0; i < 4; i++) {
      const y = 168 + i * 23;
      const p = inn1Performers.bowlers[i] || { name: '-', wickets: '', runsConceded: '', ballsBowled: '' };
      ctx.fillStyle = '#ffffff';
      ctx.font = '15px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(p.name, 545, y);

      if (p.wickets !== '') {
        const overs = Math.floor(p.ballsBowled / 6) + '.' + (p.ballsBowled % 6);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText(`${p.wickets}-${p.runsConceded}`, 820, y);
        ctx.fillStyle = '#9ca3af';
        ctx.font = '13px sans-serif';
        ctx.fillText(`${overs}`, 865, y);
      }
    }

    const greenGrad = ctx.createLinearGradient(130, 275, 130, 311);
    greenGrad.addColorStop(0, '#047857');
    greenGrad.addColorStop(0.5, '#059669');
    greenGrad.addColorStop(1, '#064e3b');
    ctx.fillStyle = greenGrad;
    drawRoundedRect(ctx, 130, 275, 764, 36, 4);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(team2.name.toUpperCase(), 145, 299);

    ctx.textAlign = 'right';
    ctx.fillText(`${team2Overs} Overs  |  ${team2Score}/${team2.wickets || 0}`, 879, 299);

    const inn2Performers = getPerformers(team2, team1);

    ctx.beginPath();
    ctx.moveTo(512, 318);
    ctx.lineTo(512, 433);
    ctx.stroke();

    for (let i = 0; i < 4; i++) {
      const y = 336 + i * 23;
      const p = inn2Performers.batsmen[i] || { name: '-', runs: '', balls: '' };
      ctx.fillStyle = '#ffffff';
      ctx.font = '15px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(p.name, 145, y);

      if (p.runs !== '') {
        ctx.textAlign = 'right';
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText(p.runs, 420, y);
        ctx.fillStyle = '#9ca3af';
        ctx.font = '13px sans-serif';
        ctx.fillText(`(${p.balls})`, 460, y);
      }
    }

    for (let i = 0; i < 4; i++) {
      const y = 336 + i * 23;
      const p = inn2Performers.bowlers[i] || { name: '-', wickets: '', runsConceded: '', ballsBowled: '' };
      ctx.fillStyle = '#ffffff';
      ctx.font = '15px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(p.name, 545, y);

      if (p.wickets !== '') {
        const overs = Math.floor(p.ballsBowled / 6) + '.' + (p.ballsBowled % 6);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText(`${p.wickets}-${p.runsConceded}`, 820, y);
        ctx.fillStyle = '#9ca3af';
        ctx.font = '13px sans-serif';
        ctx.fillText(`${overs}`, 865, y);
      }
    }

    ctx.fillStyle = metalGrad;
    drawRoundedRect(ctx, 130, 443, 764, 42, 6);
    ctx.fill();
    ctx.stroke();

    let footerLine = resultText.toUpperCase();
    if (potmName) {
        footerLine += `   |   POTM: ${potmName.toUpperCase()}`;
    }
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(footerLine, 512, 471);

    const logoPath = '/home/home/ReactNative/Telegram/undercover-bot/assets/logo.png';
    try {
      const logo = await loadImage(logoPath);
      const circleX = 145;
      const circleY = 75;
      const radius = 30;

      const ringGrad = ctx.createLinearGradient(circleX - radius, circleY - radius, circleX + radius, circleY + radius);
      ringGrad.addColorStop(0, '#f8fafc');
      ringGrad.addColorStop(0.5, '#94a3b8');
      ringGrad.addColorStop(1, '#475569');
      ctx.fillStyle = ringGrad;
      ctx.beginPath();
      ctx.arc(circleX, circleY, radius + 2, 0, Math.PI * 2);
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
