const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');

try {
  GlobalFonts.loadSystemFonts();
} catch (e) {
  console.error("Failed to load system fonts in profile generator:", e);
}

const themes = [
  {
    name: 'red',
    themeColor: '#ef4444',
    secondaryColor: '#f97316',
    borderBaseColor: '#1e293b',
    glowColorRadial: 'rgba(239, 68, 68, 0.12)',
    editionName: 'REDLINE SPORT EDITION'
  },
  {
    name: 'blue',
    themeColor: '#38bdf8',
    secondaryColor: '#8b5cf6',
    borderBaseColor: '#0f172a',
    glowColorRadial: 'rgba(56, 189, 248, 0.12)',
    editionName: 'SAPPHIRE STRIKE EDITION'
  },
  {
    name: 'green',
    themeColor: '#22c55e',
    secondaryColor: '#06b6d4',
    borderBaseColor: '#062f17',
    glowColorRadial: 'rgba(34, 197, 94, 0.12)',
    editionName: 'TOXIC HAZARD EDITION'
  },
  {
    name: 'purple',
    themeColor: '#a855f7',
    secondaryColor: '#ec4899',
    borderBaseColor: '#1e1b4b',
    glowColorRadial: 'rgba(168, 85, 247, 0.12)',
    editionName: 'NEON HELIX EDITION'
  },
  {
    name: 'gold',
    themeColor: '#fbbf24',
    secondaryColor: '#dc2626',
    borderBaseColor: '#1c1917',
    glowColorRadial: 'rgba(251, 191, 36, 0.12)',
    editionName: 'CENTURION GOLD EDITION'
  },
  {
    name: 'cyan',
    themeColor: '#06b6d4',
    secondaryColor: '#4f46e5',
    borderBaseColor: '#083344',
    glowColorRadial: 'rgba(6, 182, 212, 0.12)',
    editionName: 'GLACIER PEAK EDITION'
  },
  {
    name: 'pink',
    themeColor: '#ec4899',
    secondaryColor: '#38bdf8',
    borderBaseColor: '#31102f',
    glowColorRadial: 'rgba(236, 72, 153, 0.12)',
    editionName: 'ROSE COPPER EDITION'
  }
];

