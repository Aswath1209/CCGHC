const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log("Starting new career stats fields and leaderboard test...");

const statsFile = path.join(__dirname, '../db/career_stats.json');
if (fs.existsSync(statsFile)) {
    fs.unlinkSync(statsFile);
}

const careerStats = require('../db/careerStats');

async function runTests() {
    // 1. Verify initial stats are empty/0
    let stats = await careerStats.getStats('11111');
    assert.strictEqual(stats.runs, 0);
    assert.strictEqual(stats.highscore, 0);
    assert.strictEqual(stats.ducks, 0);
    assert.strictEqual(stats.best_wickets, 0);
    assert.strictEqual(stats.best_runs_conceded, 0);
    assert.strictEqual(stats.batting_innings, 0);
    assert.strictEqual(stats.bowling_innings, 0);

    // 2. Increment stats: match 1 (batsman: 45 runs, 20 balls; bowler: 2 wkts, 15 runs, 12 balls bowled)
    await careerStats.incrementStats('11111', {
        first_name: 'Player One',
        runs: 45,
        balls_faced: 20,
        highscore: 45,
        ducks: 0,
        best_wickets: 2,
        best_runs_conceded: 15,
        balls_bowled: 12,
        wickets: 2,
        runs_conceded: 15,
        batting_innings: 1,
        bowling_innings: 1
    });

    stats = await careerStats.getStats('11111');
    assert.strictEqual(stats.highscore, 45, "highscore should be 45");
    assert.strictEqual(stats.ducks, 0, "ducks should be 0");
    assert.strictEqual(stats.best_wickets, 2, "best wickets should be 2");
    assert.strictEqual(stats.best_runs_conceded, 15, "best runs conceded should be 15");
    assert.strictEqual(stats.batting_innings, 1, "batting innings should be 1");
    assert.strictEqual(stats.bowling_innings, 1, "bowling innings should be 1");

    // 3. Increment stats: match 2 (batsman: 0 runs, 1 ball, dismissed; bowler: 3 wkts, 10 runs, 18 balls bowled)
    await careerStats.incrementStats('11111', {
        first_name: 'Player One',
        runs: 0,
        balls_faced: 1,
        highscore: 0,
        ducks: 1,
        best_wickets: 3,
        best_runs_conceded: 10,
        balls_bowled: 18,
        wickets: 3,
        runs_conceded: 10,
        batting_innings: 1,
        bowling_innings: 1
    });

    stats = await careerStats.getStats('11111');
    assert.strictEqual(stats.highscore, 45, "highscore should remain 45");
    assert.strictEqual(stats.ducks, 1, "ducks should be 1");
    assert.strictEqual(stats.best_wickets, 3, "best wickets should improve to 3");
    assert.strictEqual(stats.best_runs_conceded, 10, "best runs conceded should improve to 10");
    assert.strictEqual(stats.batting_innings, 2, "batting innings should be 2");
    assert.strictEqual(stats.bowling_innings, 2, "bowling innings should be 2");

    // 4. Increment stats: match 3 (bowler: 1 wkt, 30 runs, 6 balls - worse bowling figures)
    await careerStats.incrementStats('11111', {
        first_name: 'Player One',
        runs: 10,
        balls_faced: 5,
        highscore: 10,
        ducks: 0,
        best_wickets: 1,
        best_runs_conceded: 30,
        balls_bowled: 6,
        wickets: 1,
        runs_conceded: 30,
        batting_innings: 1,
        bowling_innings: 1
    });

    stats = await careerStats.getStats('11111');
    assert.strictEqual(stats.best_wickets, 3, "best wickets should remain 3");
    assert.strictEqual(stats.best_runs_conceded, 10, "best runs conceded should remain 10");

    // 5. Test another player and verify leaderboards sorting
    await careerStats.incrementStats('22222', {
        first_name: 'Player Two',
        runs: 120,
        highscore: 120,
        ducks: 3,
        best_wickets: 5,
        best_runs_conceded: 5,
        balls_bowled: 12,
        wickets: 5,
        runs_conceded: 5,
        batting_innings: 5,
        bowling_innings: 3
    });

    const lists = await careerStats.getTopLists();
    assert.strictEqual(lists.topRuns[0].user_id, '22222', "Player Two should be first in runs");
    assert.strictEqual(lists.topRuns[1].user_id, '11111', "Player One should be second in runs");
    
    assert.strictEqual(lists.topHighscores[0].highscore, 120);
    assert.strictEqual(lists.topDucks[0].ducks, 3);
    assert.strictEqual(lists.topWickets[0].wickets, 6);
    assert.strictEqual(lists.topWickets[0].user_id, '11111');

    console.log("All new stats tracking and leaderboards sorting validated successfully!");

    // Clean up
    if (fs.existsSync(statsFile)) {
        fs.unlinkSync(statsFile);
    }
    process.exit(0);
}

runTests().catch(err => {
    console.error("Test failed:", err);
    process.exit(1);
});
