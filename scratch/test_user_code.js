const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const ASSETS = path.join(__dirname, '../game/assets');

async function generateCricketCard(user, stats, avatarUrl) {
    console.log("Generating card for", user.first_name);
    const width = 800;
    const height = 1200;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 1. Draw template background
    const template = await loadImage(path.join(ASSETS, 'cardtemplate.jpeg'));
    ctx.drawImage(template, 0, 0, width, height);

    // 2. DYNAMIC PROFILE PICTURE (Perfect Masked Circle)
    const avX = 400;
    const avY = 200;
    const avR = 90;

    let pfpImage = null;
    if (avatarUrl && fs.existsSync(avatarUrl)) {
        try {
            pfpImage = await loadImage(avatarUrl);
        } catch (err) {
            console.log("Failed to load user avatar, skipping or using fallback.", err);
        }
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(avX, avY, avR, 0, Math.PI * 2, true); 
    ctx.closePath();
    ctx.clip(); // Mask everything outside this circle

    if (pfpImage) {
        // Draw PFP inside the mask with aspect ratio fitting
        const s = Math.max(avR * 2 / pfpImage.width, avR * 2 / pfpImage.height);
        const dw = pfpImage.width * s;
        const dh = pfpImage.height * s;
        ctx.drawImage(pfpImage, avX - dw / 2, avY - dh / 2, dw, dh);
    } else {
        // Draw gold/dark green gradient silhouette placeholder
        const avGlow = ctx.createRadialGradient(avX, avY, 10, avX, avY, avR);
        avGlow.addColorStop(0, '#2e3a33');
        avGlow.addColorStop(1, '#0c120e');
        ctx.fillStyle = avGlow;
        ctx.fillRect(avX - avR, avY - avR, avR * 2, avR * 2);
        
        ctx.fillStyle = '#c5a059';
        ctx.beginPath();
        ctx.arc(avX, avY - avR * 0.15, avR * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(avX, avY + avR * 1.05, avR * 0.75, Math.PI, 0, false);
        ctx.fill();
    }
    ctx.restore(); // Remove masking effect

    // 3. Draw Player Name on the cream ribbon
    const name = String(user.first_name || 'PLAYER').toUpperCase();
    ctx.save();
    ctx.fillStyle = '#062d1c'; // Dark green
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Dynamic scaling for long player names
    let fontSize = 32;
    ctx.font = `bold ${fontSize}px "DejaVu Sans", "Arial"`;
    while (fontSize > 16 && ctx.measureText(name).width > 280) {
        fontSize--;
        ctx.font = `bold ${fontSize}px "DejaVu Sans", "Arial"`;
    }
    ctx.fillText(name, 400, 380);
    ctx.restore();

    // 4. Draw MOTM Badge Text below green shield
    const motmText = `★ ${stats.motm || 0} MOTM`;
    ctx.save();
    ctx.fillStyle = '#c5a059'; // Premium Gold
    ctx.font = 'bold 22px "DejaVu Sans", "Arial"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(motmText, 400, 435);
    ctx.restore();

    // 5. DYNAMIC STATS (Placing numbers perfectly into the Canva boxes)
    ctx.fillStyle = '#062d1c'; // Solid dark green for premium high-contrast look
    ctx.font = 'bold 26px "DejaVu Sans", "Arial"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Calculate career statistics properties
    const battingAverage = stats.dismissals > 0 ? (stats.runs / stats.dismissals).toFixed(2) : '0.00';
    const bowlingAverage = stats.wickets > 0 ? (stats.runs_conceded / stats.wickets).toFixed(2) : '0.00';
    const economy        = stats.balls_bowled > 0 ? ((stats.runs_conceded * 6) / stats.balls_bowled).toFixed(2) : '0.00';
    const bestBowling    = `${stats.best_wickets || 0}/${stats.best_runs_conceded || 0}`;
    const highScore      = stats.highscore > 0 ? `${stats.highscore}*` : '0';
    const overs          = (stats.balls_bowled / 6).toFixed(1);
    const foursSixes     = `${stats.fours || 0} / ${stats.sixes || 0}`;
    const fifties100s    = `${stats.fifties || 0} / ${stats.centuries || 0}`;
    const hauls3w5w      = `${stats.threew || 0} / ${stats.fivew || 0}`;

    // Left Column X: 300, Right Column X: 500
    const leftX = 300;
    const rightX = 500;

    // --- Top Modules ---
    // Left Box 1 (RUNS SCORED)
    ctx.fillText((stats.runs || 0).toLocaleString(), leftX, 585);
    // Right Box 1 (BATTING AVERAGE)
    ctx.fillText(battingAverage, rightX, 585);

    // Left Box 2 (HIGHEST SCORE)
    ctx.fillText(highScore, leftX, 665);
    // Right Box 2 (FOURS / SIXES)
    ctx.fillText(foursSixes, rightX, 665);

    // Left Box 3 (50S / 100S)
    ctx.fillText(fifties100s, leftX, 745);
    // Right Box 3 (DUCKS COUNT)
    ctx.fillText(String(stats.ducks || 0), rightX, 745);

    // --- Bottom Modules ---
    // Left Box 4 (WICKETS TAKEN)
    ctx.fillText(String(stats.wickets || 0), leftX, 905);
    // Right Box 4 (ECONOMY RATE)
    ctx.fillText(economy, rightX, 905);

    // Left Box 5 (BEST BOWLING)
    ctx.fillText(bestBowling, leftX, 985);
    // Right Box 5 (3W / 5W HAULS)
    ctx.fillText(hauls3w5w, rightX, 985);

    // Left Box 6 (BOWLING AVERAGE)
    ctx.fillText(bowlingAverage, leftX, 1065);
    // Right Box 6 (OVERS BOWLED)
    ctx.fillText(overs, rightX, 1065);

    // 6. Draw Footer Text
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px "DejaVu Sans", "Arial"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('HANDCRICKET PRO COLLECTIBLE  //  AZURE LEGION EDITION', width / 2, 1125);
    
    ctx.fillStyle = '#c5a059';
    ctx.font = 'bold 9px "DejaVu Sans", "Arial"';
    ctx.fillText('SERIALIZED CARD #001/1000 - MYCARD', width / 2, 1155);
    ctx.restore();

    // Save output
    const buffer = canvas.toBuffer('image/png');
    const outputPath = path.join(__dirname, 'user_card_preview.png');
    fs.writeFileSync(outputPath, buffer);
    console.log(`Successfully generated user card preview at ${outputPath}`);
    return buffer;
}

const mockStats = {
  runs: 2450,
  dismissals: 45,
  fours: 230,
  sixes: 105,
  fifties: 18,
  centuries: 4,
  highscore: 148,
  ducks: 2,
  wickets: 75,
  balls_bowled: 1200,
  runs_conceded: 1100,
  threew: 4,
  fivew: 1,
  best_wickets: 5,
  best_runs_conceded: 18,
  wins: 42,
  losses: 20,
  motm: 8
};

const mockUser = {
  first_name: "Virat Kohli"
};

generateCricketCard(mockUser, mockStats, path.join(__dirname, 'sample_avatar.png')).catch(err => {
    console.error("Error generating card:", err);
});
