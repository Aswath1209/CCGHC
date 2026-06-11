const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');
try { GlobalFonts.loadSystemFonts(); } catch(e) {}

const themes = [
  { name:'red',    themeColor:'#f97316', secondaryColor:'#ef4444', glowColorRadial:'rgba(249,115,22,0.15)' },
  { name:'blue',   themeColor:'#38bdf8', secondaryColor:'#8b5cf6', glowColorRadial:'rgba(56,189,248,0.12)' },
  { name:'green',  themeColor:'#22c55e', secondaryColor:'#06b6d4', glowColorRadial:'rgba(34,197,94,0.12)' },
  { name:'purple', themeColor:'#a855f7', secondaryColor:'#ec4899', glowColorRadial:'rgba(168,85,247,0.12)' },
  { name:'gold',   themeColor:'#fbbf24', secondaryColor:'#f97316', glowColorRadial:'rgba(251,191,36,0.12)' },
  { name:'cyan',   themeColor:'#06b6d4', secondaryColor:'#4f46e5', glowColorRadial:'rgba(6,182,212,0.12)' },
  { name:'pink',   themeColor:'#ec4899', secondaryColor:'#38bdf8', glowColorRadial:'rgba(236,72,153,0.12)' },
];

const unicodeMap = {
  0x1d00:'A',0x299:'B',0x1d04:'C',0x1d05:'D',0x1d07:'E',0xa730:'F',0x262:'G',0x29c:'H',0x26a:'I',
  0x1d0a:'J',0x1d0b:'K',0x29f:'L',0x1d0d:'M',0x274:'N',0x1d0f:'O',0x1d18:'P',0x280:'R',0xa731:'S',
  0x1d1b:'T',0x1d1c:'U',0x1d20:'V',0x1d21:'W',0x28f:'Y',0x1d22:'Z',
};
function normalizeStyledText(str) {
  if (!str) return '';
  return [...str].map(ch => {
    const cp = ch.codePointAt(0);
    if (!cp) return ch;
    if (unicodeMap[cp]) return unicodeMap[cp];
    if (cp>=0x1d400&&cp<=0x1d419) return String.fromCharCode(cp-0x1d400+65);
    if (cp>=0x1d41a&&cp<=0x1d433) return String.fromCharCode(cp-0x1d41a+97);
    if (cp>=0xff21&&cp<=0xff3a) return String.fromCharCode(cp-0xff21+65);
    if (cp>=0xff41&&cp<=0xff5a) return String.fromCharCode(cp-0xff41+97);
    return ch;
  }).join('');
}

