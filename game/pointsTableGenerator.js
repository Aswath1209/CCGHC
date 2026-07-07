const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

// Load custom fonts
try {
  GlobalFonts.loadSystemFonts();
  GlobalFonts.registerFromPath(path.join(__dirname, '../assets/fonts/BebasNeue-Regular.ttf'), 'BebasNeue');
  GlobalFonts.registerFromPath(path.join(__dirname, '../assets/fonts/Saira-BoldItalic.ttf'), 'Saira');
  GlobalFonts.registerFromPath(path.join(__dirname, '../assets/fonts/Saira-SemiBoldItalic.ttf'), 'Saira');
} catch (e) {
  console.error("Failed to load custom fonts in points table generator:", e);
}

function normalizeStyledText(text) {
  if (!text) return '';
  const chars = [...String(text)];
  let normal = '';
  for (const ch of chars) {
    const cp = ch.codePointAt(0);
    if (cp >= 0x1D400 && cp <= 0x1D7FF) {
      normal += ch.normalize('NFKC');
    } else {
      normal += ch;
    }
  }
  return normal.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u200B-\u200D\uFEFF]/g, '');
}

async function generatePointsTableImage(tri) {
  const bgPath = path.join(__dirname, 'assets/stadium_bg.png');
  let bg;
  try {
    bg = await loadImage(bgPath);
  } catch (e) {
    try {
      bg = await loadImage(path.join(__dirname, '../game/assets/stadium_bg.png'));
    } catch (err) {}
  }

  const teamKeys = Object.keys(tri)
    .filter(k => k.startsWith('team') && k.length === 5)
    .sort();

  const W = 1600;
  const rowHeight = 92;
  const headerHeight = 310;
  const tableBodyHeight = teamKeys.length * rowHeight;
  
  const matchesToDisplay = tri.matches || [];
  const rowsCount = Math.ceil(matchesToDisplay.length / 2);
  const scheduleBoxHeight = Math.max(120, 70 + (rowsCount * 35) + 20);
  
  const H = headerHeight + tableBodyHeight + scheduleBoxHeight + 80;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Draw Stadium Background
  if (bg) {
    ctx.drawImage(bg, 0, 0, W, H);
  } else {
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, W, H);
  }

  // Draw Premium Radial Vignette Overlay
  const overlayGrad = ctx.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, W * 0.7);
  overlayGrad.addColorStop(0, 'rgba(10, 15, 30, 0.78)');
  overlayGrad.addColorStop(1, 'rgba(4, 6, 12, 0.95)');
  ctx.fillStyle = overlayGrad;
  ctx.fillRect(0, 0, W, H);

  // Draw CCG logo
  try {
    const logoPath = path.join(__dirname, 'assets/ccg_logo.png');
    if (fs.existsSync(logoPath)) {
      const logo = await loadImage(logoPath);
      ctx.drawImage(logo, W / 2 - 50, 45, 100, 100);
    }
  } catch (e) {}

  // Title
  ctx.save();
  const goldGrad = ctx.createLinearGradient(0, 160, 0, 220);
  goldGrad.addColorStop(0, '#fde047');
  goldGrad.addColorStop(1, '#ca8a04');
  ctx.fillStyle = goldGrad;
  ctx.font = 'italic bold 56px Saira, "DejaVu Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TOURNAMENT POINTS TABLE', W / 2, 185);
  ctx.restore();

  // Subtitle
  ctx.save();
  ctx.fillStyle = '#9ca3af';
  ctx.font = 'bold 20px BebasNeue, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('LEAGUE STAGE STANDINGS', W / 2, 235);
  ctx.restore();

  // Columns Configuration
  const tableX = 100;
  const tableWidth = W - 200;
  const colWidths = {
    rank: 100,
    team: 450,
    p: 120,
    w: 120,
    l: 120,
    pts: 160,
    nrr: 200
  };

  const headerY = 270;
  const headers = [
    { label: 'POS', x: tableX + 50 },
    { label: 'TEAM', x: tableX + 130, align: 'left' },
    { label: 'PLAYED', x: tableX + colWidths.rank + colWidths.team + 60 },
    { label: 'WON', x: tableX + colWidths.rank + colWidths.team + colWidths.p + 60 },
    { label: 'LOST', x: tableX + colWidths.rank + colWidths.team + colWidths.p + colWidths.w + 60 },
    { label: 'POINTS', x: tableX + colWidths.rank + colWidths.team + colWidths.p + colWidths.w + colWidths.l + 80 },
    { label: 'NRR', x: tableX + colWidths.rank + colWidths.team + colWidths.p + colWidths.w + colWidths.l + colWidths.pts + 100 }
  ];

  ctx.save();
  ctx.fillStyle = '#ca8a04';
  ctx.font = 'bold 22px BebasNeue, sans-serif';
  ctx.textBaseline = 'middle';
  headers.forEach(h => {
    ctx.textAlign = h.align || 'center';
    ctx.fillText(h.label, h.x, headerY);
  });
  ctx.restore();

  // Divider Line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(tableX, headerY + 20);
  ctx.lineTo(tableX + tableWidth, headerY + 20);
  ctx.stroke();

  // Calculate NRR for each team
  const calculateNRR = (teamKey) => {
    const data = tri.pointsTable[teamKey];
    if (!data || data.played === 0) return 0;
    
    const runsScored = data.runsScored || 0;
    const ballsFaced = data.ballsFaced || 0;
    const runsConceded = data.runsConceded || 0;
    const ballsBowled = data.ballsBowled || 0;
    
    const batRate = ballsFaced > 0 ? (runsScored / (ballsFaced / 6)) : 0;
    const bowlRate = ballsBowled > 0 ? (runsConceded / (ballsBowled / 6)) : 0;
    
    return batRate - bowlRate;
  };

  // Sort teams by points desc, NRR desc
  const qLimit = tri.config.q || 2;
  const teamsData = teamKeys.map(key => {
    const nrrVal = calculateNRR(key);
    return {
      key,
      name: normalizeStyledText(tri[key].name).toUpperCase(),
      p: tri.pointsTable[key]?.played || 0,
      w: tri.pointsTable[key]?.won || 0,
      l: tri.pointsTable[key]?.lost || 0,
      pts: tri.pointsTable[key]?.points || 0,
      nrrVal,
      nrr: (nrrVal >= 0 ? '+' : '') + nrrVal.toFixed(3)
    };
  });

  teamsData.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    return b.nrrVal - a.nrrVal;
  });

  // Render individual rows
  let currentY = headerY + 40;
  teamsData.forEach((team, index) => {
    const rank = index + 1;
    const qualified = rank <= qLimit;

    ctx.save();
    const rowGrad = ctx.createLinearGradient(tableX, currentY, tableX + tableWidth, currentY);
    if (qualified) {
      rowGrad.addColorStop(0, 'rgba(16, 185, 129, 0.14)');
      rowGrad.addColorStop(1, 'rgba(16, 185, 129, 0.03)');
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
    } else {
      rowGrad.addColorStop(0, 'rgba(239, 68, 68, 0.08)');
      rowGrad.addColorStop(1, 'rgba(239, 68, 68, 0.02)');
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.2)';
    }
    
    ctx.fillStyle = rowGrad;
    ctx.beginPath();
    ctx.roundRect(tableX, currentY, tableWidth, 75, 16);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Position Indicator Badge
    ctx.save();
    ctx.fillStyle = qualified ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.15)';
    ctx.strokeStyle = qualified ? '#10b981' : '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tableX + 50, currentY + 37.5, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px BebasNeue, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(rank), tableX + 50, currentY + 37.5);
    ctx.restore();

    // Team name
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'italic bold 28px Saira, "DejaVu Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(team.name, tableX + 130, currentY + 37.5);
    ctx.restore();

    // Stats
    ctx.save();
    ctx.fillStyle = '#e5e7eb';
    ctx.font = 'bold 26px BebasNeue, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.fillText(String(team.p), tableX + colWidths.rank + colWidths.team + 60, currentY + 37.5);
    ctx.fillText(String(team.w), tableX + colWidths.rank + colWidths.team + colWidths.p + 60, currentY + 37.5);
    ctx.fillText(String(team.l), tableX + colWidths.rank + colWidths.team + colWidths.p + colWidths.w + 60, currentY + 37.5);
    
    // Points
    ctx.fillStyle = '#fde047';
    ctx.fillText(String(team.pts), tableX + colWidths.rank + colWidths.team + colWidths.p + colWidths.w + colWidths.l + 80, currentY + 37.5);
    
    // NRR
    ctx.fillStyle = team.nrr.startsWith('+') ? '#34d399' : '#f87171';
    ctx.fillText(team.nrr, tableX + colWidths.rank + colWidths.team + colWidths.p + colWidths.w + colWidths.l + colWidths.pts + 100, currentY + 37.5);
    
    ctx.restore();

    currentY += 92;
  });

  // Draw Tournament Schedule & History
  const scheduleY = currentY + 20;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.beginPath();
  ctx.roundRect(tableX, scheduleY, tableWidth, scheduleBoxHeight, 20);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Section Header
  ctx.save();
  ctx.fillStyle = '#ca8a04';
  ctx.font = 'bold 22px BebasNeue, sans-serif';
  ctx.fillText('TOURNAMENT SCHEDULE & RESULTS', tableX + 30, scheduleY + 35);
  ctx.restore();

  // Draw list of matches in two columns
  const matchCol1X = tableX + 45;
  const matchCol2X = tableX + tableWidth / 2 + 20;

  ctx.save();
  ctx.textBaseline = 'middle';
  matchesToDisplay.forEach((m, idx) => {
    const colX = idx < rowsCount ? matchCol1X : matchCol2X;
    const rowY = scheduleY + 70 + (idx % rowsCount) * 35;

    const t1Name = tri[m.team1Key]?.name || 'TBD';
    const t2Name = tri[m.team2Key]?.name || 'TBD';

    const done = m.state === 'COMPLETED';

    // Dot indicator
    ctx.beginPath();
    ctx.arc(colX, rowY, 6, 0, Math.PI * 2);
    ctx.fillStyle = done ? '#10b981' : (m.state === 'PLAYING' ? '#60a5fa' : '#6b7280');
    ctx.fill();

    // Match label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px "DejaVu Sans", sans-serif';
    ctx.textAlign = 'left';
    
    const displayName = m.name || `MATCH ${m.num}`;
    ctx.fillText(`${displayName}: ${normalizeStyledText(t1Name)} vs ${normalizeStyledText(t2Name)}`, colX + 20, rowY);

    // Result/Status
    ctx.fillStyle = done ? '#a3a3a3' : (m.state === 'PLAYING' ? '#60a5fa' : '#eab308');
    ctx.font = 'italic 16px "DejaVu Sans", sans-serif';
    ctx.textAlign = 'right';
    const textLimit = idx < rowsCount ? tableX + tableWidth / 2 - 40 : tableX + tableWidth - 40;
    
    let statusText = 'SCHEDULED';
    if (m.state === 'COMPLETED') {
      statusText = m.resultText || 'COMPLETED';
    } else if (m.state === 'PLAYING') {
      statusText = 'LIVE NOW';
    }
    ctx.fillText(statusText, textLimit, rowY);
  });
  ctx.restore();

  return canvas.toBuffer('image/png');
}

module.exports = { generatePointsTableImage };
