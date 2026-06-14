const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const fontsDir = path.join(__dirname, '..', 'fonts');
try {
  GlobalFonts.registerFromPath(path.join(fontsDir, 'Cinzel-Bold.ttf'), 'Cinzel');
  GlobalFonts.registerFromPath(path.join(fontsDir, 'Montserrat-ExtraBold.ttf'), 'Montserrat');
  
  // Register the newly downloaded Google Color Emoji font
  const emojiPath = path.join(fontsDir, 'NotoColorEmoji.ttf');
  if (fs.existsSync(emojiPath)) {
    GlobalFonts.registerFromPath(emojiPath, 'Noto Color Emoji');
  }
  
  // Register official Noto Sans CJK KR for Clan Emblems (replaces invisible Unifont)
  const krPath = path.join(fontsDir, 'NotoSansKR.otf');
  if (fs.existsSync(krPath)) {
    GlobalFonts.registerFromPath(krPath, 'Noto Sans KR');
  }

  // Register Esoteric Symbology Fonts
  const egPath = path.join(fontsDir, 'NotoEgyptian.ttf');
  if (fs.existsSync(egPath)) GlobalFonts.registerFromPath(egPath, 'Noto Egyptian');

  const taiPath = path.join(fontsDir, 'NotoTaiTham.ttf');
  if (fs.existsSync(taiPath)) GlobalFonts.registerFromPath(taiPath, 'Noto Tai Tham');

  const mathPath = path.join(fontsDir, 'NotoMath.ttf');
  if (fs.existsSync(mathPath)) GlobalFonts.registerFromPath(mathPath, 'Noto Math');

} catch (e) {
  console.error('Failed to register custom fonts:', e);
}

const ASSETS = path.join(__dirname, 'assets');
const TEMPLATE_WIDTH = 1229;
const TEMPLATE_HEIGHT = 1536;

const unicodeMap = {
  0x1d00: 'A', 0x299: 'B', 0x1d04: 'C', 0x1d05: 'D', 0x1d07: 'E', 0xa730: 'F',
  0x262: 'G', 0x29c: 'H', 0x26a: 'I', 0x1d0a: 'J', 0x1d0b: 'K', 0x29f: 'L',
  0x1d0d: 'M', 0x274: 'N', 0x1d0f: 'O', 0x1d18: 'P', 0x280: 'R', 0xa731: 'S',
  0x1d1b: 'T', 0x1d1c: 'U', 0x1d20: 'V', 0x1d21: 'W', 0x28f: 'Y', 0x1d22: 'Z'
};

function normalizeStyledText(text) {
  if (!text) return '';
  const chars = [...String(text)];
  let normal = '';
  
  // 1. Convert Math/Fancy fonts back to standard English
  for (const ch of chars) {
    const cp = ch.codePointAt(0);
    if (cp >= 0x1D400 && cp <= 0x1D7FF) {
      normal += ch.normalize('NFKC');
    } else {
      normal += ch;
    }
  }
  
  // 2. Strip invisible control characters that crash the canvas
  normal = normal.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u200B-\u200D\uFEFF]/g, '');
  
  // 3. Fix Floating Combining Marks
  // The symbol \uAABE (Tai Tham) is a combining mark. Because it is placed next to an Egyptian
  // Hieroglyph instead of a valid letter, the Pango rendering engine crashes and draws a box.
  // We inject a structural Dotted Circle (\u25CC) so the floating mark has a base to render on!
  return normal.replace(/([\uAAB0-\uAABF])/g, '\u25CC$1');
}

function buildFont(size, family, weight = 'bold', style = '') {
  return [style, weight, `${size}px`, family].filter(Boolean).join(' ');
}

function drawFitCenteredText(ctx, text, x, y, maxWidth, options = {}) {
  const {
    startSize,
    minSize = 10,
    // Inject all esoteric fonts into the fallback stack!
    family = 'Montserrat, "Noto Color Emoji", "Noto Sans KR", "Noto Egyptian", "Noto Tai Tham", "Noto Math", "DejaVu Sans", "Arial Unicode MS", "Segoe UI Symbol", sans-serif',
    weight = 'bold',
    style = ''
  } = options;

  let str = String(text ?? '');
  let size = startSize;
  let font = buildFont(size, family, weight, style);

  // Try to fit the text by shrinking font size down to minSize
  while (size > minSize) {
    ctx.font = font;
    if (ctx.measureText(str).width <= maxWidth) break;
    size -= 1;
    font = buildFont(size, family, weight, style);
  }

  ctx.font = font;
  
  // If it STILL exceeds maxWidth at minSize, truncate with an ellipsis
  if (ctx.measureText(str).width > maxWidth) {
    while (str.length > 0 && ctx.measureText(str + '...').width > maxWidth) {
      str = str.slice(0, -1);
    }
    str = str.trim() + '...';
  }

  ctx.fillText(str, x, y);
  return size;
}

