const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');
try { GlobalFonts.loadSystemFonts(); } catch(e) {}

const ASSETS = path.join(__dirname, 'assets');

// Template is 1024x1024. We render onto 800x800 (scale factor ~0.78)
// Then we pad to 800x1000 for Telegram compatibility
const TPL_W = 1024, TPL_H = 1024;
const OUT_W = 800, OUT_H = 800;
const SCALE = OUT_W / TPL_W; // 0.78125

// Key positions on the 1024x1024 template (measured from template):
// Avatar circle center: ~(512, 290), radius ~205
// After scale: center (399, 226), radius 160
const AV_X = Math.round(512 * SCALE);   // 400
const AV_Y = Math.round(285 * SCALE);   // 222
const AV_R = Math.round(200 * SCALE);   // 156

// Nameplate text center: ~(512, 595) on template
const NP_CX = Math.round(512 * SCALE);  // 400
const NP_Y  = Math.round(596 * SCALE);  // 465

// Batting stat cells (icon area + value) on template:
// Row y ~685, cols at ~165,  ~380,  ~595,  ~810
// After scale: y=535, cols=129, 297, 465, 633
const BAT_Y = Math.round(688 * SCALE);
const BAT_COLS = [165,380,595,810].map(x=>Math.round(x*SCALE));

// Bowling stat cells: row y ~810
const BOW_Y = Math.round(810 * SCALE);
const BOW_COLS = BAT_COLS;

// Bottom 4 boxes: row y ~920, cols at ~130, ~340, ~555, ~770
const BOT_Y  = Math.round(920 * SCALE);
const BOT_COLS = [130,340,555,770].map(x=>Math.round(x*SCALE));

