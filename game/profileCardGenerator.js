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

  // 1. Velvet carbon background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#100a08');
  bgGrad.addColorStop(0.5, '#050302');
  bgGrad.addColorStop(1, '#0c0502');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle diagonal lines grid pattern
  ctx.save();
  ctx.strokeStyle = 'rgba(249, 115, 22, 0.03)';
  ctx.lineWidth = 1;
  for (let i = -width; i < width; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + height, height);
    ctx.stroke();
  }
  ctx.restore();

  // 2. High-intensity neon fire glow border
  ctx.save();
  ctx.strokeStyle = '#f97316';
  ctx.shadowColor = 'rgba(239, 68, 68, 0.8)';
  ctx.shadowBlur = 18;
  ctx.lineWidth = 4;
  drawRoundedRect(ctx, 20, 20, width - 40, height - 40, 24);
  ctx.stroke();
  ctx.restore();

  // Inner frame line
  ctx.save();
  ctx.strokeStyle = 'rgba(249, 115, 22, 0.3)';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 4]);
  drawRoundedRect(ctx, 28, 28, width - 56, height - 56, 20);
  ctx.stroke();
  ctx.restore();

  // 3. User Avatar
  const avatarX = 110;
  const avatarY = 110;
  const avatarRadius = 65;

  ctx.save();
  // Draw glowing ring
  ctx.strokeStyle = '#f97316';
  ctx.shadowColor = 'rgba(249, 115, 22, 0.7)';
  ctx.shadowBlur = 12;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius + 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  // Clip circular path
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
  ctx.clip();

  if (avatarBuffer) {
    try {
      const img = await loadImage(avatarBuffer);
      ctx.drawImage(img, avatarX - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
    } catch (e) {
      console.error("Failed to load user avatar image, falling back to silhouette:", e);
      drawSilhouette(ctx, avatarX, avatarY, avatarRadius);
    }
  } else {
    drawSilhouette(ctx, avatarX, avatarY, avatarRadius);
  }
  ctx.restore();

  // 4. User Name & Status
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(255, 255, 255, 0.2)';
  ctx.shadowBlur = 6;
  const name = normalizeStyledText(user.first_name || 'PLAYER');
  drawTextWithEmojis(ctx, name.toUpperCase(), 200, 110, 'bold 36px sans-serif');

  // Subtitle / Title based on career wins
  ctx.fillStyle = '#f97316';
  let tier = 'ROOKIE';
  if (stats.wins >= 50) tier = 'LEGEND';
  else if (stats.wins >= 25) tier = 'PRO';
  else if (stats.wins >= 10) tier = 'CHALLENGER';
  drawTextWithEmojis(ctx, `🏏 ${tier}`, 200, 145, 'bold 16px sans-serif');
  ctx.restore();

  // 5. Statistics Grids
  // Stat Card Draw Helper
  function drawStatBlock(title, yPos, items) {
    const blockX = 50;
    const blockW = width - 100;
    const blockH = 155;

    // Background card
    ctx.save();
    const grad = ctx.createLinearGradient(blockX, yPos, blockX, yPos + blockH);
    grad.addColorStop(0, '#160d0a');
    grad.addColorStop(1, '#0a0504');
    ctx.fillStyle = grad;
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.2)';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, blockX, yPos, blockW, blockH, 12);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Section title
    ctx.fillStyle = '#f97316';
    drawTextWithEmojis(ctx, title, blockX + 15, yPos + 30, 'bold 16px sans-serif');

    // Section divider
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(blockX + 15, yPos + 40);
    ctx.lineTo(blockX + blockW - 15, yPos + 40);
    ctx.stroke();

    // Stats Grid Layout
    const startY = yPos + 75;
    const colWidth = (blockW - 30) / items.length;
    items.forEach((item, index) => {
      const itemX = blockX + 15 + index * colWidth + colWidth / 2;

      ctx.save();
      ctx.textAlign = 'center';
      
      // Value
      ctx.fillStyle = '#ffffff';
      drawTextWithEmojis(ctx, item.value, itemX, startY, 'bold 22px sans-serif');

      // Label
      ctx.fillStyle = '#fca5a5';
      drawTextWithEmojis(ctx, item.label.toUpperCase(), itemX, startY + 25, 'bold 11px sans-serif');
      ctx.restore();
    });
  }

  // Row 1: Match Record
  drawStatBlock('TOUR RECORD', 200, [
    { label: 'Wins', value: stats.wins },
    { label: 'Losses', value: stats.losses },
    { label: 'MOTMs', value: stats.motm },
    { label: 'Purse', value: `${user.coins || 0}🪙` }
  ]);

  // Row 2: Batting Stats
  const avgStr = stats.dismissals > 0 ? (stats.runs / stats.dismissals).toFixed(2) : (stats.runs > 0 ? `${stats.runs}*` : '0.00');
  const sr = stats.balls_faced > 0 ? ((stats.runs / stats.balls_faced) * 100).toFixed(2) : '0.00';
  drawStatBlock('CAREER BATTING', 385, [
    { label: 'Runs', value: stats.runs },
    { label: 'High Score', value: stats.highscore },
    { label: 'Average', value: avgStr },
    { label: 'Strike Rate', value: sr }
  ]);

  // Row 3: Bowling Stats
  const econ = stats.balls_bowled > 0 ? ((stats.runs_conceded * 6) / stats.balls_bowled).toFixed(2) : '0.00';
  const bestBowling = `${stats.best_wickets || 0}/${stats.best_runs_conceded || 0}`;
  drawStatBlock('CAREER BOWLING', 570, [
    { label: 'Wickets', value: stats.wickets },
    { label: 'Economy', value: econ },
    { label: 'Best Bowling', value: bestBowling },
    { label: 'Matches', value: stats.bowling_innings }
  ]);

  // 6. Footer Text
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.textAlign = 'center';
  drawTextWithEmojis(ctx, 'CRICKET CHAMPIONS LEAGUE • PLAYER STATS', width / 2, 765, 'bold 11px sans-serif');
  ctx.restore();

  return canvas.toBuffer('image/png');
}

function drawSilhouette(ctx, x, y, radius) {
  // Circular background
  ctx.fillStyle = '#1e1b18';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = '#4a443e';
  ctx.beginPath();
  ctx.arc(x, y - 10, radius * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Shoulders
  ctx.beginPath();
  ctx.arc(x, y + radius + 10, radius * 0.8, Math.PI, 0, false);
  ctx.fill();
}

module.exports = {
  generateProfileCard
};
