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

async function removeAchievement(userId, identifier) {
    const key = String(userId);

    if (sb.supabase) {
        try {
            const { data, error } = await sb.supabase
                .from('cricket_achievements')
                .select('*')
                .eq('user_id', userId);
            
            if (!error && data) {
                let targetId = null;
                const index = parseInt(identifier);
                if (!isNaN(index) && index > 0 && index <= data.length) {
                    targetId = data[index - 1].id;
                } else {
                    const matched = data.find(item => item.achievement.toLowerCase() === identifier.toLowerCase());
                    if (matched) {
                        targetId = matched.id;
                    }
                }

                if (targetId) {
                    const { error: delError } = await sb.supabase
                        .from('cricket_achievements')
                        .delete()
                        .eq('id', targetId);
                    if (!delError) {
                        return { success: true };
                    }
                } else {
                    const { error: delError } = await sb.supabase
                        .from('cricket_achievements')
                        .delete()
                        .eq('user_id', userId)
                        .eq('achievement', identifier);
                    if (!delError) {
                        return { success: true };
                    }
                }
            }
        } catch (e) {
            console.log("Failed to remove achievement in Supabase, falling back to local JSON:", e.message);
        }
    }

    // Local JSON Fallback
    const data = readAchievements();
    const list = data[key];
    if (!list || list.length === 0) {
        return { success: false, error: "No achievements found for this user." };
    }

    const index = parseInt(identifier);
    let removed = false;
    if (!isNaN(index) && index > 0 && index <= list.length) {
        list.splice(index - 1, 1);
        removed = true;
    } else {
        const initialLen = list.length;
        data[key] = list.filter(item => item.achievement.toLowerCase() !== identifier.toLowerCase());
        removed = data[key].length < initialLen;
    }

    if (removed) {
        if (data[key].length === 0) {
            delete data[key];
        }
        writeAchievements(data);
        return { success: true };
    }
    return { success: false, error: "Achievement not found matching the criteria." };
}

module.exports = {
    addAchievement,
    getAchievements,
    removeAchievement
};
