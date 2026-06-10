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

function drawCrown(ctx, x, y, width, height) {
  ctx.save();
  ctx.fillStyle = '#ffd700';
  ctx.strokeStyle = '#8a6f27';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  // Crown base points
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

  // Crown jewels on the peaks
  ctx.fillStyle = '#ffdf00';
  ctx.beginPath(); ctx.arc(x - width * 0.5, y - height * 0.5, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x, y - height * 0.65, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + width * 0.5, y - height * 0.5, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

async function generateProfileCard(user, stats, avatarBuffer) {
  const width = 600;
  const height = 1000;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Card boundary dimensions
  const cardX = 30;
  const cardY = 30;
  const cardW = 540;
  const cardH = 940;

  // 1. Royal Navy-Black velvet radial gradient backdrop
  ctx.save();
  const vignette = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width / 2 + 150);
  vignette.addColorStop(0, '#0f172a'); // Luxury dark slate blue
  vignette.addColorStop(0.7, '#070a1a');
  vignette.addColorStop(1, '#020308'); // Pure velvet black edge
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // Luxury glowing gold dust particles
  ctx.fillStyle = 'rgba(212, 175, 55, 0.05)';
  for (let i = 0; i < 25; i++) {
    const px = Math.random() * width;
    const py = Math.random() * height;
    const pr = Math.random() * 3 + 1;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw elegant gold diamond patterns in the background behind stats
  ctx.save();
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.04)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(300, 100);
  ctx.lineTo(540, 500);
  ctx.lineTo(300, 900);
  ctx.lineTo(60, 500);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  // 2. Velvet Card Container
  ctx.save();
  const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
  cardGrad.addColorStop(0, '#090d1f');
  cardGrad.addColorStop(1, '#020308');
  ctx.fillStyle = cardGrad;
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 28);
  ctx.fill();
  ctx.restore();

  // 3D Beveled Royal Gold borders
  // Outer border (bronze gold shadow)
  ctx.save();
  ctx.strokeStyle = '#8a6f27';
  ctx.lineWidth = 8;
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 28);
  ctx.stroke();
  ctx.restore();

  // Middle border (pure gold)
  ctx.save();
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 2.5;
  drawRoundedRect(ctx, cardX + 1, cardY + 1, cardW - 2, cardH - 2, 27);
  ctx.stroke();
  ctx.restore();

  // Inner gold line border
  ctx.save();
  ctx.strokeStyle = 'rgba(252, 211, 77, 0.35)';
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, cardX + 7, cardY + 7, cardW - 14, cardH - 14, 21);
  ctx.stroke();
  ctx.restore();

  // Ornate decorative corner circles
  ctx.fillStyle = '#ffd700';
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

  // 3. Royal Avatar Seal
  const avatarX = 300;
  const avatarY = cardY + 120;
  const avatarRadius = 55;

  // Gold crown above avatar
  drawCrown(ctx, avatarX, avatarY - avatarRadius - 18, 44, 28);

  // Avatar circular gold border
  ctx.save();
  ctx.strokeStyle = '#ffd700';
  ctx.shadowColor = 'rgba(212, 175, 55, 0.6)';
  ctx.shadowBlur = 10;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius + 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Gold-studded coin dots around avatar ring
  ctx.fillStyle = '#ffd700';
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
    const sx = avatarX + (avatarRadius + 7) * Math.cos(angle);
    const sy = avatarY + (avatarRadius + 7) * Math.sin(angle);
    ctx.beginPath();
    ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Avatar Image Clip & Draw
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

  // Username Gold Scroll Ribbon/Banner
  ctx.save();
  ctx.fillStyle = 'rgba(212, 175, 55, 0.16)';
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 2;
  ctx.beginPath();
  // Ribbon Shape
  ctx.moveTo(160, avatarY + 75);
  ctx.lineTo(440, avatarY + 75);
  ctx.lineTo(425, avatarY + 95);
  ctx.lineTo(440, avatarY + 115);
  ctx.lineTo(160, avatarY + 115);
  ctx.lineTo(175, avatarY + 95);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Username inside banner
  ctx.save();
  const nameGrad = ctx.createLinearGradient(180, avatarY + 95, 420, avatarY + 95);
  nameGrad.addColorStop(0, '#f59e0b');
  nameGrad.addColorStop(0.5, '#fbbf24');
  nameGrad.addColorStop(1, '#fef08a');
  ctx.fillStyle = nameGrad;
  ctx.textAlign = 'center';
  const name = normalizeStyledText(user.first_name || 'PLAYER');
  drawTextWithEmojis(ctx, name.toUpperCase(), avatarX, avatarY + 102, 'bold 22px sans-serif');

  // Subtitle/Rank
  ctx.fillStyle = '#e2e8f0';
  let tier = 'ROOKIE';
  if (stats.wins >= 50) tier = 'ROYAL LEGEND';
  else if (stats.wins >= 25) tier = 'ELITE PRO';
  else if (stats.wins >= 10) tier = 'CHALLENGER';
  drawTextWithEmojis(ctx, `👑 ${tier} • MEMBER CARD`, avatarX, avatarY + 138, 'bold 12px sans-serif');
  ctx.restore();

  // Header separator gold line
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + 45, cardY + 285);
  ctx.lineTo(cardX + cardW - 45, cardY + 285);
  ctx.stroke();

  // 4. Gilded Stat Panel Box Helper
  function drawGildedPanel(title, x, y, width, height, columns) {
    ctx.save();
    // Dark luxury slate blue card container
    ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.25)';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, x, y, width, height, 14);
    ctx.fill();
    ctx.stroke();

    // Panel Header (Gold Title)
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'center';
    drawTextWithEmojis(ctx, title, x + width / 2, y + 24, 'bold 13px sans-serif');

    // Header gold divider line
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 20, y + 34);
    ctx.lineTo(x + width - 20, y + 34);
    ctx.stroke();
    ctx.restore();

    // Draw grid columns
    const colW = (width - 40) / columns.length;
    columns.forEach((col, colIndex) => {
      const colX = x + 20 + colIndex * colW + colW / 2;

      col.items.forEach((item, rowIndex) => {
        const itemY = y + 66 + rowIndex * 62;

        ctx.save();
        // Label (centered)
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'center';
        drawTextWithEmojis(ctx, item.label, colX, itemY, 'bold 10px sans-serif');

        // Value (bold gold/yellow, centered)
        const valGrad = ctx.createLinearGradient(colX - 40, itemY + 22, colX + 40, itemY + 22);
        valGrad.addColorStop(0, '#fbbf24');
        valGrad.addColorStop(1, '#fef08a');
        ctx.fillStyle = valGrad;
        ctx.textAlign = 'center';
        drawTextWithEmojis(ctx, item.value, colX, itemY + 22, 'bold 18px sans-serif');
        ctx.restore();
      });
    });
  }

  // --- BATTING PANEL ---
  const avgStr = stats.dismissals > 0 ? (stats.runs / stats.dismissals).toFixed(2) : (stats.runs > 0 ? `${stats.runs}*` : '0.00');
  drawGildedPanel(
    '🏏 BATTING DISCIPLINE',
    cardX + 25,
    cardY + 295,
    cardW - 50,
    195,
    [
      {
        items: [
          { label: 'Runs Scored', value: stats.runs },
          { label: '50s / 100s', value: `${stats.fifties} / ${stats.centuries}` }
        ]
      },
      {
        items: [
          { label: 'Batting Average', value: avgStr },
          { label: 'Highest Score', value: stats.highscore }
        ]
      },
      {
        items: [
          { label: 'Fours / Sixes', value: `${stats.fours} / ${stats.sixes}` },
          { label: 'Ducks Count', value: stats.ducks }
        ]
      }
    ]
  );

  // --- BOWLING PANEL ---
  const econ = stats.balls_bowled > 0 ? ((stats.runs_conceded * 6) / stats.balls_bowled).toFixed(2) : '0.00';
  const bestBowling = `${stats.best_wickets || 0}/${stats.best_runs_conceded || 0}`;
  drawGildedPanel(
    '🥎 BOWLING DISCIPLINE',
    cardX + 25,
    cardY + 505,
    cardW - 50,
    195,
    [
      {
        items: [
          { label: 'Wickets Taken', value: stats.wickets },
          { label: '3w / 5w Hauls', value: `${stats.threew} / ${stats.fivew}` }
        ]
      },
      {
        items: [
          { label: 'Economy Rate', value: econ },
          { label: 'Best Bowling', value: bestBowling }
        ]
      }
    ]
  );

  // --- CLUB OVERVIEW PANEL ---
  drawGildedPanel(
    '🏆 ROYAL ARCHIVES & VAULT',
    cardX + 25,
    cardY + 715,
    cardW - 50,
    130,
    [
      {
        items: [
          { label: 'Tour Record', value: `${stats.wins}W - ${stats.losses}L` }
        ]
      },
      {
        items: [
          { label: 'Vault Coins Purse', value: `${user.coins || 0} 🪙` }
        ]
      }
    ]
  );

  // 5. Footer credits
  ctx.save();
  ctx.fillStyle = 'rgba(212, 175, 55, 0.4)';
  ctx.textAlign = 'center';
  drawTextWithEmojis(ctx, 'CRICKET LEAGUE COLLECTIBLES • ROYAL VIP SERIES', width / 2, cardY + cardH - 30, 'bold 10px sans-serif');
  ctx.restore();

  // 6. Premium Glossy Card overlay reflection shine
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
