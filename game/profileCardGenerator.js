const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');

try { GlobalFonts.loadSystemFonts(); } catch (e) {}

const ASSETS = path.join(__dirname, 'assets');

const unicodeMap = {
  0x1d00: 'A',
  0x299: 'B',
  0x1d04: 'C',
  0x1d05: 'D',
  0x1d07: 'E',
  0xa730: 'F',
  0x262: 'G',
  0x29c: 'H',
  0x26a: 'I',
  0x1d0a: 'J',
  0x1d0b: 'K',
  0x29f: 'L',
  0x1d0d: 'M',
  0x274: 'N',
  0x1d0f: 'O',
  0x1d18: 'P',
  0x280: 'R',
  0xa731: 'S',
  0x1d1b: 'T',
  0x1d1c: 'U',
  0x1d20: 'V',
  0x1d21: 'W',
  0x28f: 'Y',
  0x1d22: 'Z'
};

function normalizeStyledText(text) {
  if (!text) return '';
  return [...String(text)].map((ch) => {
    const codePoint = ch.codePointAt(0);
    if (!codePoint) return ch;
    if (unicodeMap[codePoint]) return unicodeMap[codePoint];
    if (codePoint >= 0x1d400 && codePoint <= 0x1d419) return String.fromCharCode(codePoint - 0x1d400 + 65);
    if (codePoint >= 0x1d41a && codePoint <= 0x1d433) return String.fromCharCode(codePoint - 0x1d41a + 97);
    if (codePoint >= 0xff21 && codePoint <= 0xff3a) return String.fromCharCode(codePoint - 0xff21 + 65);
    if (codePoint >= 0xff41 && codePoint <= 0xff5a) return String.fromCharCode(codePoint - 0xff41 + 97);
    return ch;
  }).join('');
}

function drawText(ctx, text, x, y, fontSpec) {
  if (!text) return;
  const str = String(text);
  const parts = fontSpec.split(/\s+/);
  const fontIndex = parts.findIndex((part) => part.includes('DejaVu') || part.includes('sans-serif'));
  let size = '14px';
  let family = 'DejaVu Sans';
  if (fontIndex !== -1) {
    size = parts.slice(0, fontIndex).join(' ');
    family = parts.slice(fontIndex).join(' ').replace(/['"]/g, '');
  } else {
    size = parts.slice(0, -1).join(' ');
  }

  const primaryFont = `${size} "${family}"`;
  const emojiFont = `${size} "Noto Color Emoji"`;
  const segments = str
    .split(/(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base})/gu)
    .filter((segment) => segment !== '');
  const measured = segments.map((segment) => {
    const isEmoji = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u.test(segment);
    ctx.save();
    ctx.font = isEmoji ? emojiFont : primaryFont;
    const width = ctx.measureText(segment).width;
    ctx.restore();
    return { segment, isEmoji, width };
  });

  const totalWidth = measured.reduce((sum, part) => sum + part.width, 0);
  const alignment = ctx.textAlign || 'left';
  let cursorX = x;
  if (alignment === 'center') cursorX = x - totalWidth / 2;
  else if (alignment === 'right') cursorX = x - totalWidth;

  const originalAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  for (const part of measured) {
    ctx.save();
    ctx.font = part.isEmoji ? emojiFont : primaryFont;
    ctx.fillText(part.segment, cursorX, y);
    ctx.restore();
    cursorX += part.width;
  }
  ctx.textAlign = originalAlign;
}

function drawSilhouette(ctx, x, y, radius) {
  const glow = ctx.createRadialGradient(x, y - radius * 0.2, radius * 0.1, x, y, radius);
  glow.addColorStop(0, '#2a2520');
  glow.addColorStop(1, '#0d0b09');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#4a443e';
  ctx.beginPath();
  ctx.arc(x, y - radius * 0.18, radius * 0.36, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y + radius * 1, radius * 0.72, Math.PI, 0, false);
  ctx.fill();
}

function drawImageCover(ctx, img, x, y, w, h) {
  if (!img) return;
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.width - sw) / 2;
  const sy = (img.height - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function drawImageContain(ctx, img, x, y, w, h) {
  if (!img) return;
  const scale = Math.min(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function drawChamferedRectPath(ctx, x, y, w, h, cut) {
  const c = Math.max(0, Math.min(cut, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + c, y);
  ctx.lineTo(x + w - c, y);
  ctx.lineTo(x + w, y + c);
  ctx.lineTo(x + w, y + h - c);
  ctx.lineTo(x + w - c, y + h);
  ctx.lineTo(x + c, y + h);
  ctx.lineTo(x, y + h - c);
  ctx.lineTo(x, y + c);
  ctx.closePath();
}

function drawBatIcon(ctx, x, y, color, size = 34) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 4);
  ctx.fillStyle = color;
  ctx.fillRect(-size * 0.06, -size * 0.36, size * 0.12, size * 0.28);
  ctx.fillRect(-size * 0.12, -size * 0.08, size * 0.24, size * 0.48);
  ctx.fillRect(-size * 0.18, size * 0.22, size * 0.36, size * 0.12);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillRect(-size * 0.12, -size * 0.03, size * 0.24, size * 0.04);
  ctx.restore();
}

function drawStumpsIcon(ctx, x, y, color, size = 34) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.8, size * 0.07);
  ctx.beginPath();
  ctx.moveTo(x - size * 0.18, y - size * 0.18);
  ctx.lineTo(x - size * 0.18, y + size * 0.24);
  ctx.moveTo(x, y - size * 0.18);
  ctx.lineTo(x, y + size * 0.24);
  ctx.moveTo(x + size * 0.18, y - size * 0.18);
  ctx.lineTo(x + size * 0.18, y + size * 0.24);
  ctx.stroke();
  ctx.lineWidth = Math.max(1.2, size * 0.045);
  ctx.beginPath();
  ctx.moveTo(x - size * 0.26, y - size * 0.28);
  ctx.lineTo(x + size * 0.26, y - size * 0.28);
  ctx.stroke();
  ctx.restore();
}

function drawTargetIcon(ctx, x, y, color, size = 34) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.6, size * 0.06);
  ctx.beginPath();
  ctx.arc(x, y, size * 0.26, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, size * 0.11, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = Math.max(1.2, size * 0.045);
  ctx.beginPath();
  ctx.moveTo(x - size * 0.34, y);
  ctx.lineTo(x + size * 0.34, y);
  ctx.moveTo(x, y - size * 0.34);
  ctx.lineTo(x, y + size * 0.34);
  ctx.stroke();
  ctx.restore();
}

