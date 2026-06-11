const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');
try { GlobalFonts.loadSystemFonts(); } catch(e) {}

const themes = [
  { name:'red',    tc:'#f97316', sc:'#ef4444' },
  { name:'blue',   tc:'#38bdf8', sc:'#8b5cf6' },
  { name:'green',  tc:'#22c55e', sc:'#06b6d4' },
  { name:'purple', tc:'#a855f7', sc:'#ec4899' },
  { name:'gold',   tc:'#fbbf24', sc:'#f97316' },
  { name:'cyan',   tc:'#06b6d4', sc:'#4f46e5' },
  { name:'pink',   tc:'#ec4899', sc:'#38bdf8' },
];

const unicodeMap={0x1d00:'A',0x299:'B',0x1d04:'C',0x1d05:'D',0x1d07:'E',0xa730:'F',0x262:'G',0x29c:'H',0x26a:'I',0x1d0a:'J',0x1d0b:'K',0x29f:'L',0x1d0d:'M',0x274:'N',0x1d0f:'O',0x1d18:'P',0x280:'R',0xa731:'S',0x1d1b:'T',0x1d1c:'U',0x1d20:'V',0x1d21:'W',0x28f:'Y',0x1d22:'Z'};
function normalizeStyledText(str){
  if(!str)return'';
  return[...str].map(ch=>{const cp=ch.codePointAt(0);if(!cp)return ch;if(unicodeMap[cp])return unicodeMap[cp];if(cp>=0x1d400&&cp<=0x1d419)return String.fromCharCode(cp-0x1d400+65);if(cp>=0x1d41a&&cp<=0x1d433)return String.fromCharCode(cp-0x1d41a+97);if(cp>=0xff21&&cp<=0xff3a)return String.fromCharCode(cp-0xff21+65);if(cp>=0xff41&&cp<=0xff5a)return String.fromCharCode(cp-0xff41+97);return ch;}).join('');
}

function drawTextWithEmojis(ctx,text,x,y,fontSpec){
  if(!text)return;const str=String(text);
  const parts=fontSpec.split(/\s+/);const fi=parts.findIndex(p=>p.includes('DejaVu')||p.includes('sans-serif'));
  let sz='14px',fam='DejaVu Sans';
  if(fi!==-1){sz=parts.slice(0,fi).join(' ');fam=parts.slice(fi).join(' ').replace(/['"]/g,'');}
  else sz=parts.slice(0,-1).join(' ');
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

// icons
function icoCalendar(ctx,x,y,c){ctx.save();ctx.strokeStyle=c;ctx.fillStyle=c;ctx.lineWidth=1.5;ctx.strokeRect(x-9,y-7,18,15);ctx.fillRect(x-5,y-11,3,5);ctx.fillRect(x+2,y-11,3,5);ctx.beginPath();ctx.moveTo(x-9,y-2);ctx.lineTo(x+9,y-2);ctx.stroke();ctx.restore();}
function icoBat(ctx,x,y,c){ctx.save();ctx.fillStyle=c;ctx.translate(x,y);ctx.rotate(-Math.PI/4);ctx.fillRect(-2,-13,4,5);ctx.beginPath();ctx.moveTo(-4,-8);ctx.lineTo(4,-8);ctx.lineTo(5,9);ctx.quadraticCurveTo(0,13,-5,9);ctx.closePath();ctx.fill();ctx.restore();}
function icoChart(ctx,x,y,c){ctx.save();ctx.strokeStyle=c;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-9,y+7);ctx.lineTo(x-3,y-2);ctx.lineTo(x+2,y+3);ctx.lineTo(x+9,y-8);ctx.stroke();ctx.fillStyle=c;ctx.beginPath();ctx.arc(x+9,y-8,2.5,0,Math.PI*2);ctx.fill();ctx.restore();}
function icoSpeed(ctx,x,y,c){ctx.save();ctx.strokeStyle=c;ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y+3,9,Math.PI,0);ctx.stroke();ctx.beginPath();ctx.moveTo(x,y+3);ctx.lineTo(x+6,y-4);ctx.stroke();ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y+3,2,0,Math.PI*2);ctx.fill();ctx.restore();}
function icoWickets(ctx,x,y,c){ctx.save();ctx.strokeStyle=c;ctx.lineWidth=2.2;for(const dx of[-6,0,6]){ctx.beginPath();ctx.moveTo(x+dx,y-9);ctx.lineTo(x+dx,y+9);ctx.stroke();}ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x-8,y-10);ctx.lineTo(x-1,y-10);ctx.stroke();ctx.beginPath();ctx.moveTo(x+1,y-10);ctx.lineTo(x+8,y-10);ctx.stroke();ctx.restore();}
function icoTarget(ctx,x,y,c){ctx.save();ctx.strokeStyle=c;ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.stroke();ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,2,0,Math.PI*2);ctx.fill();ctx.restore();}
function icoStar(ctx,x,y,c){ctx.save();ctx.fillStyle=c;ctx.beginPath();for(let i=0;i<5;i++){const a1=(Math.PI/2)*3+i*(Math.PI*2/5),a2=a1+Math.PI/5;i===0?ctx.moveTo(x+Math.cos(a1)*10,y+Math.sin(a1)*10):ctx.lineTo(x+Math.cos(a1)*10,y+Math.sin(a1)*10);ctx.lineTo(x+Math.cos(a2)*4.5,y+Math.sin(a2)*4.5);}ctx.closePath();ctx.fill();ctx.restore();}
function icoNum(ctx,x,y,c,n){ctx.save();ctx.strokeStyle=c;ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.stroke();ctx.fillStyle=c;ctx.font=`bold ${n==='100'?6.5:8}px "DejaVu Sans"`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(n,x,y+0.5);ctx.textBaseline='alphabetic';ctx.restore();}
function icoGrid(ctx,x,y,c){ctx.save();ctx.fillStyle=c;const s=3,g=2;for(let r=0;r<3;r++)for(let col=0;col<3;col++)ctx.fillRect(x-5+col*(s+g),y-5+r*(s+g),s,s);ctx.restore();}

