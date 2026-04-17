const crypto = require('crypto');

const tours = new Map();
const userTourMap = new Map(); // userId -> tourId

const TOUR_EXPIRE_HOURS = 2; // longer expire for tours

function generateTourId() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

function createTour(chatId, hostUser) {
  // Check if GC already has a game
  for (const t of tours.values()) {
    if (t.chatId === chatId) return { success: false, error: "A match is already active in this group!" };
  }
  // Check if user is in any game
  if (userTourMap.has(hostUser.id)) return { success: false, error: "You are already in an active match!" };

  const tourId = generateTourId();
  const tour = {
    id: tourId,
    chatId: chatId,
    hostId: hostUser.id,
    state: 'LOBBY',
    config: {
      overs: 5,
      wickets: 10,
      bet: 0
    },
    pool: [hostUser], // unassigned
    teamA: {
      id: 'teamA',
      name: 'Team A',
      players: [],
      captainId: null,
      score: 0,
      wickets: 0,
      inningsRemainingWickets: 10,
      strikerId: null,
      nonStrikerId: null,
      outPlayers: []
    },
    teamB: {
      id: 'teamB',
      name: 'Team B',
      players: [],
      captainId: null,
      score: 0,
      wickets: 0,
      inningsRemainingWickets: 10,
      strikerId: null,
      nonStrikerId: null,
      outPlayers: []
    },
    tossWinnerId: null,
    innings: 1, // 1 or 2
    battingTeamId: null, // 'teamA' or 'teamB'
    bowlingTeamId: null,
    balls: 0,
    maxBalls: 30, // config.overs * 6
    activeBowlerId: null,
    previousBowlerId: null,
    choices: {
      batChoice: null,
      bowlChoice: null,
      bowlNum: null
    },
    votesToHost: new Set(),
    createdAt: Date.now()
  };
  tours.set(tourId, tour);
  userTourMap.set(hostUser.id, tourId);
  return { success: true, tour };
}

function getAllTours() {
    return tours.values();
}

function getTour(tourId) {
    return tours.get(tourId);
}

function getUserTour(userId) {
    const tourId = userTourMap.get(userId);
    return tourId ? tours.get(tourId) : null;
}

function deleteTour(tourId) {
    const tour = tours.get(tourId);
    if (!tour) return;
    
    tour.pool.forEach(p => userTourMap.delete(p.id));
    tour.teamA.players.forEach(p => userTourMap.delete(p.id));
    tour.teamB.players.forEach(p => userTourMap.delete(p.id));
    
    tours.delete(tourId);
}

function joinPool(tourId, user) {
    const tour = tours.get(tourId);
    if (!tour || tour.state !== 'LOBBY') return { success: false, error: 'Tour lobby not found or already started.' };
    
    if (userTourMap.has(user.id)) return { success: false, error: 'You are already in a match.' };
    
    tour.pool.push(user);
    userTourMap.set(user.id, tourId);
    return { success: true, tour };
}

function assignPlayerCommand(tourId, hostId, targetUserId, team) {
    const tour = tours.get(tourId);
    if (!tour || tour.state !== 'LOBBY' || tour.hostId !== hostId) return null;
    
    // Find player in pool or teams
    let pObj = tour.pool.find(p => p.id === targetUserId);
    if (pObj) tour.pool = tour.pool.filter(p => p.id !== targetUserId);
    else {
        pObj = tour.teamA.players.find(p => p.id === targetUserId);
        if (pObj) tour.teamA.players = tour.teamA.players.filter(p => p.id !== targetUserId);
        else {
            pObj = tour.teamB.players.find(p => p.id === targetUserId);
            if (pObj) tour.teamB.players = tour.teamB.players.filter(p => p.id !== targetUserId);
        }
    }
    
    if (!pObj) return false;
    
    if (team === 'A') tour.teamA.players.push(pObj);
    else if (team === 'B') tour.teamB.players.push(pObj);
    else tour.pool.push(pObj);
    
    return true;
}

