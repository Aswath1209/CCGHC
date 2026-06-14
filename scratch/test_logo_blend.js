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

  // Draw logo with screen blend mode
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.drawImage(logoImg, 78, 74, 155, 155);
  ctx.restore();

  fs.writeFileSync(path.join(__dirname, 'test_logo_blend.png'), canvas.toBuffer('image/png'));
  console.log('Saved test_logo_blend.png');
}

main().catch(console.error);
