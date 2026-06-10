const path = require('path');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');

// Load system fonts for fallback support (e.g. emoji and star characters)
try {
  GlobalFonts.loadSystemFonts();
} catch (e) {
  console.error("Failed to load system fonts:", e);
}


function normalizeStyledText(str) {
  if (!str) return '';
  return [...str].map(char => {
    const cp = char.codePointAt(0);
    if (!cp) return char;

    // Mathematical Alphanumeric Blocks (1D400 - 1D7FF)
    // Mathematical Bold Capital (1D400 - 1D419) -> A-Z (65 - 90)
    if (cp >= 0x1d400 && cp <= 0x1d419) return String.fromCharCode(cp - 0x1d400 + 65);
    // Mathematical Bold Lowercase (1D41A - 1D433) -> a-z (97 - 122)
    if (cp >= 0x1d41a && cp <= 0x1d433) return String.fromCharCode(cp - 0x1d41a + 97);
    
    // Mathematical Italic Capital (1D434 - 1D44D) -> A-Z (65 - 90)
    if (cp >= 0x1d434 && cp <= 0x1d44d) return String.fromCharCode(cp - 0x1d434 + 65);
    // Mathematical Italic Lowercase (1D44E - 1D467) -> a-z (97 - 122)
    if (cp >= 0x1d44e && cp <= 0x1d467) return String.fromCharCode(cp - 0x1d44e + 97);
    
    // Mathematical Bold Italic Capital (1D468 - 1D481)
    if (cp >= 0x1d468 && cp <= 0x1d481) return String.fromCharCode(cp - 0x1d468 + 65);
    // Mathematical Bold Italic Lowercase (1D482 - 1D49B)
    if (cp >= 0x1d482 && cp <= 0x1d49b) return String.fromCharCode(cp - 0x1d482 + 97);
    
    // Mathematical Script Capital (1D49c - 1D4b5)
    if (cp >= 0x1d49c && cp <= 0x1d4b5) return String.fromCharCode(cp - 0x1d49c + 65);
    // Mathematical Script Lowercase (1D4b6 - 1D4cf)
    if (cp >= 0x1d4b6 && cp <= 0x1d4cf) return String.fromCharCode(cp - 0x1d4b6 + 97);
    
    // Mathematical Script Bold Capital (1D4d0 - 1D4e9)
    if (cp >= 0x1d4d0 && cp <= 0x1d4e9) return String.fromCharCode(cp - 0x1d4d0 + 65);
    // Mathematical Script Bold Lowercase (1D4ea - 1D503)
    if (cp >= 0x1d4ea && cp <= 0x1d503) return String.fromCharCode(cp - 0x1d4ea + 97);
    
    // Mathematical Fraktur Capital (1D504 - 1D51d)
    if (cp >= 0x1d504 && cp <= 0x1d51d) return String.fromCharCode(cp - 0x1d504 + 65);
    // Mathematical Fraktur Lowercase (1D51e - 1D537)
    if (cp >= 0x1d51e && cp <= 0x1d537) return String.fromCharCode(cp - 0x1d51e + 97);
    
    // Mathematical Double-Struck Capital (1D538 - 1D551)
    if (cp >= 0x1d538 && cp <= 0x1d551) return String.fromCharCode(cp - 0x1d538 + 65);
    // Mathematical Double-Struck Lowercase (1D552 - 1D56b)
    if (cp >= 0x1d552 && cp <= 0x1d56b) return String.fromCharCode(cp - 0x1d552 + 97);

    // Mathematical Fraktur Bold Capital (1D56c - 1D585)
    if (cp >= 0x1d56c && cp <= 0x1d585) return String.fromCharCode(cp - 0x1d56c + 65);
    // Mathematical Fraktur Bold Lowercase (1D586 - 1D59f)
    if (cp >= 0x1d586 && cp <= 0x1d59f) return String.fromCharCode(cp - 0x1d586 + 97);

    // Mathematical Sans-Serif Capital (1D5a0 - 1D5b9)
    if (cp >= 0x1d5a0 && cp <= 0x1d5b9) return String.fromCharCode(cp - 0x1d5a0 + 65);
    // Mathematical Sans-Serif Lowercase (1D5ba - 1D5d3)
    if (cp >= 0x1d5ba && cp <= 0x1d5d3) return String.fromCharCode(cp - 0x1d5ba + 97);
    
    // Mathematical Sans-Serif Bold Capital (1D5d4 - 1D5ed)
    if (cp >= 0x1d5d4 && cp <= 0x1d5ed) return String.fromCharCode(cp - 0x1d5d4 + 65);
    // Mathematical Sans-Serif Bold Lowercase (1D5ee - 1D607)
    if (cp >= 0x1d5ee && cp <= 0x1d607) return String.fromCharCode(cp - 0x1d5ee + 97);
    
    // Mathematical Sans-Serif Italic Capital (1D608 - 1D621)
    if (cp >= 0x1d608 && cp <= 0x1d621) return String.fromCharCode(cp - 0x1d608 + 65);
    // Mathematical Sans-Serif Italic Lowercase (1D622 - 1D63b)
    if (cp >= 0x1d622 && cp <= 0x1d63b) return String.fromCharCode(cp - 0x1d622 + 97);
    
    // Mathematical Sans-Serif Bold Italic Capital (1D63c - 0x1D655)
    if (cp >= 0x1d63c && cp <= 0x1d655) return String.fromCharCode(cp - 0x1d63c + 65);
    // Mathematical Sans-Serif Bold Italic Lowercase (1D656 - 1D66f)
    if (cp >= 0x1d656 && cp <= 0x1d66f) return String.fromCharCode(cp - 0x1d656 + 97);
    
    // Mathematical Monospace Capital (1D670 - 1D689)
    if (cp >= 0x1d670 && cp <= 0x1d689) return String.fromCharCode(cp - 0x1d670 + 65);
    // Mathematical Monospace Lowercase (1D68a - 1D6a3)
    if (cp >= 0x1d68a && cp <= 0x1d6a3) return String.fromCharCode(cp - 0x1d68a + 97);

    // Mathematical Bold Numbers (1D7CE - 1D7D7) -> 0-9
    if (cp >= 0x1d7ce && cp <= 0x1d7d7) return String.fromCharCode(cp - 0x1d7ce + 48);
    // Double-struck Numbers (1D7D8 - 1D7E1) -> 0-9
    if (cp >= 0x1d7d8 && cp <= 0x1d7e1) return String.fromCharCode(cp - 0x1d7d8 + 48);
    // Sans-serif Bold Numbers (1D7E2 - 1D7EB) -> 0-9
    if (cp >= 0x1d7e2 && cp <= 0x1d7eb) return String.fromCharCode(cp - 0x1d7e2 + 48);
    // Sans-serif Double-struck Numbers (1D7EC - 1D7F5) -> 0-9
    if (cp >= 0x1d7ec && cp <= 0x1d7f5) return String.fromCharCode(cp - 0x1d7ec + 48);
    // Monospace Numbers (1D7F6 - 1D7FF) -> 0-9
    if (cp >= 0x1d7f6 && cp <= 0x1d7ff) return String.fromCharCode(cp - 0x1d7f6 + 48);

    // Fullwidth Capital (FF21 - FF3A) -> A-Z
    if (cp >= 0xff21 && cp <= 0xff3a) return String.fromCharCode(cp - 0xff21 + 65);
    // Fullwidth Lowercase (FF41 - FF5A) -> a-z
    if (cp >= 0xff41 && cp <= 0xff5a) return String.fromCharCode(cp - 0xff41 + 97);
    // Fullwidth Numbers (FF10 - FF19) -> 0-9
    if (cp >= 0xff10 && cp <= 0xff19) return String.fromCharCode(cp - 0xff10 + 48);

    // Circled Capital (24B6 - 24CF) -> A-Z
    if (cp >= 0x24b6 && cp <= 0x24cf) return String.fromCharCode(cp - 0x24b6 + 65);
    // Circled Lowercase (24D0 - 24E9) -> a-z
    if (cp >= 0x24d0 && cp <= 0x24e9) return String.fromCharCode(cp - 0x24d0 + 97);
    // Circled Numbers (2460 - 2468) -> 1-9
    if (cp >= 0x2460 && cp <= 0x2468) return String.fromCharCode(cp - 0x2460 + 49);
    if (cp === 0x24ea) return '0';

    // BMP Script Exceptions
    if (cp === 0x212c) return 'B';
    if (cp === 0x2130) return 'E';
    if (cp === 0x2131) return 'F';
    if (cp === 0x210b) return 'H';
    if (cp === 0x2110) return 'I';
    if (cp === 0x2112) return 'L';
    if (cp === 0x2133) return 'M';
    if (cp === 0x211b) return 'R';
    if (cp === 0x210a) return 'g';
    if (cp === 0x2134) return 'o';
    if (cp === 0x212f) return 'e';
    if (cp === 0x2113) return 'l';
    // BMP Double-Struck Exceptions
    if (cp === 0x2102) return 'C';
    if (cp === 0x210d) return 'H';
    if (cp === 0x2115) return 'N';
    if (cp === 0x2119) return 'P';
    if (cp === 0x211a) return 'Q';
    if (cp === 0x211d) return 'R';
    if (cp === 0x2124) return 'Z';

    return char;
  }).join('');
}

