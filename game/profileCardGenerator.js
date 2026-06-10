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
  let primaryFamily = 'DejaVu Serif';
  
  if (familyIndex !== -1) {
    sizeAndStyle = fontParts.slice(0, familyIndex).join(' ');
  } else {
    sizeAndStyle = fontParts.slice(0, -1).join(' ');
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

function drawCricketBat(ctx, x, y) {
  ctx.save();
  ctx.fillStyle = '#ffd700';
  ctx.strokeStyle = '#8a6f27';
  ctx.lineWidth = 1;
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 4);

  // Handle
  ctx.fillRect(-2, -20, 4, 9);

  // Blade
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.moveTo(-4, -11);
  ctx.lineTo(4, -11);
  ctx.lineTo(5, 11);
  ctx.quadraticCurveTo(0, 15, -5, 11);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Ball
  ctx.fillStyle = '#ffdf00';
  ctx.beginPath();
  ctx.arc(10, 7, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawWickets(ctx, x, y) {
  ctx.save();
  ctx.fillStyle = '#ffd700';
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 2.5;

  // Stumps
  ctx.beginPath(); ctx.moveTo(x - 7, y - 11); ctx.lineTo(x - 7, y + 13); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y - 11); ctx.lineTo(x, y + 13); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 7, y - 11); ctx.lineTo(x + 7, y + 13); ctx.stroke();

  // Bails
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x - 9, y - 13); ctx.lineTo(x - 1, y - 13); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 1, y - 13); ctx.lineTo(x + 9, y - 13); ctx.stroke();
  ctx.restore();
}

function drawGem(ctx, x, y, size, color) {
  ctx.save();
  // Base gem gradient
  const grad = ctx.createRadialGradient(x - size * 0.2, y - size * 0.2, size * 0.1, x, y, size);
  if (color === 'ruby') {
    grad.addColorStop(0, '#fca5a5');
    grad.addColorStop(0.5, '#dc2626');
    grad.addColorStop(1, '#7f1d1d');
  } else if (color === 'emerald') {
    grad.addColorStop(0, '#6ee7b7');
    grad.addColorStop(0.5, '#059669');
    grad.addColorStop(1, '#064e3b');
  } else { // sapphire
    grad.addColorStop(0, '#7dd3fc');
    grad.addColorStop(0.5, '#0284c7');
    grad.addColorStop(1, '#0c4a6e');
  }
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();

  // Facet white gleam dot
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x - size * 0.3, y - size * 0.3, size * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGoldLeaf(ctx, x, y, rx, ry, rotation) {
  ctx.save();
  ctx.fillStyle = '#ffd700';
  ctx.strokeStyle = '#8a6f27';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawDetailedCorner(ctx, cx, cy, dirX, dirY) {
  ctx.save();
  ctx.strokeStyle = '#ffd700';
  ctx.fillStyle = '#ffd700';
  ctx.lineWidth = 2;

  // Corner bracket
  ctx.beginPath();
  ctx.moveTo(cx, cy + dirY * 45);
  ctx.lineTo(cx, cy);
  ctx.lineTo(cx + dirX * 45, cy);
  ctx.stroke();

  // Corner scroll loops
  ctx.beginPath();
  ctx.arc(cx + dirX * 18, cy + dirY * 18, 9, 0, Math.PI * 2);
  ctx.stroke();

  // Embed corner Ruby gem
  drawGem(ctx, cx + dirX * 18, cy + dirY * 18, 4.5, 'ruby');

  // Gold leaves
  const rotAngle = Math.atan2(dirY, dirX);
  drawGoldLeaf(ctx, cx + dirX * 6, cy + dirY * 32, 7, 3, rotAngle + Math.PI / 4);
  drawGoldLeaf(ctx, cx + dirX * 32, cy + dirY * 6, 7, 3, rotAngle - Math.PI / 4);
  drawGoldLeaf(ctx, cx + dirX * 24, cy + dirY * 24, 6, 2.5, rotAngle);

  ctx.restore();
}

function drawCenterFlourish(ctx, x, y) {
  ctx.save();
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  
  // Left scroll curve
  ctx.moveTo(x - 6, y);
  ctx.bezierCurveTo(x - 22, y - 10, x - 38, y + 10, x - 58, y);
  ctx.stroke();

  // Right scroll curve
  ctx.moveTo(x + 6, y);
  ctx.bezierCurveTo(x + 22, y - 10, x + 38, y + 10, x + 58, y);
  ctx.stroke();

  // Center Ruby jewel medallion
  drawGem(ctx, x, y, 5, 'ruby');

  // Small gold leaf buds
  drawGoldLeaf(ctx, x - 30, y - 4, 5, 2, -Math.PI / 6);
  drawGoldLeaf(ctx, x + 30, y - 4, 5, 2, Math.PI / 6);
  ctx.restore();
}

function drawOrnateFlourish(ctx, x, y, direction) {
  ctx.save();
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (direction === 'left') {
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x - 18, y - 8, x - 28, y + 8, x - 38, y);
    ctx.stroke();
    drawGoldLeaf(ctx, x - 38, y, 4, 1.8, -Math.PI / 4);
  } else {
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + 18, y - 8, x + 28, y + 8, x + 38, y);
    ctx.stroke();
    drawGoldLeaf(ctx, x + 38, y, 4, 1.8, Math.PI / 4);
  }
  ctx.restore();
}

