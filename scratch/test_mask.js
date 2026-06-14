const { loadImage, createCanvas } = require('@napi-rs/canvas');
const path = require('path');
const fs = require('fs');

async function main() {
  const imgPath = path.join(__dirname, '../game/assets/card_template.png');
  const img = await loadImage(imgPath);
  const w = img.width;
  const h = img.height;

  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  // We want to clear the center region inside the border.
  // The border inner boundary coordinates:
  // Left: ~68, Right: ~956, Top: ~68, Bottom: ~956.
  // Corner chamfer cuts:
  // Top-left: from (110, 68) to (68, 110)
  // Top-right: from (914, 68) to (956, 110)
  // Bottom-right: from (956, 914) to (914, 956)
  // Bottom-left: from (68, 914) to (110, 956)
  
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  
  // Draw the chamfered inner border path
  ctx.moveTo(110, 44);
  ctx.lineTo(914, 44);
  ctx.lineTo(956, 90);
  ctx.lineTo(956, 914);
  ctx.lineTo(914, 956);
  ctx.lineTo(110, 956);
  ctx.lineTo(68, 914);
  ctx.lineTo(68, 90);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  // Write out the processed frame
  const outPath = path.join(__dirname, 'processed_frame.png');
  fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
  console.log(`Saved processed frame to ${outPath}`);
}

main().catch(console.error);
