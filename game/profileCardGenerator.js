const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');
try { GlobalFonts.loadSystemFonts(); } catch(e) {}

const ASSETS = path.join(__dirname, 'assets');

const themes = [
  { name: 'red',    hue: '0deg',   tc: '#f97316' },
  { name: 'blue',   hue: '180deg', tc: '#38bdf8' },
  { name: 'green',  hue: '90deg',  tc: '#22c55e' },
  { name: 'purple', hue: '240deg', tc: '#a855f7' },
  { name: 'gold',   hue: '20deg',  tc: '#fbbf24' },
  { name: 'cyan',   hue: '150deg', tc: '#06b6d4' },
  { name: 'pink',   hue: '300deg', tc: '#ec4899' },
];

const unicodeMap={0x1d00:'A',0x299:'B',0x1d04:'C',0x1d05:'D',0x1d07:'E',0xa730:'F',0x262:'G',0x29c:'H',0x26a:'I',0x1d0a:'J',0x1d0b:'K',0x29f:'L',0x1d0d:'M',0x274:'N',0x1d0f:'O',0x1d18:'P',0x280:'R',0xa731:'S',0x1d1b:'T',0x1d1c:'U',0x1d20:'V',0x1d21:'W',0x28f:'Y',0x1d22:'Z'};
function normalizeStyledText(s){if(!s)return'';return[...s].map(ch=>{const cp=ch.codePointAt(0);if(!cp)return ch;if(unicodeMap[cp])return unicodeMap[cp];if(cp>=0x1d400&&cp<=0x1d419)return String.fromCharCode(cp-0x1d400+65);if(cp>=0x1d41a&&cp<=0x1d433)return String.fromCharCode(cp-0x1d41a+97);if(cp>=0xff21&&cp<=0xff3a)return String.fromCharCode(cp-0xff21+65);if(cp>=0xff41&&cp<=0xff5a)return String.fromCharCode(cp-0xff41+97);return ch;}).join('');}