function startTour(tourId, hostId) {
    const tour = tours.get(tourId);
    if (!tour || tour.state !== 'LOBBY' || tour.hostId !== hostId) return { success: false, error: 'Invalid start conditions' };
    
    if (tour.teamA.players.length === 0 || tour.teamB.players.length === 0) {
        return { success: false, error: 'Both teams must have at least 1 player to start.' };
    }
    
    // Auto-appoint captains if not set
    if (!tour.teamA.captainId) tour.teamA.captainId = tour.teamA.players[0].id;
    if (!tour.teamB.captainId) tour.teamB.captainId = tour.teamB.players[0].id;
    
    tour.teamA.inningsRemainingWickets = tour.config.wickets;
    tour.teamB.inningsRemainingWickets = tour.config.wickets;
    tour.maxBalls = tour.config.overs * 6;
    
    tour.state = 'TOSS';
    return { success: true, tour };
}

function handleToss(tourId, userId, choice) {
    const tour = tours.get(tourId);
    if (!tour || tour.state !== 'TOSS') return null;
    if (tour.teamA.captainId !== userId) return null; // Team A captain always tosses
    
    const tossResult = Math.random() < 0.5 ? 'heads' : 'tails';
    const won = choice === tossResult;
    
    tour.tossWinnerId = won ? tour.teamA.captainId : tour.teamB.captainId;
    tour.state = 'CHOOSE';
    return { tour, tossResult, winnerTeam: won ? 'A' : 'B' };
}

function chooseBatBowl(tourId, userId, choice) {
    const tour = tours.get(tourId);
    if (!tour || tour.state !== 'CHOOSE' || tour.tossWinnerId !== userId) return null;
    
    const isTeamA = tour.teamA.captainId === userId;
    
    if (choice === 'bat') {
        tour.battingTeamId = isTeamA ? 'teamA' : 'teamB';
        tour.bowlingTeamId = isTeamA ? 'teamB' : 'teamA';
    } else {
        tour.battingTeamId = isTeamA ? 'teamB' : 'teamA';
        tour.bowlingTeamId = isTeamA ? 'teamA' : 'teamB';
    }
    
    tour.state = 'BATTING_LINEUP'; // Next state: Batting Captain picks Striker & Non-Striker
    return tour;
}

// Sets the Striker or Non Striker
function setBatsman(tourId, captainId, batsmanId, position) {
    const tour = tours.get(tourId);
    if (!tour || (tour.state !== 'BATTING_LINEUP' && tour.state !== 'WICKET_FALL')) return false;
    
    const batTeam = tour[tour.battingTeamId];
    if (batTeam.captainId !== captainId) return false;
    
    // Verify player is in team
    if (!batTeam.players.some(p => p.id === batsmanId)) return false;
    
    // Cannot be the other active batsman
    if (position === 'striker' && batTeam.nonStrikerId === batsmanId) return false;
    if (position === 'non-striker' && batTeam.strikerId === batsmanId) return false;
    
    if (position === 'striker') batTeam.strikerId = batsmanId;
    if (position === 'non-striker') batTeam.nonStrikerId = batsmanId;
    
    // State transition
    if (tour.state === 'BATTING_LINEUP') {
        const wantsNonStriker = batTeam.players.length > 1;
        if (batTeam.strikerId !== null && (!wantsNonStriker || batTeam.nonStrikerId !== null)) {
            // We have openings filled! Move to Bowler selection.
            tour.state = 'BOWLING_LINEUP';
        }
    } else if (tour.state === 'WICKET_FALL') {
         // Incoming batsman after wicket
         // Filled the empty spot. Is there a bowler active? (Usually yes, unless it was end of over)
         if (tour.balls % 6 === 0) {
             tour.state = 'BOWLING_LINEUP';
         } else {
             tour.state = 'PLAYING';
         }
    }
    
    return true;
}

