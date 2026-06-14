const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const user = { first_name: "ASWATH" };
const stats = {
  runs: 2450,
  dismissals: 45,
  fours: 230,
  sixes: 105,
  fifties: 18,
  centuries: 4,
  highscore: 148,
  ducks: 2,
  wickets: 75,
  balls_bowled: 1200,
  runs_conceded: 1100,
  threew: 4,
  fivew: 1,
  best_wickets: 5,
  best_runs_conceded: 18,
  wins: 42,
  losses: 20,
  motm: 8
};

const width = 800;
const height = 1000;

const avgStr = stats.dismissals > 0 ? (stats.runs / stats.dismissals).toFixed(2) : (stats.runs > 0 ? `${stats.runs}*` : '0.00');
const econ = stats.balls_bowled > 0 ? ((stats.runs_conceded * 6) / stats.balls_bowled).toFixed(2) : '0.00';
const bestBowling = `${stats.best_wickets}/${stats.best_runs_conceded}`;
const bowlAvg = stats.wickets > 0 ? (stats.runs_conceded / stats.wickets).toFixed(2) : '0.00';
const overs = (stats.balls_bowled / 6).toFixed(1);

function drawSilhouette(ctx, x, y, radius) {
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawAvatar(ctx, img, x, y, radius) {
  ctx.save();
  if (img) {
    ctx.drawImage(img, x - radius, y - radius, radius * 2, radius * 2);
  } else {
    drawSilhouette(ctx, x, y, radius);
  }
  ctx.restore();
}

function drawVectorStar(ctx, cx, cy, spikes, outerRadius, innerRadius, color) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fillStyle = color || '#fbbf24';
  ctx.fill();
  ctx.restore();
}

function drawCornerBracket(ctx, x, y, rx, ry, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x + rx * 20, y);
  ctx.lineTo(x, y);
  ctx.lineTo(x, y + ry * 20);
  ctx.stroke();
  ctx.restore();
}

function drawBackgroundTexture(ctx, themeName) {
  ctx.save();
  
  if (themeName === 'blue') {
    // 2D Cyber Grid lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.015)';
    ctx.lineWidth = 1.2;
    for (let x = 0; x < 600; x += 25) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1000); ctx.stroke();
    }
    for (let y = 0; y < 1000; y += 25) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(600, y); ctx.stroke();
    }
  } else if (themeName === 'green') {
    // Honeycomb Hexagon Matrix
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.012)';
    ctx.lineWidth = 1;
    const hexRadius = 16;
    const a = hexRadius / 2;
    const b = hexRadius * Math.sin(Math.PI / 3);
    for (let y = -20; y < 1000 + hexRadius; y += b * 2) {
      for (let x = -20; x < 600 + hexRadius; x += hexRadius * 3) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + hexRadius, y);
        ctx.lineTo(x + hexRadius + a, y + b);
        ctx.lineTo(x + hexRadius, y + b * 2);
        ctx.lineTo(x, y + b * 2);
        ctx.lineTo(x - a, y + b);
        ctx.closePath();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x + hexRadius * 1.5, y + b);
        ctx.lineTo(x + hexRadius * 2.5, y + b);
        ctx.lineTo(x + hexRadius * 2.5 + a, y + b * 2);
        ctx.lineTo(x + hexRadius * 2.5, y + b * 3);
        ctx.lineTo(x + hexRadius * 1.5, y + b * 3);
        ctx.lineTo(x + hexRadius * 1.5 - a, y + b * 2);
        ctx.closePath();
        ctx.stroke();
      }
    }
  } else if (themeName === 'purple') {
    // Cyberpunk tech circuit lines
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.02)';
    ctx.lineWidth = 1.5;
    const nodes = [
      {x: 100, y: 100, dx: 150, dy: 150},
      {x: 500, y: 120, dx: 450, dy: 170},
      {x: 80, y: 800, dx: 140, dy: 740},
      {x: 520, y: 820, dx: 460, dy: 760},
      {x: 200, y: 450, dx: 250, dy: 500},
      {x: 400, y: 480, dx: 350, dy: 530}
    ];
    nodes.forEach(node => {
      ctx.beginPath();
      ctx.moveTo(node.x, node.y);
      ctx.lineTo(node.dx, node.dy);
      ctx.lineTo(node.dx, node.dy + 80);
      ctx.stroke();
      
      ctx.fillStyle = 'rgba(168, 85, 247, 0.15)';
      ctx.beginPath(); ctx.arc(node.x, node.y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(node.dx, node.dy + 80, 4, 0, Math.PI * 2); ctx.fill();
    });
  } else if (themeName === 'gold') {
    // Regal Horizontal Brushed Metal Stripes
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.012)';
    ctx.lineWidth = 2.5;
    for (let y = 0; y < 1000; y += 16) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(600, y); ctx.stroke();
    }
  } else if (themeName === 'cyan') {
    // Sharp Crystalline Fractal diagonals
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.025)';
    ctx.lineWidth = 1;
    for (let i = -200; i < 600 + 1000; i += 40) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i - 300, 1000); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 300, 1000); ctx.stroke();
    }
  } else if (themeName === 'pink') {
    // Cyberpunk Dot Matrix Grid
    ctx.fillStyle = 'rgba(236, 72, 153, 0.02)';
    for (let y = 10; y < 1000; y += 20) {
      for (let x = 10; x < 600; x += 20) {
        ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill();
      }
    }
  } else {
    // Red / Default - Carbon fiber weave pattern
    ctx.fillStyle = '#0b0b0e';
    for (let y = 0; y < 1000; y += 6) {
      for (let x = (y % 12 === 0 ? 0 : 3); x < 600; x += 6) {
        ctx.fillRect(x, y, 3, 3);
      }
    }
  }
  
  ctx.restore();
}