function drawText(ctx,text,x,y,fontSpec){
  if(!text)return;const str=String(text);
  const parts=fontSpec.split(/\s+/);const fi=parts.findIndex(p=>p.includes('DejaVu')||p.includes('sans-serif'));
  let sz='14px',fam='DejaVu Sans';
  if(fi!==-1){sz=parts.slice(0,fi).join(' ');fam=parts.slice(fi).join(' ').replace(/['"]/g,'');}else sz=parts.slice(0,-1).join(' ');
  const pf=`${sz} "${fam}"`,ef=`${sz} "Noto Color Emoji"`;
  const segs=str.split(/(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base})/gu).filter(s=>s!=='');
  const ds=segs.map(s=>{const e=/(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u.test(s);ctx.save();ctx.font=e?ef:pf;const w=ctx.measureText(s).width;ctx.restore();return{s,e,w};});
  const tot=ds.reduce((a,d)=>a+d.w,0);const al=ctx.textAlign||'left';
  let cx=x;if(al==='center')cx=x-tot/2;else if(al==='right')cx=x-tot;
  const oa=ctx.textAlign;ctx.textAlign='left';
  for(const d of ds){ctx.save();ctx.font=d.e?ef:pf;ctx.fillText(d.s,cx,y);ctx.restore();cx+=d.w;}
  ctx.textAlign=oa;
}

function drawSilhouette(ctx,x,y,r){
  const g=ctx.createRadialGradient(x,y-r*0.2,r*0.1,x,y,r);
  g.addColorStop(0,'#2a2520');g.addColorStop(1,'#0d0b09');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#4a443e';ctx.beginPath();ctx.arc(x,y-r*0.18,r*0.36,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(x,y+r*1.0,r*0.72,Math.PI,0,false);ctx.fill();
}

// Icon drawers for the custom bottom row
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
  ctx.font = `bold ${text.length > 2 ? 6.5 : 8}px "DejaVu Sans"`;
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

async function generateProfileCard(user,stats,avatarBuffer){
  // 1. Create base 1024x1024 canvas
  const canvas = createCanvas(1024, 1024);
  const ctx = canvas.getContext('2d');

  const themeName = user.card_theme || 'red';
  let th = themes.find(t => t.name === themeName) || themes[0];
  if (!user.card_theme && user.id) th = themes[(parseInt(user.id) || 0) % themes.length];
  const tc = th.tc;

  // 2. Load template image and apply hue rotation filter
  try {
    const tpl = await loadImage(path.join(ASSETS, 'card_template.png'));
    ctx.save();
    if (th.hue !== '0deg') {
      ctx.filter = `hue-rotate(${th.hue})`;
    }
    ctx.drawImage(tpl, 0, 0, 1024, 1024);
    ctx.restore();
  } catch (e) {
    ctx.fillStyle = '#0a0608';
    ctx.fillRect(0, 0, 1024, 1024);
  }

  // 3. Draw Player Avatar inside fire ring (center: 512, 308, radius: 188)
  const avX = 512, avY = 308, avR = 188;
  let img = null;
  if (avatarBuffer) {
    try { img = await loadImage(avatarBuffer); } catch (e) {}
  }
  ctx.save();
  ctx.beginPath();
  ctx.arc(avX, avY, avR, 0, Math.PI * 2);
  ctx.clip();
  if (img) {
    const s = Math.max(avR * 2 / img.width, avR * 2 / img.height);
    const dw = img.width * s, dh = img.height * s;
    ctx.drawImage(img, avX - dw / 2, avY - dh / 2, dw, dh);
  } else {
    drawSilhouette(ctx, avX, avY, avR);
  }
  ctx.restore();

  // 4. Draw Nameplate Cover using cloned clean background patch
  ctx.save();
  ctx.drawImage(canvas, 328, 550, 10, 76, 338, 550, 350, 76);
  ctx.restore();

  // 5. Draw Player Name
  const name = normalizeStyledText(user.first_name || 'PLAYER').toUpperCase();
  const handle = `@${(user.username || user.first_name || 'player').toLowerCase().replace(/\s+/g, '_').slice(0, 22)}`;

  let fs = 44;
  ctx.font = `italic bold ${fs}px "DejaVu Sans"`;
  while (fs > 22 && ctx.measureText(name).width > 350) {
    fs--;
    ctx.font = `italic bold ${fs}px "DejaVu Sans"`;
  }

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 6;
  drawText(ctx, name, 512, 580, `italic bold ${fs}px "DejaVu Sans"`);
  ctx.shadowBlur = 0;

  ctx.fillStyle = tc;
  ctx.font = 'bold 15px "DejaVu Sans"';
  ctx.fillText(handle, 512, 612);

  // 6. Draw Batting Stats
  const avg = stats.dismissals > 0 ? (stats.runs / stats.dismissals).toFixed(1) : (stats.runs > 0 ? `${stats.runs}*` : '0.0');
  const sr = stats.balls_faced > 0 ? ((stats.runs / stats.balls_faced) * 100).toFixed(1) : '0.0';
  const matches = (stats.wins || 0) + (stats.losses || 0);
  
  const batVals = [matches, (stats.runs || 0).toLocaleString(), avg, sr];
  const batLabels = ['MATCHES', 'RUNS', 'AVERAGE', 'STRIKE RATE'];
  const cols = [274, 412, 554, 696];

  cols.forEach((x, i) => {
    ctx.save();
    ctx.fillStyle = '#aaaaaa';
    ctx.font = 'bold 10px "DejaVu Sans"';
    ctx.textAlign = 'left';
    ctx.fillText(batLabels[i], x, 715);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "DejaVu Sans"';
    ctx.shadowColor = tc;
    ctx.shadowBlur = 8;
    ctx.fillText(String(batVals[i]), x, 740);
    ctx.restore();
  });

  // 7. Draw Bowling Stats
  const econ = stats.balls_bowled > 0 ? ((stats.runs_conceded * 6) / stats.balls_bowled).toFixed(1) : '0.0';
  const bavg = stats.wickets > 0 ? (stats.runs_conceded / stats.wickets).toFixed(1) : '0.0';
  const bb = `${stats.best_wickets || 0}/${stats.best_runs_conceded || 0}`;

  const bowVals = [stats.wickets || 0, econ, bavg, bb];
  const bowLabels = ['WICKETS', 'ECONOMY', 'AVERAGE', 'BEST BOWLING'];

  cols.forEach((x, i) => {
    ctx.save();
    ctx.fillStyle = '#aaaaaa';
    ctx.font = 'bold 10px "DejaVu Sans"';
    ctx.textAlign = 'left';
    ctx.fillText(bowLabels[i], x, 815);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "DejaVu Sans"';
    ctx.shadowColor = tc;
    ctx.shadowBlur = 8;
    ctx.fillText(String(bowVals[i]), x, 840);
    ctx.restore();
  });

  // 8. Draw Bottom 4 Box Stats (Highest Score, 50s, 100s, Maidens)
  const hs = stats.highscore > 0 ? `${stats.highscore}*` : '0';
  const botVals = [hs, stats.fifties || 0, stats.centuries || 0, stats.maidens || 0];
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
    const textX = left + 48;
    botIcons[i](ctx, iconX, 912);

    ctx.save();
    ctx.fillStyle = '#aaaaaa';
    ctx.font = 'bold 10px "DejaVu Sans"';
    ctx.textAlign = 'left';
    ctx.fillText(botLabels[i], textX, 902);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "DejaVu Sans"';
    ctx.shadowColor = tc;
    ctx.shadowBlur = 8;
    ctx.fillText(String(botVals[i]), textX, 932);
    ctx.restore();
  });

  // 9. Output as scaled 800x1000 with black padding
  const finalCanvas = createCanvas(800, 1000);
  const fctx = finalCanvas.getContext('2d');
  fctx.fillStyle = '#000000';
  fctx.fillRect(0, 0, 800, 1000);
  fctx.drawImage(canvas, 0, 100, 800, 800);

  return finalCanvas.toBuffer('image/png');
}

module.exports = { generateProfileCard, normalizeStyledText };
