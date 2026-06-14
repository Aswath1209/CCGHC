const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const ASSETS = path.join(__dirname, '../game/assets');

async function createGrid() {
    const width = 800;
    const height = 1200;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const template = await loadImage(path.join(ASSETS, 'cardtemplate.jpeg'));
    ctx.drawImage(template, 0, 0, width, height);

    // Draw horizontal lines and label them
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.4)';
    ctx.lineWidth = 1;
    ctx.fillStyle = 'red';
    ctx.font = '10px Arial';
    ctx.textAlign = 'left';

    for (let y = 500; y <= 1100; y += 10) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();

        ctx.fillText(String(y), 10, y - 2);
        ctx.fillText(String(y), width - 40, y - 2);
    }

    const outputPath = path.join(__dirname, 'grid_clean_template.png');
    fs.writeFileSync(outputPath, canvas.toBuffer('image/png'));
    console.log(`Grid generated at ${outputPath}`);
}

createGrid().catch(err => {
    console.error(err);
});