async function renderGlowingCard(avatarImg, theme) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Fill canvas with deep charcoal base
  ctx.fillStyle = '#050507';
  ctx.fillRect(0, 0, width, height);

  // Translate to center the 600px wide card
  ctx.save();
  ctx.translate(100, 0);

  const cardX = 35;
  const cardY = 35;
  const cardW = 530;
  const cardH = 930;

  const avX = 300;
  const avY = 210;
  const avRadius = 65;

  // Render background texture based on theme name
  drawBackgroundTexture(ctx, theme.name);

  // Radial backglow
  const glow = ctx.createRadialGradient(avX, avY, 10, avX, avY, 340);
  glow.addColorStop(0, theme.glowColorRadial);
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 600, height);

  // Theme-specific outline drawing helper
  function drawChassisOutline(offset) {
    const cx = cardX + offset;
    const cy = cardY + offset;
    const cw = cardW - (offset * 2);
    const ch = cardH - (offset * 2);

    if (theme.name === 'blue') {
      ctx.beginPath();
      ctx.roundRect(cx, cy, cw, ch, 24);
    } else if (theme.name === 'green') {
      const cut = 16;
      ctx.beginPath();
      ctx.moveTo(cx + cut, cy);
      ctx.lineTo(cx + cw - cut, cy);
      ctx.lineTo(cx + cw, cy + cut);
      ctx.lineTo(cx + cw, cy + ch - cut);
      ctx.lineTo(cx + cw - cut, cy + ch);
      ctx.lineTo(cx + cut, cy + ch);
      ctx.lineTo(cx, cy + ch - cut);
      ctx.lineTo(cx, cy + cut);
      ctx.closePath();
    } else if (theme.name === 'purple') {
      const step = 14;
      ctx.beginPath();
      ctx.moveTo(cx + step, cy);
      ctx.lineTo(cx + cw - step, cy);
      ctx.lineTo(cx + cw - step, cy + step);
      ctx.lineTo(cx + cw, cy + step);
      ctx.lineTo(cx + cw, cy + ch - step);
      ctx.lineTo(cx + cw - step, cy + ch - step);
      ctx.lineTo(cx + cw - step, cy + ch);
      ctx.lineTo(cx + step, cy + ch);
      ctx.lineTo(cx + step, cy + ch - step);
      ctx.lineTo(cx, cy + ch - step);
      ctx.lineTo(cx, cy + step);
      ctx.lineTo(cx + step, cy + step);
      ctx.closePath();
    } else if (theme.name === 'gold') {
      ctx.beginPath();
      ctx.moveTo(cx + cw / 2, cy); // Top center peak
      ctx.lineTo(cx + cw - 16, cy + 12);
      ctx.lineTo(cx + cw, cy + 32);
      ctx.lineTo(cx + cw, cy + ch - 32);
      ctx.lineTo(cx + cw - 16, cy + ch - 12);
      ctx.lineTo(cx + cw / 2, cy + ch); // Bottom center peak
      ctx.lineTo(cx + 16, cy + ch - 12);
      ctx.lineTo(cx, cy + ch - 32);
      ctx.lineTo(cx, cy + 32);
      ctx.lineTo(cx + 16, cy + 12);
      ctx.closePath();
    } else if (theme.name === 'cyan') {
      const cutX = 32;
      const cutY = 20;
      ctx.beginPath();
      ctx.moveTo(cx + cutX, cy);
      ctx.lineTo(cx + cw - cutX, cy);
      ctx.lineTo(cx + cw, cy + cutY);
      ctx.lineTo(cx + cw, cy + ch - cutY);
      ctx.lineTo(cx + cw - cutX, cy + ch);
      ctx.lineTo(cx + cutX, cy + ch);
      ctx.lineTo(cx, cy + ch - cutY);
      ctx.lineTo(cx, cy + cutY);
      ctx.closePath();
    } else if (theme.name === 'pink') {
      const cut = 24;
      ctx.beginPath();
      ctx.moveTo(cx + cut, cy);
      ctx.lineTo(cx + cw - cut, cy);
      ctx.lineTo(cx + cw, cy + cut);
      ctx.lineTo(cx + cw, cy + ch - cut);
      ctx.lineTo(cx + cw - cut, cy + ch);
      ctx.lineTo(cx + cut, cy + ch);
      ctx.lineTo(cx, cy + ch - cut);
      ctx.lineTo(cx, cy + cut);
      ctx.closePath();
    } else {
      // Default / Red (Redline Sport) asymmetric chamfer
      const cut = 24;
      ctx.beginPath();
      ctx.moveTo(cx + 12, cy);
      ctx.lineTo(cx + cw - cut, cy);
      ctx.lineTo(cx + cw, cy + cut);
      ctx.lineTo(cx + cw, cy + ch - 12);
      ctx.lineTo(cx + cw - 12, cy + ch);
      ctx.lineTo(cx + cut, cy + ch);
      ctx.lineTo(cx, cy + ch - cut);
      ctx.lineTo(cx, cy + 12);
      ctx.closePath();
    }
  }

  // Outer frame track
  ctx.save();
  ctx.strokeStyle = theme.borderBaseColor; ctx.lineWidth = 4.5;
  drawChassisOutline(0); ctx.stroke();
  ctx.restore();

  // Glowing inner frame track
  ctx.save();
  ctx.strokeStyle = theme.themeColor;
  ctx.lineWidth = 2.2;
  ctx.shadowColor = theme.themeColor;
  ctx.shadowBlur = 14;
  drawChassisOutline(8); ctx.stroke();
  ctx.restore();

  // Corner brackets conditionally matching theme geometry
  if (theme.name === 'red' || theme.name === 'green' || theme.name === 'pink') {
    drawCornerBracket(ctx, cardX + 12, cardY + 12, 1, 1, theme.themeColor);
    drawCornerBracket(ctx, cardX + cardW - 12, cardY + 12, -1, 1, theme.themeColor);
    drawCornerBracket(ctx, cardX + 12, cardY + cardH - 12, 1, -1, theme.themeColor);
    drawCornerBracket(ctx, cardX + cardW - 12, cardY + cardH - 12, -1, -1, theme.themeColor);
  }

  // Glowing Avatar frame ring
  ctx.save();
  ctx.strokeStyle = theme.themeColor;
  ctx.lineWidth = 3;
  ctx.shadowColor = theme.themeColor;
  ctx.shadowBlur = 14;
  ctx.beginPath(); ctx.arc(avX, avY, avRadius + 4, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  // Clip avatar
  ctx.save();
  ctx.beginPath();
  ctx.arc(avX, avY, avRadius, 0, Math.PI * 2);
  ctx.clip();
  drawAvatar(ctx, avatarImg, avX, avY, avRadius);
  ctx.restore();

  // Sleek Username Nameplate with chamfered capsule
  ctx.save();
  const nameplateX = 170;
  const nameplateY = avY + 95;
  const nameplateW = 260;
  const nameplateH = 38;
  const nCut = 8;
  ctx.beginPath();
  ctx.moveTo(nameplateX + nCut, nameplateY);
  ctx.lineTo(nameplateX + nameplateW - nCut, nameplateY);
  ctx.lineTo(nameplateX + nameplateW, nameplateY + nCut);
  ctx.lineTo(nameplateX + nameplateW, nameplateY + nameplateH - nCut);
  ctx.lineTo(nameplateX + nameplateW - nCut, nameplateY + nameplateH);
  ctx.lineTo(nameplateX + nCut, nameplateY + nameplateH);
  ctx.lineTo(nameplateX, nameplateY + nameplateH - nCut);
  ctx.lineTo(nameplateX, nameplateY + nCut);
  ctx.closePath();

  // Dark brushed finish
  const nameplateGrad = ctx.createLinearGradient(nameplateX, nameplateY, nameplateX, nameplateY + nameplateH);
  nameplateGrad.addColorStop(0, '#151419');
  nameplateGrad.addColorStop(1, '#0c0b0f');
  ctx.fillStyle = nameplateGrad;
  ctx.fill();
  ctx.strokeStyle = '#2d2b36';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Red accent tick marks on nameplate sides
  ctx.strokeStyle = theme.themeColor;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(nameplateX, nameplateY + 10); ctx.lineTo(nameplateX, nameplateY + 28);
  ctx.moveTo(nameplateX + nameplateW, nameplateY + 10); ctx.lineTo(nameplateX + nameplateW, nameplateY + 28);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 21px "DejaVu Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(user.first_name, 300, avY + 121);
  ctx.restore();

  // Compact MOTM Star Capsule
  ctx.save();
  ctx.fillStyle = 'rgba(251, 191, 36, 0.08)';
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(260, avY + 140, 80, 20, 4);
  ctx.fill(); ctx.stroke();

  drawVectorStar(ctx, 274, avY + 150, 5, 4.5, 2, '#fbbf24');

  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 10px "DejaVu Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${stats.motm} MOTM`, 285, avY + 154);
  ctx.restore();

  // Unified Dashboard Panel drawing helper
  function drawDashboardPanel(title, startY, items) {
    const pX = 65;
    const pW = 470;
    const pH = 205;
    const pCut = 12;

    ctx.save();
    // 1. Draw chamfered panel backing
    ctx.beginPath();
    ctx.moveTo(pX + pCut, startY);
    ctx.lineTo(pX + pW - pCut, startY);
    ctx.lineTo(pX + pW, startY + pCut);
    ctx.lineTo(pX + pW, startY + pH - pCut);
    ctx.lineTo(pX + pW - pCut, startY + pH);
    ctx.lineTo(pX + pCut, startY + pH);
    ctx.lineTo(pX, startY + pH - pCut);
    ctx.lineTo(pX, startY + pCut);
    ctx.closePath();

    // Dark technical gradient
    const panelGrad = ctx.createLinearGradient(pX, startY, pX, startY + pH);
    panelGrad.addColorStop(0, '#100f13');
    panelGrad.addColorStop(1, '#070608');
    ctx.fillStyle = panelGrad;
    ctx.fill();

    // Panel border
    ctx.strokeStyle = '#1e1d24';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Glowing corner bracket ticks on the panel
    ctx.strokeStyle = theme.themeColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    // Top-left bracket
    ctx.moveTo(pX + 16, startY); ctx.lineTo(pX + pCut, startY); ctx.lineTo(pX, startY + pCut); ctx.lineTo(pX, startY + 16);
    // Bottom-right bracket
    ctx.moveTo(pX + pW - 16, startY + pH); ctx.lineTo(pX + pW - pCut, startY + pH); ctx.lineTo(pX + pW, startY + pH - pCut); ctx.lineTo(pX + pW, startY + pH - 16);
    ctx.stroke();

    // Header label text floating in top-left
    ctx.fillStyle = '#656370';
    ctx.font = 'bold 9.5px "DejaVu Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(title, pX + 18, startY + 20);

    // 2. Division lines inside panel
    ctx.strokeStyle = '#1b1a20';
    ctx.lineWidth = 1.2;
    // Vertical center division line
    ctx.beginPath();
    ctx.moveTo(300, startY + 32);
    ctx.lineTo(300, startY + pH - 12);
    ctx.stroke();

    // Horizontal division lines
    ctx.beginPath();
    ctx.moveTo(pX + 15, startY + 86);
    ctx.lineTo(pX + pW - 15, startY + 86);
    ctx.moveTo(pX + 15, startY + 144);
    ctx.lineTo(pX + pW - 15, startY + 144);
    ctx.stroke();

    // 3. Render grid items
    items.forEach(item => {
      // Label
      ctx.fillStyle = '#8e8b9e';
      ctx.font = 'bold 9px "DejaVu Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.label.toUpperCase(), item.x, item.y);

      // Value
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18.5px "DejaVu Sans", sans-serif';
      ctx.fillText(String(item.val), item.x, item.y + 23);
    });

    ctx.restore();
  }

  // Batting Dashboard
  const batStartY = avY + 195;
  const col1 = 182;
  const col2 = 418;

  const battingItems = [
    { label: "Runs Scored", val: stats.runs, x: col1, y: batStartY + 50 },
    { label: "Batting Avg", val: avgStr, x: col2, y: batStartY + 50 },
    { label: "Highest Score", val: stats.highscore, x: col1, y: batStartY + 108 },
    { label: "Fours / Sixes", val: `${stats.fours} / ${stats.sixes}`, x: col2, y: batStartY + 108 },
    { label: "50s / 100s", val: `${stats.fifties} / ${stats.centuries}`, x: col1, y: batStartY + 166 },
    { label: "Ducks Count", val: stats.ducks, x: col2, y: batStartY + 166 }
  ];
  drawDashboardPanel("BATTING INSTRUMENTS", batStartY, battingItems);

  // Bowling Dashboard
  const bowlStartY = batStartY + 235;
  const bowlingItems = [
    { label: "Wickets Taken", val: stats.wickets, x: col1, y: bowlStartY + 50 },
    { label: "Economy Rate", val: econ, x: col2, y: bowlStartY + 50 },
    { label: "Best Bowling", val: bestBowling, x: col1, y: bowlStartY + 108 },
    { label: "3w / 5w Hauls", val: `${stats.threew} / ${stats.fivew}`, x: col2, y: bowlStartY + 108 },
    { label: "Bowling Avg", val: bowlAvg, x: col1, y: bowlStartY + 166 },
    { label: "Overs Bowled", val: overs, x: col2, y: bowlStartY + 166 }
  ];
  drawDashboardPanel("BOWLING INSTRUMENTS", bowlStartY, bowlingItems);

  // Bottom brand stamp
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.font = 'bold 10px "DejaVu Sans", sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(`HANDCRICKET PRO COLLECTIBLE  //  ${theme.editionName}`, 300, 940);
  ctx.restore();

  // Gloss / reflection overlay
  ctx.save();
  const glossGrad = ctx.createLinearGradient(0, 0, 600, height);
  glossGrad.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
  glossGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.02)');
  glossGrad.addColorStop(0.31, 'rgba(255, 255, 255, 0)');
  glossGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = glossGrad;
  ctx.beginPath();
  drawChassisOutline(0);
  ctx.fill();
  ctx.restore();

  ctx.restore(); // Restore translation

  return canvas.toBuffer('image/png');
}