function setBowler(tourId, captainId, bowlerId) {
    const tour = tours.get(tourId);
    if (!tour || tour.state !== 'BOWLING_LINEUP') return false;
    
    const bowlTeam = tour[tour.bowlingTeamId];
    if (bowlTeam.captainId !== captainId) return false;
    if (!bowlTeam.players.some(p => p.id === bowlerId)) return false;
    
    // Constraint: Can't bowl 2 consecutive overs unless they are the only player
    if (tour.previousBowlerId === bowlerId && bowlTeam.players.length > 1) {
        return false; // Error: Consecutive over
    }
    
    tour.activeBowlerId = bowlerId;
    tour.state = 'PLAYING';
    return true;
}

function submitPlay(tourId, userId, rawInput) {
    const tour = tours.get(tourId);
    if (!tour || tour.state !== 'PLAYING') return { success: false, error: 'Not currently playing.' };
    
    const batTeam = tour[tour.battingTeamId];
    
    const isStriker = userId === batTeam.strikerId;
    const isBowler = userId === tour.activeBowlerId;
    
    if (!isStriker && !isBowler) return { success: false, error: 'You are not the active striker or bowler.' };
    
    const BATSMAN_OPTIONS = new Set(['0','1','2','3','4','6']);
    const BOWLER_MAP = { 'rs':'0', 'bouncer':'1', 'yorker':'2', 'short':'3', 'slower':'4', 'knuckle':'6' };
    
    if (isStriker) {
        if (!BATSMAN_OPTIONS.has(rawInput)) return { success: false, error: 'Invalid shot! Send one of: 0, 1, 2, 3, 4, 6' };
        if (tour.choices.batChoice !== null) return { success: false, error: 'You already played this ball.' };
        tour.choices.batChoice = rawInput;
    } else {
        const mapped = BOWLER_MAP[rawInput.toLowerCase()];
        if (!mapped) return { success: false, error: 'Invalid delivery! Send one of: RS, Bouncer, Yorker, Short, Slower, Knuckle' };
        if (tour.choices.bowlChoice !== null) return { success: false, error: 'You already bowled this ball.' };
        tour.choices.bowlChoice = rawInput;
        tour.choices.bowlNum = mapped;
    }
    
    if (tour.choices.batChoice === null || tour.choices.bowlChoice === null) {
        return { success: true, waiting: true };
    }
    
    // RESOLUTION
    const batNum = parseInt(tour.choices.batChoice);
    const bowlNum = parseInt(tour.choices.bowlNum);
    const bowlStr = tour.choices.bowlChoice;
    const batStr = tour.choices.batChoice;
    
    tour.choices = { batChoice: null, bowlChoice: null, bowlNum: null };
    tour.balls++;
    
    const isWicket = batNum === bowlNum;
    const endOfOver = tour.balls % 6 === 0;
    const isLMS = batTeam.players.length === 1 || (batTeam.inningsRemainingWickets === 1 && batTeam.nonStrikerId === null);
    
    let res = {
        tour, batNum, bowlNum, batStr, bowlStr,
        ballsThisRound: tour.balls,
        originalBowlerId: tour.activeBowlerId,
        isWicket: isWicket,
        inningsEnded: false,
        matchEnded: false,
        winnerTeamId: null,
        needsNewBatsman: false,
        needsNewBowler: false,
        tie: false
    };
    
    if (!isWicket) {
        batTeam.score += batNum;
        
        // Strike Rotation Logic
        if ((batNum === 1 || batNum === 3) && batTeam.nonStrikerId) {
            const tmp = batTeam.strikerId;
            batTeam.strikerId = batTeam.nonStrikerId;
            batTeam.nonStrikerId = tmp;
        }
        
        if (endOfOver) {
            if (batTeam.nonStrikerId) {
                const tmp = batTeam.strikerId;
                batTeam.strikerId = batTeam.nonStrikerId;
                batTeam.nonStrikerId = tmp;
            }
        }
        
    } else {
        // Wicket
        batTeam.wickets++;
        batTeam.inningsRemainingWickets--;
        batTeam.outPlayers.push(batTeam.strikerId);
        batTeam.strikerId = null; // Blank it out for replacement
        
        if (endOfOver && batTeam.nonStrikerId) {
            // End of over, non striker rotates into striker spot!
            batTeam.strikerId = batTeam.nonStrikerId;
            batTeam.nonStrikerId = null; // The incoming batsman will take non-striker
        }
    }
    
    // Check Innings/Match End Conditions
    const targetPassed = tour.innings === 2 && batTeam.score > tour[tour.bowlingTeamId].score;
    const oversFinished = tour.balls >= tour.maxBalls;
    const allOut = batTeam.inningsRemainingWickets <= 0;
    
    if (targetPassed || oversFinished || allOut) {
        if (tour.innings === 1) {
            // Setup Innings 2
            res.inningsEnded = true;
            tour.innings = 2;
            tour.balls = 0;
            const tmpTeam = tour.battingTeamId;
            tour.battingTeamId = tour.bowlingTeamId;
            tour.bowlingTeamId = tmpTeam;
            
            tour.state = 'BATTING_LINEUP'; // Pause for captain picks
            tour.activeBowlerId = null;
            tour.previousBowlerId = null;
            tour[tour.battingTeamId].strikerId = null;
            tour[tour.battingTeamId].nonStrikerId = null;
        } else {
            // End Match
            res.matchEnded = true;
            tour.state = 'COMPLETED';
            const s1 = tour.teamA.score;
            const s2 = tour.teamB.score;
            if (s1 > s2) res.winnerTeamId = 'teamA';
            else if (s2 > s1) res.winnerTeamId = 'teamB';
            else res.tie = true;
        }
    } else {
        // Continue Innings
        if (isWicket) {
            tour.state = 'WICKET_FALL';
            res.needsNewBatsman = true;
        } else if (endOfOver) {
            tour.state = 'BOWLING_LINEUP';
            res.needsNewBowler = true;
            tour.previousBowlerId = tour.activeBowlerId;
            tour.activeBowlerId = null;
        }
    }
    
    return { success: true, ...res };
}

