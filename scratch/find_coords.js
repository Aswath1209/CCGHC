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

  // Let's print out pixel values along y = 750 to find the left and right borders
  const yTest = 750;
  console.log("Scanning pixels along y = 750 to find card frame borders:");
  
  let leftBorder = -1;
  let rightBorder = -1;
  
  for (let x = 0; x < width; x++) {
    const idx = (yTest * width + x) * 4;
    const r = data[idx];
    const g = data[idx+1];
    const b = data[idx+2];
    
    // Border is bright gold/orange. Let's find where the brightness peaks on the left and right
    const brightness = r + g + b;
    if (r > 80 && g > 50 && b < 40) {
      if (x < 300) {
        leftBorder = x;
      } else if (x > 700) {
        if (rightBorder === -1) rightBorder = x;
      }
    }
  }
  
  console.log(`Left border: ${leftBorder}, Right border: ${rightBorder}`);
}

main().catch(console.error);
