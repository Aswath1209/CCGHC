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
  vignette.addColorStop(0, 'rgba(15, 5, 5, 0.3)');
  vignette.addColorStop(0.7, 'rgba(8, 2, 2, 0.85)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.98)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  // Card dimensions
  const cardX = 140;
  const cardY = 80;
  const cardW = 520;
  const cardH = 640;

  // 2. Velvet carbon card background (semi-transparent glassmorphic look)
  ctx.save();
  const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
  cardGrad.addColorStop(0, 'rgba(22, 12, 10, 0.85)');
  cardGrad.addColorStop(1, 'rgba(10, 4, 3, 0.95)');
  ctx.fillStyle = cardGrad;
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 28);
  ctx.fill();
  ctx.restore();

  // Subtle diagonal texture lines inside the card
  ctx.save();
  ctx.beginPath();
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 28);
  ctx.clip();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
  ctx.lineWidth = 1.5;
  for (let i = -width; i < width; i += 35) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + height, height);
    ctx.stroke();
  }
  ctx.restore();

  // 3. High-intensity neon glowing glass card border
  ctx.save();
  ctx.strokeStyle = '#f97316';
  ctx.shadowColor = 'rgba(249, 115, 22, 0.8)';
  ctx.shadowBlur = 16;
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 28);
  ctx.stroke();
  ctx.restore();

  // 4. Avatar (Top-Center of the card)
  const avatarX = 400;
  const avatarY = cardY + 100;
  const avatarRadius = 65;

  // Avatar glowing neon blue ring
  ctx.save();
  ctx.strokeStyle = '#38bdf8';
  ctx.shadowColor = 'rgba(56, 189, 248, 0.7)';
  ctx.shadowBlur = 10;
  ctx.lineWidth = 2.5;
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

  // 5. Username & Status
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  const name = normalizeStyledText(user.first_name || 'PLAYER');
  drawTextWithEmojis(ctx, name.toUpperCase(), avatarX, cardY + 205, 'bold 30px sans-serif');

  // Tier Title based on wins
  ctx.fillStyle = '#94a3b8';
  let tier = 'ROOKIE';
  if (stats.wins >= 50) tier = 'LEGEND';
  else if (stats.wins >= 25) tier = 'PRO';
  else if (stats.wins >= 10) tier = 'CHALLENGER';
  drawTextWithEmojis(ctx, `ALL-ROUNDER | ${tier}`, avatarX, cardY + 232, 'bold 13px sans-serif');
  ctx.restore();

  // Stats Grid Boxes (arranged 2x2 below header)
  const boxStartY = cardY + 265;
  const boxH = 115;
  const boxW = 215;

  function drawStatBox(title, x, y, value) {
    ctx.save();
    // Box Background (darker glass)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.18)';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, x, y, boxW, boxH, 14);
    ctx.fill();
    ctx.stroke();

    // Box Label
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    drawTextWithEmojis(ctx, title.toUpperCase(), x + boxW / 2, y + 35, 'bold 11px sans-serif');

    // Box Value
    // Gold/Orange Text Gradient
    const valGrad = ctx.createLinearGradient(x + 20, y + 75, x + boxW - 20, y + 75);
    valGrad.addColorStop(0, '#f97316');
    valGrad.addColorStop(1, '#facc15');

    ctx.fillStyle = valGrad;
    ctx.textAlign = 'center';
    drawTextWithEmojis(ctx, value, x + boxW / 2, y + 78, 'bold 20px sans-serif');
    ctx.restore();
  }

  // Box 1: Record (Wins/Losses)
  drawStatBox('Wins / Losses', cardX + 30, boxStartY, `${stats.wins} - ${stats.losses}`);

  // Box 2: Career Runs
  drawStatBox('Career Runs', cardX + 275, boxStartY, `${stats.runs}`);

  // Box 3: Batting Avg & High
  const avgStr = stats.dismissals > 0 ? (stats.runs / stats.dismissals).toFixed(2) : (stats.runs > 0 ? `${stats.runs}*` : '0.00');
  drawStatBox('High / Average', cardX + 30, boxStartY + boxH + 20, `${stats.highscore} / ${avgStr}`);

  // Box 4: Wickets & Economy
  const econ = stats.balls_bowled > 0 ? ((stats.runs_conceded * 6) / stats.balls_bowled).toFixed(2) : '0.00';
  drawStatBox('Wickets / Econ', cardX + 275, boxStartY + boxH + 20, `${stats.wickets} / ${econ}`);

  // 6. Footer inside the glass card
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.textAlign = 'center';
  drawTextWithEmojis(ctx, 'LIMITED EDITION | #045/500', avatarX, cardY + cardH - 30, 'bold 11px sans-serif');
  ctx.restore();

  // 7. Glossy Plastic card reflection overlay effect
  ctx.save();
  const glossGrad = ctx.createLinearGradient(0, 0, width, height);
  glossGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
  glossGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.03)');
  glossGrad.addColorStop(0.31, 'rgba(255, 255, 255, 0)');
  glossGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = glossGrad;
  ctx.beginPath();
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 28);
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