function drawTrophyIcon(ctx, x, y, color, size = 34) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y - size * 0.1, size * 0.17, Math.PI, 0, false);
  ctx.lineTo(x + size * 0.1, y + size * 0.17);
  ctx.lineTo(x - size * 0.1, y + size * 0.17);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(x - size * 0.11, y + size * 0.17, size * 0.22, size * 0.08);
  ctx.fillRect(x - size * 0.22, y + size * 0.25, size * 0.44, size * 0.08);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.2, size * 0.05);
  ctx.beginPath();
  ctx.arc(x - size * 0.2, y - size * 0.03, size * 0.09, Math.PI / 2, Math.PI * 1.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + size * 0.2, y - size * 0.03, size * 0.09, Math.PI * 1.5, Math.PI / 2);
  ctx.stroke();
  ctx.restore();
}

function drawStarIcon(ctx, x, y, color, size = 34) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const outerAngle = (Math.PI / 2) * 3 + i * (Math.PI * 2 / 5);
    const innerAngle = outerAngle + Math.PI / 5;
    ctx.lineTo(x + Math.cos(outerAngle) * size * 0.24, y + Math.sin(outerAngle) * size * 0.24);
    ctx.lineTo(x + Math.cos(innerAngle) * size * 0.1, y + Math.sin(innerAngle) * size * 0.1);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawCalendarIcon(ctx, x, y, color, size = 34) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.lineWidth = Math.max(1.5, size * 0.07);
  ctx.beginPath();
  ctx.roundRect(x - size * 0.24, y - size * 0.2, size * 0.48, size * 0.42, size * 0.07);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = Math.max(1.2, size * 0.05);
  ctx.beginPath();
  ctx.moveTo(x - size * 0.14, y - size * 0.28);
  ctx.lineTo(x - size * 0.14, y - size * 0.14);
  ctx.moveTo(x + size * 0.14, y - size * 0.28);
  ctx.lineTo(x + size * 0.14, y - size * 0.14);
  ctx.stroke();
  ctx.globalAlpha = 0.45;
  ctx.beginPath();
  ctx.moveTo(x - size * 0.18, y - size * 0.03);
  ctx.lineTo(x + size * 0.18, y - size * 0.03);
  ctx.stroke();
  ctx.restore();
}

