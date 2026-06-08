const tourManager = require('../game/tourManager');
const assert = require('assert');

console.log("Running Power Surge and Settings Validation Tests...");

// Setup a test tour match
const chatId = 99999;
const hostUser = { id: 111, first_name: "Hosty" };
const tourResult = tourManager.createTour(chatId, hostUser, "Power Surge Test Tour");
if (!tourResult.success) {
    console.error("Failed to create tour:", tourResult.error);
    process.exit(1);
}

const tourId = tourResult.tour.id;
const tour = tourManager.getTour(tourId);

// Test 1: Configuration validation in LOBBY state
console.log("Test 1: Configuration updates...");
tour.config.overs = 10;
tour.config.wickets = 5;
assert.strictEqual(tour.config.overs, 10);
assert.strictEqual(tour.config.wickets, 5);

// Add players
tourManager.joinTeam(tourId, { id: 111, first_name: "Batter 1" }, 'teamA'); // striker
tourManager.joinTeam(tourId, { id: 222, first_name: "Batter 2" }, 'teamA'); // non-striker
tourManager.joinTeam(tourId, { id: 333, first_name: "Bowler 1" }, 'teamB'); // bowler
tourManager.joinTeam(tourId, { id: 444, first_name: "Batter 3" }, 'teamA'); // spare batsman

// Set captains
tourManager.appointCaptain(tourId, 111, 111, 'teamA');
tourManager.appointCaptain(tourId, 111, 333, 'teamB');

// Start match
tourManager.startTour(tourId, 111);
tourManager.handleToss(tourId, 111, 'heads');

// Configure batting and bowling teams
tour.battingTeamId = 'teamA';
tour.bowlingTeamId = 'teamB';
tour.firstBattingTeamId = 'teamA';
tour.state = 'SELECT_BATTERS';

// Set striker & non-striker
tourManager.setBatsman(tourId, 111, 1, 'S');  // Batter 1
tourManager.setBatsman(tourId, 111, 2, 'NS'); // Batter 2

// Set bowler
tourManager.setBowler(tourId, 333, 1); // Bowler 1
assert.strictEqual(tour.state, 'PLAYING');

// Helper to simulate a ball
function playBall(batInput, bowlInput) {
    // Force play state if needed
    if (tour.state !== 'PLAYING') {
        tour.state = 'PLAYING';
    }
    tour.choices.batChoice = null;
    tour.choices.bowlChoice = null;
    
    // Striker plays
    const batRes = tourManager.submitPlay(tourId, tour.teamA.strikerId, batInput);
    if (!batRes.success) return batRes;
    
    // Bowler plays
    const bowlRes = tourManager.submitPlay(tourId, tour.activeBowlerId, bowlInput);
    tour.processingBall = false; // Reset processing flag
    return bowlRes;
}

// Test 2: Power Surge is OFF by default, 5 and leg cutter should be rejected
console.log("Test 2: Power Surge OFF checks...");
assert.strictEqual(tour.powerSurge, false);

const offBatRes = playBall('5', 'rs');
assert.strictEqual(offBatRes.success, false);
assert.ok(offBatRes.error.includes('Invalid shot! Send one of: 0, 1, 2, 3, 4, 6'));

const offBowlRes = playBall('4', 'leg cutter');
assert.strictEqual(offBowlRes.success, false);
assert.ok(offBowlRes.error.includes('Invalid delivery! Send one of: RS, Bouncer, Yorker, Short, Slower, Knuckle'));

// Test 3: Power Surge is ON, 5 and leg cutter should be accepted
console.log("Test 3: Power Surge ON checks...");
tour.powerSurge = true;

// Striker plays 4, Bowler plays leg cutter (mapped to 5) -> mismatch -> striker gets 4 runs
const onPlay1 = playBall('4', 'leg cutter');
assert.strictEqual(onPlay1.success, true);
assert.strictEqual(onPlay1.isWicket, false);
assert.strictEqual(onPlay1.batStr, '4');
assert.strictEqual(onPlay1.bowlStr, 'leg cutter');

// Test 4: Striker plays 5, Bowler plays leg cutter -> match -> wicket!
console.log("Test 4: Power Surge wicket check...");
const onPlay2 = playBall('5', 'leg cutter');
assert.strictEqual(onPlay2.success, true);
assert.strictEqual(onPlay2.isWicket, true);

// Set batsman again to resume
tourManager.setBatsman(tourId, 111, 3, 'S'); // Batter 3 becomes striker

// Test 5: Odd run (5) striker swap check
console.log("Test 5: Striker swap on 5 runs...");
const initialStriker = tour.teamA.strikerId;
const initialNonStriker = tour.teamA.nonStrikerId;

// Striker plays 5, Bowler plays rs (0) -> mismatch -> 5 runs scored, striker/non-striker swap!
const onPlay3 = playBall('5', 'rs');
assert.strictEqual(onPlay3.success, true);
assert.strictEqual(onPlay3.isWicket, false);
assert.strictEqual(tour.teamA.strikerId, initialNonStriker);
assert.strictEqual(tour.teamA.nonStrikerId, initialStriker);

console.log("All Power Surge and Settings Validation Tests passed successfully!");
process.exit(0);
