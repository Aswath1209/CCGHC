const { loadImage, createCanvas } = require('@napi-rs/canvas');
const path = require('path');

async function main() {
  const imgPath = path.join(__dirname, '../game/assets/card_template.png');
  const img = await loadImage(imgPath);
  const width = img.width;
  const height = img.height;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Let's find the circle bounds in card_template.png
  // Search region: x = 300 to 724, y = 100 to 500
  let minX = width, maxX = 0, minY = height, maxY = 0;

  for (let y = 50; y < 550; y++) {
    for (let x = 250; x < 800; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx+1];
      const b = data[idx+2];
      
      if (r > 200 && g > 110 && b < 80) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const ringW = maxX - minX;
  const ringH = maxY - minY;
  console.log(`Avatar Ring bounds in template card_template.png:`);
  console.log(`Left: ${minX}, Right: ${maxX}, Width: ${ringW}`);
  console.log(`Top: ${minY}, Bottom: ${maxY}, Height: ${ringH}`);
  console.log(`Aspect ratio: ${ringW / ringH}`);
}

main().catch(console.error);
