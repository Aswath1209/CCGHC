const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

// Icon drawers
function icoStar(ctx, x, y, c) {
  ctx.save();
  ctx.fillStyle = c;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a1 = (Math.PI / 2) * 3 + i * (Math.PI * 2 / 5);
    const a2 = a1 + Math.PI / 5;
    if (i === 0) ctx.moveTo(x + Math.cos(a1) * 11, y + Math.sin(a1) * 11);
    else ctx.lineTo(x + Math.cos(a1) * 11, y + Math.sin(a1) * 11);
    ctx.lineTo(x + Math.cos(a2) * 5, y + Math.sin(a2) * 5);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function icoCircle(ctx, x, y, c, text) {
  ctx.save();
  ctx.strokeStyle = c;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = c;
  ctx.font = `bold ${text.length > 2 ? 7.5 : 9}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 0.5);
  ctx.restore();
}

function icoGrid(ctx, x, y, c) {
  ctx.save();
  ctx.fillStyle = c;
  const s = 3.5;
  const g = 1.5;
  for (let r = 0; r < 3; r++) {
    for (let col = 0; col < 3; col++) {
      ctx.fillRect(x - 6 + col * (s + g), y - 6 + r * (s + g), s, s);
    }
  }
  ctx.restore();
}

async function main() {
  const imgPath = path.join(__dirname, '..', 'game', 'assets', 'card_template.png');
  const img = await loadImage(imgPath);
  const W = img.width;
  const H = img.height;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const tc = '#f97316'; // theme color

  // Draw nameplate cover and name
  ctx.save();
  ctx.drawImage(img, 328, 550, 10, 76, 338, 550, 350, 76);
  ctx.restore();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'italic bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ANTHONY', 512, 580);

  ctx.fillStyle = '#f97316';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('@anthony_07', 512, 612);

  // Draw Batting Stats Values
  // Columns: x = 274, 412, 554, 696
  // Row: label y = 705, val y = 730
  const batVals = ['124', '4,892', '47.9', '142.3'];
  const batLabels = ['MATCHES', 'RUNS', 'AVERAGE', 'STRIKE RATE'];
  const cols = [274, 412, 554, 696];

  cols.forEach((x, i) => {
    ctx.save();
    ctx.fillStyle = '#aaaaaa';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(batLabels[i], x, 705);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.shadowColor = tc;
    ctx.shadowBlur = 8;
    ctx.fillText(batVals[i], x, 730);
    ctx.restore();
  });

  // Draw Bowling Stats Values
  // Row: label y = 821, val y = 846
  const bowVals = ['182', '7.1', '24.8', '5/18'];
  const bowLabels = ['WICKETS', 'ECONOMY', 'AVERAGE', 'BEST BOWLING'];

  cols.forEach((x, i) => {
    ctx.save();
    ctx.fillStyle = '#aaaaaa';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(bowLabels[i], x, 821);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.shadowColor = tc;
    ctx.shadowBlur = 8;
    ctx.fillText(bowVals[i], x, 846);
    ctx.restore();
  });

  // Draw Bottom 4 boxes stats
  // Box positions (left edge): 214, 360, 506, 652
  // Icon center: left + 22. Text left: left + 46
  // Row: label y = 902, val y = 928
  const botVals = ['178*', '41', '12', '11'];
  const botLabels = ['HIGHEST SCORE', '50s', '100s', 'MAIDENS'];
  const botLefts = [214, 360, 506, 652];
  const botIcons = [
    (c, x, y) => icoStar(c, x, y, tc),
    (c, x, y) => icoCircle(c, x, y, tc, '50'),
    (c, x, y) => icoCircle(c, x, y, tc, '100'),
    (c, x, y) => icoGrid(c, x, y, tc),
  ];

  botLefts.forEach((left, i) => {
    const iconX = left + 22;
    const textX = left + 48; // Shifted slightly more to the right
    botIcons[i](ctx, iconX, 910);

    ctx.save();
    ctx.fillStyle = '#aaaaaa';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(botLabels[i], textX, 902);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.shadowColor = tc;
    ctx.shadowBlur = 8;
    ctx.fillText(botVals[i], textX, 928);
    ctx.restore();
  });

  fs.writeFileSync(path.join(__dirname, 'test_stats_alignment_v2.png'), canvas.toBuffer('image/png'));
  console.log('Saved test_stats_alignment_v2.png');
}

main().catch(console.error);
