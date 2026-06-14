const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

async function main() {
  const templatePath = '/home/home/Downloads/cardtemplate.jpeg';
  const template = await loadImage(templatePath);

  const canvas = createCanvas(1229, 1536);
  const ctx = canvas.getContext('2d');

  // Draw background
  ctx.drawImage(template, 0, 0, 1229, 1536);

  // Draw grid
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
  ctx.lineWidth = 1;
  ctx.fillStyle = 'red';
  ctx.font = '12px Arial';

  // Vertical lines
  for (let x = 0; x <= 1229; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1536);
    ctx.stroke();
    ctx.fillText(x.toString(), x + 2, 20);
  }

  // Horizontal lines
  for (let y = 0; y <= 1536; y += 50) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1229, y);
    ctx.stroke();
    ctx.fillText(y.toString(), 5, y - 2);
  }

  // Draw a finer grid of 10px ticks
  ctx.strokeStyle = 'rgba(0, 0, 255, 0.2)';
  for (let x = 0; x <= 1229; x += 10) {
    if (x % 50 === 0) continue;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1536);
    ctx.stroke();
  }
  for (let y = 0; y <= 1536; y += 10) {
    if (y % 50 === 0) continue;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1229, y);
    ctx.stroke();
  }

  const outputPath = path.join(__dirname, 'grid_overlay.png');
  fs.writeFileSync(outputPath, canvas.toBuffer('image/png'));
  
  // Also copy to the artifacts directory
  const artPath = '/home/home/.gemini/antigravity/brain/22ef68fc-5b3d-4ebc-b6e8-1483655299e7/grid_overlay.png';
  fs.writeFileSync(artPath, canvas.toBuffer('image/png'));
  
  console.log("Grid overlay generated at:", outputPath);
}

main().catch(err => console.error(err));
