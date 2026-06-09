const assert = require('assert');
const fs = require('fs');
const path = require('path');
const tourManager = require('../game/tourManager');
const installTourMode = require('../game/tourBotUI');

console.log("Starting Super Over Tie-Breaker Unit Tests...");

// 1. Mock bot, sleep, sendEventUpdate, commentaries, and other UI dependencies
const botMock = {
    botInfo: { username: 'test_bot' },
    commands: {},
    command(cmd, handler) {
        if (Array.isArray(cmd)) {
            cmd.forEach(c => this.commands[c] = handler);
        } else {
            this.commands[cmd] = handler;
        }
    },
    on(event, handler) {
        // Mock on for callback query
    }
};

const sleepMock = () => Promise.resolve();
const sendEventUpdateMock = () => Promise.resolve();

const COMMENTARY = {
    "0": ["Dot ball!"],
    "1": ["Single!"],
    "2": ["Double!"],
    "3": ["Three runs!"],
    "4": ["Boundary!"],
    "5": ["Five runs!"],
    "6": ["Sixer!"]
};

// Initialize UI layer
installTourMode(botMock, sleepMock, sendEventUpdateMock, COMMENTARY, {}, {});

// Create clean DB backup to prevent stats pollution
const statsFile = path.join(__dirname, '../db/career_stats.json');
let initialStats = "";
if (fs.existsSync(statsFile)) {
    initialStats = fs.readFileSync(statsFile, 'utf8');
    fs.writeFileSync(statsFile, '{}');
} else {
    fs.writeFileSync(statsFile, '{}');
}

// 2. Setup the Tour Match
const chatId = 88888;
const hostUser = { id: 111, first_name: "Host" };
const tourResult = tourManager.createTour(chatId, hostUser, "Super Over Test");
assert.ok(tourResult.success);

const tourId = tourResult.tour.id;
const tour = tourManager.getTour(tourId);

// Set match config
tour.config.overs = 1; // 1 over match to speed up
tour.config.wickets = 2;

// Add players
tourManager.joinTeam(tourId, { id: 111, first_name: "A1" }, 'teamA');
tourManager.joinTeam(tourId, { id: 222, first_name: "A2" }, 'teamA');
tourManager.joinTeam(tourId, { id: 333, first_name: "B1" }, 'teamB');
tourManager.joinTeam(tourId, { id: 444, first_name: "B2" }, 'teamB');

// Appoint captains
tourManager.appointCaptain(tourId, 111, 111, 'teamA');
tourManager.appointCaptain(tourId, 111, 333, 'teamB');

// Start tour and toss
tourManager.startTour(tourId, 111);
tour.battingTeamId = 'teamA';
tour.bowlingTeamId = 'teamB';
tour.firstBattingTeamId = 'teamA';
tour.state = 'PLAYING';

// Set batters/bowler for Innings 1
tour.teamA.strikerId = 111;
tour.teamA.nonStrikerId = 222;
tour.activeBowlerId = 333;

// Mock Ctx
let sentMessages = [];
let sentPhotos = [];
const ctxMock = {
    chat: { id: chatId, type: 'supergroup' },
    from: { id: 111, first_name: 'A1' },
    api: {
        sendMessage(cId, text, options) {
            sentMessages.push(text);
            return Promise.resolve({ message_id: 1 });
        },
        sendPhoto(cId, photo, options) {
            sentPhotos.push(options.caption || "");
            return Promise.resolve({ message_id: 1 });
        }
    },
    reply(text) {
        sentMessages.push(text);
        return Promise.resolve({ message_id: 1 });
    }
};

