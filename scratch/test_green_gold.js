const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const ASSETS = path.join(__dirname, '../game/assets');

async function generateCollectibleCard(userData) {
    const templatePath = path.join(ASSETS, 'green_gold_template.png');
    const template = await loadImage(templatePath);
    
    const W = 1024;
    const H = 1024;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');
    
    // 1. Draw template background
    ctx.drawImage(template, 0, 0, W, H);
    
    // 2. Player Avatar (Masked inside the gear circular frame)
    // Center: (512, 235), Radius: 104px (mask slightly smaller for a clean border fit)
    const avX = 512;
    const avY = 235;
    const avR = 102;
    
    try {
        let pfpImage;
        if (userData.avatarUrl && fs.existsSync(userData.avatarUrl)) {
            pfpImage = await loadImage(userData.avatarUrl);
        }
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(avX, avY, avR, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        
        if (pfpImage) {
            const s = Math.max(avR * 2 / pfpImage.width, avR * 2 / pfpImage.height);
            const dw = pfpImage.width * s;
            const dh = pfpImage.height * s;
            ctx.drawImage(pfpImage, avX - dw / 2, avY - dh / 2, dw, dh);
        } else {
            // Draw a nice dark background and silhouette fallback
            const avGlow = ctx.createRadialGradient(avX, avY, 10, avX, avY, avR);
            avGlow.addColorStop(0, '#2e3a33');
            avGlow.addColorStop(1, '#0c120e');
            ctx.fillStyle = avGlow;
            ctx.fillRect(avX - avR, avY - avR, avR * 2, avR * 2);
            
            // Draw silhouette
            ctx.fillStyle = '#c5a059';
            ctx.beginPath();
            ctx.arc(avX, avY - avR * 0.15, avR * 0.35, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(avX, avY + avR * 1.05, avR * 0.75, Math.PI, 0, false);
            ctx.fill();
        }
        ctx.restore();
    } catch (err) {
        console.error("Failed to load avatar:", err);
    }
    
    // 3. Draw Player Name on the cream ribbon
    const name = (userData.name || 'PLAYER').toUpperCase();
    ctx.save();
    ctx.font = 'bold 32px "DejaVu Sans", "Arial"';
    ctx.fillStyle = '#062d1c'; // Deep forest green
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, 512, 412);
    ctx.restore();
    
    // 4. Draw MOTM Badge on the shield crest banner space
    const motmText = `${userData.motm || 0} MOTM`;
    ctx.save();
    ctx.font = 'bold 15px "DejaVu Sans", "Arial"';
    ctx.fillStyle = '#ffffff'; // White text on green shield top banner
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(motmText, 512, 465);
    ctx.restore();
    
    // 5. Draw Stats in the 2x2 Grid Modules
    const greenText = '#062d1c';
    const goldText = '#c5a059';
    
    // Helper function to draw module title
    function drawModuleTitle(title, x, y) {
        ctx.save();
        ctx.font = 'italic bold 21px "DejaVu Sans", "Arial"';
        ctx.fillStyle = goldText;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(title, x, y);
        ctx.restore();
    }
    
    // Helper function to draw stats column
    function drawStatsList(items, startX, startY) {
        const rowH = 45;
        items.forEach((item, index) => {
            const cy = startY + index * rowH;
            
            // Draw Label
            ctx.save();
            ctx.font = 'bold 9px "DejaVu Sans", "Arial"';
            ctx.fillStyle = 'rgba(6, 45, 28, 0.55)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(item.label.toUpperCase(), startX, cy + 6);
            
            // Draw Value
            ctx.font = 'bold 20px "DejaVu Sans", "Arial"';
            ctx.fillStyle = greenText;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(String(item.value), startX, cy + 18);
            ctx.restore();
        });
    }
    
    // Define the stats structure
    const battingModule1 = [
        { label: 'Runs Scored', value: userData.runs },
        { label: 'Highest Score', value: userData.highestScore },
        { label: '50s / 100s', value: userData.boundaries }
    ];
    
    const battingModule2 = [
        { label: 'Batting Average', value: userData.batAvg },
        { label: 'Fours / Sixes', value: userData.foursSixes || '0 / 0' },
        { label: 'Ducks Count', value: userData.ducks }
    ];
    
    const bowlingModule1 = [
        { label: 'Wickets Taken', value: userData.wickets },
        { label: 'Best Bowling', value: userData.bestBowling },
        { label: 'Bowling Average', value: userData.bowlingAvg || userData.batAvg }
    ];
    
    const bowlingModule2 = [
        { label: 'Economy Rate', value: userData.economy },
        { label: '3w / 5w Hauls', value: userData.hauls },
        { label: 'Overs Bowled', value: userData.overs }
    ];
    
    // Draw Headers
    drawModuleTitle('Batting Module', 250, 532);
    drawModuleTitle('Batting Module', 774, 532);
    drawModuleTitle('Bowling Module', 250, 750);
    drawModuleTitle('Bowling Module', 774, 750);
    
    // Draw Stats Values (startY shifted slightly down inside the panels)
    drawStatsList(battingModule1, 250, 542);
    drawStatsList(battingModule2, 774, 542);
    drawStatsList(bowlingModule1, 250, 760);
    drawStatsList(bowlingModule2, 774, 760);
    
    // 6. Draw Footer Text
    ctx.save();
    ctx.fillStyle = '#ffffff'; // White/Gold text on green band
    ctx.font = 'bold 10px "DejaVu Sans", "Arial"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('HANDCRICKET PRO COLLECTIBLE  //  AZURE LEGION EDITION', W/2, 950);
    
    ctx.fillStyle = '#062d1c'; // Dark green text on bottom cream band
    ctx.font = 'bold 9px "DejaVu Sans", "Arial"';
    ctx.fillText('SERIALIZED CARD #001/1000 - MYCARD', W/2, 995);
    ctx.restore();

    // 7. Save file
    const buffer = canvas.toBuffer('image/png');
    const outputPath = path.join(__dirname, 'collectible_preview.png');
    fs.writeFileSync(outputPath, buffer);
    console.log(`Saved collectible preview to ${outputPath}`);
}

const mockData = {
    name: "Aswath",
    motm: 8,
    runs: 526,
    batAvg: "10.12",
    highestScore: "31",
    boundaries: "0 / 0", // used for 50s/100s
    foursSixes: "44 / 38",
    ducks: 7,
    wickets: 50,
    economy: "16.56",
    bestBowling: "3/24",
    bowlingAvg: "13.80",
    hauls: "3 / 0", // 3w / 5w hauls
    overs: "41.7",
    avatarUrl: null
};

generateCollectibleCard(mockData).catch(console.error);
