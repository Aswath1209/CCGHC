const { loadImage, createCanvas } = require('@napi-rs/canvas');
const path = require('path');
const fs = require('fs');

// Mock theme configurations
const themes = {
  9: { name: 'orange', color: '#f97316', accent: '#ea580c', glow: 'rgba(249, 115, 22, 0.48)', hue: '0deg' }
};

// Mock user and stats
const user = { first_name: 'NEON BULLET', username: 'neon_bullet', id: '9' };
const stats = { wins: 45, losses: 17, runs: 2450, dismissals: 45, balls_faced: 1800, wickets: 75, runs_conceded: 1100, balls_bowled: 1200, best_wickets: 5, best_runs_conceded: 18, highscore: 148, fifties: 18, centuries: 4, motm: 8 };

function drawSilhouette(ctx, x, y, r) {
  ctx.save();
  ctx.fillStyle = '#1e1b1d';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawChamferedRectPath(ctx, x, y, w, h, cut) {
  ctx.beginPath();
  ctx.moveTo(x + cut, y);
  ctx.lineTo(x + w - cut, y);
  ctx.lineTo(x + w, y + cut);
  ctx.lineTo(x + w, y + h - cut);
  ctx.lineTo(x + w - cut, y + h);
  ctx.lineTo(x + cut, y + h);
  ctx.lineTo(x, y + h - cut);
  ctx.lineTo(x, y + cut);
  ctx.closePath();
}

function drawRibbonPath(ctx, x, y, w, h) {
  ctx.beginPath();
  ctx.moveTo(x + 20, y);
  ctx.lineTo(x + w - 48, y);
  ctx.lineTo(x + w - 16, y + h / 2);
  ctx.lineTo(x + w - 48, y + h);
  ctx.lineTo(x + 20, y + h);
  ctx.lineTo(x, y + h / 2);
  ctx.closePath();
}

function drawText(ctx, text, x, y, font) {
  ctx.font = font;
  ctx.fillText(text, x, y);
}

// Icons
function drawCalendarIcon(ctx, x, y, color, size) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(x - size/2, y - size/2 + 2, size, size - 2);
  ctx.beginPath();
  ctx.moveTo(x - size/2, y - size/2 + 6);
  ctx.lineTo(x + size/2, y - size/2 + 6);
  ctx.stroke();
  ctx.restore();
}
function drawBatIcon(ctx, x, y, color, size) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x - size/2, y + size/2);
  ctx.lineTo(x + size/4, y - size/4);
  ctx.stroke();
  ctx.restore();
}
function drawBarsIcon(ctx, x, y, color, size) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(x - size/2, y + size/4, size/3, size/4);
  ctx.fillRect(x - size/6, y - size/4, size/3, size/2 + size/4);
  ctx.fillRect(x + size/6, y, size/3, size/2);
  ctx.restore();
}
function drawGaugeIcon(ctx, x, y, color, size) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y + size/4, size/2, Math.PI, 0);
  ctx.stroke();
  ctx.restore();
}
function drawStarIcon(ctx, x, y, color, size) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    ctx.lineTo(x + Math.cos((18 + i * 72) * Math.PI / 180) * size/2, y - Math.sin((18 + i * 72) * Math.PI / 180) * size/2);
    ctx.lineTo(x + Math.cos((54 + i * 72) * Math.PI / 180) * size/4, y - Math.sin((54 + i * 72) * Math.PI / 180) * size/4);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
function drawNumberBadge(ctx, x, y, size, text, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = 'bold 9px "DejaVu Sans"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
  ctx.restore();
}
function drawStumpsIcon(ctx, x, y, color, size) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(x - size/2, y - size/2, size, size);
  ctx.restore();
}
function drawTargetIcon(ctx, x, y, color, size) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, size/2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, size/4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