function resolveTemplatePath() {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  const candidates = [
    path.join(homeDir, 'Downloads', 'cardteemplate.jpeg'),
    path.join(homeDir, 'Downloads', 'cardtemplate.jpeg'),
    path.join(homeDir, 'Downloads', 'cardTemplate2.jpeg'),
    path.join(homeDir, 'Downloads', 'cardTemplate.jpeg'),
    path.join(ASSETS, 'cardtemplate.jpeg'),
    path.join(ASSETS, 'cardTemplate.jpeg')
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

async function generateProfileCard(user, stats, avatarBuffer) {
  const templatePath = resolveTemplatePath();
  if (!templatePath) {
    throw new Error('Unable to locate cricket card template image.');
  }

  const template = await loadImage(templatePath);
  const width = TEMPLATE_WIDTH;
  const height = TEMPLATE_HEIGHT;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. Draw template background
  ctx.drawImage(template, 0, 0, width, height);

  // 2. DYNAMIC PROFILE PICTURE (Perfect Masked Circle)
  const avX = 621.5;
  const avY = 321.2; // Exact gear wheel center
  const avR = 97; // Slightly reduced innermost cutout radius

  let pfpImage = null;
  if (avatarBuffer) {
    try {
      if (Buffer.isBuffer(avatarBuffer) || avatarBuffer instanceof Uint8Array) {
        pfpImage = await loadImage(Buffer.from(avatarBuffer));
      } else if (typeof avatarBuffer === 'string' && fs.existsSync(avatarBuffer)) {
        pfpImage = await loadImage(avatarBuffer);
      }
    } catch (e) {
      console.error('Error loading player avatar:', e);
    }
  }

  ctx.save();
  ctx.beginPath();
  ctx.arc(avX, avY, avR, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip(); // Mask everything outside this circle

  if (pfpImage) {
    // Draw PFP inside the mask with aspect ratio fitting
    const s = Math.max(avR * 2 / pfpImage.width, avR * 2 / pfpImage.height);
    const dw = pfpImage.width * s;
    const dh = pfpImage.height * s;
    ctx.drawImage(pfpImage, avX - dw / 2, avY - dh / 2, dw, dh);
  } else {
    // Draw gold/dark green gradient silhouette placeholder
    const avGlow = ctx.createRadialGradient(avX, avY, 10, avX, avY, avR);
    avGlow.addColorStop(0, '#2e3a33');
    avGlow.addColorStop(1, '#0c120e');
    ctx.fillStyle = avGlow;
    ctx.fillRect(avX - avR, avY - avR, avR * 2, avR * 2);

    ctx.fillStyle = '#c5a059';
    ctx.beginPath();
    ctx.arc(avX, avY - avR * 0.15, avR * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(avX, avY + avR * 1.05, avR * 0.75, Math.PI, 0, false);
    ctx.fill();
  }
  ctx.restore(); // Remove masking effect

  // Apply an inner shadow overlay to make the profile picture look inset/embedded
  ctx.save();
  ctx.beginPath();
  ctx.arc(avX, avY, avR, 0, Math.PI * 2);
  ctx.closePath();
  const insetShadow = ctx.createRadialGradient(avX, avY, avR * 0.7, avX, avY, avR);
  insetShadow.addColorStop(0, 'rgba(0,0,0,0)');
  insetShadow.addColorStop(0.85, 'rgba(0,0,0,0.4)');
  insetShadow.addColorStop(1, 'rgba(0,0,0,0.85)');
  ctx.fillStyle = insetShadow;
  ctx.fill();
  
  // A crisp, subtle dark rim to separate it cleanly from the gear edge
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.stroke();
  ctx.restore();

  // 3. Draw Player Name (Centered inside nameplate ribbon)
  const name = String(normalizeStyledText(user.first_name || 'PLAYER'));
  ctx.save();
  ctx.fillStyle = '#0c4f3b';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // TIGHTENED MAX-WIDTH TO 380px and implemented ellipsis truncation
  drawFitCenteredText(ctx, name, 614, 503, 380, {
    startSize: 36,
    minSize: 20,
    family: 'Cinzel, "Noto Color Emoji", "Noto Sans KR", "Noto Egyptian", "Noto Tai Tham", "Noto Math", "DejaVu Sans", "Arial Unicode MS", "Segoe UI Symbol", sans-serif',
    weight: 'bold'
  });
  ctx.restore();

  // 4. Draw MOTM Badge Text
  const motm = stats.motm || 0;
  ctx.save();
  ctx.fillStyle = '#e5d3a1'; // Soft cream/champagne color to match small star
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetY = 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  drawFitCenteredText(ctx, `${motm} MOTM`, 629, 555.5, 200, {
    startSize: 18,
    minSize: 12,
    family: 'Montserrat, "DejaVu Sans", Arial, sans-serif',
    weight: '600'
  });
  ctx.restore();

  // 5. DYNAMIC STATS (Beautifully centered inside boxes with elegant margins)
  ctx.save();
  ctx.fillStyle = '#0c4f3b';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = 2;
  ctx.shadowOffsetY = 1;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Calculate career statistics properties
  const battingAverage = stats.dismissals > 0 ? (stats.runs / stats.dismissals).toFixed(2) : '0.00';
  const bowlingAverage = stats.wickets > 0 ? (stats.runs_conceded / stats.wickets).toFixed(2) : '0.00';
  const economy        = stats.balls_bowled > 0 ? ((stats.runs_conceded * 6) / stats.balls_bowled).toFixed(2) : '0.00';
  const bestBowling    = `${stats.best_wickets || 0}/${stats.best_runs_conceded || 0}`;
  const highScore      = stats.highscore > 0 ? `${stats.highscore}*` : '0';
  const overs          = (stats.balls_bowled / 6).toFixed(1);
  const foursSixes     = `${stats.fours || 0}/${stats.sixes || 0}`;
  const fifties100s    = `${stats.fifties || 0}/${stats.centuries || 0}`;
  const hauls3w5w      = `${stats.threew || 0}/${stats.fivew || 0}`;
  const runs           = stats.runs || 0;
  const wickets        = stats.wickets || 0;
  const ducks          = stats.ducks || 0;

  // X Coordinates shifted based on user feedback
  const leftX = 403;      // Moved right further inward
  const rightX = 825;     // Moved left further inward

  const statMaxWidth = 220;
  const statFontSize = 32;

  // TOP LEFT (Batting Module) - Row 2 and 3 lowered
  drawFitCenteredText(ctx, String(runs), leftX, 725, statMaxWidth, { startSize: statFontSize, minSize: 22, family: 'Montserrat, "DejaVu Sans", Arial, sans-serif', weight: 'bold' });
  drawFitCenteredText(ctx, String(highScore), leftX, 839, statMaxWidth, { startSize: statFontSize, minSize: 22, family: 'Montserrat, "DejaVu Sans", Arial, sans-serif', weight: 'bold' });
  drawFitCenteredText(ctx, fifties100s, leftX, 948, statMaxWidth, { startSize: statFontSize, minSize: 22, family: 'Montserrat, "DejaVu Sans", Arial, sans-serif', weight: 'bold' });

  // TOP RIGHT (Bowling Module / Batting Stats) - Row 2 and 3 lowered
  drawFitCenteredText(ctx, String(battingAverage), rightX, 725, statMaxWidth, { startSize: statFontSize, minSize: 22, family: 'Montserrat, "DejaVu Sans", Arial, sans-serif', weight: 'bold' });
  drawFitCenteredText(ctx, foursSixes, rightX, 839, statMaxWidth, { startSize: statFontSize, minSize: 22, family: 'Montserrat, "DejaVu Sans", Arial, sans-serif', weight: 'bold' });
  drawFitCenteredText(ctx, String(ducks), rightX, 948, statMaxWidth, { startSize: statFontSize, minSize: 22, family: 'Montserrat, "DejaVu Sans", Arial, sans-serif', weight: 'bold' });

  // BOTTOM LEFT Column 1 (Wickets, Best Bowling, Bowling Average) - REVERTED Y (no up/down change)
  drawFitCenteredText(ctx, String(wickets), leftX, 1147, statMaxWidth, { startSize: statFontSize, minSize: 22, family: 'Montserrat, "DejaVu Sans", Arial, sans-serif', weight: 'bold' });
  drawFitCenteredText(ctx, String(bestBowling), leftX, 1251, statMaxWidth, { startSize: statFontSize, minSize: 22, family: 'Montserrat, "DejaVu Sans", Arial, sans-serif', weight: 'bold' });
  drawFitCenteredText(ctx, String(bowlingAverage), leftX, 1355, statMaxWidth, { startSize: statFontSize, minSize: 22, family: 'Montserrat, "DejaVu Sans", Arial, sans-serif', weight: 'bold' });

  // BOTTOM RIGHT Column 2 (Economy, 3w/5w, Overs) - REVERTED Y (no up/down change)
  drawFitCenteredText(ctx, String(economy), rightX, 1147, statMaxWidth, { startSize: statFontSize, minSize: 22, family: 'Montserrat, "DejaVu Sans", Arial, sans-serif', weight: 'bold' });
  drawFitCenteredText(ctx, hauls3w5w, rightX, 1251, statMaxWidth, { startSize: statFontSize, minSize: 22, family: 'Montserrat, "DejaVu Sans", Arial, sans-serif', weight: 'bold' });
  drawFitCenteredText(ctx, String(overs), rightX, 1355, statMaxWidth, { startSize: statFontSize, minSize: 22, family: 'Montserrat, "DejaVu Sans", Arial, sans-serif', weight: 'bold' });

  ctx.restore();

  // 7. Render Clean High-Contrast Engraved Footer
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Use deep dark green for perfect contrast against the cream background
  ctx.fillStyle = '#0c4f3b'; 
  
  // Sharp white shadow offset downwards to simulate an engraved/stamped deboss effect
  ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
  ctx.shadowBlur = 1;
  ctx.shadowOffsetY = 1.5;
  
  // Bold, classic font, standard spacing
  ctx.font = 'bold 32px Cinzel, "DejaVu Sans", Arial, sans-serif';
  ctx.fillText('CCG HANDCRICKET', 614.5, 1485);
  
  ctx.restore();

  return canvas.toBuffer('image/png');
}

module.exports = { generateProfileCard, normalizeStyledText };
