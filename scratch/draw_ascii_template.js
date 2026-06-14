const { loadImage, createCanvas } = require('@napi-rs/canvas');
const path = require('path');

async function main() {
  const imgPath = path.join(__dirname, '../game/assets/card_template.png');
  const img = await loadImage(imgPath);
  const w = img.width;
  const h = img.height;

  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Let's divide 1024x1024 into a 64x64 grid (each block is 16x16 pixels)
  const gridSize = 64;
  const blockSize = w / gridSize;

  let ascii = '';
  for (let row = 0; row < gridSize; row++) {
    let line = '';
    for (let col = 0; col < gridSize; col++) {
      // Sample the center pixel of the block
      const px = Math.floor(col * blockSize + blockSize / 2);
      const py = Math.floor(row * blockSize + blockSize / 2);
      const idx = (py * w + px) * 4;
      const r = data[idx];
      const g = data[idx+1];
      const b = data[idx+2];

      // Check if it's a golden/accent/border pixel
      // (usually high red/green, lower blue)
      if (r > 100 && g > 70 && b < 120) {
        line += '#'; // Border / metallic accent
      } else {
        line += '.'; // Dark background / stadium / space
      }
    }
    ascii += line + '\n';
  }

  console.log(ascii);
}

main().catch(console.error);