function drawTextWithEmojis(ctx, text, x, y, fontSpec) {
  if (!text) return;
  const str = String(text);
  const parts = fontSpec.split(/\s+/);
  const fIdx = parts.findIndex(p=>p.includes('DejaVu')||p.includes('sans-serif')||p.includes('Arial'));
  let sz = '14px', fam = 'DejaVu Sans';
  if (fIdx!==-1) { sz=parts.slice(0,fIdx).join(' '); fam=parts.slice(fIdx).join(' ').replace(/['"]/g,''); }
  else sz=parts.slice(0,-1).join(' ');
  const pf=`${sz} "${fam}"`, ef=`${sz} "Noto Color Emoji"`;
  const segs = str.split(/(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base})/gu).filter(s=>s!=='');
  const details = segs.map(seg=>{
    const isE=/(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base})/u.test(seg);
    ctx.save(); ctx.font=isE?ef:pf;
    const w=ctx.measureText(seg).width; ctx.restore();
    return {seg,isE,w};
  });
  const total=details.reduce((s,d)=>s+d.w,0);
  const align=ctx.textAlign||'left';
  let cx=x;
  if(align==='center') cx=x-total/2;
  else if(align==='right') cx=x-total;
  const orig=ctx.textAlign; ctx.textAlign='left';
  for(const d of details){
    ctx.save(); ctx.font=d.isE?ef:pf; ctx.fillText(d.seg,cx,y); ctx.restore();
    cx+=d.w;
  }
  ctx.textAlign=orig;
}

function drawSilhouette(ctx,x,y,r){
  ctx.fillStyle='#1a1714'; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#3d3730'; ctx.beginPath(); ctx.arc(x,y-r*0.15,r*0.38,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x,y+r*1.05,r*0.75,Math.PI,0,false); ctx.fill();
}

// ── Icons ──
function icoCalendar(ctx,x,y,c){
  ctx.save();ctx.strokeStyle=c;ctx.fillStyle=c;ctx.lineWidth=1.5;
  ctx.strokeRect(x-9,y-7,18,15); ctx.fillRect(x-5,y-11,3,5); ctx.fillRect(x+2,y-11,3,5);
  ctx.beginPath();ctx.moveTo(x-9,y-2);ctx.lineTo(x+9,y-2);ctx.stroke();ctx.restore();
}
function icoBat(ctx,x,y,c){
  ctx.save();ctx.fillStyle=c;ctx.translate(x,y);ctx.rotate(-Math.PI/4);
  ctx.fillRect(-2,-13,4,5);
  ctx.beginPath();ctx.moveTo(-4,-8);ctx.lineTo(4,-8);ctx.lineTo(5,9);ctx.quadraticCurveTo(0,13,-5,9);ctx.closePath();ctx.fill();
  ctx.restore();
}
function icoChart(ctx,x,y,c){
  ctx.save();ctx.strokeStyle=c;ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(x-9,y+7);ctx.lineTo(x-3,y-2);ctx.lineTo(x+2,y+3);ctx.lineTo(x+9,y-8);ctx.stroke();
  ctx.fillStyle=c;ctx.beginPath();ctx.arc(x+9,y-8,2.5,0,Math.PI*2);ctx.fill();ctx.restore();
}
function icoSpeed(ctx,x,y,c){
  ctx.save();ctx.strokeStyle=c;ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(x,y+3,9,Math.PI,0);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x,y+3);ctx.lineTo(x+6,y-4);ctx.stroke();
  ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y+3,2,0,Math.PI*2);ctx.fill();ctx.restore();
}
function icoWickets(ctx,x,y,c){
  ctx.save();ctx.strokeStyle=c;ctx.lineWidth=2.2;
  for(const dx of[-6,0,6]){ctx.beginPath();ctx.moveTo(x+dx,y-9);ctx.lineTo(x+dx,y+9);ctx.stroke();}
  ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(x-8,y-10);ctx.lineTo(x-1,y-10);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x+1,y-10);ctx.lineTo(x+8,y-10);ctx.stroke();ctx.restore();
}
function icoTarget(ctx,x,y,c){
  ctx.save();ctx.strokeStyle=c;ctx.lineWidth=1.8;
  ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,2,0,Math.PI*2);ctx.fill();ctx.restore();
}
function icoStar(ctx,x,y,c){
  ctx.save();ctx.fillStyle=c;ctx.beginPath();
  for(let i=0;i<5;i++){
    const a1=(Math.PI/2)*3+i*(Math.PI*2/5),a2=a1+Math.PI/5;
    i===0?ctx.moveTo(x+Math.cos(a1)*10,y+Math.sin(a1)*10):ctx.lineTo(x+Math.cos(a1)*10,y+Math.sin(a1)*10);
    ctx.lineTo(x+Math.cos(a2)*4.5,y+Math.sin(a2)*4.5);
  }
  ctx.closePath();ctx.fill();ctx.restore();
}
function icoNum(ctx,x,y,c,n){
  ctx.save();ctx.strokeStyle=c;ctx.lineWidth=1.8;
  ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle=c;ctx.font=`bold ${n==='100'?6.5:8}px "DejaVu Sans"`;
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(n,x,y+0.5);
  ctx.textBaseline='alphabetic';ctx.restore();
}
function icoGrid(ctx,x,y,c){
  ctx.save();ctx.fillStyle=c;
  const s=3,g=2;
  for(let r=0;r<3;r++) for(let col=0;col<3;col++)
    ctx.fillRect(x-5+col*(s+g),y-5+r*(s+g),s,s);
  ctx.restore();
}