const unicodeMap = {
  // Small Caps
  0x1d00: 'A', 0x299: 'B', 0x1d04: 'C', 0x1d05: 'D', 0x1d07: 'E', 0xa730: 'F',
  0x262: 'G', 0x29c: 'H', 0x26a: 'I', 0x1d0a: 'J', 0x1d0b: 'K', 0x29f: 'L',
  0x1d0d: 'M', 0x274: 'N', 0x1d0f: 'O', 0x1d18: 'P', 0x280: 'R', 0xa731: 'S',
  0x1d1b: 'T', 0x1d1c: 'U', 0x1d20: 'V', 0x1d21: 'W', 0x28f: 'Y', 0x1d22: 'Z',
  // Lowercase Superscripts
  0x1d43: 'a', 0x1d47: 'b', 0x1d9c: 'c', 0x1d48: 'd', 0x1d49: 'e', 0x1da0: 'f',
  0x1d4d: 'g', 0x02b0: 'h', 0x2071: 'i', 0x02b2: 'j', 0x1d4f: 'k', 0x02e1: 'l',
  0x1d50: 'm', 0x207f: 'n', 0x1d52: 'o', 0x1d56: 'p', 0x02b3: 'r', 0x02e2: 's',
  0x1d57: 't', 0x1d58: 'u', 0x1d5b: 'v', 0x02b7: 'w', 0x02e3: 'x', 0x02b8: 'y',
  0x1dbb: 'z',
  // Uppercase Superscripts
  0x1d2c: 'A', 0x1d2e: 'B', 0x1d30: 'D', 0x1d31: 'E', 0x1d33: 'G', 0x1d34: 'H',
  0x1d35: 'I', 0x1d36: 'J', 0x1d37: 'K', 0x1d38: 'L', 0x1d39: 'M', 0x1d3a: 'N',
  0x1d3c: 'O', 0x1d3e: 'P', 0x1d3f: 'R', 0x1d40: 'T', 0x1d41: 'U', 0x2c7d: 'V',
  0x1d42: 'W',
  // Superscript Numbers/Symbols
  0x2070: '0', 0x00b9: '1', 0x00b2: '2', 0x00b3: '3', 0x2074: '4', 0x2075: '5',
  0x2076: '6', 0x2077: '7', 0x2078: '8', 0x2079: '9', 0x207a: '+', 0x207b: '-',
  0x207c: '=', 0x207d: '(', 0x207e: ')',
  // Lowercase Subscripts
  0x2090: 'a', 0x2091: 'e', 0x2095: 'h', 0x1d62: 'i', 0x2c7c: 'j', 0x2096: 'k',
  0x2097: 'l', 0x2098: 'm', 0x2099: 'n', 0x2092: 'o', 0x209a: 'p', 0x1d63: 'r',
  0x209b: 's', 0x209c: 't', 0x1d64: 'u', 0x1d65: 'v', 0x2093: 'x',
  // Subscript Numbers/Symbols
  0x2080: '0', 0x2081: '1', 0x2082: '2', 0x2083: '3', 0x2084: '4', 0x2085: '5',
  0x2086: '6', 0x2087: '7', 0x2088: '8', 0x2089: '9', 0x208a: '+', 0x208b: '-',
  0x208c: '=', 0x208d: '(', 0x208e: ')',
  // BMP Script/Fraktur/Double-struck Exceptions
  0x212c: 'B', 0x2130: 'E', 0x2131: 'F', 0x210b: 'H', 0x2110: 'I', 0x2112: 'L',
  0x2133: 'M', 0x211b: 'R', 0x210a: 'g', 0x2134: 'o', 0x212f: 'e', 0x2113: 'l',
  0x2102: 'C', 0x210d: 'H', 0x2115: 'N', 0x2119: 'P', 0x211a: 'Q', 0x211d: 'R',
  0x2124: 'Z'
};

function normalizeStyledText(str) {
  if (!str) return '';
  return [...str].map(char => {
    const cp = char.codePointAt(0);
    if (!cp) return char;
    if (unicodeMap[cp]) return unicodeMap[cp];

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

    return char;
  }).join('');
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
    const familyPart = fontParts.slice(familyIndex).join(' ').replace(/['"]/g, '');
    if (familyPart) primaryFamily = familyPart;
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

// ─── Icon Drawers ──────────────────────────────────────────────────────────

function iconCalendar(ctx, x, y, c) {
  ctx.save(); ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = 1.5;
  ctx.strokeRect(x-9, y-9, 18, 17);
  ctx.fillRect(x-5, y-13, 3, 6); ctx.fillRect(x+2, y-13, 3, 6);
  ctx.beginPath(); ctx.moveTo(x-9, y-3); ctx.lineTo(x+9, y-3); ctx.stroke();
  ctx.restore();
}
function iconBat(ctx, x, y, c) {
  ctx.save(); ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = 1.8;
  ctx.save(); ctx.translate(x, y); ctx.rotate(-Math.PI/4);
  ctx.fillRect(-2, -14, 4, 6); 
  ctx.beginPath(); ctx.moveTo(-4,-8); ctx.lineTo(4,-8); ctx.lineTo(5,8); ctx.quadraticCurveTo(0,12,-5,8); ctx.closePath(); ctx.fill();
  ctx.restore(); ctx.restore();
}
function iconChart(ctx, x, y, c) {
  ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.moveTo(x-9, y+7); ctx.lineTo(x-3, y-2); ctx.lineTo(x+2, y+3); ctx.lineTo(x+9, y-7); ctx.stroke();
  ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x+9, y-7, 2.5, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}
function iconSpeedometer(ctx, x, y, c) {
  ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.arc(x, y+2, 9, Math.PI, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y+2); ctx.lineTo(x+6, y-5); ctx.stroke();
  ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y+2, 2, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}
function iconWickets(ctx, x, y, c) {
  ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x-6,y-8); ctx.lineTo(x-6,y+8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x,y-8); ctx.lineTo(x,y+8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x+6,y-8); ctx.lineTo(x+6,y+8); ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x-8,y-9); ctx.lineTo(x-1,y-9); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x+1,y-9); ctx.lineTo(x+8,y-9); ctx.stroke();
  ctx.restore();
}
function iconTarget(ctx, x, y, c) {
  ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI*2); ctx.stroke();
  ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}
