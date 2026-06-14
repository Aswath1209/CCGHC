const { generateProfileCard } = require('../game/profileCardGenerator');
const fs = require('fs');
const path = require('path');

const stats = {
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

const testCases = [
  { first_name: "DESIGN 1: LUXURY GOLD", card_theme: "gold", design_id: 1 },
  { first_name: "DESIGN 2: CYBER CARBON", card_theme: "cyan", design_id: 2 },
  { first_name: "DESIGN 3: SATIN CRIMSON", card_theme: "red", design_id: 3 },
  { first_name: "DESIGN 4: ROYAL PURPLE", card_theme: "purple", design_id: 4 },
  { first_name: "DESIGN 5: EMERALD CHAMP", card_theme: "emerald", design_id: 5 },
  { first_name: "DESIGN 6: RACING CARBON", card_theme: "yellow", design_id: 6 },
  { first_name: "DESIGN 7: VAPORWAVE RETRO", card_theme: "pink", design_id: 7 },
  { first_name: "DESIGN 8: STEEL INDUSTRY", card_theme: "silver", design_id: 8 },
  { first_name: "DESIGN 9: VOLCANIC LAVA", card_theme: "orange", design_id: 9 },
  { first_name: "DESIGN 10: COSMIC NEBULA", card_theme: "blue", design_id: 10 }
];

const outputDir = __dirname;

fs.readFile(path.join(__dirname, 'sample_avatar.png'), (err, avatarBuffer) => {
  if (err) {
    console.error("Failed to load sample_avatar.png:", err);
    process.exit(1);
  }

  Promise.all(
    testCases.map((user) => {
      return generateProfileCard(user, stats, avatarBuffer).then(buf => {
        const filepath = path.join(outputDir, `test_stadium_v9_design_${user.design_id}.png`);
        fs.writeFileSync(filepath, buf);
        console.log(`Rendered Design ${user.design_id} (${user.card_theme}) -> ${filepath}`);
      });
    })
  ).then(() => {
    console.log("All 10 designs with themed CCG logo rendered successfully!");
  }).catch(err => {
    console.error("Rendering failed:", err);
  });
});
