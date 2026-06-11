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

async function generateProfileCard(user, stats, avatarBuffer) {
  const width = 800;
  const height = 1000;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Fill entire 800x1000 canvas with the dark matte background
  ctx.fillStyle = '#050507';
  ctx.fillRect(0, 0, width, height);

  // Translate 100px horizontally to center the 600px wide card
  ctx.save();
  ctx.translate(100, 0);

  // Card boundary dimensions (relative to the 600px card width)
  const cardX = 35;
  const cardY = 35;
  const cardW = 530;
  const cardH = 930;

  const avX = 300;
  const avY = 210;
  const avRadius = 65;

  // Select theme dynamically
  const themeName = user.card_theme || 'red';
  let theme = themes.find(t => t.name === themeName) || themes[0];
  if (!user.card_theme && user.id) {
    const themeIndex = (parseInt(user.id) || 0) % themes.length;
    theme = themes[themeIndex];
  }

  // 1. Theme-specific background texture pattern
  drawBackgroundTexture(ctx, theme.name);

  // Background radial core glow
  ctx.save();
  const glow = ctx.createRadialGradient(avX, avY, 10, avX, avY, 340);
  glow.addColorStop(0, theme.glowColorRadial);
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 600, height);
  ctx.restore();

  // 2. Theme-specific Outlines / Chassis Shapes
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

  // Outer frame
  ctx.save();
  ctx.strokeStyle = theme.borderBaseColor; ctx.lineWidth = 4.5;
  drawChassisOutline(0); ctx.stroke();
  ctx.restore();

  // Glowing inner frame outline
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

  // 3. Avatar Section
  ctx.save();
  ctx.strokeStyle = theme.themeColor;
  ctx.lineWidth = 3;
  ctx.shadowColor = theme.themeColor;
  ctx.shadowBlur = 14;
  ctx.beginPath(); ctx.arc(avX, avY, avRadius + 4, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  let loadedImg = null;
  if (avatarBuffer) {
    try {
      loadedImg = await loadImage(avatarBuffer);
    } catch (e) {
      console.error("Failed to load avatar image in profile generator:", e);
    }
  }

  ctx.save();
  ctx.beginPath();
  ctx.arc(avX, avY, avRadius, 0, Math.PI * 2);
  ctx.clip();
  if (loadedImg) {
    ctx.drawImage(loadedImg, avX - avRadius, avY - avRadius, avRadius * 2, avRadius * 2);
  } else {
    drawSilhouette(ctx, avX, avY, avRadius);
  }
  ctx.restore();

  // 4. Dynamic Username Capsule with Emoji Support
  const name = normalizeStyledText(user.first_name || 'PLAYER');
  const displayName = name.toUpperCase();

  let fontSize = 21;
  let fontSpec = `bold ${fontSize}px "DejaVu Sans"`;

  function measureNameWidth(fs) {
    ctx.save();
    const fontParts = fs.split(/\s+/);
    const familyIndex = fontParts.findIndex(part => part.includes('sans-serif') || part.includes('Arial') || part.includes('DejaVu'));
    let sizeAndStyle = '21px';
    let primaryFamily = 'DejaVu Sans';
    if (familyIndex !== -1) {
      sizeAndStyle = fontParts.slice(0, familyIndex).join(' ');
      const familyPart = fontParts.slice(familyIndex).join(' ').replace(/['"]/g, '');
      if (familyPart) primaryFamily = familyPart;
    } else {
      sizeAndStyle = fontParts.slice(0, -1).join(' ');
    }
    const primaryFont = `${sizeAndStyle} "${primaryFamily}"`;
    const emojiFont = `${sizeAndStyle} "Noto Color Emoji"`;

    const segments = displayName.split(/(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base})/gu);
    const activeSegments = segments.filter(seg => seg !== '');

    let w = 0;
    for (const seg of activeSegments) {
      const isEmoji = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base})/u.test(seg);
      ctx.font = isEmoji ? emojiFont : primaryFont;
      w += ctx.measureText(seg).width;
    }
    ctx.restore();
    return w;
  }

  while (fontSize > 11 && measureNameWidth(fontSpec) > 260) {
    fontSize--;
    fontSpec = `bold ${fontSize}px "DejaVu Sans"`;
  }

  const textW = measureNameWidth(fontSpec);
  const nameplateW = Math.max(160, Math.min(320, textW + 36));
  const nameplateX = 300 - nameplateW / 2;
  const nameplateY = avY + 95;
  const nameplateH = 38;
  const nCut = 8;

  ctx.save();
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

  // Theme accent tick marks on nameplate sides
  ctx.strokeStyle = theme.themeColor;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(nameplateX, nameplateY + 10); ctx.lineTo(nameplateX, nameplateY + 28);
  ctx.moveTo(nameplateX + nameplateW, nameplateY + 10); ctx.lineTo(nameplateX + nameplateW, nameplateY + 28);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  const textY = avY + 95 + 19 + (fontSize * 0.35);
  drawTextWithEmojis(ctx, displayName, 300, textY, fontSpec);
  ctx.restore();

  // 5. Compact MOTM Star Capsule
  ctx.save();
  ctx.fillStyle = 'rgba(251, 191, 36, 0.08)';
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(260, avY + 140, 80, 20, 4);
  ctx.fill(); ctx.stroke();

  // Draw gold vector star
  drawVectorStar(ctx, 274, avY + 150, 5, 4.5, 2, '#fbbf24');

  // Text
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 10px "DejaVu Sans", sans-serif';
  ctx.textAlign = 'left';
  drawTextWithEmojis(ctx, `${stats.motm || 0} MOTM`, 285, avY + 154, 'bold 10px "DejaVu Sans"');
  ctx.restore();

  // 6. Batting & Bowling Sleek Dashboard Panels
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
    drawTextWithEmojis(ctx, title, pX + 18, startY + 20, 'bold 9.5px "DejaVu Sans"');

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
      drawTextWithEmojis(ctx, item.label.toUpperCase(), item.x, item.y, 'bold 9px "DejaVu Sans"');

      // Value
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18.5px "DejaVu Sans", sans-serif';
      drawTextWithEmojis(ctx, String(item.val), item.x, item.y + 23, 'bold 18.5px "DejaVu Sans"');
    });

    ctx.restore();
  }

  const col1 = 182;
  const col2 = 418;
  const avgStr = stats.dismissals > 0 ? (stats.runs / stats.dismissals).toFixed(2) : (stats.runs > 0 ? `${stats.runs}*` : '0.00');
  const econ = stats.balls_bowled > 0 ? ((stats.runs_conceded * 6) / stats.balls_bowled).toFixed(2) : '0.00';
  const bestBowling = `${stats.best_wickets || 0}/${stats.best_runs_conceded || 0}`;
  const bowlAvg = stats.wickets > 0 ? (stats.runs_conceded / stats.wickets).toFixed(2) : '0.00';
  const overs = (stats.balls_bowled / 6).toFixed(1);

  const batStartY = avY + 195;
  const battingItems = [
    { label: "Runs Scored", val: stats.runs || 0, x: col1, y: batStartY + 50 },
    { label: "Batting Avg", val: avgStr, x: col2, y: batStartY + 50 },
    { label: "Highest Score", val: stats.highscore || 0, x: col1, y: batStartY + 108 },
    { label: "Fours / Sixes", val: `${stats.fours || 0} / ${stats.sixes || 0}`, x: col2, y: batStartY + 108 },
    { label: "50s / 100s", val: `${stats.fifties || 0} / ${stats.centuries || 0}`, x: col1, y: batStartY + 166 },
    { label: "Ducks Count", val: stats.ducks || 0, x: col2, y: batStartY + 166 }
  ];
  drawDashboardPanel("BATTING INSTRUMENTS", batStartY, battingItems);

  const bowlStartY = batStartY + 235;
  const bowlingItems = [
    { label: "Wickets Taken", val: stats.wickets || 0, x: col1, y: bowlStartY + 50 },
    { label: "Economy Rate", val: econ, x: col2, y: bowlStartY + 50 },
    { label: "Best Bowling", val: bestBowling, x: col1, y: bowlStartY + 108 },
    { label: "3w / 5w Hauls", val: `${stats.threew || 0} / ${stats.fivew || 0}`, x: col2, y: bowlStartY + 108 },
    { label: "Bowling Avg", val: bowlAvg, x: col1, y: bowlStartY + 166 },
    { label: "Overs Bowled", val: overs, x: col2, y: bowlStartY + 166 }
  ];
  drawDashboardPanel("BOWLING INSTRUMENTS", bowlStartY, bowlingItems);

  // 7. Bottom Brand Stamp
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.font = 'bold 10px "DejaVu Sans", sans-serif'; ctx.textAlign = 'center';
  drawTextWithEmojis(ctx, `HANDCRICKET PRO COLLECTIBLE  //  ${theme.editionName}`, 300, 940, 'bold 10px "DejaVu Sans"');
  ctx.restore();

  // 8. Card Gloss Overlay
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

  ctx.restore(); // Restore card translation

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
    // Regal Brushed Stripes
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.012)';
    ctx.lineWidth = 2.5;
    for (let y = 0; y < 1000; y += 16) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(600, y); ctx.stroke();
    }
  } else if (themeName === 'cyan') {
    // Sharp Crystalline diagonals
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

module.exports = {
  generateProfileCard,
  normalizeStyledText
};
