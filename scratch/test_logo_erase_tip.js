const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

function makeLogoTransparent(logoImg, width, height) {
  const tempCanvas = createCanvas(width, height);
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.drawImage(logoImg, 0, 0, width, height);
  
  const imgData = tempCtx.getImageData(0, 0, width, height);
  const data = imgData.data;
  
  // Make black background transparent
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i+1];
    const b = data[i+2];
    
    // Threshold to detect black background
    if (r < 30 && g < 30 && b < 30) {
      data[i+3] = 0;
    }
  }
  
  tempCtx.putImageData(imgData, 0, 0);
  return tempCanvas;
}

async function main() {
  const tplImg = await loadImage(path.join(__dirname, '..', 'game', 'assets', 'card_template.png'));
  const logoImg = await loadImage(path.join(__dirname, '..', 'game', 'assets', 'logo.png'));

  const W = 1024;
  const H = 1024;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  
  // Draw template
  ctx.drawImage(tplImg, 0, 0);

  // Erase only the hand tip (x=175 to 235, y=95 to 145) by copying a clean stadium area from the right side of the template
  // The right side stadium area (x=800 to 860, y=95 to 145) is clean and matches the lighting perfectly
  ctx.save();
  ctx.drawImage(tplImg, 800, 95, 60, 50, 175, 95, 60, 50);
  ctx.restore();

  // Make the logo transparent
  const transparentLogo = makeLogoTransparent(logoImg, 150, 150);

  // Draw transparent logo on top
  ctx.drawImage(transparentLogo, 70, 65);

  fs.writeFileSync(path.join(__dirname, 'test_logo_erase_tip.png'), canvas.toBuffer('image/png'));
  console.log('Saved test_logo_erase_tip.png');
}

main().catch(console.error);
