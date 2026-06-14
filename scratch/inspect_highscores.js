require('dotenv').config();
const { supabase } = require('../db/supabase');
const fs = require('fs');
const path = require('path');

async function run() {
    console.log("=== LOCAL JSON STATS (highscore > 0) ===");
    const localPath = path.join(__dirname, '../db/career_stats.json');
    if (fs.existsSync(localPath)) {
        const localData = JSON.parse(fs.readFileSync(localPath, 'utf8'));
        for (const [userId, stats] of Object.entries(localData)) {
            if (stats.highscore > 0) {
                console.log(`Local User ${userId} (${stats.first_name}): runs=${stats.runs}, batting_innings=${stats.batting_innings}, fifties=${stats.fifties}, centuries=${stats.centuries}, highscore=${stats.highscore}`);
            }
        }
    }

    if (supabase) {
        console.log("\n=== SUPABASE STATS (highscore > 0) ===");
        const { data, error } = await supabase.from('cricket_career_stats').select('*').gt('highscore', 0);
        if (error) {
            console.error("Error fetching Supabase stats:", error);
        } else {
            for (const stats of data) {
                console.log(`Supabase User ${stats.user_id} (${stats.first_name}): runs=${stats.runs}, batting_innings=${stats.batting_innings}, fifties=${stats.fifties}, centuries=${stats.centuries}, highscore=${stats.highscore}`);
            }
        }
    }
}

run();
