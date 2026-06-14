const { loadImage, createCanvas } = require('@napi-rs/canvas');
const path = require('path');

async function main() {
  const tplPath = path.join(__dirname, '../game/assets/card_template.png');
  const img = await loadImage(tplPath);
  const canvas = createCanvas(10, 10);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 36, 36, 10, 10, 0, 0, 10, 10);
  const data = ctx.getImageData(0, 0, 10, 10).data;
  console.log(`Border pixel sample: R=${data[0]}, G=${data[1]}, B=${data[2]}`);
}

main().catch(console.error);
