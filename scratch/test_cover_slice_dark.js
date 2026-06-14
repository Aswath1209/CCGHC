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

  // Copy a clean slice from x = 328 to x = 338 (width 10)
  ctx.save();
  ctx.drawImage(
    img, 
    328, 550, 10, 76,  // source
    338, 550, 350, 76  // destination
  );
  ctx.restore();

  // Now draw the player name over it
  ctx.fillStyle = '#ffffff';
  ctx.font = 'italic bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ANTHONY', 512, 580);

  // Handle
  ctx.fillStyle = '#f97316';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('@anthony_07', 512, 612);

  fs.writeFileSync(path.join(__dirname, 'test_cover_slice_dark.png'), canvas.toBuffer('image/png'));
  console.log('Saved test_cover_slice_dark.png');
}

main().catch(console.error);
