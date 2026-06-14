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

  // Erase the logo by copying stadium lights from the right side
  ctx.save();
  // We mirror the right side stadium lights (around x=780) to the left side (around x=70)
  // To make it look natural, we can flip it horizontally
  ctx.translate(240, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(canvas, 780, 65, 170, 170, 0, 65, 170, 170);
  ctx.restore();

  // Draw user's actual logo on top
  ctx.drawImage(logoImg, 70, 65, 170, 170);

  fs.writeFileSync(path.join(__dirname, 'test_logo_erase.png'), canvas.toBuffer('image/png'));
  console.log('Saved test_logo_erase.png');
}

main().catch(console.error);
