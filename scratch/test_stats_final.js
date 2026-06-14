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
    if (i === 0) ctx.moveTo(x + Math.cos(a1) * 10, y + Math.sin(a1) * 10);
    else ctx.lineTo(x + Math.cos(a1) * 10, y + Math.sin(a1) * 10);
    ctx.lineTo(x + Math.cos(a2) * 4.5, y + Math.sin(a2) * 4.5);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function icoCircle(ctx, x, y, c, text) {
  ctx.save();
  ctx.strokeStyle = c;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(x, y, 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = c;
  ctx.font = `bold ${text.length > 2 ? 6.5 : 8}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 0.5);
  ctx.restore();
}

function icoGrid(ctx, x, y, c) {
  ctx.save();
  ctx.fillStyle = c;
  const s = 3;
  const g = 1.5;
  for (let r = 0; r < 3; r++) {
    for (let col = 0; col < 3; col++) {
      ctx.fillRect(x - 5.25 + col * (s + g), y - 5.25 + r * (s + g), s, s);
    }
  }
  ctx.restore();
}

async function main() {
  const imgPath = path.join(__dirname, '..', 'game', 'assets', 'card_template.png');
  const img = await loadImage(imgPath);
  
  // Load the user's actual logo
  const logoImg = await loadImage(path.join(__dirname, '..', 'game', 'assets', 'logo.png'));

  const W = 1024;
  const H = 1024;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  
  // 1. Draw template
  ctx.drawImage(img, 0, 0);

  // 2. Draw user's actual logo on top of the placeholder logo at top left
  // Bounding box of placeholder logo on template: x=75, y=70, w=160, h=160
  ctx.drawImage(logoImg, 70, 65, 170, 170);

  const tc = '#f97316'; // theme color

  // 3. Draw nameplate cover and name
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

  // 4. Draw Batting Stats Values
  // Columns: x = 270, 408, 548, 688
  // Row: label y = 715, val y = 740
  const batVals = ['124', '4,892', '47.9', '142.3'];
  const batLabels = ['MATCHES', 'RUNS', 'AVERAGE', 'STRIKE RATE'];
  const cols = [270, 408, 548, 688];

  cols.forEach((x, i) => {
    ctx.save();
    ctx.fillStyle = '#aaaaaa';
    ctx.font = 'bold 9.5px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(batLabels[i], x, 715);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.shadowColor = tc;
    ctx.shadowBlur = 8;
    ctx.fillText(batVals[i], x, 740);
    ctx.restore();
  });

  // 5. Draw Bowling Stats Values
  // Row: label y = 815, val y = 840
  const bowVals = ['182', '7.1', '24.8', '5/18'];
  const bowLabels = ['WICKETS', 'ECONOMY', 'AVERAGE', 'BEST BOWLING'];

  cols.forEach((x, i) => {
    ctx.save();
    ctx.fillStyle = '#aaaaaa';
    ctx.font = 'bold 9.5px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(bowLabels[i], x, 815);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.shadowColor = tc;
    ctx.shadowBlur = 8;
    ctx.fillText(bowVals[i], x, 840);
    ctx.restore();
  });

  // 6. Draw Bottom 4 boxes stats
  // Box positions (left edge): 214, 360, 506, 652
  // Icon center: left + 22. Text left: left + 46
  // Row: label y = 902, val y = 932
  const botVals = ['178*', '41', '12', '11'];
  const botLabels = ['HIGHEST SCORE', '50s', '100s', 'MOTM']; // Using MOTM instead of MAIDENS
  const botLefts = [214, 360, 506, 652];
  const botIcons = [
    (c, x, y) => icoStar(c, x, y, tc),
    (c, x, y) => icoCircle(c, x, y, tc, '50'),
    (c, x, y) => icoCircle(c, x, y, tc, '100'),
    (c, x, y) => icoGrid(c, x, y, tc),
  ];

  botLefts.forEach((left, i) => {
    const iconX = left + 22;
    const textX = left + 46;
    botIcons[i](ctx, iconX, 912);

    ctx.save();
    ctx.fillStyle = '#aaaaaa';
    ctx.font = 'bold 9.5px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(botLabels[i], textX, 902);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.shadowColor = tc;
    ctx.shadowBlur = 8;
    ctx.fillText(botVals[i], textX, 932);
    ctx.restore();
  });

  fs.writeFileSync(path.join(__dirname, 'test_stats_final.png'), canvas.toBuffer('image/png'));
  console.log('Saved test_stats_final.png');
}

main().catch(console.error);