async function main() {
  const assetsDir = path.join(__dirname, '../game/assets');
  const bgImg = await loadImage(path.join(assetsDir, 'stadium_bg.png'));
  const logoImg = await loadImage(path.join(assetsDir, 'logo.png'));
  const tpl = await loadImage(path.join(assetsDir, 'card_template.png'));

  // Define new dimensions
  const width = 1024;
  const height = 1280;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const th = themes[9];
  const accent = th.color;
  const accentBright = th.accent;
  const panelFill = 'rgba(8, 2, 2, 0.94)';

  // 1. Draw Background
  ctx.drawImage(bgImg, 0, 0, width, height);

  // Apply theme color tint to the whole background image
  ctx.save();
  ctx.globalCompositeOperation = 'color';
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // Apply overlay glow for stadium lights
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.35;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // Solid dark gradient shading overlay (shades out grass at the bottom, making it dark/cohesive)
  ctx.save();
  const linearShade = ctx.createLinearGradient(0, 0, 0, height);
  linearShade.addColorStop(0, 'rgba(8, 2, 2, 0.0)');
  linearShade.addColorStop(0.35, 'rgba(8, 2, 2, 0.45)');
  linearShade.addColorStop(0.55, 'rgba(8, 2, 2, 0.88)');
  linearShade.addColorStop(0.75, 'rgba(8, 2, 2, 0.98)');
  linearShade.addColorStop(1, '#080202');
  ctx.fillStyle = linearShade;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // 2. Crest
  ctx.save();
  const crestX = 512;
  const crestY = 120;
  const crestRadius = 46;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 24;
  ctx.strokeStyle = accentBright;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(crestX, crestY, crestRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(8, 2, 2, 0.90)';
  ctx.beginPath();
  ctx.arc(crestX, crestY, crestRadius - 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 3. Avatar
  const avX = 512;
  const avY = 370;
  const avR = 172;
  
  ctx.save();
  const avatarGlow = ctx.createRadialGradient(avX, avY, avR - 40, avX, avY, avR + 32);
  avatarGlow.addColorStop(0, accent + '1e');
  avatarGlow.addColorStop(0.5, accent + '99');
  avatarGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = avatarGlow;
  ctx.beginPath();
  ctx.arc(avX, avY, avR + 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 8;
  ctx.shadowColor = accent + 'cc';
  ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.arc(avX, avY, avR + 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.36)';
  ctx.lineWidth = 1.8;
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(avX, avY, avR - 1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  drawSilhouette(ctx, avX, avY, avR - 4);

  // 4. Redesigned Nameplate Ribbon (Chamfered rectangle, clean centered name, no chevrons/brackets)
  const nameplateW = 620;
  const nameplateH = 64;
  const nameplateX = width / 2 - nameplateW / 2;
  const nameplateY = 570;

  ctx.save();
  drawChamferedRectPath(ctx, nameplateX, nameplateY, nameplateW, nameplateH, 12);
  ctx.fillStyle = panelFill;
  ctx.fill();
  
  // Outer border
  const nameBorder = ctx.createLinearGradient(nameplateX, nameplateY, nameplateX + nameplateW, nameplateY + nameplateH);
  nameBorder.addColorStop(0, accentBright);
  nameBorder.addColorStop(0.5, accent);
  nameBorder.addColorStop(1, accentBright);
  ctx.strokeStyle = nameBorder;
  ctx.lineWidth = 2.0;
  ctx.stroke();

  // Inner highlight border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  drawChamferedRectPath(ctx, nameplateX + 3, nameplateY + 3, nameplateW - 6, nameplateH - 6, 10);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 6;
  
  const displayName = 'NEON BULLET';
  let fontSize = 32;
  ctx.font = `italic bold ${fontSize}px "DejaVu Sans"`;
  ctx.fillText(displayName, 512, nameplateY + nameplateH / 2);
  ctx.restore();

  // 5. MOTM Prestige Badge (solid dark background, gold border, and gold text glow)
  ctx.save();
  const motmBadgeW = 240;
  const motmBadgeH = 38;
  const motmBadgeX = width / 2 - motmBadgeW / 2;
  const motmBadgeY = 662;

  // Draw glowing badge border
  ctx.save();
  ctx.shadowColor = '#fbbf24';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.roundRect(motmBadgeX, motmBadgeY, motmBadgeW, motmBadgeH, 6);
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // Badge body fill
  ctx.beginPath();
  ctx.roundRect(motmBadgeX + 0.5, motmBadgeY + 0.5, motmBadgeW - 1, motmBadgeH - 1, 6);
  ctx.fillStyle = panelFill;
  ctx.fill();

  const motmText = '8 MOTM AWARDS';
  ctx.font = 'bold 14px "DejaVu Sans"';
  const motmContentWidth = 28 + 10 + ctx.measureText(motmText).width;
  const motmStartX = motmBadgeX + (motmBadgeW - motmContentWidth) / 2;

  // Glowing star and text
  ctx.save();
  ctx.shadowColor = '#fbbf24';
  ctx.shadowBlur = 10;
  drawStarIcon(ctx, motmStartX + 14, motmBadgeY + motmBadgeH / 2, '#fbbf24', 28);

  ctx.fillStyle = '#fbbf24';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(motmText, motmStartX + 38, motmBadgeY + motmBadgeH / 2 + 0.5);
  ctx.restore();
  ctx.restore();

  // Stats formatting
  const battingItems = [
    { label: 'Matches', value: '62', icon: drawCalendarIcon },
    { label: 'Runs', value: '2,450', icon: drawBatIcon },
    { label: 'Average', value: '54.4', icon: drawBarsIcon },
    { label: 'Strike Rate', value: '138.4', icon: drawGaugeIcon },
    { label: 'Highest Score', value: '148*', icon: drawStarIcon },
    { label: '50s / 100s', value: '18 / 4', icon: (iconCtx, xB, yB, color, size) => drawNumberBadge(iconCtx, xB, yB, size, '50/100', color) }
  ];

  const bowlingItems = [
    { label: 'Wickets', value: '75', icon: drawStumpsIcon },
    { label: 'Economy', value: '5.5', icon: drawGaugeIcon },
    { label: 'Average', value: '14.7', icon: drawBarsIcon },
    { label: 'Best Bowling', value: '5/18', icon: drawTargetIcon },
    { label: 'Overs', value: '200.0', icon: drawCalendarIcon },
    { label: '3w / 5w', value: '4 / 1', icon: (iconCtx, xB, yB, color, size) => drawNumberBadge(iconCtx, xB, yB, size, '3w/5w', color) }
  ];

  // Draw panels
  function drawStatPanel(panelX, panelY, panelW, panelH, title, items) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 12);
    ctx.fillStyle = panelFill;
    ctx.fill();

    const border = ctx.createLinearGradient(panelX, panelY, panelX + panelW, panelY + panelH);
    border.addColorStop(0, accentBright);
    border.addColorStop(0.45, accent);
    border.addColorStop(1, accentBright);
    ctx.strokeStyle = border;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Title
    ctx.fillStyle = accentBright;
    ctx.font = 'bold 13px "DejaVu Sans"';
    ctx.fillText(title.toUpperCase(), panelX + 16, panelY + 22);

    // Divider
    ctx.strokeStyle = accent + '38';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(panelX + 16, panelY + 36);
    ctx.lineTo(panelX + panelW - 16, panelY + 36);
    ctx.stroke();
    ctx.restore();

    // Box dimensions
    const colW = 274;
    const colGap = 17;
    const colMargin = 16;
    const rowH = 72; // increased height!
    const rowGap = 10;
    const rowMargin = 46;

    items.forEach((item, index) => {
      const row = Math.floor(index / 3);
      const col = index % 3;
      const colX = panelX + colMargin + col * (colW + colGap);
      const colY = panelY + rowMargin + row * (rowH + rowGap);
      
      ctx.save();
      drawChamferedRectPath(ctx, colX, colY, colW, rowH, 6);
      ctx.fillStyle = 'rgba(10, 4, 4, 0.85)';
      ctx.fill();
      ctx.strokeStyle = accent + '5b';
      ctx.lineWidth = 1.0;
      ctx.stroke();
      ctx.restore();

      // Icon on the left
      const iconSize = 22;
      const iconX = colX + 22;
      const iconY = colY + rowH / 2;
      if (item.icon) {
        item.icon(ctx, iconX, iconY, accent, iconSize);
      }

      // Stacked Label and Value
      ctx.save();
      // Label on top
      ctx.fillStyle = accentBright + 'b3';
      ctx.font = 'bold 9px "DejaVu Sans"';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.label.toUpperCase(), colX + 46, colY + 25);

      // Value below
      ctx.fillStyle = '#ffffff';
      ctx.font = 'italic bold 21px "DejaVu Sans"';
      ctx.fillText(item.value, colX + 46, colY + 49);
      ctx.restore();
    });
  }

  drawStatPanel(68, 720, 888, 210, 'BATTING RECORD', battingItems);
  drawStatPanel(68, 960, 888, 210, 'BOWLING RECORD', bowlingItems);

  // 6. Template Frame overlay sliced in 3 sections (prevents corner stretching)
  const tplCanvas = createCanvas(width, height);
  const tplCtx = tplCanvas.getContext('2d');
  
  // Slice rendering:
  // - Top section (120px): drawn normal
  tplCtx.drawImage(tpl, 0, 0, 1024, 120, 0, 0, 1024, 120);
  // - Middle section (784px): stretched vertically to fill 1040px
  tplCtx.drawImage(tpl, 0, 120, 1024, 784, 0, 120, 1024, 1040);
  // - Bottom section (120px): drawn normal at the bottom
  tplCtx.drawImage(tpl, 0, 904, 1024, 120, 0, 1160, 1024, 120);

  // Clear center using precise chamfered polygon mask matching the sliced layout
  tplCtx.save();
  tplCtx.globalCompositeOperation = 'destination-out';
  tplCtx.fillStyle = '#000000';
  tplCtx.beginPath();
  tplCtx.moveTo(110, 44);
  tplCtx.lineTo(914, 44);
  tplCtx.lineTo(956, 90);
  tplCtx.lineTo(956, 1170);
  tplCtx.lineTo(914, 1212);
  tplCtx.lineTo(110, 1212);
  tplCtx.lineTo(68, 1170);
  tplCtx.lineTo(68, 90);
  tplCtx.closePath();
  tplCtx.fill();
  tplCtx.restore();

  // Overlay
  ctx.drawImage(tplCanvas, 0, 0, width, height);

  // Save the result
  const outPath = path.join(__dirname, 'test_card_stretched.png');
  fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
  console.log(`Saved stretched card to ${outPath}`);
}

main().catch(console.error);
