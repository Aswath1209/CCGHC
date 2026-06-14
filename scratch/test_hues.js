const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const testThemes = [
  { id: 1, name: 'gold', filter: 'none' },
  { id: 2, name: 'cyan', filter: 'hue-rotate(150deg)' },
  { id: 3, name: 'red', filter: 'hue-rotate(330deg)' },
  { id: 4, name: 'purple', filter: 'hue-rotate(240deg)' },
  { id: 5, name: 'emerald', filter: 'hue-rotate(80deg)' },
  { id: 6, name: 'teal', filter: 'hue-rotate(120deg)' },
  { id: 7, name: 'pink', filter: 'hue-rotate(285deg)' },
  { id: 8, name: 'silver', filter: 'saturate(0)' },
  { id: 9, name: 'orange', filter: 'hue-rotate(15deg)' },
  { id: 10, name: 'blue', filter: 'hue-rotate(190deg)' }
];

async function run() {
  const tpl = await loadImage('/home/home/ReactNative/Telegram/cricket-bot/game/assets/card_template.png');
  
  for (const th of testThemes) {
    const canvas = createCanvas(1024, 1024);
    const ctx = canvas.getContext('2d');
    
    ctx.save();
    if (th.filter !== 'none') {
      ctx.filter = th.filter;
    }
    ctx.drawImage(tpl, 0, 0, 1024, 1024);
    ctx.restore();
    
    const outPath = `/home/home/ReactNative/Telegram/cricket-bot/scratch/test_hue_${th.id}_${th.name}.png`;
    fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
    console.log(`Saved ${outPath}`);
  }
}

run().catch(console.error);
