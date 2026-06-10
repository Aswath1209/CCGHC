const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const { normalizeStyledText } = require('./scoreboardGenerator');

try {
  GlobalFonts.loadSystemFonts();
} catch (e) {
  console.error("Failed to load system fonts in profile generator:", e);
}

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

function drawTextWithEmojis(ctx, text, x, y, fontSpec, emojiFontFamily = 'Noto Color Emoji') {
  if (text === undefined || text === null) return;
  const str = String(text);
  
  const fontParts = fontSpec.split(/\s+/);
  const familyIndex = fontParts.findIndex(part => part.includes('sans-serif') || part.includes('Arial') || part.includes('DejaVu'));
  
  let sizeAndStyle = '14px';
  let primaryFamily = 'DejaVu Sans';
  
  if (familyIndex !== -1) {
    sizeAndStyle = fontParts.slice(0, familyIndex).join(' ');
    primaryFamily = 'DejaVu Sans'; 
  } else {
    sizeAndStyle = fontParts.slice(0, -1).join(' ');
    primaryFamily = 'DejaVu Sans';
  }
  
  const primaryFont = `${sizeAndStyle} "${primaryFamily}"`;
  const emojiFont = `${sizeAndStyle} "${emojiFontFamily}"`;
  
  const segments = str.split(/(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base})/gu);
  const activeSegments = segments.filter(seg => seg !== '');
  
  const details = activeSegments.map(seg => {
    const isEmoji = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base})/u.test(seg);
    ctx.save();
    ctx.font = isEmoji ? emojiFont : primaryFont;
    const metrics = ctx.measureText(seg);
    ctx.restore();
    return {
      text: seg,
      isEmoji,
      width: metrics.width
    };
  });
  
  const totalWidth = details.reduce((sum, d) => sum + d.width, 0);
  
  let currentX = x;
  const align = ctx.textAlign || 'left';
  if (align === 'center') {
    currentX = x - totalWidth / 2;
  } else if (align === 'right') {
    currentX = x - totalWidth;
  }
  
  const originalAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  
  for (const d of details) {
    ctx.save();
    ctx.font = d.isEmoji ? emojiFont : primaryFont;
    ctx.fillText(d.text, currentX, y);
    ctx.restore();
    currentX += d.width;
  }
  
  ctx.textAlign = originalAlign;
}

