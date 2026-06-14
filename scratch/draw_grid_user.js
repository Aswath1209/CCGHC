const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

async function drawGrid() {
    const templatePath = path.join(__dirname, '../game/assets/cardtemplate.jpeg');
    const img = await loadImage(templatePath);
    
    const W = 800;
    const H = 1200;
    
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(img, 0, 0, W, H);
    
    // Draw grid lines every 50 pixels
    ctx.lineWidth = 1;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    for (let x = 50; x < W; x += 50) {
        ctx.strokeStyle = x % 100 === 0 ? 'rgba(255, 0, 0, 0.5)' : 'rgba(0, 0, 255, 0.3)';
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(x - 15, 10, 30, 14);
        ctx.fillStyle = '#ff0000';
        ctx.font = '9px Arial';
        ctx.fillText(String(x), x, 17);
    }
    
    for (let y = 50; y < H; y += 50) {
        ctx.strokeStyle = y % 100 === 0 ? 'rgba(255, 0, 0, 0.5)' : 'rgba(0, 0, 255, 0.3)';
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(10, y - 7, 30, 14);
        ctx.fillStyle = '#ff0000';
        ctx.font = '9px Arial';
        ctx.fillText(String(y), 25, y);
    }
    
    const outputPath = path.join(__dirname, 'grid_user_template.png');
    fs.writeFileSync(outputPath, canvas.toBuffer('image/png'));
    console.log(`Saved grid template to ${outputPath}`);
}

drawGrid().catch(console.error);