function drawPanel(ctx,title,items,px,py,pw,ph,tc){
  ctx.save();
  ctx.fillStyle='rgba(6,3,1,0.88)';ctx.strokeStyle=tc+'cc';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.roundRect(px,py,pw,ph,6);ctx.fill();ctx.stroke();
  if(title){
    const tg=ctx.createLinearGradient(px,py,px+pw,py);
    tg.addColorStop(0,tc+'00');tg.addColorStop(0.3,tc+'55');tg.addColorStop(0.7,tc+'55');tg.addColorStop(1,tc+'00');
    ctx.fillStyle=tg;ctx.fillRect(px+2,py+2,pw-4,24);
    ctx.fillStyle=tc;ctx.font='bold 10px "DejaVu Sans"';ctx.textAlign='center';ctx.fillText(title,px+pw/2,py+17);
  }
  const cw=pw/items.length;
  items.forEach((item,i)=>{
    const ix=px+cw*i+cw/2,iy=py+(title?28:8);
    item.icon(ctx,ix,iy+12,tc);
    ctx.fillStyle='#aaa';ctx.font='bold 8.5px "DejaVu Sans"';ctx.textAlign='center';ctx.fillText(item.label,ix,iy+30);
    ctx.fillStyle='#fff';ctx.font='bold 18px "DejaVu Sans"';ctx.shadowColor=tc;ctx.shadowBlur=8;
    ctx.fillText(String(item.val),ix,iy+52);ctx.shadowBlur=0;
    if(i<items.length-1){ctx.strokeStyle=tc+'50';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(px+cw*(i+1),py+28);ctx.lineTo(px+cw*(i+1),py+ph-8);ctx.stroke();}
  });
  ctx.restore();
}