const themes = [
  {
    name: 'red',
    themeColor: '#ef4444',
    borderBaseColor: '#1e293b',
    glowColorRadial: 'rgba(239, 68, 68, 0.12)',
    editionName: 'REDLINE SPORT EDITION'
  },
  {
    name: 'blue',
    themeColor: '#38bdf8',
    borderBaseColor: '#0f172a',
    glowColorRadial: 'rgba(56, 189, 248, 0.12)',
    editionName: 'SAPPHIRE STRIKE EDITION'
  },
  {
    name: 'green',
    themeColor: '#22c55e',
    borderBaseColor: '#062f17',
    glowColorRadial: 'rgba(34, 197, 94, 0.12)',
    editionName: 'TOXIC HAZARD EDITION'
  },
  {
    name: 'purple',
    themeColor: '#a855f7',
    borderBaseColor: '#1e1b4b',
    glowColorRadial: 'rgba(168, 85, 247, 0.12)',
    editionName: 'NEON HELIX EDITION'
  },
  {
    name: 'gold',
    themeColor: '#fbbf24',
    borderBaseColor: '#1c1917',
    glowColorRadial: 'rgba(251, 191, 36, 0.12)',
    editionName: 'CENTURION GOLD EDITION'
  },
  {
    name: 'cyan',
    themeColor: '#06b6d4',
    borderBaseColor: '#083344',
    glowColorRadial: 'rgba(6, 182, 212, 0.12)',
    editionName: 'GLACIER PEAK EDITION'
  },
  {
    name: 'pink',
    themeColor: '#ec4899',
    borderBaseColor: '#31102f',
    glowColorRadial: 'rgba(236, 72, 153, 0.12)',
    editionName: 'ROSE COPPER EDITION'
  }
];

const outputDir = '/home/home/.gemini/antigravity/brain/c6919f8c-601c-4941-887d-dffaf2d6865f';

loadImage(path.join(__dirname, 'sample_avatar.png')).then(avatarImg => {
  return Promise.all(
    themes.map(theme => {
      return renderGlowingCard(avatarImg, theme).then(buf => {
        const filepath = path.join(outputDir, `template_glow_${theme.name}.png`);
        fs.writeFileSync(filepath, buf);
        console.log(`Rendered glowing theme ${theme.name}`);
      });
    })
  );
}).then(() => {
  console.log("All glowing mockups generated successfully!");
}).catch(err => {
  console.error("Error generating mockups:", err);
  process.exit(1);
});
