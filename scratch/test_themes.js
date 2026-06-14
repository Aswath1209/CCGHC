const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const themes = [
  { name: 'red',    hue: '0deg',   tc: '#f97316' },
  { name: 'blue',   hue: '180deg', tc: '#38bdf8' },
  { name: 'green',  hue: '90deg',  tc: '#22c55e' },
  { name: 'purple', hue: '240deg', tc: '#a855f7' },
  { name: 'gold',   hue: '20deg',  tc: '#fbbf24' },
  { name: 'cyan',   hue: '150deg', tc: '#06b6d4' },
  { name: 'pink',   hue: '300deg', tc: '#ec4899' },
];

async function main() {
  const imgPath = path.join(__dirname, '..', 'game', 'assets', 'card_template.png');
  const img = await loadImage(imgPath);
  const W = img.width;
  const H = img.height;

  for (const th of themes) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');
    
    // Draw template with hue rotation
    ctx.save();
    if (th.hue !== '0deg') {
      ctx.filter = `hue-rotate(${th.hue})`;
    }
    ctx.drawImage(img, 0, 0, W, H);
    ctx.restore();

    // Draw nameplate cover
    ctx.save();
    // Use the color rotated template to clone texture
    ctx.drawImage(canvas, 328, 550, 10, 76, 338, 550, 350, 76);
    ctx.restore();

    // Player name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'italic bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ANTHONY', 512, 580);

    ctx.fillStyle = th.tc;
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('@anthony_07', 512, 612);

    fs.writeFileSync(path.join(__dirname, `test_theme_${th.name}.png`), canvas.toBuffer('image/png'));
    console.log(`Saved test_theme_${th.name}.png`);
  }
}

main().catch(console.error);
