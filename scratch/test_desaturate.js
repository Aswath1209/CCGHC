const { loadImage, createCanvas } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

function desaturateGrass(img) {
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  
  const imgData = ctx.getImageData(0, 0, img.width, img.height);
  const data = imgData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i+1];
    const b = data[i+2];
    
    // Green grass: g > r * 1.05 and g > b * 1.05
    if (g > r * 1.05 && g > b * 1.05) {
      const brightness = (r + g + b) / 3;
      data[i] = brightness * 0.12;
      data[i+1] = brightness * 0.12;
      data[i+2] = brightness * 0.12;
    }
  }
  
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

async function main() {
  const imgPath = path.join(__dirname, '../game/assets/card_template.png');
  const img = await loadImage(imgPath);
  const processedCanvas = desaturateGrass(img);
  
  const outPath = path.join(__dirname, 'test_desaturate.png');
  const buffer = processedCanvas.toBuffer('image/png');
  fs.writeFileSync(outPath, buffer);
  console.log("Processed image saved to:", outPath);
}

main().catch(console.error);