async function generateProfileCard(user,stats,avatarBuffer){
  const W=800,H=1000;
  const canvas=createCanvas(W,H);
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#020101';ctx.fillRect(0,0,W,H);
  ctx.save();ctx.translate(100,0);

  const themeName=user.card_theme||'red';
  let th=themes.find(t=>t.name===themeName)||themes[0];
  if(!user.card_theme&&user.id)th=themes[(parseInt(user.id)||0)%themes.length];
  const tc=th.tc,sc=th.sc;

  // 1. Stadium background image
  try{
    const bg=await loadImage(path.join(__dirname,'assets','stadium_bg.png'));
    ctx.drawImage(bg,0,0,600,1000);
  }catch(e){
    ctx.fillStyle='#0a0608';ctx.fillRect(0,0,600,1000);
  }

  // 2. Dark overlay on bottom 55% so panels are readable
  const ov=ctx.createLinearGradient(0,350,0,1000);
  ov.addColorStop(0,'rgba(0,0,0,0)');
  ov.addColorStop(0.25,'rgba(0,0,0,0.65)');
  ov.addColorStop(1,'rgba(0,0,0,0.92)');
  ctx.fillStyle=ov;ctx.fillRect(0,0,600,1000);

  // Subtle theme tint overlay
  const tint=ctx.createRadialGradient(300,500,0,300,500,600);
  tint.addColorStop(0,tc+'08');tint.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=tint;ctx.fillRect(0,0,600,1000);

  // 3. Card frame
  ctx.save();ctx.shadowColor=tc;ctx.shadowBlur=30;ctx.strokeStyle=tc;ctx.lineWidth=3.5;
  ctx.beginPath();ctx.roundRect(18,18,564,964,16);ctx.stroke();
  ctx.shadowColor=sc;ctx.shadowBlur=12;ctx.strokeStyle=sc;ctx.lineWidth=1.5;
  ctx.beginPath();ctx.roundRect(27,27,546,946,12);ctx.stroke();
  ctx.shadowBlur=0;ctx.restore();
  // Corner notches
  ctx.save();ctx.strokeStyle=tc;ctx.lineWidth=3.5;ctx.shadowColor=tc;ctx.shadowBlur=18;
  for(const[cx2,cy2,dx,dy]of[[18,18,1,1],[582,18,-1,1],[18,982,1,-1],[582,982,-1,-1]]){
    ctx.beginPath();ctx.moveTo(cx2+dx*6,cy2);ctx.lineTo(cx2+dx*38,cy2);
    ctx.moveTo(cx2,cy2+dy*6);ctx.lineTo(cx2,cy2+dy*38);ctx.stroke();
  }
  ctx.restore();

  // 4. CCG Logo
  try{
    const logo=await loadImage(path.join(__dirname,'assets','ccg_logo.png'));
    ctx.drawImage(logo,26,24,90,90);
  }catch(e){
    ctx.fillStyle=tc;ctx.font='bold 14px "DejaVu Sans"';ctx.textAlign='left';ctx.fillText('CCG',42,72);
  }

  // 5. Season badge
  ctx.save();ctx.fillStyle='rgba(0,0,0,0.82)';ctx.strokeStyle=tc;ctx.lineWidth=1.5;
  ctx.beginPath();ctx.roundRect(386,40,172,38,7);ctx.fill();ctx.stroke();
  ctx.fillStyle='#fff';ctx.font='bold 14px "DejaVu Sans"';ctx.textAlign='left';ctx.fillText('SEASON 3',404,64);
  ctx.fillStyle=tc;ctx.fillText(' ///',494,64);ctx.restore();

  // 6. Avatar ring
  const avX=300,avY=278,avR=100;
  ctx.save();
  for(let i=4;i>=1;i--){
    ctx.strokeStyle=tc+(i===4?'18':i===3?'38':i===2?'65':'bb');
    ctx.lineWidth=i*8;ctx.shadowColor=tc;ctx.shadowBlur=28*i;
    ctx.beginPath();ctx.arc(avX,avY,avR+14+i*4,0,Math.PI*2);ctx.stroke();
  }
  ctx.strokeStyle='#ffffff60';ctx.lineWidth=1.5;ctx.shadowBlur=0;
  ctx.beginPath();ctx.arc(avX,avY,avR+14,0,Math.PI*2);ctx.stroke();
  ctx.restore();
  // Spark dots
  ctx.save();
  for(const ang of[0.2,0.85,1.6,2.5,3.4,4.3,5.15]){
    const sx=avX+Math.cos(ang)*(avR+26),sy=avY+Math.sin(ang)*(avR+26);
    const rg=ctx.createRadialGradient(sx,sy,0,sx,sy,8);
    rg.addColorStop(0,'#ffffff');rg.addColorStop(0.35,tc);rg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=rg;ctx.beginPath();ctx.arc(sx,sy,8,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
  // Avatar image
  let img=null;
  if(avatarBuffer){try{img=await loadImage(avatarBuffer);}catch(e){}}
  ctx.save();ctx.beginPath();ctx.arc(avX,avY,avR,0,Math.PI*2);ctx.clip();
  if(img)ctx.drawImage(img,avX-avR,avY-avR,avR*2,avR*2);
  else drawSilhouette(ctx,avX,avY,avR);
  ctx.restore();

  // 7. Nameplate
  const name=normalizeStyledText(user.first_name||'PLAYER').toUpperCase();
  const handle=`@${(user.username||user.first_name||'player').toLowerCase().replace(/\s+/g,'_').slice(0,22)}`;
  let fs=36;ctx.font=`bold italic ${fs}px "DejaVu Sans"`;
  while(fs>16&&ctx.measureText(name).width>400){fs--;ctx.font=`bold italic ${fs}px "DejaVu Sans"`;}
  const npY=avY+avR+30,npH=74,npX=62,npW=476;
  ctx.save();
  ctx.fillStyle='rgba(5,2,1,0.92)';ctx.strokeStyle=tc;ctx.lineWidth=1.8;
  ctx.beginPath();ctx.moveTo(npX+18,npY);ctx.lineTo(npX+npW-18,npY);
  ctx.lineTo(npX+npW,npY+18);ctx.lineTo(npX+npW,npY+npH-10);
  ctx.lineTo(npX+npW-10,npY+npH);ctx.lineTo(npX+10,npY+npH);
  ctx.lineTo(npX,npY+npH-10);ctx.lineTo(npX,npY+18);
  ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle=tc;ctx.font='bold 16px "DejaVu Sans"';ctx.textAlign='left';ctx.globalAlpha=0.9;
  ctx.fillText('///',npX+10,npY+npH/2+8);
  ctx.textAlign='right';ctx.fillText('///',npX+npW-10,npY+npH/2+8);ctx.globalAlpha=1;
  ctx.fillStyle='#fff';ctx.font=`bold italic ${fs}px "DejaVu Sans"`;
  ctx.textAlign='center';ctx.shadowColor=tc;ctx.shadowBlur=12;
  drawTextWithEmojis(ctx,name,300,npY+42,`bold italic ${fs}px "DejaVu Sans"`);
  ctx.shadowBlur=0;
  ctx.fillStyle=tc+'ee';ctx.font='12px "DejaVu Sans"';ctx.fillText(handle,300,npY+60);
  ctx.restore();

  // 8. Stats panels
  const avg=stats.dismissals>0?(stats.runs/stats.dismissals).toFixed(1):(stats.runs>0?`${stats.runs}*`:'0.0');
  const sr=stats.balls_faced>0?((stats.runs/stats.balls_faced)*100).toFixed(1):'0.0';
  const econ=stats.balls_bowled>0?((stats.runs_conceded*6)/stats.balls_bowled).toFixed(1):'0.0';
  const bavg=stats.wickets>0?(stats.runs_conceded/stats.wickets).toFixed(1):'0.0';
  const bb=`${stats.best_wickets||0}/${stats.best_runs_conceded||0}`;
  const matches=(stats.wins||0)+(stats.losses||0);
  const hs=stats.highscore>0?`${stats.highscore}*`:'0';
  const PX=40,PW=520,PH=92,gap=10;
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
  const bw=(PW-gap*3)/4;
  [
    {label:'HIGHEST SCORE',val:hs,icon:icoStar},
    {label:'50s',val:stats.fifties||0,icon:(c,x,y,t)=>icoNum(c,x,y,t,'50')},
    {label:'100s',val:stats.centuries||0,icon:(c,x,y,t)=>icoNum(c,x,y,t,'100')},
    {label:'MOTM',val:stats.motm||0,icon:icoGrid},
  ].forEach((item,i)=>{
    drawPanel(ctx,'',[{label:item.label,val:item.val,icon:item.icon}],PX+i*(bw+gap),p3y,bw,80,tc);
  });

  // 9. Footer
  ctx.save();ctx.fillStyle='rgba(255,255,255,0.14)';
  ctx.font='bold 9px "DejaVu Sans"';ctx.textAlign='center';
  ctx.fillText('CCG · HANDCRICKET PRO COLLECTIBLE CARD',300,970);ctx.restore();

  ctx.restore();
  return canvas.toBuffer('image/png');
}

module.exports={generateProfileCard,normalizeStyledText};