function drawCrown(ctx, x, y, width, height) {
  ctx.save();
  ctx.fillStyle = '#ffd700';
  ctx.strokeStyle = '#8a6f27';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - width / 2, y + height / 2);
  ctx.lineTo(x + width / 2, y + height / 2);
  ctx.lineTo(x + width * 0.4, y - height * 0.1);
  ctx.lineTo(x + width * 0.5, y - height * 0.5); // Right peak
  ctx.lineTo(x + width * 0.2, y - height * 0.15); // Right valley
  ctx.lineTo(x, y - height * 0.65); // Center peak
  ctx.lineTo(x - width * 0.2, y - height * 0.15); // Left valley
  ctx.lineTo(x - width * 0.5, y - height * 0.5); // Left peak
  ctx.lineTo(x - width * 0.4, y - height * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Gemstones on the peaks
  drawGem(ctx, x - width * 0.5, y - height * 0.5, 3.5, 'sapphire');
  drawGem(ctx, x, y - height * 0.65, 4.5, 'ruby');
  drawGem(ctx, x + width * 0.5, y - height * 0.5, 3.5, 'sapphire');

  // Base decorative gems
  drawGem(ctx, x - 8, y + height / 2 - 3, 2.5, 'emerald');
  drawGem(ctx, x, y + height / 2 - 3, 2.5, 'ruby');
  drawGem(ctx, x + 8, y + height / 2 - 3, 2.5, 'emerald');
  ctx.restore();
}