async function generateProfileCard(user, stats, avatarBuffer) {
  const width = 800;
  const height = 1200; // Vertical card aspect ratio
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Card Boundary Dimensions
  const cardX = 40;
  const cardY = 40;
  const cardW = 720;
  const cardH = 1120;

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

  // Cinematic dark radial vignette overlay with gold/bronze hues
  const vignette = ctx.createRadialGradient(width / 2, height / 2, 80, width / 2, height / 2, width / 2 + 150);
  vignette.addColorStop(0, 'rgba(12, 6, 18, 0.25)');
  vignette.addColorStop(0.7, 'rgba(6, 3, 9, 0.82)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.98)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  // Ornate glowing background dust particle overlay
  ctx.fillStyle = 'rgba(212, 175, 55, 0.05)';
  for (let i = 0; i < 35; i++) {
    const px = Math.random() * width;
    const py = Math.random() * height;
    const pr = Math.random() * 4 + 1;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Velvet royal-black card background container
  ctx.save();
  const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
  cardGrad.addColorStop(0, '#0c0512');
  cardGrad.addColorStop(0.5, '#060309');
  cardGrad.addColorStop(1, '#0e0804');
  ctx.fillStyle = cardGrad;
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 36);
  ctx.fill();
  ctx.restore();

  // Subtle diagonal gold carbon pattern lines inside card
  ctx.save();
  ctx.beginPath();
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 36);
  ctx.clip();
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.03)';
  ctx.lineWidth = 1;
  for (let i = -width; i < width; i += 30) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + height, height);
    ctx.stroke();
  }
  ctx.restore();

  // 3. Ornate Double Gold Framing Borders
  ctx.save();
  ctx.strokeStyle = '#d4af37'; // Ornate metallic gold
  ctx.shadowColor = 'rgba(212, 175, 55, 0.7)';
  ctx.shadowBlur = 18;
  ctx.lineWidth = 5.5;
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 36);
  ctx.stroke();
  ctx.restore();

  // Inner gold line border
  ctx.save();
  ctx.strokeStyle = 'rgba(252, 211, 77, 0.35)'; // Light gold line
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, cardX + 11, cardY + 11, cardW - 22, cardH - 22, 26);
  ctx.stroke();
  ctx.restore();

  // Ornate decorative corners (small circles at intersection points)
  ctx.fillStyle = '#d4af37';
  const cornerOffset = 22;
  const corners = [
    [cardX + cornerOffset, cardY + cornerOffset],
    [cardX + cardW - cornerOffset, cardY + cornerOffset],
    [cardX + cornerOffset, cardY + cardH - cornerOffset],
    [cardX + cardW - cornerOffset, cardY + cardH - cornerOffset]
  ];
  corners.forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  // 4. Header Section (Avatar + Username)
  const avatarX = cardX + 90;
  const avatarY = cardY + 100;
  const avatarRadius = 65;

  // Avatar thick gold framing ring
  ctx.save();
  ctx.strokeStyle = '#d4af37';
  ctx.shadowColor = 'rgba(212, 175, 55, 0.6)';
  ctx.shadowBlur = 12;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius + 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Avatar Clip & Draw
  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
  ctx.clip();

  if (avatarBuffer) {
    try {
      const img = await loadImage(avatarBuffer);
      ctx.drawImage(img, avatarX - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
    } catch (e) {
      drawSilhouette(ctx, avatarX, avatarY, avatarRadius);
    }
  } else {
    drawSilhouette(ctx, avatarX, avatarY, avatarRadius);
  }
  ctx.restore();

  // Username (uppercase in Gold gradient)
  ctx.save();
  const nameGrad = ctx.createLinearGradient(cardX + 175, avatarY - 20, cardX + 500, avatarY - 20);
  nameGrad.addColorStop(0, '#f59e0b');
  nameGrad.addColorStop(0.5, '#fbbf24');
  nameGrad.addColorStop(1, '#fef08a');
  ctx.fillStyle = nameGrad;
  const name = normalizeStyledText(user.first_name || 'PLAYER');
  drawTextWithEmojis(ctx, name.toUpperCase(), cardX + 175, avatarY - 10, 'bold 36px sans-serif');

  // Subtitle/Rank
  ctx.fillStyle = '#e2e8f0';
  let tier = 'ROOKIE';
  if (stats.wins >= 50) tier = 'ROYAL LEGEND';
  else if (stats.wins >= 25) tier = 'ELITE PRO';
  else if (stats.wins >= 10) tier = 'CHALLENGER';
  drawTextWithEmojis(ctx, `👑 ${tier} • ROYAL CLUB`, cardX + 175, avatarY + 24, 'bold 13px sans-serif');

  // Record summary label
  ctx.fillStyle = '#fca5a5';
  drawTextWithEmojis(ctx, `RECORD: ${stats.wins} WINS / ${stats.losses} LOSSES / ${stats.motm} MVPS`, cardX + 175, avatarY + 48, 'bold 12px sans-serif');
  ctx.restore();

  // Header separator gold line
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + 30, cardY + 195);
  ctx.lineTo(cardX + cardW - 30, cardY + 195);
  ctx.stroke();

  // Helper function to draw structured, labeled stat boxes
  function drawStatBox(title, x, y, width, height, rows) {
    // Stat Box Card Container
    ctx.save();
    const boxGrad = ctx.createLinearGradient(x, y, x, y + height);
    boxGrad.addColorStop(0, '#0c0714');
    boxGrad.addColorStop(1, '#050208');
    ctx.fillStyle = boxGrad;
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.25)';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, x, y, width, height, 16);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Box Header Title (gold/yellow text)
    ctx.save();
    ctx.fillStyle = '#d4af37';
    ctx.textAlign = 'center';
    drawTextWithEmojis(ctx, title, x + width / 2, y + 28, 'bold 13px sans-serif');
    ctx.restore();

    // Box divider line
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 20, y + 38);
    ctx.lineTo(x + width - 20, y + 38);
    ctx.stroke();

    // Draw multi-column stats
    const colW = (width - 40) / rows.length;
    rows.forEach((col, colIndex) => {
      const colX = x + 20 + colIndex * colW;
      
      col.items.forEach((item, rowIndex) => {
        const itemY = y + 72 + rowIndex * 55;

        // Label
        ctx.save();
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'left';
        drawTextWithEmojis(ctx, item.label, colX, itemY, 'bold 11px sans-serif');

        // Value (bold yellow/gold)
        ctx.fillStyle = '#fbbf24';
        drawTextWithEmojis(ctx, item.value, colX, itemY + 23, 'bold 18px sans-serif');
        ctx.restore();
      });
    });
  }

  // 5. BATTING DISCIPLINE Box (from Y = 250 to Y = 560, height 310)
  const avgStr = stats.dismissals > 0 ? (stats.runs / stats.dismissals).toFixed(2) : (stats.runs > 0 ? `${stats.runs}*` : '0.00');
  const sr = stats.balls_faced > 0 ? ((stats.runs / stats.balls_faced) * 100).toFixed(2) : '0.00';
  
  drawStatBox(
    '🏏 BATTING DISCIPLINE',
    cardX + 30,
    cardY + 215,
    cardW - 60,
    305,
    [
      {
        items: [
          { label: 'Runs Scored', value: stats.runs },
          { label: 'Balls Faced', value: stats.balls_faced },
          { label: 'Strike Rate', value: sr }
        ]
      },
      {
        items: [
          { label: 'Batting Avg', value: avgStr },
          { label: 'High Score', value: stats.highscore },
          { label: 'Innings/Outs', value: `${stats.batting_innings} / ${stats.dismissals}` }
        ]
      },
      {
        items: [
          { label: 'Centuries/50s', value: `${stats.centuries} / ${stats.fifties}` },
          { label: 'Fours / Sixes', value: `${stats.fours} / ${stats.sixes}` },
          { label: 'Ducks Count', value: stats.ducks }
        ]
      }
    ]
  );

  // 6. BOWLING DISCIPLINE Box (from Y = 540 to Y = 850, height 310)
  const econ = stats.balls_bowled > 0 ? ((stats.runs_conceded * 6) / stats.balls_bowled).toFixed(2) : '0.00';
  const ov = `${Math.floor(stats.balls_bowled / 6)}.${stats.balls_bowled % 6}`;
  const bestBowling = `${stats.best_wickets || 0}/${stats.best_runs_conceded || 0}`;

  drawStatBox(
    '🥎 BOWLING DISCIPLINE',
    cardX + 30,
    cardY + 540,
    cardW - 60,
    305,
    [
      {
        items: [
          { label: 'Wickets Taken', value: stats.wickets },
          { label: 'Overs Bowled', value: `${ov} ov` },
          { label: 'Economy Rate', value: econ }
        ]
      },
      {
        items: [
          { label: 'Best Bowling', value: bestBowling },
          { label: 'Runs Conceded', value: stats.runs_conceded },
          { label: 'Bowling Innings', value: stats.bowling_innings }
        ]
      },
      {
        items: [
          { label: '3 Wicket Hauls', value: stats.threew },
          { label: '5 Wicket Hauls', value: stats.fivew },
          { label: 'Bowler Status', value: stats.wickets > 20 ? 'ELITE' : 'ACTIVE' }
        ]
      }
    ]
  );

  // 7. RECORD & PURSE BOX (from Y = 865 to Y = 1005, height 140)
  drawStatBox(
    '🏆 TOUR ARCHIVES & WALLET',
    cardX + 30,
    cardY + 865,
    cardW - 60,
    155,
    [
      {
        items: [
          { label: 'Matches Won', value: `${stats.wins} W` },
          { label: 'Matches Lost', value: `${stats.losses} L` }
        ]
      },
      {
        items: [
          { label: 'MOTM Awards', value: `${stats.motm} 🏅` },
          { label: 'Win Rate Ratio', value: stats.wins + stats.losses > 0 ? `${((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(1)}%` : '0.0%' }
        ]
      },
      {
        items: [
          { label: 'Vault Coins Balance', value: `${user.coins || 0} 🪙` },
          { label: 'Collector Status', value: 'ROYAL member' }
        ]
      }
    ]
  );

  // 8. Footer credits
  ctx.save();
  ctx.fillStyle = 'rgba(212, 175, 55, 0.4)';
  ctx.textAlign = 'center';
  drawTextWithEmojis(ctx, 'CRICKET LEAGUE COLLECTIBLES • ROYAL SERIES', width / 2, cardY + cardH - 35, 'bold 11px sans-serif');
  ctx.restore();

  // 9. Premium Glossy Card overlay reflection shine
  ctx.save();
  const glossGrad = ctx.createLinearGradient(0, 0, width, height);
  glossGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
  glossGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.04)');
  glossGrad.addColorStop(0.31, 'rgba(255, 255, 255, 0)');
  glossGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = glossGrad;
  ctx.beginPath();
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 36);
  ctx.fill();
  ctx.restore();

  return canvas.toBuffer('image/png');
}

function drawSilhouette(ctx, x, y, radius) {
  ctx.fillStyle = '#1e1b18';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#4a443e';
  ctx.beginPath();
  ctx.arc(x, y - 8, radius * 0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y + radius + 8, radius * 0.8, Math.PI, 0, false);
  ctx.fill();
}

module.exports = {
  generateProfileCard
};
