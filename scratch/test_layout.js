const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const user = { first_name: "ASWATH", username: "aswath" };
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

// Bottom row icons only
function drawStarIcon(ctx, x, y, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a1 = (Math.PI / 2) * 3 + i * ((Math.PI * 2) / 5);
    const a2 = a1 + Math.PI / 5;
    if (i === 0) ctx.moveTo(x + Math.cos(a1) * 11, y + Math.sin(a1) * 11);
    else ctx.lineTo(x + Math.cos(a1) * 11, y + Math.sin(a1) * 11);
    ctx.lineTo(x + Math.cos(a2) * 5.0, y + Math.sin(a2) * 5.0);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawCircleBadge(ctx, x, y, color, text) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = 'bold 8px "DejaVu Sans"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 0.5);
  ctx.restore();
}

function drawGridIcon(ctx, x, y, color) {
  ctx.save();
  ctx.fillStyle = color;
  const s = 3.2;
  const g = 1.6;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      ctx.fillRect(x - 5.6 + c * (s + g), y - 5.6 + r * (s + g), s, s);
    }
  }
  ctx.restore();
}

async function run() {
  const tpl = await loadImage('/home/home/ReactNative/Telegram/cricket-bot/game/assets/card_template.png');
  const stadiumBg = await loadImage('/home/home/ReactNative/Telegram/cricket-bot/game/assets/stadium_bg.png');

  const canvas = createCanvas(1024, 1024);
  const ctx = canvas.getContext('2d');

  // 1. Draw template base
  ctx.drawImage(tpl, 0, 0, 1024, 1024);

  // 2. Cover ONLY the "PLAYER NAME" text on nameplate to keep chevrons intact
  // "PLAYER NAME" is between x: 415 and 609. Let's patch x: 415 to 609, y: 562 to 604
  ctx.drawImage(stadiumBg, 415, 562, 194, 42, 415, 562, 194, 42);

  // 3. Draw Avatar (Center: 512, 338, Radius: 190)
  const avX = 512, avY = 338, avR = 190;
  ctx.save();
  ctx.beginPath();
  ctx.arc(avX, avY, avR, 0, Math.PI * 2);
  ctx.clip();
  
  // Draw silhouette
  const g = ctx.createRadialGradient(avX, avY - avR * 0.2, avR * 0.1, avX, avY, avR);
  g.addColorStop(0, '#2a2520');
  g.addColorStop(1, '#0d0b09');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(avX, avY, avR, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#4a443e';
  ctx.beginPath();
  ctx.arc(avX, avY - avR * 0.18, avR * 0.36, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(avX, avY + avR * 1.0, avR * 0.72, Math.PI, 0, false);
  ctx.fill();
  ctx.restore();

  // 4. Draw Player Name & Handle inside nameplate
  const name = "ASWATH";
  const handle = "@aswath";
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'italic bold 44px "DejaVu Sans"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 6;
  ctx.fillText(name, 512, 580);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#fbbf24'; // theme color (gold)
  ctx.font = 'bold 15px "DejaVu Sans"';
  ctx.fillText(handle, 512, 614);
  ctx.restore();

  // Calculate values
  const avg = stats.dismissals > 0 ? (stats.runs / stats.dismissals).toFixed(1) : (stats.runs > 0 ? `${stats.runs}*` : '0.0');
  const sr = stats.balls_faced > 0 ? ((stats.runs / stats.balls_faced) * 100).toFixed(1) : '0.0';
  const econ = stats.balls_bowled > 0 ? ((stats.runs_conceded * 6) / stats.balls_bowled).toFixed(1) : '0.0';
  const bavg = stats.wickets > 0 ? (stats.runs_conceded / stats.wickets).toFixed(1) : '0.0';
  const bb = `${stats.best_wickets}/${stats.best_runs_conceded}`;
  const overs = (stats.balls_bowled / 6).toFixed(1);

  // Text center coordinates for drawing next to the baked-in icons
  const textCenters = [205, 423, 657, 877];

  // Draw Batting Stats (No programmatic icons drawn, using template's baked-in icons)
  const batVals = [stats.runs.toLocaleString(), `${avg} / ${sr}`, `${stats.fours} / ${stats.sixes}`, `${stats.fifties} / ${stats.centuries}`];
  const batLabels = ['RUNS', 'AVG / SR', '4s / 6s', '50s / 100s'];

  textCenters.forEach((cx, i) => {
    ctx.save();
    ctx.fillStyle = '#aaaaaa';
    ctx.font = 'bold 9px "DejaVu Sans"';
    ctx.textAlign = 'center';
    ctx.fillText(batLabels[i], cx, 712);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "DejaVu Sans"';
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 8;
    ctx.fillText(String(batVals[i]), cx, 742);
    ctx.restore();
  });

  // Draw Bowling Stats (No programmatic icons drawn, using template's baked-in icons)
  const bowVals = [stats.wickets, `${econ} / ${bavg}`, bb, `${stats.threew} / ${stats.fivew}`];
  const bowLabels = ['WICKETS', 'ECON / AVG', 'BEST BOWLING', '3w / 5w'];

  textCenters.forEach((cx, i) => {
    ctx.save();
    ctx.fillStyle = '#aaaaaa';
    ctx.font = 'bold 9px "DejaVu Sans"';
    ctx.textAlign = 'center';
    ctx.fillText(bowLabels[i], cx, 822);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "DejaVu Sans"';
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 8;
    ctx.fillText(String(bowVals[i]), cx, 852);
    ctx.restore();
  });

  // Draw Bottom 4 boxes (These boxes are blank in the template, so we draw icons + text)
  const botVals = [`${stats.highscore}*`, overs, stats.ducks, stats.motm];
  const botLabels = ['HIGHEST SCORE', 'OVERS', 'DUCKS', 'MOTM'];
  const botIcons = [
    (c, x, y) => drawStarIcon(ctx, x, y, c),
    (c, x, y) => drawCircleBadge(ctx, x, y, c, 'OV'),
    (c, x, y) => drawCircleBadge(ctx, x, y, c, '0'),
    (c, x, y) => drawGridIcon(ctx, x, y, c)
  ];
  const botCenters = [205, 421, 655, 875];
  const botIconXs = [116, 332, 566, 786];

  botCenters.forEach((cx, i) => {
    // Draw icon programmatically
    botIcons[i]('#fbbf24', botIconXs[i], 926);

    ctx.save();
    ctx.fillStyle = '#aaaaaa';
    ctx.font = 'bold 9px "DejaVu Sans"';
    ctx.textAlign = 'center';
    ctx.fillText(botLabels[i], cx, 912);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "DejaVu Sans"';
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 8;
    ctx.fillText(String(botVals[i]), cx, 942);
    ctx.restore();
  });

  // Output as padded 800x1000
  const finalCanvas = createCanvas(800, 1000);
  const fctx = finalCanvas.getContext('2d');
  fctx.fillStyle = '#000000';
  fctx.fillRect(0, 0, 800, 1000);
  fctx.drawImage(canvas, 0, 100, 800, 800);

  fs.writeFileSync('/home/home/ReactNative/Telegram/cricket-bot/scratch/test_layout_final.png', finalCanvas.toBuffer('image/png'));
  console.log('Saved scratch/test_layout_final.png');
}

run().catch(console.error);
