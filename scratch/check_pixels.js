const { loadImage } = require('@napi-rs/canvas');
const path = require('path');

async function main() {
  const logoImg = await loadImage(path.join(__dirname, '..', 'game', 'assets', 'logo.png'));
  const { createCanvas } = require('@napi-rs/canvas');
  const canvas = createCanvas(10, 10);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(logoImg, 0, 0, 10, 10);
  const data = ctx.getImageData(0, 0, 10, 10).data;
  for (let i = 0; i < 40; i += 4) {
    console.log(`Pixel ${i/4}: R=${data[i]}, G=${data[i+1]}, B=${data[i+2]}, A=${data[i+3]}`);
  }
}

main().catch(console.error);
