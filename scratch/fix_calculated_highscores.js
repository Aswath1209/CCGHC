require('dotenv').config();
const { supabase } = require('../db/supabase');
const fs = require('fs');
const path = require('path');

async function run() {
    console.log("=== CLEANING LOCAL JSON STATS ===");
    const localPath = path.join(__dirname, '../db/career_stats.json');
    if (fs.existsSync(localPath)) {
        const localData = JSON.parse(fs.readFileSync(localPath, 'utf8'));
        let modifiedLocal = false;
        for (const [userId, stats] of Object.entries(localData)) {
            const hs = stats.highscore || 0;
            const fifties = stats.fifties || 0;
            const centuries = stats.centuries || 0;

            let shouldReset = false;
            if (hs >= 100 && centuries === 0) {
                shouldReset = true;
            } else if (hs >= 50 && fifties === 0 && centuries === 0) {
                shouldReset = true;
            }

            if (shouldReset) {
                console.log(`Local User ${userId} (${stats.first_name}) highscore of ${hs} is inconsistent. Resetting to 0.`);
                stats.highscore = 0;
                modifiedLocal = true;
            }
        }
        if (modifiedLocal) {
            fs.writeFileSync(localPath, JSON.stringify(localData, null, 4), 'utf8');
            console.log("Saved updated local stats.");
        } else {
            console.log("No inconsistent local stats found.");
        }
    }

    if (supabase) {
        console.log("\n=== CLEANING SUPABASE STATS ===");
        const { data, error } = await supabase.from('cricket_career_stats').select('*');
        if (error) {
            console.error("Error fetching Supabase stats:", error);
            return;
        }

        for (const stats of data) {
            const hs = stats.highscore || 0;
            const fifties = stats.fifties || 0;
            const centuries = stats.centuries || 0;

            let shouldReset = false;
            if (hs >= 100 && centuries === 0) {
                shouldReset = true;
            } else if (hs >= 50 && fifties === 0 && centuries === 0) {
                shouldReset = true;
            }

            if (shouldReset) {
                console.log(`Supabase User ${stats.user_id} (${stats.first_name}) highscore of ${hs} is inconsistent. Resetting to 0.`);
                const { error: updateErr } = await supabase
                    .from('cricket_career_stats')
                    .update({ highscore: 0 })
                    .eq('user_id', stats.user_id);
                
                if (updateErr) {
                    console.error(`Error resetting highscore for User ${stats.user_id}:`, updateErr);
                } else {
                    console.log(`Successfully reset highscore to 0 for User ${stats.user_id}.`);
                }
            }
        }
    }
}

run();
