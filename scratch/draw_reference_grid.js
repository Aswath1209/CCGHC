const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

async function drawReferenceGrid() {
    const srcPath = '/home/home/.gemini/antigravity/brain/702cfd33-1c1a-4a07-8969-e78596f45b6d/.tempmediaStorage/media_702cfd33-1c1a-4a07-8969-e78596f45b6d_1781448439022.png';
    const img = await loadImage(srcPath);
    
    const W = img.width;
    const H = img.height;
    
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(img, 0, 0);
    
    ctx.lineWidth = 1;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    for (let x = 50; x < W; x += 50) {
        ctx.strokeStyle = x % 100 === 0 ? 'rgba(255, 0, 0, 0.4)' : 'rgba(0, 0, 255, 0.2)';
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
        ctx.strokeStyle = y % 100 === 0 ? 'rgba(255, 0, 0, 0.4)' : 'rgba(0, 0, 255, 0.2)';
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
    
    const outputPath = path.join(__dirname, 'reference_grid.png');
    fs.writeFileSync(outputPath, canvas.toBuffer('image/png'));
    console.log(`Saved reference grid to ${outputPath}`);
}

drawReferenceGrid().catch(console.error);
