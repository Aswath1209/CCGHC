const { generateProfileCard } = require('../game/profileCardGenerator');
const fs = require('fs');
const path = require('path');

const user = {
  first_name: 'Virat Kohli'
};

const stats = {
  runs: 2450,
  dismissals: 45,
  highscore: 148,
  fifties: 18,
  centuries: 4,
  fours: 230,
  sixes: 105,
  ducks: 2,
  wickets: 75,
  runs_conceded: 1100,
  balls_bowled: 1200,
  best_wickets: 5,
  best_runs_conceded: 18,
  threew: 4,
  fivew: 1,
  motm: 8
};

async function test() {
  const avatarPath = path.join(__dirname, 'sample_avatar.png');
  let avatarBuffer = null;
  if (fs.existsSync(avatarPath)) {
    avatarBuffer = fs.readFileSync(avatarPath);
  }
  
  console.log("Generating profile card...");
  const buffer = await generateProfileCard(user, stats, avatarBuffer);
  const outputPath = path.join(__dirname, 'user_card_preview_new_code.png');
  fs.writeFileSync(outputPath, buffer);
  console.log("Card generated successfully at:", outputPath);
}

test().catch(err => console.error("Test failed:", err));
