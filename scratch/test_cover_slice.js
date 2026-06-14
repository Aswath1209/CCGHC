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

  // Let's copy a clean slice of the nameplate background.
  // The nameplate is vertically from y = 548 to y = 628.
  // Let's copy from x = 305 to x = 325 (width 20) and y = 550 to y = 626 (height 76).
  // And stretch it across the text area from x = 325 to x = 700.
  ctx.save();
  ctx.drawImage(
    img, 
    305, 550, 20, 76,  // source
    325, 550, 375, 76  // destination
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

  fs.writeFileSync(path.join(__dirname, 'test_cover_slice.png'), canvas.toBuffer('image/png'));
  console.log('Saved test_cover_slice.png');
}

main().catch(console.error);