function drawTextWithEmojis(ctx, text, x, y, fontSpec, emojiFontFamily = 'Noto Color Emoji') {
  if (text === undefined || text === null) return;
  const str = String(text);
  
  // Parse the fontSpec to extract font size and style, and replace/force font family
  // e.g. "bold 15px sans-serif" -> sizeAndStyle = "bold 15px", family = "sans-serif"
  const fontParts = fontSpec.split(/\s+/);
  const familyIndex = fontParts.findIndex(part => part.includes('sans-serif') || part.includes('Arial') || part.includes('DejaVu'));
  
  let sizeAndStyle = '14px';
  let primaryFamily = 'DejaVu Sans';
  
  if (familyIndex !== -1) {
    sizeAndStyle = fontParts.slice(0, familyIndex).join(' ');
    primaryFamily = 'DejaVu Sans'; // Force DejaVu Sans for reliability on Linux
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

function drawOrnateBorder(ctx, x, y, w, h, radius) {
  drawRoundedRect(ctx, x, y, w, h, radius);
  ctx.stroke();

  // Inner orange/red frame line
  const offset = 8;
  ctx.save();
  ctx.strokeStyle = 'rgba(249, 115, 22, 0.4)';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 4]);
  drawRoundedRect(ctx, x + offset, y + offset, w - offset * 2, h - offset * 2, radius - 2);
  ctx.stroke();
  ctx.restore();

  // Corner decorative dots
  ctx.fillStyle = '#ef4444';
  const corners = [
    [x + offset, y + offset],
    [x + w - offset, y + offset],
    [x + offset, y + h - offset],
    [x + w - offset, y + h - offset]
  ];
  corners.forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

async function generateScoreboardImage(tour, resultText, potmName) {
  try {
    const width = 1024;
    const height = 576;
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

    // Apply a deep cinematic fiery radial vignette over the stadium background
    const vignette = ctx.createRadialGradient(width / 2, height / 2, 80, width / 2, height / 2, width / 2 + 200);
    vignette.addColorStop(0, 'rgba(15, 5, 5, 0.3)');
    vignette.addColorStop(0.7, 'rgba(8, 2, 2, 0.88)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.98)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    // Card dimensions
    const cardX = 60;
    const cardY = 30;
    const cardW = 904;
    const cardH = 516;

    // Velvet carbon black gradient background
    const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
    cardGrad.addColorStop(0, '#100a08');
    cardGrad.addColorStop(1, '#050302');
    ctx.fillStyle = cardGrad;
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 24);
    ctx.fill();

    // High-intensity neon fire glow border
    ctx.save();
    ctx.strokeStyle = '#f97316';
    ctx.shadowColor = 'rgba(239, 68, 68, 0.8)';
    ctx.shadowBlur = 22;
    ctx.lineWidth = 3.5;
    drawOrnateBorder(ctx, cardX, cardY, cardW, cardH, 24);
    ctx.restore();

    // Draw Custom Tournament Name Title if provided
    if (tour.name) {
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 8;
      drawTextWithEmojis(ctx, normalizeStyledText(tour.name).toUpperCase(), width / 2, 85, 'bold 20px sans-serif');
      ctx.restore();
    }

    // Setup first and second batting teams
    const totalScore = (team) => Math.max(0, (team.score || 0) + (team.bonusRuns || 0) - (team.penaltyRuns || 0));
    const team1Key = tour.firstBattingTeamId || 'teamA';
    const team2Key = team1Key === 'teamA' ? 'teamB' : 'teamA';
    
    const team1 = tour[team1Key];
    const team2 = tour[team2Key];

    const team1Score = totalScore(team1);
    const team2Score = totalScore(team2);

    const getOversStr = (balls) => {
        if (balls === undefined) return "0.0";
        const ov = Math.floor(balls / 6);
        const bl = balls % 6;
        return `${ov}.${bl}`;
    };

    const team1Overs = getOversStr(tour.innings1Balls !== undefined ? tour.innings1Balls : (tour.innings === 1 ? tour.balls : tour.config.overs * 6));
    const team2Overs = getOversStr(tour.innings2Balls !== undefined ? tour.innings2Balls : (tour.innings === 2 ? tour.balls : 0));

    const getPerformers = (batT, bowlT) => {
        const batsmen = batT.players
            .map(p => {
                const isOut = batT.outPlayers && batT.outPlayers.some(id => id && id.toString() === p.id.toString());
                const cleanFirstName = p.first_name;
                const normalizedName = normalizeStyledText(cleanFirstName);
                const name = normalizedName + (isOut ? '' : '*');
                return { name, runs: p.runs || 0, balls: p.balls || 0 };
            })
            .filter(p => p.balls > 0 || p.runs > 0)
            .sort((a, b) => b.runs - a.runs);
            
        const bowlers = bowlT.players
            .map(p => {
                const cleanFirstName = p.first_name;
                return {
                    name: normalizeStyledText(cleanFirstName),
                    wickets: p.wickets || 0,
                    runsConceded: p.runsConceded || 0,
                    ballsBowled: p.ballsBowled || 0
                };
            })
            .filter(p => p.ballsBowled > 0)
            .sort((a, b) => {
                if (b.wickets !== a.wickets) return b.wickets - a.wickets;
                return a.runsConceded - b.runsConceded;
            });
            
        return { batsmen, bowlers };
    };

    const inn1Performers = getPerformers(team1, team2);
    const inn2Performers = getPerformers(team2, team1);

    // Columns Layout
    const col1X = 90;
    const colW = 395;
    const col2X = 539;
    const tableY = 110;

    // ================= LEFT COLUMN: TEAM 1 =================
    renderTeamColumn(ctx, col1X, colW, team1, team1Score, team1Overs, "#991b1b", "#1a0505", tableY, inn1Performers.batsmen, inn1Performers.bowlers);

    // ================= RIGHT COLUMN: TEAM 2 =================
    renderTeamColumn(ctx, col2X, colW, team2, team2Score, team2Overs, "#c2410c", "#1c0a02", tableY, inn2Performers.batsmen, inn2Performers.bowlers);

    // ================= BOTTOM SUMMARY BADGE =================
    const capX = 232;
    const capW = 560;
    const capY = 440;
    const capH = 92;

    ctx.save();
    const footerGrad = ctx.createLinearGradient(capX, capY, capX, capY + capH);
    footerGrad.addColorStop(0, '#22110a');
    footerGrad.addColorStop(1, '#0c0502');
    ctx.fillStyle = footerGrad;
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(239, 68, 68, 0.7)';
    ctx.shadowBlur = 12;

    ctx.beginPath();
    const radius = 15;
    ctx.moveTo(capX + radius, capY);
    ctx.quadraticCurveTo(capX + capW / 2, capY - 6, capX + capW - radius, capY);
    ctx.quadraticCurveTo(capX + capW, capY + capH / 2, capX + capW - radius, capY + capH);
    ctx.quadraticCurveTo(capX + capW / 2, capY + capH + 6, capX + radius, capY + capH);
    ctx.quadraticCurveTo(capX, capY + capH / 2, capX + radius, capY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // POTM Stats calculation
    let potmStatsStr = "";
    if (potmName) {
        const normPotm = normalizeStyledText(potmName);
        const potmPlayer = [...team1.players, ...team2.players].find(p => normalizeStyledText(p.first_name) === normPotm);
        if (potmPlayer) {
            let parts = [];
            if (potmPlayer.runs > 0 || potmPlayer.balls > 0) {
                parts.push(`${potmPlayer.runs || 0} Runs (${potmPlayer.balls || 0}b)`);
            }
            if (potmPlayer.ballsBowled > 0) {
                const ovs = Math.floor(potmPlayer.ballsBowled / 6) + '.' + (potmPlayer.ballsBowled % 6);
                parts.push(`${potmPlayer.wickets || 0} Wkts for ${potmPlayer.runsConceded || 0} Runs (${ovs} Ov)`);
            }
            potmStatsStr = parts.join("  |  ");
        }
    }

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    drawTextWithEmojis(ctx, resultText.toUpperCase(), capX + capW / 2, capY + 32, 'bold 18px sans-serif');
    
    if (potmName) {
        ctx.fillStyle = '#f97316';
        const normPotm = normalizeStyledText(potmName);
        drawTextWithEmojis(ctx, `★ ${normPotm.toUpperCase()} (PLAYER OF THE MATCH)`, capX + capW / 2, capY + 58, 'bold 15px sans-serif');
        if (potmStatsStr) {
            ctx.fillStyle = '#fca5a5';
            drawTextWithEmojis(ctx, potmStatsStr, capX + capW / 2, capY + 78, '13px sans-serif');
        }
    }
    ctx.restore();

    // 8. Broadcaster Channel Logo Badge (circular overlay watermark top right)
    try {
      const logoPath = '/home/home/ReactNative/Telegram/undercover-bot/assets/logo.png';
      const logo = await loadImage(logoPath);
      ctx.drawImage(logo, 910, 15, 45, 45);
    } catch (err) {}

    return canvas.toBuffer('image/png');
  } catch (err) {
    console.error("Error generating TV scoreboard image:", err);
    return null;
  }
}

function renderTeamColumn(ctx, colX, colW, team, score, overs, startColor, endColor, tableY, batsmen, bowlers) {
  // Curved header
  ctx.save();
  const hGrad = ctx.createLinearGradient(colX, tableY, colX, tableY + 38);
  hGrad.addColorStop(0, startColor);
  hGrad.addColorStop(1, endColor);
  ctx.fillStyle = hGrad;
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  const radius = 8;
  const width = colW;
  const height = 38;
  ctx.moveTo(colX + radius, tableY);
  ctx.lineTo(colX + width - radius, tableY);
  ctx.quadraticCurveTo(colX + width, tableY, colX + width, tableY + radius);
  ctx.lineTo(colX + width, tableY + height);
  ctx.lineTo(colX, tableY + height);
  ctx.lineTo(colX, tableY + radius);
  ctx.quadraticCurveTo(colX, tableY, colX + radius, tableY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = '#ffffff';
  drawTextWithEmojis(ctx, normalizeStyledText(team.name).toUpperCase(), colX + 12, tableY + 24, 'bold 15px sans-serif');
  ctx.textAlign = 'right';
  drawTextWithEmojis(ctx, `${score}/${team.wickets || 0} (${overs})`, colX + colW - 12, tableY + 24, 'bold 15px sans-serif');
  ctx.restore();

  // Batting Title
  ctx.fillStyle = '#f97316';
  drawTextWithEmojis(ctx, 'BATTING', colX + 12, tableY + 62, 'bold 12px sans-serif');

  for (let i = 0; i < 3; i++) {
    const y = tableY + 84 + i * 22;
    const p = batsmen[i] || { name: '-', runs: '', balls: '' };
    ctx.fillStyle = '#fca5a5';
    drawTextWithEmojis(ctx, p.name, colX + 15, y, '14px sans-serif');

    if (p.runs !== '') {
        ctx.save();
        ctx.textAlign = 'right';
        ctx.fillStyle = '#f97316';
        drawTextWithEmojis(ctx, p.runs, colX + colW - 55, y, 'bold 14px sans-serif');
        ctx.fillStyle = '#fca5a5';
        drawTextWithEmojis(ctx, `(${p.balls})`, colX + colW - 15, y, '12px sans-serif');
        ctx.restore();
    }
  }

  // Bowling Title
  ctx.fillStyle = '#f87171';
  drawTextWithEmojis(ctx, 'BOWLING', colX + 12, tableY + 172, 'bold 12px sans-serif');

  for (let i = 0; i < 3; i++) {
    const y = tableY + 194 + i * 22;
    const p = bowlers[i] || { name: '-', wickets: '', runsConceded: '', ballsBowled: '' };
    ctx.fillStyle = '#fca5a5';
    drawTextWithEmojis(ctx, p.name, colX + 15, y, '14px sans-serif');

    if (p.wickets !== '') {
        ctx.save();
        ctx.textAlign = 'right';
        ctx.fillStyle = '#f87171';
        drawTextWithEmojis(ctx, `${p.wickets}-${p.runsConceded}`, colX + colW - 55, y, 'bold 14px sans-serif');
        ctx.fillStyle = '#fca5a5';
        const ovs = Math.floor(p.ballsBowled / 6) + '.' + (p.ballsBowled % 6);
        drawTextWithEmojis(ctx, `${ovs}`, colX + colW - 15, y, '12px sans-serif');
        ctx.restore();
    }
  }

  // Footer / Extras
  ctx.fillStyle = '#fca5a5';
  const ext = (team.bonusRuns || 0) - (team.penaltyRuns || 0);
  drawTextWithEmojis(ctx, `Extras: ${ext}`, colX + 15, tableY + 315, '13px sans-serif');
}

module.exports = {
  generateScoreboardImage,
  normalizeStyledText
};
