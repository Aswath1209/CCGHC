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

  // Let's sample horizontal rows to find where the border transition is.
  // Left border ends when we hit stadium background.
  // We can scan along Y = 512 (middle row).
  const yMid = 512;
  let leftBorderEnd = 0;
  let rightBorderStart = w;
  
  // Scan from left to right
  for (let x = 0; x < w; x++) {
    const idx = (yMid * w + x) * 4;
    const r = data[idx];
    const g = data[idx+1];
    const b = data[idx+2];
    // The stadium background at the sides is very dark (r, g, b < 40)
    if (r < 50 && g < 50 && b < 50) {
      leftBorderEnd = x;
      break;
    }
  }

  // Scan from right to left
  for (let x = w - 1; x >= 0; x--) {
    const idx = (yMid * w + x) * 4;
    const r = data[idx];
    const g = data[idx+1];
    const b = data[idx+2];
    if (r < 50 && g < 50 && b < 50) {
      rightBorderStart = x;
      break;
    }
  }

  // Scan vertical columns to find top and bottom border boundaries (scan along X = 512)
  const xMid = 512;
  let topBorderEnd = 0;
  let bottomBorderStart = h;

  for (let y = 0; y < h; y++) {
    const idx = (y * w + xMid) * 4;
    const r = data[idx];
    const g = data[idx+1];
    const b = data[idx+2];
    if (r < 50 && g < 50 && b < 50) {
      topBorderEnd = y;
      break;
    }
  }

  for (let y = h - 1; y >= 0; y--) {
    const idx = (y * w + xMid) * 4;
    const r = data[idx];
    const g = data[idx+1];
    const b = data[idx+2];
    if (r < 50 && g < 50 && b < 50) {
      bottomBorderStart = y;
      break;
    }
  }

  console.log(`Scan Results at Midpoints:`);
  console.log(`Left Border End: ${leftBorderEnd}`);
  console.log(`Right Border Start: ${rightBorderStart}`);
  console.log(`Top Border End: ${topBorderEnd}`);
  console.log(`Bottom Border Start: ${bottomBorderStart}`);

  // Let's check the corner chamfers by scanning at y = 100, 200, 300
  console.log(`\nScanning corner transitions to map the chamfer cuts...`);
  for (let y = 30; y < 150; y += 15) {
    let xTrans = 0;
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = data[idx];
      const g = data[idx+1];
      const b = data[idx+2];
      if (r < 50 && g < 50 && b < 50) {
        xTrans = x;
        break;
      }
    }
    console.log(`Row Y = ${y}: Inner border starts at X = ${xTrans}`);
  }
}

main().catch(console.error);
