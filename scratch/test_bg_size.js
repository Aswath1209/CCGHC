const { loadImage } = require('@napi-rs/canvas');
const path = require('path');

async function main() {
  const bg = await loadImage(path.join(__dirname, '..', 'game', 'assets', 'stadium_bg.png'));
  console.log('stadium_bg.png width:', bg.width, 'height:', bg.height);
}

main().catch(console.error);