// ── Background ──
function drawBg(ctx,tc){
  const W=600,H=1000;
  // Sky
  const sky=ctx.createLinearGradient(0,0,0,H*0.6);
  sky.addColorStop(0,'#05030a');sky.addColorStop(0.6,'#0e0709');sky.addColorStop(1,'#1a0d04');
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  // Ground
  const gnd=ctx.createLinearGradient(0,H*0.5,0,H);
  gnd.addColorStop(0,'#0e0700');gnd.addColorStop(1,'#040200');
  ctx.fillStyle=gnd;ctx.fillRect(0,H*0.5,W,H*0.5);
  // Stadium floodlights glow
  for(const [lx,ly,op] of [[60,100,0.35],[540,100,0.35],[20,180,0.18],[580,180,0.18]]){
    const g=ctx.createRadialGradient(lx,ly,4,lx,ly,160);
    g.addColorStop(0,`rgba(255,190,60,${op})`);
    g.addColorStop(0.5,`rgba(255,130,20,${op*0.3})`);
    g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  }
  // Crowd silhouette suggestion - faint dots
  ctx.save();ctx.globalAlpha=0.04;ctx.fillStyle='#ffaa33';
  for(let i=0;i<80;i++){
    const bx=20+Math.sin(i*7.3)*250+250,by=140+Math.cos(i*5.1)*40+(i%3)*18;
    ctx.beginPath();ctx.arc(bx,by,2+Math.sin(i)*1,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
  // Pitch lines
  ctx.save();ctx.globalAlpha=0.06;ctx.strokeStyle='#ffffff';ctx.lineWidth=1;
  const hor=H*0.54,cx2=W/2;
  for(let dx=-240;dx<=240;dx+=48){ctx.beginPath();ctx.moveTo(cx2+dx*0.1,hor);ctx.lineTo(cx2+dx,H);ctx.stroke();}
  ctx.restore();
  // Theme color floor glow
  const tg=ctx.createRadialGradient(W/2,H,0,W/2,H,420);
  tg.addColorStop(0,tc+'30');tg.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=tg;ctx.fillRect(0,0,W,H);
  // Ember sparks
  ctx.save();
  const embers=[[110,260,2.2],[195,140,1.8],[75,380,1.5],[470,200,2],[535,290,1.5],
    [430,150,1.8],[340,110,1.2],[490,130,1.6],[160,310,1.3],[510,380,1.8],
    [65,450,1.1],[555,420,1.9],[140,170,1.6],[320,80,1.1],[250,340,1.4]];
  for(const [ex,ey,er] of embers){
    const rg=ctx.createRadialGradient(ex,ey,0,ex,ey,er*4);
    rg.addColorStop(0,tc);rg.addColorStop(0.4,tc+'80');rg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=rg;ctx.beginPath();ctx.arc(ex,ey,er*4,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#ffffffcc';ctx.beginPath();ctx.arc(ex,ey,er*0.5,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}

// ── Card Frame ──
function drawFrame(ctx,tc,sc){
  const x=18,y=18,w=564,h=964,r=16;
  // Outer glow
  ctx.save();ctx.shadowColor=tc;ctx.shadowBlur=32;
  ctx.strokeStyle=tc;ctx.lineWidth=3.5;
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.stroke();
  // Inner track
  ctx.shadowColor=sc;ctx.shadowBlur=14;
  ctx.strokeStyle=sc;ctx.lineWidth=1.5;
  ctx.beginPath();ctx.roundRect(x+9,y+9,w-18,h-18,r-4);ctx.stroke();
  ctx.shadowBlur=0;ctx.restore();
  // Corner notches
  ctx.save();ctx.strokeStyle=tc;ctx.lineWidth=3.5;ctx.shadowColor=tc;ctx.shadowBlur=16;
  for(const [cx2,cy2,dx,dy] of[[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]]){
    ctx.beginPath();ctx.moveTo(cx2+dx*6,cy2);ctx.lineTo(cx2+dx*36,cy2);
    ctx.moveTo(cx2,cy2+dy*6);ctx.lineTo(cx2,cy2+dy*36);ctx.stroke();
  }
  ctx.restore();
}

// ── Stat Panel ──
function drawPanel(ctx,title,items,px,py,pw,ph,tc){
  ctx.save();
  ctx.fillStyle='rgba(6,3,1,0.90)';
  ctx.strokeStyle=tc+'cc';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.roundRect(px,py,pw,ph,7);ctx.fill();ctx.stroke();
  // Title bar gradient
  if(title){
    const tg=ctx.createLinearGradient(px,py,px+pw,py);
    tg.addColorStop(0,tc+'00');tg.addColorStop(0.3,tc+'55');tg.addColorStop(0.7,tc+'55');tg.addColorStop(1,tc+'00');
    ctx.fillStyle=tg;ctx.fillRect(px+2,py+2,pw-4,24);
    ctx.fillStyle=tc;ctx.font='bold 10px "DejaVu Sans"';ctx.textAlign='center';
    ctx.fillText(title,px+pw/2,py+17);
  }
  const cw=pw/items.length;
  items.forEach((item,i)=>{
    const ix=px+cw*i+cw/2, iy=py+(title?28:8);
    item.icon(ctx,ix,iy+12,tc);
    ctx.fillStyle='#999';ctx.font='bold 8.5px "DejaVu Sans"';ctx.textAlign='center';
    ctx.fillText(item.label,ix,iy+30);
    ctx.fillStyle='#ffffff';ctx.font='bold 18px "DejaVu Sans"';
    ctx.shadowColor=tc;ctx.shadowBlur=8;
    ctx.fillText(String(item.val),ix,iy+52);ctx.shadowBlur=0;
    if(i<items.length-1){
      ctx.strokeStyle=tc+'50';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(px+cw*(i+1),py+28);ctx.lineTo(px+cw*(i+1),py+ph-8);ctx.stroke();
    }
  });
  ctx.restore();
}

// ── Main ──
async function generateProfileCard(user, stats, avatarBuffer) {
  const W=800,H=1000;
  const canvas=createCanvas(W,H);
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#020101';ctx.fillRect(0,0,W,H);
  ctx.save();ctx.translate(100,0);

  const themeName=user.card_theme||'red';
  let theme=themes.find(t=>t.name===themeName)||themes[0];
  if(!user.card_theme&&user.id) theme=themes[(parseInt(user.id)||0)%themes.length];
  const tc=theme.themeColor, sc=theme.secondaryColor;

  drawBg(ctx,tc);
  drawFrame(ctx,tc,sc);

  // CCG Logo top-left
  try {
    const logoImg=await loadImage(path.join(__dirname,'assets','ccg_logo.png'));
    ctx.drawImage(logoImg,28,26,88,88);
  } catch(e) {
    ctx.fillStyle=tc;ctx.font='bold 14px "DejaVu Sans"';ctx.textAlign='left';ctx.fillText('CCG',40,70);
  }

  // SEASON 3 badge top-right
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,0.8)';ctx.strokeStyle=tc;ctx.lineWidth=1.5;
  ctx.beginPath();ctx.roundRect(388,42,168,36,7);ctx.fill();ctx.stroke();
  ctx.fillStyle='#ffffff';ctx.font='bold 14px "DejaVu Sans"';ctx.textAlign='left';
  ctx.fillText('SEASON 3',406,65);
  ctx.fillStyle=tc;ctx.fillText(' ///',498,65);
  ctx.restore();

  // Avatar ring
  const avX=300,avY=275,avR=100;
  ctx.save();
  // Multi-layer glow
  for(let i=4;i>=1;i--){
    ctx.strokeStyle=tc+(i===4?'20':i===3?'40':i===2?'70':'cc');
    ctx.lineWidth=i*7;ctx.shadowColor=tc;ctx.shadowBlur=25*i;
    ctx.beginPath();ctx.arc(avX,avY,avR+12+i*4,0,Math.PI*2);ctx.stroke();
  }
  ctx.strokeStyle='#ffffff55';ctx.lineWidth=1.5;ctx.shadowBlur=0;
  ctx.beginPath();ctx.arc(avX,avY,avR+12,0,Math.PI*2);ctx.stroke();
  ctx.restore();
  // Sparks on ring
  ctx.save();
  for(const ang of[0.2,0.9,1.7,2.6,3.5,4.4,5.2]){
    const sx=avX+Math.cos(ang)*(avR+24),sy=avY+Math.sin(ang)*(avR+24);
    const rg=ctx.createRadialGradient(sx,sy,0,sx,sy,7);
    rg.addColorStop(0,'#ffffff');rg.addColorStop(0.4,tc);rg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=rg;ctx.beginPath();ctx.arc(sx,sy,7,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
  // Avatar image
  let img=null;
  if(avatarBuffer){try{img=await loadImage(avatarBuffer);}catch(e){}}
  ctx.save();ctx.beginPath();ctx.arc(avX,avY,avR,0,Math.PI*2);ctx.clip();
  if(img) ctx.drawImage(img,avX-avR,avY-avR,avR*2,avR*2);
  else drawSilhouette(ctx,avX,avY,avR);
  ctx.restore();

  // Nameplate
  const name=normalizeStyledText(user.first_name||'PLAYER').toUpperCase();
  const handle=`@${(user.username||user.first_name||'player').toLowerCase().replace(/\s+/g,'_').slice(0,20)}`;
  let fs=36;
  ctx.font=`bold italic ${fs}px "DejaVu Sans"`;
  while(fs>16&&ctx.measureText(name).width>400){fs--;ctx.font=`bold italic ${fs}px "DejaVu Sans"`;}
  const npY=avY+avR+28,npH=72,npX=65,npW=470;
  ctx.save();
  ctx.fillStyle='rgba(5,2,1,0.93)';ctx.strokeStyle=tc;ctx.lineWidth=1.8;
  ctx.beginPath();
  ctx.moveTo(npX+18,npY);ctx.lineTo(npX+npW-18,npY);
  ctx.lineTo(npX+npW,npY+18);ctx.lineTo(npX+npW,npY+npH-10);
  ctx.lineTo(npX+npW-10,npY+npH);ctx.lineTo(npX+10,npY+npH);
  ctx.lineTo(npX,npY+npH-10);ctx.lineTo(npX,npY+18);
  ctx.closePath();ctx.fill();ctx.stroke();
  // Accent slashes
  ctx.fillStyle=tc;ctx.font='bold 15px "DejaVu Sans"';ctx.textAlign='left';ctx.globalAlpha=0.85;
  ctx.fillText('///',npX+10,npY+npH/2+8);
  ctx.textAlign='right';ctx.fillText('///',npX+npW-10,npY+npH/2+8);ctx.globalAlpha=1;
  // Name
  ctx.fillStyle='#ffffff';ctx.font=`bold italic ${fs}px "DejaVu Sans"`;
  ctx.textAlign='center';ctx.shadowColor=tc;ctx.shadowBlur=10;
  drawTextWithEmojis(ctx,name,300,npY+40,`bold italic ${fs}px "DejaVu Sans"`);
  ctx.shadowBlur=0;
  ctx.fillStyle=tc+'dd';ctx.font='12px "DejaVu Sans"';
  ctx.fillText(handle,300,npY+58);
  ctx.restore();

  // Stats
  const avg=stats.dismissals>0?(stats.runs/stats.dismissals).toFixed(1):(stats.runs>0?`${stats.runs}*`:'0.0');
  const sr=stats.balls_faced>0?((stats.runs/stats.balls_faced)*100).toFixed(1):'0.0';
  const econ=stats.balls_bowled>0?((stats.runs_conceded*6)/stats.balls_bowled).toFixed(1):'0.0';
  const bavg=stats.wickets>0?(stats.runs_conceded/stats.wickets).toFixed(1):'0.0';
  const bb=`${stats.best_wickets||0}/${stats.best_runs_conceded||0}`;
  const matches=(stats.wins||0)+(stats.losses||0);
  const hs=stats.highscore>0?`${stats.highscore}*`:'0';
  const PX=42,PW=516,PH=92,gap=10;
  const p1y=npY+npH+gap;
  drawPanel(ctx,'BATTING STATS',[
    {label:'MATCHES',val:matches,icon:icoCalendar},
    {label:'RUNS',val:stats.runs||0,icon:icoBat},
    {label:'AVERAGE',val:avg,icon:icoChart},
    {label:'STRIKE RATE',val:sr,icon:icoSpeed},
  ],PX,p1y,PW,PH,tc);
  const p2y=p1y+PH+gap;
  drawPanel(ctx,'BOWLING STATS',[
    {label:'WICKETS',val:stats.wickets||0,icon:icoWickets},
    {label:'ECONOMY',val:econ,icon:icoSpeed},
    {label:'AVERAGE',val:bavg,icon:icoChart},
    {label:'BEST BOWLING',val:bb,icon:icoTarget},
  ],PX,p2y,PW,PH,tc);
  const p3y=p2y+PH+gap;
  // Bottom 4 mini boxes
  const bw=(PW-gap*3)/4;
  const bItems=[
    {label:'HIGHEST SCORE',val:hs,icon:icoStar},
    {label:'50s',val:stats.fifties||0,icon:(c,x,y,tc2)=>icoNum(c,x,y,tc2,'50')},
    {label:'100s',val:stats.centuries||0,icon:(c,x,y,tc2)=>icoNum(c,x,y,tc2,'100')},
    {label:'MOTM',val:stats.motm||0,icon:icoGrid},
  ];
  bItems.forEach((item,i)=>{
    const bx=PX+i*(bw+gap);
    drawPanel(ctx,'',[ {label:item.label,val:item.val,icon:item.icon} ],bx,p3y,bw,80,tc);
  });

  // Bottom brand
  ctx.save();ctx.fillStyle='rgba(255,255,255,0.15)';
  ctx.font='bold 9px "DejaVu Sans"';ctx.textAlign='center';
  ctx.fillText('CCG · HANDCRICKET PRO CARD',300,968);ctx.restore();

  ctx.restore();
  return canvas.toBuffer('image/png');
}

module.exports = { generateProfileCard, normalizeStyledText };
