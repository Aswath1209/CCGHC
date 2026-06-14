require('dotenv').config();
const { generateProfileCard } = require('../game/profileCardGenerator');
const { getUser } = require('../db/supabase');
const fs = require('fs');

async function test() {
  console.log("Fetching user stats...");
  const userStats = await getUser('1871953626');
  if (!userStats) {
    console.error("User not found!");
    return;
  }
  
  const user = { first_name: userStats.first_name || 'UNKNOWN USER' };
  console.log("User found:", user.first_name);

  const buffer = await generateProfileCard(user, userStats, null);
  fs.writeFileSync('scratch/user_card_preview_new_code.png', buffer);
  fs.copyFileSync('scratch/user_card_preview_new_code.png', '/home/home/.gemini/antigravity/brain/22ef68fc-5b3d-4ebc-b6e8-1483655299e7/user_card_preview_v39.png');
  console.log('Done!');
}
test();
