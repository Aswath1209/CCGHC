const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

function makeLogoTransparent(logoImg, width, height, threshold) {
  const tempCanvas = createCanvas(width, height);
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.drawImage(logoImg, 0, 0, width, height);
  
  const imgData = tempCtx.getImageData(0, 0, width, height);
  const data = imgData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i+1];
    const b = data[i+2];
    
    // Check if pixel is dark
    if (r < threshold && g < threshold && b < threshold) {
      data[i+3] = 0;
    }
  }
  
  tempCtx.putImageData(imgData, 0, 0);
  return tempCanvas;
}

async function main() {
  const logoImg = await loadImage(path.join(__dirname, '..', 'game', 'assets', 'logo.png'));
  const tplImg = await loadImage(path.join(__dirname, '..', 'game', 'assets', 'card_template.png'));
  const bgImg = await loadImage(path.join(__dirname, '..', 'game', 'assets', 'stadium_bg.png'));

  // Let's try thresholds: 50, 70, 90
  for (const th of [50, 70, 90]) {
    const canvas = createCanvas(1024, 1024);
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(tplImg, 0, 0);
    ctx.drawImage(bgImg, 75, 70, 180, 150, 75, 70, 180, 150);
    
    const transparentLogo = makeLogoTransparent(logoImg, 150, 150, th);
    ctx.drawImage(transparentLogo, 75, 70);
    
    fs.writeFileSync(path.join(__dirname, `test_logo_threshold_${th}.png`), canvas.toBuffer('image/png'));
    console.log(`Saved test_logo_threshold_${th}.png`);
  }
}

main().catch(console.error);
