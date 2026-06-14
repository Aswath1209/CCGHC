const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

async function main() {
  const imgPath = path.join(__dirname, '..', 'game', 'assets', 'card_template.png');
  const img = await loadImage(imgPath);
  const W = img.width;
  const H = img.height;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, W, H);
  const data = imgData.data;

  // Let's find the bounding box of the black circle inside the fire ring.
  // The fire ring has very high red/green/blue values, while the inside is very dark (black).
  // Let's scan a horizontal line at H/2 or y=300 to find the boundaries of the dark region.
  // We can also just print out colors at some points to verify.
  
  // Let's create an output image showing a grid of coordinates, every 50 pixels, to visually see the exact coordinates on the template.
  const debugCanvas = createCanvas(W, H);
  const dctx = debugCanvas.getContext('2d');
  dctx.drawImage(img, 0, 0);
  dctx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
  dctx.lineWidth = 1;
  dctx.fillStyle = 'rgba(0, 255, 255, 0.8)';
  dctx.font = '12px sans-serif';
  
  // Draw horizontal lines
  for (let y = 0; y < H; y += 50) {
    dctx.beginPath();
    dctx.moveTo(0, y);
    dctx.lineTo(W, y);
    dctx.stroke();
    dctx.fillText(y.toString(), 5, y - 2);
  }
  
  // Draw vertical lines
  for (let x = 0; x < W; x += 50) {
    dctx.beginPath();
    dctx.moveTo(x, 0);
    dctx.lineTo(x, H);
    dctx.stroke();
    dctx.fillText(x.toString(), x + 2, 15);
  }
  
  fs.writeFileSync(path.join(__dirname, 'grid_overlay.png'), debugCanvas.toBuffer('image/png'));
  console.log('Saved grid_overlay.png');
}

main().catch(console.error);
