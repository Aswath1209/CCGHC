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
  const width = 600;
  const height = 1000; // Vertical trading card ratio
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Card boundary dimensions
  const cardX = 30;
  const cardY = 30;
  const cardW = 540;
  const cardH = 940;

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
  vignette.addColorStop(0, 'rgba(12, 6, 18, 0.25)');
  vignette.addColorStop(0.7, 'rgba(6, 3, 9, 0.85)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.98)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  // Ornate glowing background dust particle overlay
  ctx.fillStyle = 'rgba(212, 175, 55, 0.04)';
  for (let i = 0; i < 20; i++) {
    const px = Math.random() * width;
    const py = Math.random() * height;
    const pr = Math.random() * 3 + 1;
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
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 28);
  ctx.fill();
  ctx.restore();

  // Subtle diagonal carbon fiber texture lines inside card
  ctx.save();
  ctx.beginPath();
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 28);
  ctx.clip();
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.025)';
  ctx.lineWidth = 1;
  for (let i = -width; i < width; i += 25) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + height, height);
    ctx.stroke();
  }
  ctx.restore();

  // 3. Ornate Double Gold Framing Borders
  ctx.save();
  ctx.strokeStyle = '#d4af37'; // Ornate metallic gold
  ctx.shadowColor = 'rgba(212, 175, 55, 0.65)';
  ctx.shadowBlur = 15;
  ctx.lineWidth = 5;
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 28);
  ctx.stroke();
  ctx.restore();

  // Inner gold line border
  ctx.save();
  ctx.strokeStyle = 'rgba(252, 211, 77, 0.3)';
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, cardX + 9, cardY + 9, cardW - 18, cardH - 18, 20);
  ctx.stroke();
  ctx.restore();

  // Ornate decorative corner circles
  ctx.fillStyle = '#d4af37';
  const cornerOffset = 18;
  const corners = [
    [cardX + cornerOffset, cardY + cornerOffset],
    [cardX + cardW - cornerOffset, cardY + cornerOffset],
    [cardX + cornerOffset, cardY + cardH - cornerOffset],
    [cardX + cardW - cornerOffset, cardY + cardH - cornerOffset]
  ];
  corners.forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // 4. Header Section (Avatar + Username centered)
  const avatarX = 300;
  const avatarY = cardY + 110;
  const avatarRadius = 60;

  // Avatar gold framing ring
  ctx.save();
  ctx.strokeStyle = '#d4af37';
  ctx.shadowColor = 'rgba(212, 175, 55, 0.5)';
  ctx.shadowBlur = 10;
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

  // Username (centered in Gold gradient)
  ctx.save();
  const nameGrad = ctx.createLinearGradient(width / 2 - 150, avatarY + 80, width / 2 + 150, avatarY + 80);
  nameGrad.addColorStop(0, '#f59e0b');
  nameGrad.addColorStop(0.5, '#fbbf24');
  nameGrad.addColorStop(1, '#fef08a');
  ctx.fillStyle = nameGrad;
  ctx.textAlign = 'center';
  const name = normalizeStyledText(user.first_name || 'PLAYER');
  drawTextWithEmojis(ctx, name.toUpperCase(), avatarX, avatarY + 95, 'bold 28px sans-serif');

  // Subtitle/Rank
  ctx.fillStyle = '#94a3b8';
  let tier = 'ROOKIE';
  if (stats.wins >= 50) tier = 'ROYAL LEGEND';
  else if (stats.wins >= 25) tier = 'ELITE PRO';
  else if (stats.wins >= 10) tier = 'CHALLENGER';
  drawTextWithEmojis(ctx, `👑 ${tier} • PLAYER CARD`, avatarX, avatarY + 120, 'bold 12px sans-serif');
  ctx.restore();

  // Header separator gold line
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + 30, cardY + 260);
  ctx.lineTo(cardX + cardW - 30, cardY + 260);
  ctx.stroke();

  // 5. Stat Column Division Boxes
  const colY = cardY + 285;
  const colW = 230;
  const colH = 550;

  function drawDivisionCard(title, xPos, items, rowGap) {
    // Column Card Background
    ctx.save();
    const grad = ctx.createLinearGradient(xPos, colY, xPos, colY + colH);
    grad.addColorStop(0, '#0c0714');
    grad.addColorStop(1, '#050208');
    ctx.fillStyle = grad;
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.22)';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, xPos, colY, colW, colH, 14);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Section title (gold/yellow text)
    ctx.fillStyle = '#d4af37';
    ctx.textAlign = 'center';
    drawTextWithEmojis(ctx, title, xPos + colW / 2, colY + 28, 'bold 13px sans-serif');

    // Title divider line
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(xPos + 20, colY + 38);
    ctx.lineTo(xPos + colW - 20, colY + 38);
    ctx.stroke();

    // Draw Stats Rows
    const rowStartY = colY + 75;

    items.forEach((item, index) => {
      const itemY = rowStartY + index * rowGap;

      ctx.save();
      // Label (centered)
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center';
      drawTextWithEmojis(ctx, item.label, xPos + colW / 2, itemY, 'bold 11px sans-serif');

      // Value (bold gold/yellow, centered)
      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'center';
      drawTextWithEmojis(ctx, item.value, xPos + colW / 2, itemY + 24, 'bold 18px sans-serif');
      ctx.restore();

      // Divider line
      if (index < items.length - 1) {
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(xPos + 30, itemY + 38);
        ctx.lineTo(xPos + colW - 30, itemY + 38);
        ctx.stroke();
      }
    });
  }

  // Batting stats (6 items, rowGap = 78)
  const avgStr = stats.dismissals > 0 ? (stats.runs / stats.dismissals).toFixed(2) : (stats.runs > 0 ? `${stats.runs}*` : '0.00');
  drawDivisionCard(
    '🏏 BATTING',
    cardX + 30,
    [
      { label: 'Runs Scored', value: stats.runs },
      { label: 'Batting Average', value: avgStr },
      { label: 'Fours / Sixes', value: `${stats.fours} / ${stats.sixes}` },
      { label: '50s / 100s', value: `${stats.fifties} / ${stats.centuries}` },
      { label: 'Highest Score', value: stats.highscore },
      { label: 'Ducks Count', value: stats.ducks }
    ],
    78
  );

  // Bowling stats (4 items, rowGap = 120)
  const econ = stats.balls_bowled > 0 ? ((stats.runs_conceded * 6) / stats.balls_bowled).toFixed(2) : '0.00';
  const bestBowling = `${stats.best_wickets || 0}/${stats.best_runs_conceded || 0}`;
  drawDivisionCard(
    '🥎 BOWLING',
    cardX + 275,
    [
      { label: 'Wickets Taken', value: stats.wickets },
      { label: 'Economy Rate', value: econ },
      { label: '3w / 5w Hauls', value: `${stats.threew} / ${stats.fivew}` },
      { label: 'Best Bowling', value: bestBowling }
    ],
    120
  );

  // 6. Footer credits
  ctx.save();
  ctx.fillStyle = 'rgba(212, 175, 55, 0.4)';
  ctx.textAlign = 'center';
  drawTextWithEmojis(ctx, 'CRICKET LEAGUE COLLECTIBLES • ELITE GOLD SERIES', width / 2, cardY + cardH - 30, 'bold 10px sans-serif');
  ctx.restore();

  // 7. Premium Glossy Card overlay reflection shine
  ctx.save();
  const glossGrad = ctx.createLinearGradient(0, 0, width, height);
  glossGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
  glossGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.04)');
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
