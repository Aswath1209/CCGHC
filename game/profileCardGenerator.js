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

  // Card Boundary Dimensions (full-bleed layout)
  const cardX = 30;
  const cardY = 30;
  const cardW = 740;
  const cardH = 740;

  // 1. Velvet carbon background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#120907');
  bgGrad.addColorStop(0.5, '#050201');
  bgGrad.addColorStop(1, '#0e0603');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Diagonal Carbon Fiber lines pattern across the card
  ctx.save();
  ctx.strokeStyle = 'rgba(249, 115, 22, 0.04)';
  ctx.lineWidth = 1.5;
  for (let i = -width; i < width; i += 25) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + height, height);
    ctx.stroke();
  }
  ctx.restore();

  // 2. High-intensity neon outer glowing border
  ctx.save();
  ctx.strokeStyle = '#f97316';
  ctx.shadowColor = 'rgba(239, 68, 68, 0.95)';
  ctx.shadowBlur = 24;
  ctx.lineWidth = 5;
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 36);
  ctx.stroke();
  ctx.restore();

  // Thin double inner card border
  ctx.save();
  ctx.strokeStyle = 'rgba(249, 115, 22, 0.25)';
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, cardX + 10, cardY + 10, cardW - 20, cardH - 20, 28);
  ctx.stroke();
  ctx.restore();

  // 3. Futuristic Glowing Corner Brackets
  ctx.save();
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 3.5;
  ctx.shadowColor = 'rgba(239, 68, 68, 0.8)';
  ctx.shadowBlur = 8;
  const offset = 8;

  // Top-Left
  ctx.beginPath();
  ctx.moveTo(cardX + offset, cardY + offset + 35);
  ctx.lineTo(cardX + offset, cardY + offset);
  ctx.lineTo(cardX + offset + 35, cardY + offset);
  ctx.stroke();

  // Top-Right
  ctx.beginPath();
  ctx.moveTo(cardX + cardW - offset - 35, cardY + offset);
  ctx.lineTo(cardX + cardW - offset, cardY + offset);
  ctx.lineTo(cardX + cardW - offset, cardY + offset + 35);
  ctx.stroke();

  // Bottom-Left
  ctx.beginPath();
  ctx.moveTo(cardX + offset, cardY + cardH - offset - 35);
  ctx.lineTo(cardX + offset, cardY + cardH - offset);
  ctx.lineTo(cardX + offset + 35, cardY + cardH - offset);
  ctx.stroke();

  // Bottom-Right
  ctx.beginPath();
  ctx.moveTo(cardX + cardW - offset - 35, cardY + cardH - offset);
  ctx.lineTo(cardX + cardW - offset, cardY + cardH - offset);
  ctx.lineTo(cardX + cardW - offset, cardY + cardH - offset - 35);
  ctx.stroke();
  ctx.restore();

  // 4. Header (Avatar + Username side-by-side)
  const avatarX = cardX + 90;
  const avatarY = cardY + 95;
  const avatarRadius = 60;

  // Avatar glowing ring
  ctx.save();
  ctx.strokeStyle = '#f97316';
  ctx.shadowColor = 'rgba(249, 115, 22, 0.7)';
  ctx.shadowBlur = 12;
  ctx.lineWidth = 3;
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

  // Username & Tier Text
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(255, 255, 255, 0.15)';
  ctx.shadowBlur = 4;
  const name = normalizeStyledText(user.first_name || 'PLAYER');
  drawTextWithEmojis(ctx, name.toUpperCase(), cardX + 175, cardY + 90, 'bold 38px sans-serif');

  // Tier Title based on wins
  ctx.fillStyle = '#f97316';
  let tier = 'ROOKIE TIER';
  if (stats.wins >= 50) tier = 'LEGEND TIER';
  else if (stats.wins >= 25) tier = 'PRO TIER';
  else if (stats.wins >= 10) tier = 'CHALLENGER TIER';
  drawTextWithEmojis(ctx, `🏆 ${tier}`, cardX + 175, cardY + 128, 'bold 16px sans-serif');
  ctx.restore();

  // Header separator line
  ctx.strokeStyle = 'rgba(249, 115, 22, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + 30, cardY + 180);
  ctx.lineTo(cardX + cardW - 30, cardY + 180);
  ctx.stroke();

  // 5. Dual-Column Stats Division Cards
  const colY = cardY + 205;
  const colW = 325;
  const colH = 345;

  // Stat division helper function
  function drawDivisionCard(title, xPos, items) {
    // Column Card Background
    ctx.save();
    const grad = ctx.createLinearGradient(xPos, colY, xPos, colY + colH);
    grad.addColorStop(0, '#150d0a');
    grad.addColorStop(1, '#070302');
    ctx.fillStyle = grad;
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.2)';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, xPos, colY, colW, colH, 16);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Section title
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    drawTextWithEmojis(ctx, title, xPos + colW / 2, colY + 32, 'bold 14px sans-serif');

    // Title divider line
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(xPos + 20, colY + 46);
    ctx.lineTo(xPos + colW - 20, colY + 46);
    ctx.stroke();

    // Draw Stats Rows inside the Column Card
    const rowStartY = colY + 80;
    const rowGap = 65;

    items.forEach((item, index) => {
      const itemY = rowStartY + index * rowGap;

      ctx.save();
      // Label (Left side of division card)
      ctx.fillStyle = '#fca5a5';
      drawTextWithEmojis(ctx, item.label, xPos + 25, itemY, 'bold 17px sans-serif');

      // Value (Right side of division card)
      // Premium Gold/Orange text gradient
      const textGrad = ctx.createLinearGradient(xPos + colW - 25, itemY, xPos + colW - 120, itemY);
      textGrad.addColorStop(0, '#f97316');
      textGrad.addColorStop(1, '#facc15');

      ctx.fillStyle = textGrad;
      ctx.textAlign = 'right';
      drawTextWithEmojis(ctx, item.value, xPos + colW - 25, itemY, 'bold 20px sans-serif');
      ctx.restore();

      // Divider between rows
      if (index < items.length - 1) {
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(xPos + 20, itemY + 18);
        ctx.lineTo(xPos + colW - 20, itemY + 18);
        ctx.stroke();
      }
    });
  }

  // Batting Division Data
  const avgStr = stats.dismissals > 0 ? (stats.runs / stats.dismissals).toFixed(2) : (stats.runs > 0 ? `${stats.runs}*` : '0.00');
  const sr = stats.balls_faced > 0 ? ((stats.runs / stats.balls_faced) * 100).toFixed(2) : '0.00';
  drawDivisionCard('BATTING DIVISION', cardX + 30, [
    { label: 'Runs', value: stats.runs },
    { label: 'High Score', value: stats.highscore },
    { label: 'Average', value: avgStr },
    { label: 'Strike Rate', value: sr }
  ]);

  // Bowling Division Data
  const econ = stats.balls_bowled > 0 ? ((stats.runs_conceded * 6) / stats.balls_bowled).toFixed(2) : '0.00';
  const bestBowling = `${stats.best_wickets || 0}/${stats.best_runs_conceded || 0}`;
  drawDivisionCard('BOWLING DIVISION', cardX + 385, [
    { label: 'Wickets', value: stats.wickets },
    { label: 'Economy', value: econ },
    { label: 'Best Bowling', value: bestBowling },
    { label: 'Matches', value: stats.bowling_innings }
  ]);

  // 6. Bottom Banner (Wins / Losses Record & Purse coins)
  const bannerY = cardY + 575;
  const bannerW = cardW - 60;
  const bannerH = 75;

  ctx.save();
  const bannerGrad = ctx.createLinearGradient(cardX + 30, bannerY, cardX + 30, bannerY + bannerH);
  bannerGrad.addColorStop(0, '#180d09');
  bannerGrad.addColorStop(1, '#090403');
  ctx.fillStyle = bannerGrad;
  ctx.strokeStyle = 'rgba(249, 115, 22, 0.25)';
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, cardX + 30, bannerY, bannerW, bannerH, 14);
  ctx.fill();
  ctx.stroke();

  // Wins / Losses label & value
  ctx.fillStyle = '#fca5a5';
  drawTextWithEmojis(ctx, 'Tour Record:', cardX + 55, bannerY + 44, 'bold 18px sans-serif');

  // Pill badge for Wins / Losses
  const pillW = 120;
  const pillH = 34;
  const pillX = cardX + 180;
  const pillY = bannerY + 20;

  ctx.fillStyle = '#100a08';
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 17);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  drawTextWithEmojis(ctx, `${stats.wins}W / ${stats.losses}L`, pillX + pillW / 2, bannerY + 43, 'bold 16px sans-serif');

  // Coins Purse (Right side of the bottom banner)
  ctx.textAlign = 'right';
  ctx.fillStyle = '#fca5a5';
  drawTextWithEmojis(ctx, 'Purse:', cardX + bannerW - 140, bannerY + 44, 'bold 18px sans-serif');
  ctx.fillStyle = '#facc15';
  drawTextWithEmojis(ctx, `${user.coins || 0} 🪙`, cardX + bannerW - 10, bannerY + 44, 'bold 22px sans-serif');
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
