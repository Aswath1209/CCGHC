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

  // Avatar center (512, 308), radius 188
  const avX = 512;
  const avY = 308;
  const avR = 188;

  // Let's try drawing a sample avatar image inside it to test alignment.
  // We'll load the sample avatar from the brain/conversation directory if it exists, or generate a simple pattern.
  let avatarImg = null;
  try {
    const avatarPath = '/home/home/.gemini/antigravity/brain/c6919f8c-601c-4941-887d-dffaf2d6865f/sample_player_avatar_1781180100809.png';
    avatarImg = await loadImage(avatarPath);
  } catch(e) {
    console.log('Sample avatar not found, using generic pattern');
  }

  ctx.save();
  ctx.beginPath();
  ctx.arc(avX, avY, avR, 0, Math.PI * 2);
  ctx.clip();
  if (avatarImg) {
    const s = Math.max(avR * 2 / avatarImg.width, avR * 2 / avatarImg.height);
    const dw = avatarImg.width * s;
    const dh = avatarImg.height * s;
    ctx.drawImage(avatarImg, avX - dw / 2, avY - dh / 2, dw, dh);
  } else {
    // Draw silhouette
    ctx.fillStyle = '#1a1714';
    ctx.beginPath();
    ctx.arc(avX, avY, avR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3d3730';
    ctx.beginPath();
    ctx.arc(avX, avY - avR * 0.15, avR * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(avX, avY + avR * 1.05, avR * 0.75, Math.PI, 0, false);
    ctx.fill();
  }
  ctx.restore();

  // Draw nameplate cover
  ctx.save();
  ctx.drawImage(img, 328, 550, 10, 76, 338, 550, 350, 76);
  ctx.restore();

  // Draw name
  ctx.fillStyle = '#ffffff';
  ctx.font = 'italic bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ANTHONY', 512, 580);

  ctx.fillStyle = '#f97316';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('@anthony_07', 512, 612);

  fs.writeFileSync(path.join(__dirname, 'test_avatar_alignment.png'), canvas.toBuffer('image/png'));
  console.log('Saved test_avatar_alignment.png');
}

main().catch(console.error);
