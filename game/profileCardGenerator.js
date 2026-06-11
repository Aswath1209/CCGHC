const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');
try { GlobalFonts.loadSystemFonts(); } catch(e) {}

const ASSETS = path.join(__dirname, 'assets');

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
  ctx.fillStyle='#1a1714';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#3d3730';ctx.beginPath();ctx.arc(x,y-r*0.15,r*0.38,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(x,y+r*1.05,r*0.75,Math.PI,0,false);ctx.fill();
}

// ── stat row: icon left, label+val right ──
function drawStatRow(ctx,ix,iy,rowW,rowH,iconFn,label,val,tc){
  ctx.save();
  const iconX=ix+22,iconY=iy+rowH/2;
  iconFn(ctx,iconX,iconY,tc);
  ctx.fillStyle='#aaaaaa';ctx.font='bold 8.5px "DejaVu Sans"';ctx.textAlign='left';
  ctx.fillText(label,ix+46,iy+rowH/2-6);
  ctx.fillStyle='#ffffff';ctx.font='bold 20px "DejaVu Sans"';
  ctx.shadowColor=tc;ctx.shadowBlur=6;
  ctx.fillText(String(val),ix+46,iy+rowH/2+14);
  ctx.shadowBlur=0;ctx.restore();
}

// ── icons ──
function icoCalendar(ctx,x,y,c){ctx.save();ctx.strokeStyle=c;ctx.fillStyle=c;ctx.lineWidth=1.5;ctx.strokeRect(x-10,y-8,20,17);ctx.fillRect(x-6,y-12,4,5);ctx.fillRect(x+2,y-12,4,5);ctx.beginPath();ctx.moveTo(x-10,y-2);ctx.lineTo(x+10,y-2);ctx.stroke();ctx.restore();}
function icoBat(ctx,x,y,c){ctx.save();ctx.fillStyle=c;ctx.translate(x,y);ctx.rotate(-Math.PI/4);ctx.fillRect(-2,-14,4,6);ctx.beginPath();ctx.moveTo(-4,-8);ctx.lineTo(4,-8);ctx.lineTo(5,10);ctx.quadraticCurveTo(0,14,-5,10);ctx.closePath();ctx.fill();ctx.restore();}
function icoChart(ctx,x,y,c){ctx.save();ctx.strokeStyle=c;ctx.lineWidth=2.2;ctx.beginPath();ctx.moveTo(x-10,y+8);ctx.lineTo(x-4,y-2);ctx.lineTo(x+2,y+4);ctx.lineTo(x+10,y-8);ctx.stroke();ctx.fillStyle=c;ctx.beginPath();ctx.arc(x+10,y-8,3,0,Math.PI*2);ctx.fill();ctx.restore();}
function icoSpeed(ctx,x,y,c){ctx.save();ctx.strokeStyle=c;ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y+3,10,Math.PI,0);ctx.stroke();ctx.beginPath();ctx.moveTo(x,y+3);ctx.lineTo(x+7,y-5);ctx.stroke();ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y+3,2.5,0,Math.PI*2);ctx.fill();ctx.restore();}
function icoWickets(ctx,x,y,c){ctx.save();ctx.strokeStyle=c;ctx.lineWidth=2.5;for(const dx of[-7,0,7]){ctx.beginPath();ctx.moveTo(x+dx,y-10);ctx.lineTo(x+dx,y+10);ctx.stroke();}ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x-9,y-11);ctx.lineTo(x-1,y-11);ctx.stroke();ctx.beginPath();ctx.moveTo(x+1,y-11);ctx.lineTo(x+9,y-11);ctx.stroke();ctx.restore();}
function icoTarget(ctx,x,y,c){ctx.save();ctx.strokeStyle=c;ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(x,y,10,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(x,y,6,0,Math.PI*2);ctx.stroke();ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,2.5,0,Math.PI*2);ctx.fill();ctx.restore();}
function icoStar(ctx,x,y,c){ctx.save();ctx.fillStyle=c;ctx.beginPath();for(let i=0;i<5;i++){const a1=(Math.PI/2)*3+i*(Math.PI*2/5),a2=a1+Math.PI/5;i===0?ctx.moveTo(x+Math.cos(a1)*11,y+Math.sin(a1)*11):ctx.lineTo(x+Math.cos(a1)*11,y+Math.sin(a1)*11);ctx.lineTo(x+Math.cos(a2)*5,y+Math.sin(a2)*5);}ctx.closePath();ctx.fill();ctx.restore();}
function icoCircle(ctx,x,y,c,n){ctx.save();ctx.strokeStyle=c;ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,10,0,Math.PI*2);ctx.stroke();ctx.fillStyle=c;ctx.font=`bold ${n.length>2?7:8.5}px "DejaVu Sans"`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(n,x,y+0.5);ctx.textBaseline='alphabetic';ctx.restore();}
function icoGrid(ctx,x,y,c){ctx.save();ctx.fillStyle=c;const s=3.5,g=2;for(let r=0;r<3;r++)for(let col=0;col<3;col++)ctx.fillRect(x-6+col*(s+g),y-6+r*(s+g),s,s);ctx.restore();}

