const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

async function main() {
  const tplImg = await loadImage(path.join(__dirname, '..', 'game', 'assets', 'card_template.png'));
  const bgImg = await loadImage(path.join(__dirname, '..', 'game', 'assets', 'stadium_bg.png'));

  const W = 1024;
  const H = 1024;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  
  // Draw template
  ctx.drawImage(tplImg, 0, 0);

  // Draw a red rectangle around the patch area first
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 3;
  ctx.strokeRect(75, 70, 180, 150);

  // Now draw the patch from bgImg
  ctx.drawImage(bgImg, 75, 70, 180, 150, 75, 70, 180, 150);

  // Draw another blue rectangle around the drawn patch to verify its boundaries
  ctx.strokeStyle = 'blue';
  ctx.strokeRect(75, 70, 180, 150);

  fs.writeFileSync(path.join(__dirname, 'test_patch_debug.png'), canvas.toBuffer('image/png'));
  console.log('Saved test_patch_debug.png');
}

main().catch(console.error);
