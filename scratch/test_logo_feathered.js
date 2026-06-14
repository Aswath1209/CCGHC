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

  // Create a feathered mask for the patch
  // Bounding box of the patch: x=55, y=50, w=210, h=190
  const px = 55, py = 50, pw = 210, ph = 190;
  
  const patchCanvas = createCanvas(pw, ph);
  const pctx = patchCanvas.getContext('2d');
  
  // Draw stadium bg chunk
  pctx.drawImage(bgImg, px, py, pw, ph, 0, 0, pw, ph);
  
  // Apply a feathered radial gradient mask to fade the edges
  pctx.globalCompositeOperation = 'destination-in';
  const grad = pctx.createRadialGradient(pw/2, ph/2, Math.min(pw, ph)*0.3, pw/2, ph/2, Math.max(pw, ph)*0.6);
  grad.addColorStop(0, 'rgba(0,0,0,1)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  pctx.fillStyle = grad;
  pctx.fillRect(0, 0, pw, ph);
  
  // Draw the feathered patch onto our main canvas
  ctx.save();
  ctx.drawImage(patchCanvas, px, py);
  ctx.restore();

  fs.writeFileSync(path.join(__dirname, 'test_logo_feathered.png'), canvas.toBuffer('image/png'));
  console.log('Saved test_logo_feathered.png');
}

main().catch(console.error);
