const { loadImage } = require('@napi-rs/canvas');
const path = require('path');

async function main() {
  const ccgLogo = await loadImage(path.join(__dirname, '..', 'game', 'assets', 'ccg_logo.png'));
  const { createCanvas } = require('@napi-rs/canvas');
  const canvas = createCanvas(1024, 1024);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(ccgLogo, 0, 0, 1024, 1024);
  const data = ctx.getImageData(0, 0, 1024, 1024).data;
  
  // Let's sample pixels in the top-left area: x from 0 to 200, y from 0 to 200
  let maxR = 0, maxG = 0, maxB = 0;
  let counts = {};
  for (let y = 0; y < 150; y++) {
    for (let x = 0; x < 150; x++) {
      const idx = (y * 1024 + x) * 4;
      const r = data[idx];
      const g = data[idx+1];
      const b = data[idx+2];
      maxR = Math.max(maxR, r);
      maxG = Math.max(maxG, g);
      maxB = Math.max(maxB, b);
    }
  }
  console.log(`Top-left 150x150 max values: R=${maxR}, G=${maxG}, B=${maxB}`);
}

main().catch(console.error);
