const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

async function main() {
  const tplImg = await loadImage(path.join(__dirname, '..', 'game', 'assets', 'card_template.png'));
  const bgImg = await loadImage(path.join(__dirname, '..', 'game', 'assets', 'stadium_bg.png'));
  const logoImg = await loadImage(path.join(__dirname, '..', 'game', 'assets', 'logo.png'));

  const W = 1024;
  const H = 1024;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  
  // Draw template
  ctx.drawImage(tplImg, 0, 0);

  // Erase logo using a patch from stadium_bg.png
  ctx.drawImage(bgImg, 70, 65, 170, 170, 70, 65, 170, 170);

  // Draw user's actual logo on top
  ctx.drawImage(logoImg, 70, 65, 170, 170);

  fs.writeFileSync(path.join(__dirname, 'test_logo_erase_bg.png'), canvas.toBuffer('image/png'));
  console.log('Saved test_logo_erase_bg.png');
}

main().catch(console.error);