function drawAvatarFlourish(ctx, x, y, radius) {
  ctx.save();
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 1.5;

  // Left wing
  ctx.beginPath();
  ctx.arc(x - radius - 15, y, 12, Math.PI * 0.5, Math.PI * 1.5);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(x - radius - 27, y);
  ctx.quadraticCurveTo(x - radius - 18, y - 22, x - radius - 6, y - 25);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x - radius - 27, y);
  ctx.quadraticCurveTo(x - radius - 18, y + 22, x - radius - 6, y + 25);
  ctx.stroke();

  drawGoldLeaf(ctx, x - radius - 20, y - 18, 6, 2.5, -Math.PI / 4);
  drawGoldLeaf(ctx, x - radius - 20, y + 18, 6, 2.5, Math.PI / 4);

  // Right wing
  ctx.beginPath();
  ctx.arc(x + radius + 15, y, 12, Math.PI * 1.5, Math.PI * 0.5);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + radius + 27, y);
  ctx.quadraticCurveTo(x + radius + 18, y - 22, x + radius + 6, y - 25);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + radius + 27, y);
  ctx.quadraticCurveTo(x + radius + 18, y + 22, x + radius + 6, y + 25);
  ctx.stroke();

  drawGoldLeaf(ctx, x + radius - 2, y - 24, 6, 2.5, Math.PI / 4);
  drawGoldLeaf(ctx, x + radius - 2, y + 24, 6, 2.5, -Math.PI / 4);

  // Bottom scroll
  ctx.beginPath();
  ctx.moveTo(x - 25, y + radius + 10);
  ctx.quadraticCurveTo(x, y + radius + 20, x + 25, y + radius + 10);
  ctx.stroke();

  drawGem(ctx, x, y + radius + 17, 3.5, 'ruby');
  ctx.restore();
}

