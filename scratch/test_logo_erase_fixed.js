const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

async function main() {
  const imgPath = path.join(__dirname, '..', 'game', 'assets', 'card_template.png');
  const img = await loadImage(imgPath);
  const logoImg = await loadImage(path.join(__dirname, '..', 'game', 'assets', 'logo.png'));

  const W = 1024;
  const H = 1024;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  
  // Draw template
  ctx.drawImage(img, 0, 0);

  // Erase the logo by copying stadium lights from the right side directly to x=70
  ctx.save();
  ctx.drawImage(canvas, 780, 65, 170, 170, 70, 65, 170, 170);
  ctx.restore();

  // Draw user's actual logo on top
  ctx.drawImage(logoImg, 70, 65, 170, 170);

  fs.writeFileSync(path.join(__dirname, 'test_logo_erase_fixed.png'), canvas.toBuffer('image/png'));
  console.log('Saved test_logo_erase_fixed.png');
}

main().catch(console.error);