function iconStar(ctx, x, y, c) {
  ctx.save(); ctx.fillStyle = c;
  ctx.beginPath();
  for (let i=0; i<5; i++) {
    const a1 = (Math.PI/2)*3 + i*(Math.PI*2/5);
    const a2 = a1 + Math.PI/5;
    if (i===0) ctx.moveTo(x+Math.cos(a1)*9, y+Math.sin(a1)*9);
    else ctx.lineTo(x+Math.cos(a1)*9, y+Math.sin(a1)*9);
    ctx.lineTo(x+Math.cos(a2)*4, y+Math.sin(a2)*4);
  }
  ctx.closePath(); ctx.fill(); ctx.restore();
}
function iconCircle50(ctx, x, y, c) {
  ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI*2); ctx.stroke();
  ctx.fillStyle = c; ctx.font = 'bold 8px "DejaVu Sans"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('50', x, y+0.5); ctx.restore();
}
function iconCircle100(ctx, x, y, c) {
  ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI*2); ctx.stroke();
  ctx.fillStyle = c; ctx.font = 'bold 7px "DejaVu Sans"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('100', x, y+0.5); ctx.restore();
}
function iconMedal(ctx, x, y, c) {
  ctx.save(); ctx.fillStyle = c;
  ctx.beginPath(); ctx.arc(x, y+3, 7, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#0a0a0a';
  ctx.beginPath(); ctx.arc(x, y+3, 4, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = c;
  ctx.beginPath(); ctx.moveTo(x-4, y-4); ctx.lineTo(x, y+0); ctx.lineTo(x+4, y-4); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// ─── Stadium Background ────────────────────────────────────────────────────

function drawStadiumBg(ctx, theme) {
  const W = 600, H = 1000;
  const tc = theme.themeColor;

  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, H*0.55);
  sky.addColorStop(0, '#060408');
  sky.addColorStop(0.5, '#0d0810');
  sky.addColorStop(1, '#180d05');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

  // Ground glow
  const ground = ctx.createLinearGradient(0, H*0.45, 0, H);
  ground.addColorStop(0, '#0a0600');
  ground.addColorStop(0.4, '#130900');
  ground.addColorStop(1, '#050300');
  ctx.fillStyle = ground; ctx.fillRect(0, H*0.45, W, H*0.55);

  // Turf lines
  ctx.save(); ctx.globalAlpha = 0.05;
  ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const yy = H*0.55 + i*30;
    const fade = 1 - i/10;
    ctx.globalAlpha = 0.04 * fade;
    ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W, yy); ctx.stroke();
  }
  ctx.restore();

  // Perspective pitch lines from center
  ctx.save(); ctx.globalAlpha = 0.07; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
  const hor = H * 0.52, cx = W/2;
  for (let dx = -200; dx <= 200; dx += 50) {
    ctx.beginPath(); ctx.moveTo(cx+dx*0.15, hor); ctx.lineTo(cx+dx, H); ctx.stroke();
  }
  ctx.restore();

  // Crowd glow banks (left + right stadium lights)
  const lightPositions = [[80, 120], [520, 120], [30, 200], [570, 200]];
  for (const [lx, ly] of lightPositions) {
    const r = ctx.createRadialGradient(lx, ly, 5, lx, ly, 120);
    r.addColorStop(0, 'rgba(255,200,80,0.22)');
    r.addColorStop(0.4, 'rgba(255,140,20,0.07)');
    r.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
  }

  // Ember / spark particles
  ctx.save();
  const embers = [
    [120,280,2],[200,150,1.5],[80,400,2],[160,320,1],[480,200,2.5],
    [530,300,1.5],[440,160,2],[350,120,1],[250,350,1.5],[500,380,1.8],
    [70,480,1.2],[560,450,2],[130,180,1.8],[490,140,1.5],[320,90,1]
  ];
  for (const [ex, ey, er] of embers) {
    const rg = ctx.createRadialGradient(ex, ey, 0, ex, ey, er*3);
    rg.addColorStop(0, tc);
    rg.addColorStop(0.5, tc+'88');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(ex, ey, er*3, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(ex, ey, er*0.6, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();

  // Theme color bottom pulse
  const pulse = ctx.createRadialGradient(W/2, H, 0, W/2, H, 350);
  pulse.addColorStop(0, tc+'25');
  pulse.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = pulse; ctx.fillRect(0, 0, W, H);
}

// ─── CCG Logo ──────────────────────────────────────────────────────────────

function drawCCGLogo(ctx, x, y, theme) {
  ctx.save();
  // Background hexagon-ish badge
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.strokeStyle = theme.themeColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y-32); ctx.lineTo(x+28, y-18); ctx.lineTo(x+28, y+10);
  ctx.lineTo(x, y+24); ctx.lineTo(x-28, y+10); ctx.lineTo(x-28, y-18);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // Flame icon
  ctx.fillStyle = theme.themeColor;
  ctx.shadowColor = theme.themeColor; ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(x-6, y-5); ctx.bezierCurveTo(x-8, y-14, x, y-20, x+1, y-12);
  ctx.bezierCurveTo(x+5, y-18, x+4, y-10, x+6, y-5);
  ctx.bezierCurveTo(x+9, y+2, x+4, y+8, x, y+6);
  ctx.bezierCurveTo(x-4, y+8, x-9, y+2, x-6, y-5);
  ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;

  // "CCG" text
  ctx.fillStyle = theme.themeColor;
  ctx.font = 'bold 10px "DejaVu Sans"'; ctx.textAlign = 'center';
  ctx.fillText('CCG', x, y+21);
  ctx.restore();
}

// ─── Card Frame ────────────────────────────────────────────────────────────

function drawCardFrame(ctx, theme) {
  const x=20, y=20, w=560, h=960, r=18, tc=theme.themeColor, sc=theme.secondaryColor;

  // Outer glow
  ctx.save();
  ctx.shadowColor = tc; ctx.shadowBlur = 28;
  ctx.strokeStyle = tc; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.stroke();
  ctx.shadowBlur = 0; ctx.restore();

  // Inner second track
  ctx.save();
  ctx.shadowColor = sc; ctx.shadowBlur = 10;
  ctx.strokeStyle = sc; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(x+8, y+8, w-16, h-16, r-4); ctx.stroke();
  ctx.shadowBlur = 0; ctx.restore();

  // Corner notches
  const corners = [[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]];
  ctx.save(); ctx.strokeStyle = tc; ctx.lineWidth = 3; ctx.shadowColor = tc; ctx.shadowBlur = 12;
  for (const [cx2,cy2,dx,dy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx2+dx*5, cy2); ctx.lineTo(cx2+dx*32, cy2);
    ctx.moveTo(cx2, cy2+dy*5); ctx.lineTo(cx2, cy2+dy*32);
    ctx.stroke();
  }
  ctx.restore();
}

// ─── Stat Panel ────────────────────────────────────────────────────────────

function drawStatPanel(ctx, title, items, panelX, panelY, panelW, panelH, theme) {
  const tc = theme.themeColor;
  ctx.save();

  // Panel bg
  ctx.fillStyle = 'rgba(5,3,2,0.88)';
  ctx.strokeStyle = tc+'aa';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(panelX, panelY, panelW, panelH, 6); ctx.fill(); ctx.stroke();

  // Title bar
  const titleGrad = ctx.createLinearGradient(panelX, panelY, panelX+panelW, panelY);
  titleGrad.addColorStop(0, tc+'00');
  titleGrad.addColorStop(0.3, tc+'44');
  titleGrad.addColorStop(0.7, tc+'44');
  titleGrad.addColorStop(1, tc+'00');
  ctx.fillStyle = titleGrad;
  ctx.fillRect(panelX+2, panelY+2, panelW-4, 22);

  ctx.fillStyle = tc;
  ctx.font = 'bold 9.5px "DejaVu Sans"'; ctx.textAlign = 'center';
  ctx.fillText(title, panelX + panelW/2, panelY + 16);

  // Items
  const cols = items.length;
  const colW = panelW / cols;
  items.forEach((item, i) => {
    const cx2 = panelX + colW*i + colW/2;
    const iy = panelY + 34;

    // Icon
    item.icon(ctx, cx2, iy + 10, tc);

    // Label
    ctx.fillStyle = '#aaa'; ctx.font = 'bold 8px "DejaVu Sans"'; ctx.textAlign = 'center';
    ctx.fillText(item.label, cx2, iy + 28);

    // Value
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 17px "DejaVu Sans"'; ctx.textAlign = 'center';
    ctx.shadowColor = tc; ctx.shadowBlur = 6;
    ctx.fillText(String(item.val), cx2, iy + 48);
    ctx.shadowBlur = 0;

    // Divider
    if (i < cols-1) {
      ctx.strokeStyle = tc+'55'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(panelX+colW*(i+1), panelY+28);
      ctx.lineTo(panelX+colW*(i+1), panelY+panelH-8);
      ctx.stroke();
    }
  });

  ctx.restore();
}

// ─── Main Generator ────────────────────────────────────────────────────────

async function generateProfileCard(user, stats, avatarBuffer) {
  const width = 800, height = 1000;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Black outer fill
  ctx.fillStyle = '#020101'; ctx.fillRect(0, 0, width, height);

  // Translate to center 600px card
  ctx.save(); ctx.translate(100, 0);

  const themeName = user.card_theme || 'red';
  let theme = themes.find(t => t.name === themeName) || themes[0];
  if (!user.card_theme && user.id) {
    theme = themes[(parseInt(user.id)||0) % themes.length];
  }

  const tc = theme.themeColor;
  const sc = theme.secondaryColor;

  // ── 1. Stadium Background
  drawStadiumBg(ctx, theme);

  // ── 2. Card frame
  drawCardFrame(ctx, theme);

  // ── 3. CCG Logo (top-left)
  drawCCGLogo(ctx, 60, 68, theme);

  // ── 4. Season badge (top-right)
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.strokeStyle = tc; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(390, 45, 170, 34, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 13px "DejaVu Sans"'; ctx.textAlign = 'left';
  ctx.fillText('SEASON 3', 408, 67);
  ctx.fillStyle = tc; ctx.font = 'bold 13px "DejaVu Sans"';
  ctx.fillText('  ///', 480, 67);
  ctx.restore();

  // ── 5. Avatar with glowing ring
  const avX = 300, avY = 270, avR = 90;

  // Outer wide glow ring
  ctx.save();
  for (let i = 3; i >= 1; i--) {
    ctx.strokeStyle = tc + (i===3?'30': i===2?'60':'bb');
    ctx.lineWidth = i * 6;
    ctx.shadowColor = tc; ctx.shadowBlur = 20*i;
    ctx.beginPath(); ctx.arc(avX, avY, avR + 10 + i*5, 0, Math.PI*2); ctx.stroke();
  }
  // Crisp bright ring
  ctx.strokeStyle = tc; ctx.lineWidth = 3; ctx.shadowColor = tc; ctx.shadowBlur = 25;
  ctx.beginPath(); ctx.arc(avX, avY, avR+10, 0, Math.PI*2); ctx.stroke();
  // White core
  ctx.strokeStyle = '#ffffff88'; ctx.lineWidth = 1; ctx.shadowBlur = 0;
  ctx.beginPath(); ctx.arc(avX, avY, avR+10, 0, Math.PI*2); ctx.stroke();
  ctx.restore();

  // Spark orbits
  ctx.save();
  const sparkAngles = [0.3, 1.1, 1.9, 3.0, 4.2, 5.1];
  for (const ang of sparkAngles) {
    const sx = avX + Math.cos(ang) * (avR+22);
    const sy = avY + Math.sin(ang) * (avR+22);
    const rg = ctx.createRadialGradient(sx,sy,0,sx,sy,6);
    rg.addColorStop(0,'#ffffff');
    rg.addColorStop(0.3, tc);
    rg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(sx,sy,6,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();

  // Load and draw avatar
  let loadedImg = null;
  if (avatarBuffer) {
    try { loadedImg = await loadImage(avatarBuffer); } catch(e) {}
  }
  ctx.save();
  ctx.beginPath(); ctx.arc(avX, avY, avR, 0, Math.PI*2); ctx.clip();
  if (loadedImg) {
    ctx.drawImage(loadedImg, avX-avR, avY-avR, avR*2, avR*2);
  } else {
    drawSilhouette(ctx, avX, avY, avR);
  }
  ctx.restore();

  // ── 6. Nameplate
  const name = normalizeStyledText(user.first_name || 'PLAYER').toUpperCase();
  const handle = `@${(user.username || user.first_name || 'player').toLowerCase().replace(/\s+/g,'_')}`;

  // Measure name for adaptive font
  let fs = 34;
  ctx.font = `bold italic ${fs}px "DejaVu Sans"`;
  while (fs > 16 && ctx.measureText(name).width > 400) {
    fs--;
    ctx.font = `bold italic ${fs}px "DejaVu Sans"`;
  }

  const npY = avY + avR + 28;
  const npH = 68;
  const npX = 70, npW = 460;

  ctx.save();
  // Dark bg
  ctx.fillStyle = 'rgba(4,2,1,0.92)';
  ctx.strokeStyle = tc; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(npX+16, npY); ctx.lineTo(npX+npW-16, npY);
  ctx.lineTo(npX+npW, npY+16); ctx.lineTo(npX+npW, npY+npH-8);
  ctx.lineTo(npX+npW-8, npY+npH); ctx.lineTo(npX+8, npY+npH);
  ctx.lineTo(npX, npY+npH-8); ctx.lineTo(npX, npY+16);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // Accent slashes left
  ctx.fillStyle = tc; ctx.font = 'bold 14px "DejaVu Sans"'; ctx.textAlign = 'left';
  ctx.globalAlpha = 0.9;
  ctx.fillText('///  ', npX+12, npY+npH/2+6);
  // Accent slashes right
  ctx.textAlign = 'right';
  ctx.fillText('  ///', npX+npW-12, npY+npH/2+6);
  ctx.globalAlpha = 1;

  // Name
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold italic ${fs}px "DejaVu Sans"`;
  ctx.textAlign = 'center'; ctx.shadowColor = tc; ctx.shadowBlur = 8;
  drawTextWithEmojis(ctx, name, 300, npY+38, `bold italic ${fs}px "DejaVu Sans"`);
  ctx.shadowBlur = 0;

  // Handle
  ctx.fillStyle = tc; ctx.font = '12px "DejaVu Sans"'; ctx.textAlign = 'center';
  ctx.fillText(handle, 300, npY+56);
  ctx.restore();

  // ── 7. Stat panels
  const avgStr = stats.dismissals>0 ? (stats.runs/stats.dismissals).toFixed(1) : (stats.runs>0?`${stats.runs}*`:'0.0');
  const srStr  = stats.balls_faced>0 ? ((stats.runs/stats.balls_faced)*100).toFixed(1) : '0.0';
  const econ   = stats.balls_bowled>0 ? ((stats.runs_conceded*6)/stats.balls_bowled).toFixed(1) : '0.0';
  const bAvg   = stats.wickets>0 ? (stats.runs_conceded/stats.wickets).toFixed(1) : '0.0';
  const bestBowl = `${stats.best_wickets||0}/${stats.best_runs_conceded||0}`;
  const matches= (stats.wins||0)+(stats.losses||0);
  const totalInnings = stats.batting_innings || matches || 0;

  const panelX = 40, panelW = 520;
  const p1Y = npY + npH + 18;

  drawStatPanel(ctx, 'BATTING STATS', [
    { label:'MATCHES',     val: matches,          icon: iconCalendar },
    { label:'RUNS',        val: stats.runs||0,    icon: iconBat },
    { label:'AVERAGE',     val: avgStr,            icon: iconChart },
    { label:'STRIKE RATE', val: srStr,             icon: iconSpeedometer },
  ], panelX, p1Y, panelW, 90, theme);

  const p2Y = p1Y + 100;
  drawStatPanel(ctx, 'BOWLING STATS', [
    { label:'WICKETS',     val: stats.wickets||0, icon: iconWickets },
    { label:'ECONOMY',     val: econ,              icon: iconSpeedometer },
    { label:'AVERAGE',     val: bAvg,              icon: iconChart },
    { label:'BEST BOWLING',val: bestBowl,          icon: iconTarget },
  ], panelX, p2Y, panelW, 90, theme);

  const p3Y = p2Y + 100;
  drawStatPanel(ctx, '', [
    { label:'HIGHEST SCORE', val: stats.highscore>0 ? `${stats.highscore}*` : '0',  icon: iconStar },
    { label:'50s',           val: stats.fifties||0,   icon: iconCircle50 },
    { label:'100s',          val: stats.centuries||0, icon: iconCircle100 },
    { label:'MOTM',          val: stats.motm||0,      icon: iconMedal },
  ], panelX, p3Y, panelW, 90, theme);

  // ── 8. Bottom brand text
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.font = 'bold 9px "DejaVu Sans"'; ctx.textAlign = 'center';
  ctx.fillText('CCG · HANDCRICKET PRO COLLECTIBLE CARD', 300, 960);
  ctx.restore();

  ctx.restore(); // translate
  return canvas.toBuffer('image/png');
}

function drawSilhouette(ctx, x, y, radius) {
  ctx.fillStyle = '#1e1b18';
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#4a443e';
  ctx.beginPath(); ctx.arc(x, y-radius*0.15, radius*0.38, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x, y+radius*1.05, radius*0.75, Math.PI, 0, false); ctx.fill();
}

function drawVectorStar(ctx, cx, cy, spikes, outerRadius, innerRadius, color) {
  let rot = (Math.PI/2)*3; ctx.save(); ctx.beginPath();
  ctx.moveTo(cx, cy-outerRadius);
  for (let i=0; i<spikes; i++) {
    ctx.lineTo(cx+Math.cos(rot)*outerRadius, cy+Math.sin(rot)*outerRadius); rot += Math.PI/spikes;
    ctx.lineTo(cx+Math.cos(rot)*innerRadius, cy+Math.sin(rot)*innerRadius); rot += Math.PI/spikes;
  }
  ctx.closePath(); ctx.fillStyle = color||'#fbbf24'; ctx.fill(); ctx.restore();
}

module.exports = { generateProfileCard, normalizeStyledText };