const themes = [
  { name:'red',    tc:'#f97316', sc:'#dc2626' },
  { name:'blue',   tc:'#38bdf8', sc:'#8b5cf6' },
  { name:'green',  tc:'#22c55e', sc:'#06b6d4' },
  { name:'purple', tc:'#a855f7', sc:'#ec4899' },
  { name:'gold',   tc:'#fbbf24', sc:'#f97316' },
  { name:'cyan',   tc:'#06b6d4', sc:'#4f46e5' },
  { name:'pink',   tc:'#ec4899', sc:'#38bdf8' },
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

// Stat cell: label on top, big value below
function statCell(ctx,x,y,label,val,tc){
  ctx.save();
  ctx.fillStyle='#aaa';ctx.font='bold 9px "DejaVu Sans"';ctx.textAlign='center';
  ctx.fillText(label.toUpperCase(),x,y-8);
  ctx.fillStyle='#fff';ctx.font='bold 20px "DejaVu Sans"';
  ctx.shadowColor=tc;ctx.shadowBlur=8;
  ctx.fillText(String(val),x,y+14);ctx.shadowBlur=0;
  ctx.restore();
}

async function generateProfileCard(user,stats,avatarBuffer){
  // Create canvas matching template size (square), then pad to 800x1000
  const canvas=createCanvas(OUT_W, OUT_H);
  const ctx=canvas.getContext('2d');

  const themeName=user.card_theme||'red';
  let th=themes.find(t=>t.name===themeName)||themes[0];
  if(!user.card_theme&&user.id)th=themes[(parseInt(user.id)||0)%themes.length];
  const tc=th.tc;

  // ── 1. Draw template
  try{
    const tpl=await loadImage(path.join(ASSETS,'card_template.png'));
    ctx.drawImage(tpl,0,0,OUT_W,OUT_H);
  }catch(e){
    ctx.fillStyle='#0a0608';ctx.fillRect(0,0,OUT_W,OUT_H);
  }

  // ── 2. Apply theme color tint to frame (multiply blend isn't available so use overlay)
  if(th.name !== 'red' && th.name !== 'gold'){
    // Tint the border area with theme color
    ctx.save();
    ctx.globalCompositeOperation='screen';
    ctx.globalAlpha=0.18;
    ctx.strokeStyle=tc;ctx.lineWidth=18;
    ctx.beginPath();ctx.roundRect(8,8,OUT_W-16,OUT_H-16,14);ctx.stroke();
    ctx.globalCompositeOperation='source-over';
    ctx.globalAlpha=1;
    ctx.restore();
  }

  // ── 3. Avatar
  let img=null;
  if(avatarBuffer){try{img=await loadImage(avatarBuffer);}catch(e){}}
  ctx.save();
  ctx.beginPath();ctx.arc(AV_X,AV_Y,AV_R,0,Math.PI*2);ctx.clip();
  if(img){
    // Cover-fit the image in the circle
    const s=Math.max(AV_R*2/img.width,AV_R*2/img.height);
    const dw=img.width*s,dh=img.height*s;
    ctx.drawImage(img,AV_X-dw/2,AV_Y-dh/2,dw,dh);
  }else{
    drawSilhouette(ctx,AV_X,AV_Y,AV_R);
  }
  ctx.restore();

  // ── 4. Player Name (over the template's "PLAYER NAME" area)
  const name=normalizeStyledText(user.first_name||'PLAYER').toUpperCase();
  const handle=`@${(user.username||user.first_name||'player').toLowerCase().replace(/\s+/g,'_').slice(0,22)}`;

  let fs=32;ctx.font=`bold italic ${fs}px "DejaVu Sans"`;
  while(fs>16&&ctx.measureText(name).width>340){fs--;ctx.font=`bold italic ${fs}px "DejaVu Sans"`;}

  // Cover the template "PLAYER NAME" text with solid fill first
  ctx.save();
  ctx.fillStyle='rgba(6,3,1,0.0)'; // transparent - template text will be overdrawn
  ctx.fillRect(NP_CX-200,NP_Y-38,400,55);
  // Draw actual name
  ctx.fillStyle='#ffffff';ctx.font=`bold italic ${fs}px "DejaVu Sans"`;
  ctx.textAlign='center';ctx.shadowColor='#000';ctx.shadowBlur=4;
  drawText(ctx,name,NP_CX,NP_Y,`bold italic ${fs}px "DejaVu Sans"`);
  ctx.shadowBlur=0;
  // Handle below
  ctx.fillStyle=tc+'ee';ctx.font='11px "DejaVu Sans"';
  ctx.fillText(handle,NP_CX,NP_Y+18);
  ctx.restore();

  // ── 5. Batting stats
  const avg=stats.dismissals>0?(stats.runs/stats.dismissals).toFixed(1):(stats.runs>0?`${stats.runs}*`:'0.0');
  const sr=stats.balls_faced>0?((stats.runs/stats.balls_faced)*100).toFixed(1):'0.0';
  const matches=(stats.wins||0)+(stats.losses||0);
  const batVals=[matches,(stats.runs||0).toLocaleString(),avg,sr];
  const batLabels=['MATCHES','RUNS','AVERAGE','STRIKE RATE'];
  BAT_COLS.forEach((cx2,i)=>statCell(ctx,cx2,BAT_Y,batLabels[i],batVals[i],tc));

  // ── 6. Bowling stats
  const econ=stats.balls_bowled>0?((stats.runs_conceded*6)/stats.balls_bowled).toFixed(1):'0.0';
  const bavg=stats.wickets>0?(stats.runs_conceded/stats.wickets).toFixed(1):'0.0';
  const bb=`${stats.best_wickets||0}/${stats.best_runs_conceded||0}`;
  const bowVals=[stats.wickets||0,econ,bavg,bb];
  const bowLabels=['WICKETS','ECONOMY','AVERAGE','BEST BOWLING'];
  BOW_COLS.forEach((cx2,i)=>statCell(ctx,cx2,BOW_Y,bowLabels[i],bowVals[i],tc));

  // ── 7. Bottom 4 mini boxes
  const hs=stats.highscore>0?`${stats.highscore}*`:'0';
  const botVals=[hs,stats.fifties||0,stats.centuries||0,stats.motm||0];
  const botLabels=['HIGHEST SCORE','50s','100s','MOTM'];
  BOT_COLS.forEach((cx2,i)=>statCell(ctx,cx2,BOT_Y,botLabels[i],botVals[i],tc));

  // ── 8. Output as 800x1000 (pad 100px top and bottom)
  const finalCanvas=createCanvas(800,1000);
  const fctx=finalCanvas.getContext('2d');
  fctx.fillStyle='#000';fctx.fillRect(0,0,800,1000);
  fctx.drawImage(canvas,0,100,800,800);

  return finalCanvas.toBuffer('image/png');
}

module.exports={generateProfileCard,normalizeStyledText};