async function runSimulation() {
    function playBall(batId, batChoice, bowlId, bowlChoice) {
        tour.processingBall = false;
        let r = tourManager.submitPlay(tourId, batId, batChoice);
        assert.ok(r.success, r.error);
        r = tourManager.submitPlay(tourId, bowlId, bowlChoice);
        assert.ok(r.success, r.error);
        tour.processingBall = false;
        return r;
    }

    // INNINGS 1: Team A bats first.
    // Ball 1: A1 plays 4, B1 bowls RS(0) -> 4 runs
    let playRes = playBall(111, '4', 333, 'RS');
    assert.strictEqual(playRes.success, true);
    assert.strictEqual(playRes.isWicket, false);
    
    // Ball 2: A1 plays 6, B1 bowls RS(0) -> 6 runs
    playRes = playBall(111, '6', 333, 'RS');
    
    // Ball 3: A1 plays 0, B1 bowls RS(0) -> Wicket 1!
    playRes = playBall(111, '0', 333, 'RS');
    assert.strictEqual(playRes.isWicket, true);
    
    // Replace striker A1
    tour.teamA.strikerId = 111;
    tour.state = 'PLAYING';
    
    // Ball 4: A1 plays 0, B1 bowls RS(0) -> Wicket 2! All out!
    playRes = playBall(111, '0', 333, 'RS');
    assert.strictEqual(playRes.isWicket, true);
    assert.strictEqual(playRes.inningsEnded, true);
    
    // End Innings 1. Score: 10/2. Target: 11.
    assert.strictEqual(tour.teamA.score, 10);
    assert.strictEqual(tour.teamA.wickets, 2);
    
    // Setup Innings 2: Team B bats, Team A bowls
    tour.innings = 2;
    tour.balls = 0;
    tour.battingTeamId = 'teamB';
    tour.bowlingTeamId = 'teamA';
    tour.teamB.strikerId = 333;
    tour.teamB.nonStrikerId = 444;
    tour.activeBowlerId = 111;
    tour.state = 'PLAYING';
    
    // Ball 1: B1 plays 6, A1 bowls RS(0) -> 6 runs
    playRes = playBall(333, '6', 111, 'RS');
    
    // Ball 2: B1 plays 4, A1 bowls RS(0) -> 4 runs (Tied!)
    playRes = playBall(333, '4', 111, 'RS');
    
    // Ball 3: B1 plays 0, A1 bowls RS(0) -> Wicket 1
    playRes = playBall(333, '0', 111, 'RS');
    
    tour.teamB.strikerId = 333;
    tour.state = 'PLAYING';
    
    // Ball 4: B1 plays 0, A1 bowls RS(0) -> Wicket 2! All out! Tied match!
    // Submit striker's input first:
    tour.processingBall = false;
    let submitBat = tourManager.submitPlay(tourId, 333, '0');
    assert.ok(submitBat.success);
    
    // Bowler A1 submits choice via UI Text Hook to trigger tie/Super Over
    ctxMock.from.id = 111; // Bowler A1
    let hookHandled = await botMock.tourTextHook(ctxMock, tour, 'RS');
    assert.ok(hookHandled);
    
    // 3. Verify Super Over 1 has initialized correctly
    console.log("Checking Super Over 1 initialization...");
    assert.strictEqual(tour.isSuperOver, true);
    assert.strictEqual(tour.superOverCount, 1);
    assert.ok(tour.mainMatchTeamA, "Main match Team A stats should be backed up");
    assert.ok(tour.mainMatchTeamB, "Main match Team B stats should be backed up");
    
    // The team who bat last will bat first in super over (Team B)
    assert.strictEqual(tour.battingTeamId, 'teamB');
    assert.strictEqual(tour.bowlingTeamId, 'teamA');
    assert.strictEqual(tour.firstBattingTeamId, 'teamB');
    
    // Assert scores were reset
    assert.strictEqual(tour.teamA.score, 0);
    assert.strictEqual(tour.teamB.score, 0);
    assert.strictEqual(tour.teamA.wickets, 0);
    assert.strictEqual(tour.teamB.wickets, 0);
    assert.strictEqual(tour.balls, 0);
    assert.strictEqual(tour.innings, 1);
    
    // Let's verify our overridden wickets/overs limits in submitPlay
    // Setup Super Over Innings 1: Team B bats, Team A bowls
    tour.teamB.strikerId = 333;
    tour.teamB.nonStrikerId = 444;
    tour.activeBowlerId = 111;
    tour.state = 'PLAYING';
    
    // Ball 1: B1 plays 6, A1 bowls RS(0) -> 6 runs
    playRes = playBall(333, '6', 111, 'RS');
    
    // Ball 2: B1 plays 0, A1 bowls RS(0) -> Wicket 1
    playRes = playBall(333, '0', 111, 'RS');
    assert.strictEqual(playRes.isWicket, true);
    
    // Replace striker
    tour.teamB.strikerId = 333;
    tour.state = 'PLAYING';
    
    // Ball 3: B1 plays 0, A1 bowls RS(0) -> Wicket 2! All out! (Wicket limit is 2 in Super Over!)
    playRes = playBall(333, '0', 111, 'RS');
    assert.strictEqual(playRes.isWicket, true);
    assert.strictEqual(playRes.inningsEnded, true, "Super Over Innings 1 should end after 2 wickets");
    
    // Super Over Innings 1 Score: 6/2
    assert.strictEqual(tour.teamB.score, 6);
    
    // Setup Super Over Innings 2: Team A bats, Team B bowls
    tour.innings = 2;
    tour.balls = 0;
    tour.battingTeamId = 'teamA';
    tour.bowlingTeamId = 'teamB';
    tour.teamA.strikerId = 111;
    tour.teamA.nonStrikerId = 222;
    tour.activeBowlerId = 333;
    tour.state = 'PLAYING';
    
    // Ball 1: A1 plays 6, B1 bowls RS(0) -> 6 runs (Tied!)
    playRes = playBall(111, '6', 333, 'RS');
    
    // Ball 2: A1 plays 0, B1 bowls RS(0) -> Wicket 1
    playRes = playBall(111, '0', 333, 'RS');
    
    // Replace striker
    tour.teamA.strikerId = 111;
    tour.state = 'PLAYING';
    
    // Ball 3: A1 plays 0, B1 bowls RS(0) -> Wicket 2! All out! (Tied Super Over!)
    // Submit striker's input first:
    tour.processingBall = false;
    submitBat = tourManager.submitPlay(tourId, 111, '0');
    assert.ok(submitBat.success);
    
    // Bowler B1 submits choice via UI Text Hook to trigger Super Over 2
    ctxMock.from.id = 333; // Bowler B1
    hookHandled = await botMock.tourTextHook(ctxMock, tour, 'RS');
    assert.ok(hookHandled);
    
    // 4. Verify Super Over 2 has initialized correctly
    console.log("Checking Super Over 2 recursive initialization...");
    assert.strictEqual(tour.isSuperOver, true);
    assert.strictEqual(tour.superOverCount, 2);
    
    // Chasing team in preceding SO (Team A) bats first in Super Over 2
    assert.strictEqual(tour.battingTeamId, 'teamA');
    assert.strictEqual(tour.bowlingTeamId, 'teamB');
    assert.strictEqual(tour.firstBattingTeamId, 'teamA');
    
    // Setup Super Over 2 Innings 1: Team A bats
    tour.teamA.strikerId = 111;
    tour.teamA.nonStrikerId = 222;
    tour.activeBowlerId = 333;
    tour.state = 'PLAYING';
    
    // Ball 1: A1 plays 4, B1 bowls RS -> 4 runs
    playRes = playBall(111, '4', 333, 'RS');
    
    // Ball 2: A1 plays 4, B1 bowls RS -> 4 runs (8 total)
    playRes = playBall(111, '4', 333, 'RS');
    
    // Finish over of 6 balls
    tour.balls = 5;
    playRes = playBall(111, '1', 333, 'RS');
    assert.strictEqual(playRes.inningsEnded, true, "Super Over Innings 1 should end after 1 over (6 balls)");
    assert.strictEqual(tour.teamA.score, 9);
    
    // Setup Super Over 2 Innings 2: Team B bats
    tour.innings = 2;
    tour.balls = 0;
    tour.battingTeamId = 'teamB';
    tour.bowlingTeamId = 'teamA';
    tour.teamB.strikerId = 333;
    tour.teamB.nonStrikerId = 444;
    tour.activeBowlerId = 111;
    tour.state = 'PLAYING';
    
    // Ball 1: B1 plays 6, A1 bowls RS -> 6 runs
    playRes = playBall(333, '6', 111, 'RS');
    
    // Ball 2: B1 plays 4, A1 bowls RS -> 4 runs (10 total - Chased!)
    // Submit striker's input first:
    tour.processingBall = false;
    submitBat = tourManager.submitPlay(tourId, 333, '4');
    assert.ok(submitBat.success);
    
    // Bowler A1 submits choice via UI Text Hook to resolve match and record stats
    ctxMock.from.id = 111; // Bowler A1
    hookHandled = await botMock.tourTextHook(ctxMock, tour, 'RS');
    assert.ok(hookHandled);
    
    // 5. Verify match resolution & stats recording
    console.log("Checking final match resolution and database updates...");
    const allSentOutputs = [...sentPhotos, ...sentMessages];
    console.log("All sent outputs:", allSentOutputs);
    assert.ok(allSentOutputs.some(text => text.includes("won the Super Over by 1 run")), "Should display the Super Over outcome");
    
    // Read stats JSON to verify main match stats were recorded, not Super Over stats
    const updatedStats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
    
    // Batter 1 (id 111) scored 10 runs in the main match (4 + 6), but scored 4 + 4 + 1 = 9 runs in Super Overs.
    // If stats restored correctly, 111's career statistics should show 10 runs (main match) and NOT 19 runs (total).
    const batter1Stats = updatedStats['111'];
    assert.ok(batter1Stats);
    assert.strictEqual(batter1Stats.runs, 10, "Career runs should equal main match runs (10), ignoring Super Over runs");
    
    // Bowler 1 (id 333) took 2 wickets in the main match, and 2 wickets in Super Overs.
    // Career stats should record 2 wickets, not 4.
    const bowler1Stats = updatedStats['333'];
    assert.ok(bowler1Stats);
    assert.strictEqual(bowler1Stats.wickets, 2, "Career wickets should equal main match wickets (2), ignoring Super Over wickets");
    assert.strictEqual(bowler1Stats.wins, 1, "Team B players should receive a win");
    assert.strictEqual(batter1Stats.losses, 1, "Team A players should receive a loss");
    
    // Cleanup stats file
    if (initialStats) {
        fs.writeFileSync(statsFile, initialStats);
    } else {
        fs.unlinkSync(statsFile);
    }
    
    console.log("🏆 ALL SUPER OVER TESTS PASSED SUCCESSFULLY!");
}

runSimulation().catch(e => {
    console.error("Test failed with error:", e);
    // Restore initial stats
    if (initialStats) {
        fs.writeFileSync(statsFile, initialStats);
    }
    process.exit(1);
});