async function generateProfileCard(user,stats,avatarBuffer){
  const W=800,H=1000;
  const canvas=createCanvas(W,H);
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);

  // translate to center 600px card
  ctx.save();ctx.translate(100,0);
  const CW=600;

  const themeName=user.card_theme||'red';
  let th=themes.find(t=>t.name===themeName)||themes[0];
  if(!user.card_theme&&user.id)th=themes[(parseInt(user.id)||0)%themes.length];
  const tc=th.tc,sc=th.sc;

  // ── 1. Full stadium background
  try{
    const bg=await loadImage(path.join(ASSETS,'stadium_bg.png'));
    ctx.drawImage(bg,0,0,CW,1000);
  }catch(e){ctx.fillStyle='#0a0608';ctx.fillRect(0,0,CW,1000);}

  // Dark fade on bottom half for readability
  const fade=ctx.createLinearGradient(0,380,0,1000);
  fade.addColorStop(0,'rgba(0,0,0,0)');
  fade.addColorStop(0.2,'rgba(0,0,0,0.75)');
  fade.addColorStop(1,'rgba(0,0,0,0.97)');
  ctx.fillStyle=fade;ctx.fillRect(0,0,CW,1000);

  // ── 2. Card outer frame (thick glow border)
  // Main glow
  ctx.save();
  ctx.shadowColor=tc;ctx.shadowBlur=40;
  ctx.strokeStyle=tc;ctx.lineWidth=4;
  ctx.beginPath();ctx.roundRect(16,16,568,968,14);ctx.stroke();
  // inner secondary track
  ctx.shadowColor=sc;ctx.shadowBlur=15;
  ctx.strokeStyle=sc+'bb';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.roundRect(24,24,552,952,10);ctx.stroke();
  ctx.shadowBlur=0;ctx.restore();

  // Corner bracket notches - 4 corners
  ctx.save();ctx.strokeStyle=tc;ctx.lineWidth=4;ctx.shadowColor=tc;ctx.shadowBlur=20;
  const corners=[[16,16,1,1],[584,16,-1,1],[16,984,1,-1],[584,984,-1,-1]];
  for(const[cx2,cy2,dx,dy] of corners){
    ctx.beginPath();
    ctx.moveTo(cx2+dx*8,cy2);ctx.lineTo(cx2+dx*48,cy2);
    ctx.moveTo(cx2,cy2+dy*8);ctx.lineTo(cx2,cy2+dy*48);
    ctx.stroke();
    // small diagonal cut
    ctx.beginPath();ctx.moveTo(cx2+dx*8,cy2);ctx.lineTo(cx2,cy2+dy*8);ctx.stroke();
  }
  ctx.restore();

  // Hexagonal texture subtly overlaid on frame edges
  ctx.save();ctx.globalAlpha=0.08;ctx.strokeStyle=tc;ctx.lineWidth=0.8;
  for(let hy=30;hy<970;hy+=28){
    for(let hx=30;hx<570;hx+=24){
      const isEdge=(hx<60||hx>540||hy<60||hy>940);
      if(!isEdge)continue;
      ctx.beginPath();
      for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.lineTo(hx+8*Math.cos(a),hy+8*Math.sin(a));}
      ctx.closePath();ctx.stroke();
    }
  }
  ctx.globalAlpha=1;ctx.restore();

  // ── 3. CCG Logo top-left
  try{
    const logo=await loadImage(path.join(ASSETS,'ccg_logo.png'));
    ctx.drawImage(logo,24,22,95,95);
  }catch(e){ctx.fillStyle=tc;ctx.font='bold 16px "DejaVu Sans"';ctx.textAlign='left';ctx.fillText('CCG',44,75);}

  // ── 4. Season badge top-right
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,0.85)';ctx.strokeStyle=tc;ctx.lineWidth=1.8;
  ctx.beginPath();ctx.roundRect(388,36,175,40,8);ctx.fill();ctx.stroke();
  ctx.fillStyle='#ffffff';ctx.font='bold 15px "DejaVu Sans"';ctx.textAlign='left';ctx.fillText('SEASON 3',406,62);
  ctx.fillStyle=tc;ctx.font='bold 15px "DejaVu Sans"';ctx.fillText(' ///',502,62);
  ctx.restore();

  // ── 5. Avatar (large - radius 115px, centered)
  const avX=300,avY=285,avR=115;

  // Glow ring - 5 passes from wide/dim to tight/bright
  ctx.save();
  for(let i=5;i>=1;i--){
    const opx=['10','25','45','75','cc'];
    ctx.strokeStyle=tc+opx[i-1];
    ctx.lineWidth=i*9;ctx.shadowColor=tc;ctx.shadowBlur=30*i;
    ctx.beginPath();ctx.arc(avX,avY,avR+16+i*5,0,Math.PI*2);ctx.stroke();
  }
  // Bright crisp ring
  ctx.strokeStyle=tc;ctx.lineWidth=3;ctx.shadowColor=tc;ctx.shadowBlur=30;
  ctx.beginPath();ctx.arc(avX,avY,avR+16,0,Math.PI*2);ctx.stroke();
  // White hot core
  ctx.strokeStyle='#ffffffaa';ctx.lineWidth=1.5;ctx.shadowBlur=0;
  ctx.beginPath();ctx.arc(avX,avY,avR+16,0,Math.PI*2);ctx.stroke();
  ctx.restore();

  // Spark particles on ring
  ctx.save();
  for(const ang of[0.1,0.65,1.3,2.0,2.8,3.6,4.4,5.0,5.7]){
    const r2=avR+28,sx=avX+Math.cos(ang)*r2,sy=avY+Math.sin(ang)*r2;
    const rg=ctx.createRadialGradient(sx,sy,0,sx,sy,9);
    rg.addColorStop(0,'#ffffff');rg.addColorStop(0.3,tc);rg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=rg;ctx.beginPath();ctx.arc(sx,sy,9,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();

  // Avatar image
  let img=null;
  if(avatarBuffer){try{img=await loadImage(avatarBuffer);}catch(e){}}
  ctx.save();ctx.beginPath();ctx.arc(avX,avY,avR,0,Math.PI*2);ctx.clip();
  if(img)ctx.drawImage(img,avX-avR,avY-avR,avR*2,avR*2);
  else drawSilhouette(ctx,avX,avY,avR);
  ctx.restore();

  // ── 6. Nameplate
  const name=normalizeStyledText(user.first_name||'PLAYER').toUpperCase();
  const handle=`@${(user.username||user.first_name||'player').toLowerCase().replace(/\s+/g,'_').slice(0,24)}`;
  let fs=40;ctx.font=`bold italic ${fs}px "DejaVu Sans"`;
  while(fs>18&&ctx.measureText(name).width>380){fs--;ctx.font=`bold italic ${fs}px "DejaVu Sans"`;}

  const npY=avY+avR+28,npH=80,npX=55,npW=490;
  ctx.save();
  ctx.fillStyle='rgba(4,2,1,0.92)';ctx.strokeStyle=tc;ctx.lineWidth=2;
  ctx.beginPath();
  ctx.moveTo(npX+20,npY);ctx.lineTo(npX+npW-20,npY);
  ctx.lineTo(npX+npW,npY+20);ctx.lineTo(npX+npW,npY+npH-12);
  ctx.lineTo(npX+npW-12,npY+npH);ctx.lineTo(npX+12,npY+npH);
  ctx.lineTo(npX,npY+npH-12);ctx.lineTo(npX,npY+20);
  ctx.closePath();ctx.fill();ctx.stroke();

  // Chevrons <<< and >>> (like in reference)
  ctx.fillStyle=tc;ctx.font='bold 18px "DejaVu Sans"';
  ctx.textAlign='left';ctx.fillText('<<<',npX+8,npY+npH/2+8);
  ctx.textAlign='right';ctx.fillText('>>>',npX+npW-8,npY+npH/2+8);

  // Player name
  ctx.fillStyle='#ffffff';ctx.font=`bold italic ${fs}px "DejaVu Sans"`;
  ctx.textAlign='center';ctx.shadowColor=tc;ctx.shadowBlur=14;
  drawText(ctx,name,300,npY+46,`bold italic ${fs}px "DejaVu Sans"`);ctx.shadowBlur=0;
  // Handle
  ctx.fillStyle=tc+'ee';ctx.font='13px "DejaVu Sans"';ctx.fillText(handle,300,npY+65);
  ctx.restore();

  // ── 7. Stat panels
  const avg=stats.dismissals>0?(stats.runs/stats.dismissals).toFixed(1):(stats.runs>0?`${stats.runs}*`:'0.0');
  const sr=stats.balls_faced>0?((stats.runs/stats.balls_faced)*100).toFixed(1):'0.0';
  const econ=stats.balls_bowled>0?((stats.runs_conceded*6)/stats.balls_bowled).toFixed(1):'0.0';
  const bavg=stats.wickets>0?(stats.runs_conceded/stats.wickets).toFixed(1):'0.0';
  const bb=`${stats.best_wickets||0}/${stats.best_runs_conceded||0}`;
  const matches=(stats.wins||0)+(stats.losses||0);
  const hs=stats.highscore>0?`${stats.highscore}*`:'0';

  // Panel draw helper - title row + 2-column icon grid
  function panel(title,rows,px,py,pw,ph){
    ctx.save();
    ctx.fillStyle='rgba(5,2,1,0.90)';ctx.strokeStyle=tc+'cc';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.roundRect(px,py,pw,ph,6);ctx.fill();ctx.stroke();
    // title band
    const tg=ctx.createLinearGradient(px,py,px+pw,py);
    tg.addColorStop(0,tc+'00');tg.addColorStop(0.25,tc+'55');tg.addColorStop(0.75,tc+'55');tg.addColorStop(1,tc+'00');
    ctx.fillStyle=tg;ctx.fillRect(px+2,py+1,pw-4,26);
    ctx.fillStyle=tc;ctx.font='bold 10.5px "DejaVu Sans"';ctx.textAlign='center';
    ctx.fillText(title,px+pw/2,py+18);
    // Horizontal divider below title
    ctx.strokeStyle=tc+'66';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(px+8,py+27);ctx.lineTo(px+pw-8,py+27);ctx.stroke();
    // rows - 2 per row, each row is icon-left label/val-right
    const rH=(ph-30)/Math.ceil(rows.length/2);
    rows.forEach((item,i)=>{
      const col=i%2,row=Math.floor(i/2);
      const rx=px+(col*(pw/2)),ry=py+28+row*rH;
      const rw=pw/2;
      drawStatRow(ctx,rx,ry,rw,rH,item.icon,item.label,item.val,tc);
      // vertical divider
      if(col===0&&i+1<rows.length){
        ctx.strokeStyle=tc+'44';ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(rx+rw,ry+8);ctx.lineTo(rx+rw,ry+rH-8);ctx.stroke();
      }
      // horizontal divider between rows
      if(row>0&&col===0){
        ctx.strokeStyle=tc+'33';ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(rx+8,ry);ctx.lineTo(rx+pw-8,ry);ctx.stroke();
      }
    });
    ctx.restore();
  }

  const PX=38,PW=524,gap=9;
  const p1y=npY+npH+gap;
  panel('BATTING STATS',[
    {label:'MATCHES',val:matches,icon:icoCalendar},
    {label:'RUNS',val:(stats.runs||0).toLocaleString(),icon:icoBat},
    {label:'AVERAGE',val:avg,icon:icoChart},
    {label:'STRIKE RATE',val:sr,icon:icoSpeed},
  ],PX,p1y,PW,108);

  const p2y=p1y+108+gap;
  panel('BOWLING STATS',[
    {label:'WICKETS',val:stats.wickets||0,icon:icoWickets},
    {label:'ECONOMY',val:econ,icon:icoSpeed},
    {label:'AVERAGE',val:bavg,icon:icoChart},
    {label:'BEST BOWLING',val:bb,icon:icoTarget},
  ],PX,p2y,PW,108);

  // ── 8. Bottom 4 mini boxes
  const p3y=p2y+108+gap;
  const bItems=[
    {label:'HIGHEST SCORE',val:hs,icon:icoStar},
    {label:'50s',val:stats.fifties||0,icon:(c,x,y,t)=>icoCircle(c,x,y,t,'50')},
    {label:'100s',val:stats.centuries||0,icon:(c,x,y,t)=>icoCircle(c,x,y,t,'100')},
    {label:'MOTM',val:stats.motm||0,icon:icoGrid},
  ];
  const bw=(PW-gap*3)/4;
  bItems.forEach((item,i)=>{
    const bx=PX+i*(bw+gap);
    ctx.save();
    ctx.fillStyle='rgba(5,2,1,0.90)';ctx.strokeStyle=tc+'cc';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.roundRect(bx,p3y,bw,80,6);ctx.fill();ctx.stroke();
    // icon top-center
    item.icon(ctx,bx+bw/2,p3y+24,tc);
    ctx.fillStyle='#999';ctx.font='bold 7.5px "DejaVu Sans"';ctx.textAlign='center';
    ctx.fillText(item.label,bx+bw/2,p3y+42);
    ctx.fillStyle='#fff';ctx.font='bold 18px "DejaVu Sans"';
    ctx.shadowColor=tc;ctx.shadowBlur=6;
    ctx.fillText(String(item.val),bx+bw/2,p3y+65);ctx.shadowBlur=0;
    ctx.restore();
  });

  // ── Footer
  ctx.save();ctx.fillStyle='rgba(255,255,255,0.12)';
  ctx.font='bold 9px "DejaVu Sans"';ctx.textAlign='center';
  ctx.fillText('CCG · HANDCRICKET PRO COLLECTIBLE CARD',300,972);ctx.restore();

  ctx.restore();
  return canvas.toBuffer('image/png');
}

module.exports={generateProfileCard,normalizeStyledText};