async function generateProfileCard(user, stats, avatarBuffer) {
  const width = 600;
  const height = 1000;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Card boundary dimensions
  const cardX = 40;
  const cardY = 40;
  const cardW = 520;
  const cardH = 920;

  // 1. Imperial Velvet Gradient Backdrop (Purple, Burgundy, Black)
  ctx.save();
  const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 80, width / 2, height / 2, width / 2 + 200);
  bgGrad.addColorStop(0, '#2d0714'); // Imperial Burgundy center
  bgGrad.addColorStop(0.4, '#150624'); // Royal Purple mid
  bgGrad.addColorStop(1, '#050209'); // Midnight Black edge
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // Linen grid backdrop texture (fine matte texture overlay)
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.012)';
  ctx.lineWidth = 0.5;
  for (let x = 0; x < width; x += 3.5) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
  }
  for (let y = 0; y < height; y += 3.5) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
  }
  ctx.restore();

  // Glowing gold radial highlight centered behind the avatar
  ctx.save();
  const goldGlow = ctx.createRadialGradient(300, 210, 30, 300, 210, 420);
  goldGlow.addColorStop(0, 'rgba(212, 175, 55, 0.18)');
  goldGlow.addColorStop(0.5, 'rgba(212, 175, 55, 0.03)');
  goldGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = goldGlow;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // Luxury gold dust particles
  ctx.fillStyle = 'rgba(212, 175, 55, 0.04)';
  for (let i = 0; i < 22; i++) {
    const px = Math.random() * width;
    const py = Math.random() * height;
    const pr = Math.random() * 2.5 + 1;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Main Gold Card Frame
  ctx.save();
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 3.5;
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 16);
  ctx.stroke();
  ctx.restore();

  // Inner thin gold accent line
  ctx.save();
  ctx.strokeStyle = 'rgba(252, 211, 77, 0.35)';
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, cardX + 6, cardY + 6, cardW - 12, cardH - 12, 11);
  ctx.stroke();
  ctx.restore();

  // 3. Ornate Corner Filigrees (Ruby embellished)
  drawDetailedCorner(ctx, cardX + 12, cardY + 12, 1, 1);       // Top Left
  drawDetailedCorner(ctx, cardX + cardW - 12, cardY + 12, -1, 1); // Top Right
  drawDetailedCorner(ctx, cardX + 12, cardY + cardH - 12, 1, -1); // Bottom Left
  drawDetailedCorner(ctx, cardX + cardW - 12, cardY + cardH - 12, -1, -1); // Bottom Right

  // Center border flourishes (Ruby embellished)
  drawCenterFlourish(ctx, 300, cardY + 12);
  drawCenterFlourish(ctx, 300, cardY + cardH - 12);

  // 4. Header Section
  const avatarX = 300;
  const avatarY = cardY + 140;
  const avatarRadius = 60;

  // Gold crown above avatar (Gem embellished)
  drawCrown(ctx, avatarX, avatarY - avatarRadius - 18, 44, 28);

  // Gold avatar flourish wings
  drawAvatarFlourish(ctx, avatarX, avatarY, avatarRadius);

  // Avatar circular gold ring
  ctx.save();
  ctx.strokeStyle = '#ffd700';
  ctx.shadowColor = 'rgba(212, 175, 55, 0.55)';
  ctx.shadowBlur = 10;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius + 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Alternate Ruby and Emerald Gems around the Avatar Ring (12 gems total)
  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI) / 6;
    const sx = avatarX + (avatarRadius + 7) * Math.cos(angle);
    const sy = avatarY + (avatarRadius + 7) * Math.sin(angle);
    const type = i % 2 === 0 ? 'ruby' : 'emerald';
    drawGem(ctx, sx, sy, 3.5, type);
  }

  // Avatar clip & draw
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

  // Username gold scroll ribbon/banner
  ctx.save();
  ctx.fillStyle = 'rgba(212, 175, 55, 0.16)';
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(160, avatarY + 75);
  ctx.lineTo(440, avatarY + 75);
  ctx.lineTo(425, avatarY + 95);
  ctx.lineTo(440, avatarY + 115);
  ctx.lineTo(160, avatarY + 115);
  ctx.lineTo(175, avatarY + 95);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Ribbon corner Emeralds
  drawGem(ctx, 160, avatarY + 95, 3.5, 'emerald');
  drawGem(ctx, 440, avatarY + 95, 3.5, 'emerald');
  ctx.restore();

  // Username inside banner (centered in gold gradient, serif typeface)
  ctx.save();
  const nameGrad = ctx.createLinearGradient(180, avatarY + 95, 420, avatarY + 95);
  nameGrad.addColorStop(0, '#f59e0b');
  nameGrad.addColorStop(0.5, '#fbbf24');
  nameGrad.addColorStop(1, '#fef08a');
  ctx.fillStyle = nameGrad;
  ctx.textAlign = 'center';
  const name = normalizeStyledText(user.first_name || 'PLAYER');
  drawTextWithEmojis(ctx, name.toUpperCase(), avatarX, avatarY + 102, 'bold 22px "DejaVu Serif"');
  ctx.restore();

  // Header separator gold line
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + 45, cardY + 285);
  ctx.lineTo(cardX + cardW - 45, cardY + 285);
  ctx.stroke();

  // Section header draw helper
  function drawSectionHeader(title, y, themeColor) {
    ctx.save();
    // Gold wings/lines flanking header
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
    ctx.lineWidth = 1.2;
    
    // Left Wing line
    ctx.beginPath();
    ctx.moveTo(110, y - 5);
    ctx.lineTo(210, y - 5);
    ctx.stroke();

    // Right Wing line
    ctx.beginPath();
    ctx.moveTo(390, y - 5);
    ctx.lineTo(490, y - 5);
    ctx.stroke();

    // Scroll wings
    drawOrnateFlourish(ctx, 210, y - 5, 'left');
    drawOrnateFlourish(ctx, 390, y - 5, 'right');

    // Title text
    ctx.fillStyle = themeColor;
    ctx.textAlign = 'center';
    drawTextWithEmojis(ctx, title, 300, y, 'bold 15px "DejaVu Serif"');
    ctx.restore();
  }

  // --- BATTING SECTION ---
  const batStartY = cardY + 320;
  drawSectionHeader('BATTING', batStartY, '#ffd700');
  drawCricketBat(ctx, 110, batStartY - 6);

  // 2-Column Batting Grid (3 rows)
  const batRowY = batStartY + 45;
  const col1X = 170;
  const col2X = 430;
  
  const avgStr = stats.dismissals > 0 ? (stats.runs / stats.dismissals).toFixed(2) : (stats.runs > 0 ? `${stats.runs}*` : '0.00');

  const battingItems = [
    [
      { label: 'Runs Scored', value: stats.runs, x: col1X },
      { label: 'Batting Average', value: avgStr, x: col2X }
    ],
    [
      { label: 'Fours / Sixes', value: `${stats.fours} / ${stats.sixes}`, x: col1X },
      { label: '50s / 100s', value: `${stats.fifties} / ${stats.centuries}`, x: col2X }
    ],
    [
      { label: 'Highest Score', value: stats.highscore, x: col1X },
      { label: 'Ducks Count', value: stats.ducks, x: col2X }
    ]
  ];

  battingItems.forEach((row, rowIndex) => {
    const itemY = batRowY + rowIndex * 75;
    row.forEach(item => {
      ctx.save();
      // Label
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center';
      drawTextWithEmojis(ctx, item.label, item.x, itemY, 'bold 11px "DejaVu Serif"');

      // Value (bold gold-yellow gradient)
      const valGrad = ctx.createLinearGradient(item.x - 50, itemY + 22, item.x + 50, itemY + 22);
      valGrad.addColorStop(0, '#fbbf24');
      valGrad.addColorStop(1, '#fef08a');
      ctx.fillStyle = valGrad;
      ctx.textAlign = 'center';
      drawTextWithEmojis(ctx, item.value, item.x, itemY + 24, 'bold 20px "DejaVu Serif"');
      ctx.restore();
    });
  });

  // Section Divider Line
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.16)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + 45, batRowY + 200);
  ctx.lineTo(cardX + cardW - 45, batRowY + 200);
  ctx.stroke();

  // --- BOWLING SECTION ---
  const bowlStartY = batRowY + 230;
  // Theme Bowling header with Sapphire Blue/Ice color
  drawSectionHeader('BOWLING', bowlStartY, '#38bdf8');
  drawWickets(ctx, 110, bowlStartY - 6);

  const econ = stats.balls_bowled > 0 ? ((stats.runs_conceded * 6) / stats.balls_bowled).toFixed(2) : '0.00';
  const bestBowling = `${stats.best_wickets || 0}/${stats.best_runs_conceded || 0}`;

  const bowlingItems = [
    [
      { label: 'Wickets Taken', value: stats.wickets, x: col1X },
      { label: 'Economy Rate', value: econ, x: col2X }
    ],
    [
      { label: '3w / 5w Hauls', value: `${stats.threew} / ${stats.fivew}`, x: col1X },
      { label: 'Best Bowling', value: bestBowling, x: col2X }
    ]
  ];

  bowlingItems.forEach((row, rowIndex) => {
    const itemY = bowlStartY + 45 + rowIndex * 78;
    row.forEach(item => {
      ctx.save();
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center';
      drawTextWithEmojis(ctx, item.label, item.x, itemY, 'bold 11px "DejaVu Serif"');

      // Value (bold sapphire/cyan/ice-blue gradient)
      const valGrad = ctx.createLinearGradient(item.x - 50, itemY + 22, item.x + 50, itemY + 22);
      valGrad.addColorStop(0, '#38bdf8');
      valGrad.addColorStop(1, '#bae6fd');
      ctx.fillStyle = valGrad;
      ctx.textAlign = 'center';
      drawTextWithEmojis(ctx, item.value, item.x, itemY + 24, 'bold 20px "DejaVu Serif"');
      ctx.restore();
    });
  });

  // Footer separator gold line
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.16)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + 45, cardY + cardH - 35);
  ctx.lineTo(cardX + cardW - 45, cardY + cardH - 35);
  ctx.stroke();

  // 6. Premium Glossy Card overlay reflection shine
  ctx.save();
  const glossGrad = ctx.createLinearGradient(0, 0, width, height);
  glossGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
  glossGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.04)');
  glossGrad.addColorStop(0.31, 'rgba(255, 255, 255, 0)');
  glossGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = glossGrad;
  ctx.beginPath();
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 16);
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
