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
  const bgImg = await loadImage(path.join(__dirname, '..', 'game', 'assets', 'stadium_bg.png'));
  const logoImg = await loadImage(path.join(__dirname, '..', 'game', 'assets', 'logo.png'));

  const W = 1024;
  const H = 1024;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  
  // Draw template
  ctx.drawImage(tplImg, 0, 0);

  // Erase the template logo using stadium_bg patch (width 180 to cover the hand tip completely)
  ctx.drawImage(bgImg, 75, 70, 180, 150, 75, 70, 180, 150);

  // Make the logo transparent
  const transparentLogo = makeLogoTransparent(logoImg, 150, 150);

  // Draw transparent logo on top
  ctx.drawImage(transparentLogo, 75, 70);

  fs.writeFileSync(path.join(__dirname, 'test_logo_final_combination_2.png'), canvas.toBuffer('image/png'));
  console.log('Saved test_logo_final_combination_2.png');
}

main().catch(console.error);
