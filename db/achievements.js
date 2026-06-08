const fs = require('fs');
const path = require('path');
const sb = require('./supabase');

const ACHIEVEMENTS_FILE = path.join(__dirname, 'achievements.json');

function readAchievements() {
    try {
        if (fs.existsSync(ACHIEVEMENTS_FILE)) {
            const content = fs.readFileSync(ACHIEVEMENTS_FILE, 'utf-8');
            return JSON.parse(content);
        }
    } catch (e) {
        console.error("Error reading achievements file:", e);
    }
    return {};
}

function writeAchievements(data) {
    try {
        fs.writeFileSync(ACHIEVEMENTS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
        console.error("Error writing achievements file:", e);
    }
}

async function addAchievement(userId, achievement, awardedBy) {
    const key = String(userId);
    const awardedAt = new Date().toISOString();

    if (sb.supabase) {
        try {
            const { error } = await sb.supabase
                .from('cricket_achievements')
                .insert({
                    user_id: userId,
                    achievement: achievement,
                    awarded_by: awardedBy,
                    awarded_at: awardedAt
                });
            if (!error) {
                return { success: true, achievement, awardedAt };
            }
            console.log("Supabase achievements insert error, falling back to local JSON:", error.message);
        } catch (e) {
            console.log("Failed to insert achievement in Supabase, falling back to local JSON:", e.message);
        }
    }

    // Local JSON Fallback
    const data = readAchievements();
    if (!data[key]) {
        data[key] = [];
    }
    data[key].push({
        achievement,
        awarded_by: awardedBy,
        awarded_at: awardedAt
    });
    writeAchievements(data);
    return { success: true, achievement, awardedAt };
}

async function getAchievements(userId) {
    const key = String(userId);

    if (sb.supabase) {
        try {
            const { data, error } = await sb.supabase
                .from('cricket_achievements')
                .select('*')
                .eq('user_id', userId);
            if (!error && data) {
                return data.map(item => ({
                    achievement: item.achievement,
                    awardedBy: item.awarded_by,
                    awardedAt: item.awarded_at
                }));
            }
        } catch (e) {
            console.log("Failed to fetch achievements from Supabase, falling back to local JSON:", e.message);
        }
    }

    // Local JSON Fallback
    const data = readAchievements();
    const list = data[key] || [];
    return list.map(item => ({
        achievement: item.achievement,
        awardedBy: item.awarded_by,
        awardedAt: item.awarded_at
    }));
}

module.exports = {
    addAchievement,
    getAchievements
};
