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
  const height = 800;
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

  // Cinematic dark radial vignette overlay
  const vignette = ctx.createRadialGradient(width / 2, height / 2, 80, width / 2, height / 2, width / 2 + 100);
  vignette.addColorStop(0, 'rgba(15, 5, 5, 0.4)');
  vignette.addColorStop(0.7, 'rgba(8, 2, 2, 0.9)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.98)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  // Card dimensions
  const cardX = 120;
  const cardY = 80;
  const cardW = 560;
  const cardH = 640;

  // 2. Velvet carbon card background
  const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
  cardGrad.addColorStop(0, '#100a08');
  cardGrad.addColorStop(1, '#050302');
  ctx.fillStyle = cardGrad;
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 32);
  ctx.fill();

  // Subtle diagonal texture lines inside the card
  ctx.save();
  ctx.beginPath();
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 32);
  ctx.clip();
  ctx.strokeStyle = 'rgba(249, 115, 22, 0.03)';
  ctx.lineWidth = 1;
  for (let i = -width; i < width; i += 30) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + height, height);
    ctx.stroke();
  }
  ctx.restore();

  // 3. High-intensity neon glow card border
  ctx.save();
  ctx.strokeStyle = '#f97316';
  ctx.shadowColor = 'rgba(239, 68, 68, 0.8)';
  ctx.shadowBlur = 20;
  ctx.lineWidth = 4;
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 32);
  ctx.stroke();
  ctx.restore();

  // 4. Avatar (Top-Left of the card)
  const avatarX = cardX + 90;
  const avatarY = cardY + 100;
  const avatarRadius = 65;

  ctx.save();
  ctx.strokeStyle = '#f97316';
  ctx.shadowColor = 'rgba(249, 115, 22, 0.6)';
  ctx.shadowBlur = 10;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius + 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

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

  // 5. Username (Top-Right of the card, next to Avatar)
  ctx.save();
  ctx.fillStyle = '#ffffff';
  const name = normalizeStyledText(user.first_name || 'PLAYER');
  drawTextWithEmojis(ctx, name.toUpperCase(), cardX + 175, cardY + 115, 'bold 36px sans-serif');
  ctx.restore();

  // 6. Horizontal separator line
  ctx.strokeStyle = 'rgba(249, 115, 22, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + 30, cardY + 195);
  ctx.lineTo(cardX + cardW - 30, cardY + 195);
  ctx.stroke();

  // Helper function to draw clean horizontal separator rows
  function drawDivider(y) {
    ctx.save();
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cardX + 30, y);
    ctx.lineTo(cardX + cardW - 30, y);
    ctx.stroke();
    ctx.restore();
  }

  // 7. Stat Rows
  const startY = cardY + 245;
  const rowHeight = 75;

  // --- Row 1: Wins / Losses ---
  ctx.save();
  ctx.fillStyle = '#fca5a5';
  drawTextWithEmojis(ctx, 'Wins / Losses:', cardX + 40, startY, 'bold 22px sans-serif');

  // Pill badge
  const pillW = 120;
  const pillH = 38;
  const pillX = cardX + cardW - 40 - pillW;
  const pillY = startY - 26;

  ctx.fillStyle = '#100a08';
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 19);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  drawTextWithEmojis(ctx, `${stats.wins} / ${stats.losses}`, pillX + pillW / 2, startY, 'bold 20px sans-serif');
  ctx.restore();

  drawDivider(startY + 35);

  // --- Row 2: Runs ---
  const runsY = startY + rowHeight;
  ctx.save();
  ctx.fillStyle = '#fca5a5';
  drawTextWithEmojis(ctx, 'Runs:', cardX + 40, runsY, 'bold 22px sans-serif');
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  drawTextWithEmojis(ctx, stats.runs, cardX + cardW - 40, runsY, 'bold 26px sans-serif');
  ctx.restore();

  drawDivider(runsY + 35);

  // --- Row 3: High Score & Average ---
  const hsY = runsY + rowHeight;
  const col1X = cardX + 40;
  const col2X = cardX + cardW / 2 + 10;

  ctx.save();
  ctx.fillStyle = '#fca5a5';
  drawTextWithEmojis(ctx, 'High Score:', col1X, hsY, 'bold 22px sans-serif');
  ctx.fillStyle = '#ffffff';
  drawTextWithEmojis(ctx, stats.highscore, col1X + 135, hsY, 'bold 22px sans-serif');

  ctx.fillStyle = '#fca5a5';
  drawTextWithEmojis(ctx, 'Avg:', col2X, hsY, 'bold 22px sans-serif');
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  const avgStr = stats.dismissals > 0 ? (stats.runs / stats.dismissals).toFixed(2) : (stats.runs > 0 ? `${stats.runs}*` : '0.00');
  drawTextWithEmojis(ctx, avgStr, cardX + cardW - 40, hsY, 'bold 22px sans-serif');
  ctx.restore();

  drawDivider(hsY + 35);

  // --- Row 4: Wickets & Economy ---
  const wkY = hsY + rowHeight;
  ctx.save();
  ctx.fillStyle = '#fca5a5';
  drawTextWithEmojis(ctx, 'Wickets:', col1X, wkY, 'bold 22px sans-serif');
  ctx.fillStyle = '#ffffff';
  drawTextWithEmojis(ctx, stats.wickets, col1X + 135, wkY, 'bold 22px sans-serif');

  ctx.fillStyle = '#fca5a5';
  drawTextWithEmojis(ctx, 'Econ:', col2X, wkY, 'bold 22px sans-serif');
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  const econ = stats.balls_bowled > 0 ? ((stats.runs_conceded * 6) / stats.balls_bowled).toFixed(2) : '0.00';
  drawTextWithEmojis(ctx, econ, cardX + cardW - 40, wkY, 'bold 22px sans-serif');
  ctx.restore();

  drawDivider(wkY + 35);

  // --- Row 5: Best Bowling ---
  const bbY = wkY + rowHeight;
  ctx.save();
  ctx.fillStyle = '#fca5a5';
  drawTextWithEmojis(ctx, 'Best Bowling:', cardX + 40, bbY, 'bold 22px sans-serif');
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  const bestBowling = `${stats.best_wickets || 0}/${stats.best_runs_conceded || 0}`;
  drawTextWithEmojis(ctx, bestBowling, cardX + cardW - 40, bbY, 'bold 24px sans-serif');
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
