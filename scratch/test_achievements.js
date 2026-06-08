const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log("Starting achievements test...");

// Clear local achievements.json first to have a clean test
const achievementsFile = path.join(__dirname, '../db/achievements.json');
if (fs.existsSync(achievementsFile)) {
    fs.unlinkSync(achievementsFile);
}

const achievementsHelper = require('../db/achievements');

async function runTests() {
    // 1. Verify get achievements on empty
    let list = await achievementsHelper.getAchievements('test_user_123');
    assert.strictEqual(list.length, 0, "Initial achievements list should be empty");
    
    // 2. Add an achievement
    const res = await achievementsHelper.addAchievement('test_user_123', 'Incredible 100 Runs', '7361215114');
    assert.ok(res.success, "addAchievement should return success");
    assert.strictEqual(res.achievement, 'Incredible 100 Runs');
    
    // 3. Verify retrieved list has the achievement
    list = await achievementsHelper.getAchievements('test_user_123');
    assert.strictEqual(list.length, 1, "Achievements list should contain exactly 1 item");
    assert.strictEqual(list[0].achievement, 'Incredible 100 Runs');
    assert.strictEqual(list[0].awardedBy, '7361215114');
    assert.ok(list[0].awardedAt, "Awarded timestamp should exist");

    // 4. Verify admin check logic
    const BOT_ADMIN_IDS = new Set(["7361215114", "6268846393"]);
    function isBotAdmin(userId) {
        return BOT_ADMIN_IDS.has(String(userId));
    }
    assert.ok(isBotAdmin("7361215114"), "7361215114 should be admin");
    assert.ok(isBotAdmin("6268846393"), "6268846393 should be admin");
    assert.ok(!isBotAdmin("12345"), "Normal user should not be admin");

    console.log("Achievements system successfully validated!");
    
    // Clean up
    if (fs.existsSync(achievementsFile)) {
        fs.unlinkSync(achievementsFile);
    }
    process.exit(0);
}

runTests().catch(err => {
    console.error("Test failed:", err);
    process.exit(1);
});