function drawBarsIcon(ctx, x, y, color, size = 34) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.95;
  ctx.fillRect(x - size * 0.22, y + size * 0.08, size * 0.1, size * 0.14);
  ctx.fillRect(x - size * 0.06, y - size * 0.02, size * 0.1, size * 0.24);
  ctx.fillRect(x + size * 0.1, y - size * 0.12, size * 0.1, size * 0.34);
  ctx.globalAlpha = 0.28;
  ctx.fillRect(x - size * 0.24, y + size * 0.18, size * 0.48, 1);
  ctx.restore();
}

function drawGaugeIcon(ctx, x, y, color, size = 34) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
  ctx.lineWidth = Math.max(1.5, size * 0.07);
  ctx.beginPath();
  ctx.arc(x, y + size * 0.06, size * 0.26, Math.PI, 0);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = Math.max(1.2, size * 0.05);
  ctx.beginPath();
  ctx.moveTo(x - size * 0.18, y + size * 0.06);
  ctx.lineTo(x + size * 0.15, y + size * 0.06);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.06);
  ctx.lineTo(x + size * 0.18, y - size * 0.1);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y + size * 0.06, size * 0.04, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawNumberBadge(ctx, x, y, size, text, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
  ctx.lineWidth = Math.max(1.4, size * 0.07);
  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;

  let fontSize = size * 0.42;
  if (text.length > 5) fontSize = size * 0.28;
  else if (text.length > 3) fontSize = size * 0.34;

  ctx.font = `bold ${Math.max(8, fontSize)}px "DejaVu Sans"`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(text), x, y + 0.5);
  ctx.restore();
}

let cachedLogoImg = null;
let cachedBgImg = null;

async function getAssets() {
  if (!cachedLogoImg) {
    try { cachedLogoImg = await loadImage(path.join(ASSETS, 'logo.png')); } catch (e) { console.error('Error loading logo.png:', e); }
  }
  if (!cachedBgImg) {
    try { cachedBgImg = await loadImage(path.join(ASSETS, 'stadium_bg.png')); } catch (e) { console.error('Error loading stadium_bg.png:', e); }
  }
  return { logoImg: cachedLogoImg, bgImg: cachedBgImg };
}

function makeLogoTransparent(logoImg) {
  if (!logoImg) return null;
  const tempCanvas = createCanvas(logoImg.width, logoImg.height);
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.drawImage(logoImg, 0, 0);
  
  const imgData = tempCtx.getImageData(0, 0, logoImg.width, logoImg.height);
  const data = imgData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i+1];
    const b = data[i+2];
    // Strip black backgrounds cleanly (r, g, b < 35)
    if (r < 35 && g < 35 && b < 35) {
      data[i+3] = 0;
    }
  }
  
  tempCtx.putImageData(imgData, 0, 0);
  return tempCanvas;
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

function drawDotGridIcon(iconCtx, x, y, color, size = 34) {
  const dot = Math.max(1.8, size * 0.06);
  const gap = Math.max(7, size * 0.24);
  const startX = x - gap;
  const startY = y - gap;
  iconCtx.save();
  iconCtx.fillStyle = color;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      iconCtx.beginPath();
      iconCtx.arc(startX + col * gap, startY + row * gap, dot, 0, Math.PI * 2);
      iconCtx.fill();
    }
  }
  iconCtx.restore();
}

const themes = {
  1: { name: 'gold', color: '#fbbf24', accent: '#f59e0b', glow: 'rgba(251, 191, 36, 0.48)' },
  2: { name: 'cyan', color: '#06b6d4', accent: '#0891b2', glow: 'rgba(6, 182, 212, 0.48)' },
  3: { name: 'red', color: '#ef4444', accent: '#dc2626', glow: 'rgba(239, 68, 68, 0.48)' },
  4: { name: 'purple', color: '#a855f7', accent: '#9333ea', glow: 'rgba(168, 85, 247, 0.48)' },
  5: { name: 'emerald', color: '#10b981', accent: '#059669', glow: 'rgba(16, 185, 129, 0.48)' },
  6: { name: 'teal', color: '#2dd4bf', accent: '#0d9488', glow: 'rgba(45, 212, 191, 0.48)' },
  7: { name: 'pink', color: '#ec4899', accent: '#db2777', glow: 'rgba(236, 72, 153, 0.48)' },
  8: { name: 'silver', color: '#94a3b8', accent: '#64748b', glow: 'rgba(148, 163, 184, 0.48)' },
  9: { name: 'orange', color: '#f97316', accent: '#ea580c', glow: 'rgba(249, 115, 22, 0.48)' },
  10: { name: 'blue', color: '#3b82f6', accent: '#2563eb', glow: 'rgba(59, 130, 246, 0.48)' }
};