function voteHost(tourId, voterId, targetHostId) {
    // Basic implementation: if this is called, assumes 1 voter. In real scenario, would track per-user.
    // Simplifying: the Host allows `/votehost` to just transfer directly if the host is completely asleep,
    // or we just trust the users to agree. 
    // To make it robust: 
    const tour = tours.get(tourId);
    if (!tour) return false;
    tour.hostId = targetHostId; 
    return true; 
}

function kickAFK(tourId, hostId, afkUserId) {
    // Only Host can force actions
    const tour = tours.get(tourId);
    if (!tour || tour.hostId !== hostId) return false;
    
    // Blank their slot so captain is forced to repick
    if (tour.activeBowlerId === afkUserId) {
         tour.previousBowlerId = null;
         tour.activeBowlerId = null;
         tour.choices.bowlChoice = null;
         tour.state = 'BOWLING_LINEUP';
         return 'bowler';
    } 
    if (tour[tour.battingTeamId].strikerId === afkUserId) {
         tour[tour.battingTeamId].strikerId = null;
         tour.choices.batChoice = null;
         tour.state = 'WICKET_FALL'; // Recycles state to let cap pick new batsman
         return 'striker';
    }
    return false;
}

setInterval(cleanupExpiredGames, 3600000);
function cleanupExpiredGames() {
  const now = Date.now();
  for (const [key, t] of tours.entries()) {
    if (now - t.createdAt > TOUR_EXPIRE_HOURS * 3600000) {
      deleteTour(key);
    }
  }
}

module.exports = {
  createTour, getTour, getUserTour, deleteTour, joinPool,
  assignPlayerCommand, startTour, handleToss, chooseBatBowl,
  setBatsman, setBowler, submitPlay, voteHost, kickAFK, getAllTours
};
