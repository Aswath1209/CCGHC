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

  // Sample colors in the nameplate area
  // Let's sample a box at x: 340 to 680, y: 555 to 615
  const sampleX = 512;
  const sampleY = 582;
  const pixel = ctx.getImageData(sampleX, sampleY, 1, 1).data;
  console.log(`Color at (512, 582): rgba(${pixel[0]}, ${pixel[1]}, ${pixel[2]}, ${pixel[3]})`);

  // Let's test covering the PLAYER NAME text on a test canvas and save it
  const testCanvas = createCanvas(W, H);
  const tctx = testCanvas.getContext('2d');
  tctx.drawImage(img, 0, 0);

  // Draw a dark fill to cover the text
  // The text is roughly from x = 320 to x = 704, y = 552 to y = 612
  // Let's use a nice gradient that matches the background of the nameplate
  const grad = tctx.createLinearGradient(320, 580, 700, 580);
  grad.addColorStop(0, 'rgba(5, 3, 2, 0.95)');
  grad.addColorStop(0.5, 'rgba(12, 7, 4, 0.95)');
  grad.addColorStop(1, 'rgba(5, 3, 2, 0.95)');
  
  tctx.fillStyle = grad;
  tctx.fillRect(320, 552, 384, 60);

  // Let's draw "ANTHONY" in place
  tctx.fillStyle = '#ffffff';
  tctx.font = 'italic bold 44px sans-serif';
  tctx.textAlign = 'center';
  tctx.textBaseline = 'middle';
  tctx.fillText('ANTHONY', 512, 580);

  // Let's also draw the handle below
  tctx.fillStyle = '#f97316';
  tctx.font = 'bold 15px sans-serif';
  tctx.fillText('@anthony_07', 512, 612);

  fs.writeFileSync(path.join(__dirname, 'test_cover.png'), testCanvas.toBuffer('image/png'));
  console.log('Saved test_cover.png');
}

main().catch(console.error);