async function generateProfileCard(user, stats, avatarBuffer) {
  const canvas = createCanvas(1024, 1448);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const width = 1024;
  const height = 1448;
  const deepBlack = '#050202';

  // Determine active design ID and theme configurations dynamically
  const designId = user.design_id || ((parseInt(user.id) || 0) % 10) + 1;
  const th = themes[designId] || themes[3];

  const accent = th.color;
  const accentBright = th.accent;
  const glowColor = th.glow;
  const panelFill = 'rgba(8, 2, 2, 0.90)';

  const { logoImg, bgImg } = await getAssets();

  ctx.fillStyle = deepBlack;
  ctx.fillRect(0, 0, width, height);

  if (bgImg) {
    drawImageCover(ctx, bgImg, 0, 0, width, height);
  }

  // Linear dark gradient to blend the stadium background smoothly
  const topFade = ctx.createLinearGradient(0, 0, 0, height);
  topFade.addColorStop(0, 'rgba(3, 1, 1, 0.70)');
  topFade.addColorStop(0.34, 'rgba(0, 0, 0, 0.40)');
  topFade.addColorStop(0.78, 'rgba(0, 0, 0, 0.65)');
  topFade.addColorStop(1, 'rgba(0, 0, 0, 0.90)');
  ctx.fillStyle = topFade;
  ctx.fillRect(0, 0, width, height);

  // Theme-colored light halo behind player avatar
  const halo = ctx.createRadialGradient(512, 410, 40, 512, 410, 650);
  halo.addColorStop(0, accent + '2e');
  halo.addColorStop(0.45, accent + '14');
  halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, width, height);

  // Seeded random spark generation for ambient glowing embers matching theme color
  const seedSource = `${user.first_name || ''}|${user.username || ''}|${user.id || ''}`;
  let seed = 0;
  for (const ch of seedSource) {
    seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  }
  function random() {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 0xffffffff;
  }

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 140; i++) {
    const sparkX = 40 + random() * 944;
    const sparkY = 70 + random() * 1250;
    const sparkSize = 0.8 + random() * 2.2;
    ctx.fillStyle = random() > 0.55 ? accentBright + 'c8' : accent + 'b4';
    ctx.beginPath();
    ctx.arc(sparkX, sparkY, sparkSize, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  const x = 32;
  const y = 32;
  const w = width - 64;
  const h = height - 64;
  const r = 28;

  // 1. Semi-transparent dark background for the whole card content area
  ctx.save();
  ctx.fillStyle = 'rgba(5, 2, 2, 0.5)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.restore();

  // 2. Draw the honeycomb patterns on the left and right margins
  ctx.save();
  ctx.strokeStyle = accent + '1e';
  ctx.lineWidth = 1;
  for (let hy = y + 48; hy < y + h - 48; hy += 28) {
    for (const hx of [x + 20, x + 34, x + w - 34, x + w - 20]) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        ctx.lineTo(hx + 8 * Math.cos(angle), hy + 8 * Math.sin(angle));
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.restore();

  // 3. Thick glowing outer rounded rectangle border
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4.5;
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.stroke();
  ctx.restore();

  // 4. Inner thin secondary border
  ctx.save();
  ctx.strokeStyle = accentBright + 'a6';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x + 10, y + 10, w - 20, h - 20, r - 8);
  ctx.stroke();
  ctx.restore();

  // 5. Four Corner L-Brackets (thick highlight)
  ctx.save();
  ctx.strokeStyle = accentBright;
  ctx.lineWidth = 5;
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 12;
  const bracketSize = 54;
  const bracketOffset = 6;
  // Top-left
  ctx.beginPath();
  ctx.moveTo(x + bracketOffset, y + bracketOffset + bracketSize);
  ctx.lineTo(x + bracketOffset, y + bracketOffset);
  ctx.lineTo(x + bracketOffset + bracketSize, y + bracketOffset);
  ctx.stroke();
  // Top-right
  ctx.beginPath();
  ctx.moveTo(x + w - bracketOffset - bracketSize, y + bracketOffset);
  ctx.lineTo(x + w - bracketOffset, y + bracketOffset);
  ctx.lineTo(x + w - bracketOffset, y + bracketOffset + bracketSize);
  ctx.stroke();
  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(x + bracketOffset, y + h - bracketOffset - bracketSize);
  ctx.lineTo(x + bracketOffset, y + h - bracketOffset);
  ctx.lineTo(x + bracketOffset + bracketSize, y + h - bracketOffset);
  ctx.stroke();
  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(x + w - bracketOffset - bracketSize, y + h - bracketOffset);
  ctx.lineTo(x + w - bracketOffset, y + h - bracketOffset);
  ctx.lineTo(x + w - bracketOffset, y + h - bracketOffset - bracketSize);
  ctx.stroke();
  ctx.restore();

  // 6. Center Top and Bottom slanted/trapezoidal caps
  ctx.save();
  ctx.strokeStyle = accentBright;
  ctx.fillStyle = 'rgba(6, 2, 2, 0.95)';
  ctx.lineWidth = 2.4;
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 10;
  const capW = 160;
  const capH = 14;
  // Top center cap
  ctx.beginPath();
  ctx.moveTo(x + w / 2 - capW / 2, y + 4);
  ctx.lineTo(x + w / 2 - capW / 2 + 12, y + 4 + capH);
  ctx.lineTo(x + w / 2 + capW / 2 - 12, y + 4 + capH);
  ctx.lineTo(x + w / 2 + capW / 2, y + 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Bottom center cap
  ctx.beginPath();
  ctx.moveTo(x + w / 2 - capW / 2, y + h - 4);
  ctx.lineTo(x + w / 2 - capW / 2 + 12, y + h - 4 - capH);
  ctx.lineTo(x + w / 2 + capW / 2 - 12, y + h - 4 - capH);
  ctx.lineTo(x + w / 2 + capW / 2, y + h - 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Render the design-specific graphic overlays
  ctx.save();
  if (designId === 1) {
    // Design 1: Centurion Gold (Heavy corner tech brackets)
    ctx.strokeStyle = accent + '73';
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 50, width - 100, height - 100);
    ctx.fillStyle = accentBright;
    ctx.fillRect(50, 50, 24, 4);
    ctx.fillRect(50, 50, 4, 24);
    ctx.fillRect(width - 74, 50, 24, 4);
    ctx.fillRect(width - 54, 50, 4, 24);
  } else if (designId === 2) {
    // Design 2: Cyber Carbon (2D tech circuit lines and glowing matrix nodes)
    ctx.strokeStyle = accent + '1f';
    ctx.lineWidth = 1;
    for (let xGrid = 60; xGrid < width - 50; xGrid += 60) {
      ctx.beginPath();
      ctx.moveTo(xGrid, 60);
      ctx.lineTo(xGrid, height - 60);
      ctx.stroke();
    }
    ctx.fillStyle = accent + '80';
    ctx.beginPath(); ctx.arc(120, 150, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(width - 120, 150, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(120, 600, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(width - 120, 600, 4, 0, Math.PI * 2); ctx.fill();
  } else if (designId === 3) {
    // Design 3: Volcanic Embers (Fiery heated magma streaks)
    const volcanicGrad = ctx.createLinearGradient(0, height, width, 0);
    volcanicGrad.addColorStop(0, accent + '24');
    volcanicGrad.addColorStop(0.5, accentBright + '14');
    volcanicGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = volcanicGrad;
    ctx.fillRect(0, 0, width, height);
  } else if (designId === 4) {
    // Design 4: Carbon Racing (Diagonal carbon-fiber chevrons on sides)
    ctx.save();
    ctx.fillStyle = accent + '10';
    ctx.beginPath();
    ctx.moveTo(32, 200);
    ctx.lineTo(120, 300);
    ctx.lineTo(120, 600);
    ctx.lineTo(32, 700);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(width - 32, 200);
    ctx.lineTo(width - 120, 300);
    ctx.lineTo(width - 120, 600);
    ctx.lineTo(width - 32, 700);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else if (designId === 5) {
    // Design 5: Laser Beams (Intense vertical theme glow lines on left/right edges)
    const laserGlow = ctx.createLinearGradient(32, 0, 150, 0);
    laserGlow.addColorStop(0, accent + '59');
    laserGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = laserGlow;
    ctx.fillRect(32, 32, 120, height - 64);
    
    const laserGlowR = ctx.createLinearGradient(width - 150, 0, width - 32, 0);
    laserGlowR.addColorStop(0, 'rgba(0, 0, 0, 0)');
    laserGlowR.addColorStop(1, accent + '59');
    ctx.fillStyle = laserGlowR;
    ctx.fillRect(width - 152, 32, 120, height - 64);
  } else if (designId === 6) {
    // Design 6: Royal Crest (Heavy corner plates and metallic highlights)
    ctx.strokeStyle = accentBright;
    ctx.lineWidth = 3;
    ctx.strokeRect(48, 48, width - 96, height - 96);
    ctx.fillStyle = accentBright;
    ctx.beginPath();
    ctx.moveTo(48, 48);
    ctx.lineTo(88, 48);
    ctx.lineTo(48, 88);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(width - 48, 48);
    ctx.lineTo(width - 88, 48);
    ctx.lineTo(width - 48, 88);
    ctx.closePath();
    ctx.fill();
  } else if (designId === 7) {
    // Design 7: Stealth Obsidian (Subtle horizontal scanlines)
    ctx.fillStyle = accent + '0c';
    for (let yGrid = 60; yGrid < height - 60; yGrid += 12) {
      ctx.fillRect(32, yGrid, width - 64, 2);
    }
  } else if (designId === 8) {
    // Design 8: Industrial Steel (Metallic corner bolts/rivets and brushed borders)
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.strokeRect(48, 48, width - 96, height - 96);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath(); ctx.arc(60, 60, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(width - 60, 60, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(60, height - 60, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(width - 60, height - 60, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else if (designId === 9) {
    // Design 9: Celestial Nebula (Concentric space orbit rings centered around avatar)
    ctx.save();
    ctx.strokeStyle = accent + '33';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(512, 410, 320, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(512, 410, 440, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } else if (designId === 10) {
    // Design 10: Arena Matrix (Athletic speed chevrons on side borders)
    ctx.save();
    ctx.fillStyle = accent + '1e';
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(48, 100 + i * 80);
      ctx.lineTo(68, 120 + i * 80);
      ctx.lineTo(48, 140 + i * 80);
      ctx.closePath();
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(width - 48, 100 + i * 80);
      ctx.lineTo(width - 68, 120 + i * 80);
      ctx.lineTo(width - 48, 140 + i * 80);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();

  // Centered glassmorphic Championship Crest for CCG logo (keeps official red logo colors)
  const processedLogo = makeLogoTransparent(logoImg);
  if (processedLogo) {
    ctx.save();
    const crestX = 512;
    const crestY = 105;
    const crestRadius = 46;

    // Glowing outer ring in theme accent colors
    ctx.shadowColor = accent;
    ctx.shadowBlur = 24;
    ctx.strokeStyle = accentBright;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(crestX, crestY, crestRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Dark semi-transparent shield fill
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(8, 2, 2, 0.90)';
    ctx.beginPath();
    ctx.arc(crestX, crestY, crestRadius - 1, 0, Math.PI * 2);
    ctx.fill();

    // Inner theme color ring
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(crestX, crestY, crestRadius - 4, 0, Math.PI * 2);
    ctx.stroke();

    // Draw the transparent logo centered with its original branding colors preserved
    ctx.shadowColor = '#f97316';
    ctx.shadowBlur = 12;
    ctx.drawImage(processedLogo, crestX - 32, crestY - 32, 64, 64);
    ctx.restore();
  }

  // Draw the Player Avatar centered below the crest
  const avatarX = 512;
  const avatarY = 410;
  const avatarR = 172;
  const avatarImage = avatarBuffer ? await loadImage(avatarBuffer).catch(() => null) : null;

  ctx.save();
  const avatarGlow = ctx.createRadialGradient(avatarX, avatarY, avatarR - 48, avatarX, avatarY, avatarR + 42);
  avatarGlow.addColorStop(0, accent + '22');
  avatarGlow.addColorStop(0.5, accent + 'cc');
  avatarGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = avatarGlow;
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarR + 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 10;
  ctx.shadowColor = accent + 'd9';
  ctx.shadowBlur = 30;
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarR + 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.36)';
  ctx.lineWidth = 2;
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarR - 1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarR - 5, 0, Math.PI * 2);
  ctx.clip();
  if (avatarImage) {
    const scale = Math.max((avatarR * 2) / avatarImage.width, (avatarR * 2) / avatarImage.height);
    const dw = avatarImage.width * scale;
    const dh = avatarImage.height * scale;
    ctx.drawImage(avatarImage, avatarX - dw / 2, avatarY - dh / 2, dw, dh);
  } else {
    drawSilhouette(ctx, avatarX, avatarY, avatarR - 5);
  }
  ctx.restore();

  // Draw Player Nameplate
  const name = normalizeStyledText(user.first_name || 'PLAYER').toUpperCase();
  const handle = `@${(user.username || user.first_name || 'player').toLowerCase().replace(/\s+/g, '_').slice(0, 22)}`;

  const nameplateX = 164;
  const nameplateY = 670;
  const nameplateW = 696;
  const nameplateH = 110;

  ctx.save();
  drawRibbonPath(ctx, nameplateX, nameplateY, nameplateW, nameplateH);
  ctx.fillStyle = panelFill;
  ctx.fill();
  const nameBorder = ctx.createLinearGradient(nameplateX, nameplateY, nameplateX + nameplateW, nameplateY + nameplateH);
  nameBorder.addColorStop(0, accentBright);
  nameBorder.addColorStop(0.5, accent);
  nameBorder.addColorStop(1, accentBright);
  ctx.strokeStyle = nameBorder;
  ctx.lineWidth = 2.4;
  ctx.stroke();
  ctx.fillStyle = accent + '2e';
  ctx.fillRect(nameplateX + 18, nameplateY + 18, nameplateW - 36, 3);
  ctx.fillRect(nameplateX + 18, nameplateY + nameplateH - 22, nameplateW - 36, 3);
  ctx.fillStyle = accent + 'b8';
  ctx.fillRect(nameplateX + 18, nameplateY + 18, 8, 32);
  ctx.fillRect(nameplateX + nameplateW - 26, nameplateY + 18, 8, 32);
  ctx.restore();

  let nameSize = 60;
  ctx.font = `italic bold ${nameSize}px "DejaVu Sans"`;
  while (nameSize > 34 && ctx.measureText(name).width > nameplateW - 100) {
    nameSize -= 2;
    ctx.font = `italic bold ${nameSize}px "DejaVu Sans"`;
  }

  ctx.save();
  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = accent + '8c';
  ctx.shadowBlur = 8;
  ctx.font = `italic bold ${nameSize}px "DejaVu Sans"`;
  ctx.fillText(name, avatarX, nameplateY + 38);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = accentBright;
  ctx.font = 'bold 24px "DejaVu Sans"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(handle, avatarX, nameplateY + 76);
  ctx.restore();

  // Statistics data formatting
  const matches = (stats.wins || 0) + (stats.losses || 0);
  const battingAverage = stats.dismissals > 0 ? (stats.runs / stats.dismissals).toFixed(1) : '0.0';
  const strikeRate = stats.balls_faced > 0 ? ((stats.runs / stats.balls_faced) * 100).toFixed(1) : '0.0';
  const bowlingAverage = stats.wickets > 0 ? (stats.runs_conceded / stats.wickets).toFixed(1) : '0.0';
  const economy = stats.balls_bowled > 0 ? ((stats.runs_conceded * 6) / stats.balls_bowled).toFixed(1) : '0.0';
  const bestBowling = `${stats.best_wickets || 0}/${stats.best_runs_conceded || 0}`;
  const highScore = stats.highscore > 0 ? `${stats.highscore}*` : '0';

  const battingItems = [
    { label: 'Matches', value: matches, icon: drawCalendarIcon },
    { label: 'Runs', value: (stats.runs || 0).toLocaleString(), icon: drawBatIcon },
    { label: 'Average', value: battingAverage, icon: drawBarsIcon },
    { label: 'Strike Rate', value: strikeRate, icon: drawGaugeIcon },
    { label: 'Highest Score', value: highScore, icon: drawStarIcon },
    { label: '50s', value: stats.fifties || 0, icon: (iconCtx, xB, yB, color, size) => drawNumberBadge(iconCtx, xB, yB, size, '50', color) }
  ];

  const bowlingItems = [
    { label: 'Wickets', value: stats.wickets || 0, icon: drawStumpsIcon },
    { label: 'Economy', value: economy, icon: drawGaugeIcon },
    { label: 'Average', value: bowlingAverage, icon: drawBarsIcon },
    { label: 'Best Bowling', value: bestBowling, icon: drawTargetIcon },
    { label: '100s', value: stats.centuries || 0, icon: (iconCtx, xB, yB, color, size) => drawNumberBadge(iconCtx, xB, yB, size, '100', color) },
    { label: 'MOTMs', value: stats.motm || 0, icon: drawTrophyIcon }
  ];

  // Draw a beautiful stats panel
  function drawStatPanel(panelX, panelY, panelW, panelH, title, items) {
    ctx.save();
    // Rounded rectangle border for the panel
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 16);
    ctx.fillStyle = panelFill;
    ctx.fill();

    const border = ctx.createLinearGradient(panelX, panelY, panelX + panelW, panelY + panelH);
    border.addColorStop(0, accentBright);
    border.addColorStop(0.45, accent);
    border.addColorStop(1, accentBright);
    ctx.strokeStyle = border;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    const overlay = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
    overlay.addColorStop(0, accent + '14');
    overlay.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = overlay;
    ctx.fill();

    // Panel Title inside the border at top-left
    ctx.fillStyle = accentBright;
    ctx.font = 'bold 16px "DejaVu Sans"';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(title.toUpperCase(), panelX + 20, panelY + 24);

    // Divider line below title
    ctx.strokeStyle = accent + '38';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(panelX + 20, panelY + 40);
    ctx.lineTo(panelX + panelW - 20, panelY + 40);
    ctx.stroke();
    ctx.restore();

    // Box dimensions
    const colW = 274;
    const colGap = 17;
    const colMargin = 16;

    const rowH = 106;
    const rowGap = 12;
    const rowMargin = 52; // start after title/divider

    items.forEach((item, index) => {
      const row = Math.floor(index / 3);
      const col = index % 3;
      const colX = panelX + colMargin + col * (colW + colGap);
      const colY = panelY + rowMargin + row * (rowH + rowGap);
      
      // Draw metric box
      ctx.save();
      drawChamferedRectPath(ctx, colX, colY, colW, rowH, 8);
      ctx.fillStyle = 'rgba(10, 4, 4, 0.82)';
      ctx.fill();
      ctx.strokeStyle = accent + '5b';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();

      // Icon on the left
      const iconSize = 34;
      const iconX = colX + 24;
      const iconY = colY + rowH / 2;
      if (item.icon) {
        item.icon(ctx, iconX, iconY, accent, iconSize);
      }

      // Label at the top-left of the box
      ctx.save();
      ctx.fillStyle = accentBright + 'd9';
      let labelSize = 13;
      ctx.font = `bold ${labelSize}px "DejaVu Sans"`;
      const maxLabelW = colW - 68;
      while (labelSize > 9 && ctx.measureText(item.label.toUpperCase()).width > maxLabelW) {
        labelSize -= 1;
        ctx.font = `bold ${labelSize}px "DejaVu Sans"`;
      }
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(item.label.toUpperCase(), colX + 52, colY + 18);
      ctx.restore();

      // Value at the bottom-right
      const valueStr = String(item.value);
      ctx.save();
      ctx.fillStyle = '#ffffff';
      let valueSize = 32;
      if (valueStr.length > 8) valueSize = 20;
      else if (valueStr.length > 5) valueSize = 24;
      ctx.font = `italic bold ${valueSize}px "DejaVu Sans"`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.shadowColor = accent + '7a';
      ctx.shadowBlur = 8;
      ctx.fillText(valueStr, colX + colW - 22, colY + rowH - 16);
      ctx.restore();
    });
  }

  drawStatPanel(68, 788, 888, 292, 'BATTING RECORD', battingItems);
  drawStatPanel(68, 1098, 888, 292, 'BOWLING RECORD', bowlingItems);

  // Footer Credit
  ctx.save();
  ctx.fillStyle = accent + 'cc';
  ctx.font = 'bold 12px "DejaVu Sans"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CRICKET CHAMPIONS LEAGUE • CHAMPION CARD', width / 2, 1416);
  ctx.restore();

  return canvas.toBuffer('image/png');
}

module.exports = { generateProfileCard, normalizeStyledText };
