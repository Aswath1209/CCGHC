const crypto = require('crypto');

const tours = new Map();
const userTourMap = new Map(); // userId -> tourId

const TOUR_EXPIRE_HOURS = 2; // longer expire for tours

function generateTourId() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

function createTour(chatId, hostUser) {
  for (const t of tours.values()) {
    if (t.chatId === chatId) return { success: false, error: "A match is already active in this group!" };
  }
  if (userTourMap.has(hostUser.id)) return { success: false, error: "You are already in an active match!" };

  const tourId = generateTourId();
  const tour = {
    id: tourId,
    chatId: chatId,
    hostId: hostUser.id,
    state: 'INIT', // Initial state before /create_team
    config: {
      overs: 5,
      wickets: 10,
      bet: 0
    },
    teamA: {
      players: [], // First one is captain usually
      captainId: null,
      score: 0,
      wickets: 0,
      outPlayers: [],
      strikerId: null,
      nonStrikerId: null,
      penaltyRuns: 0,
      bonusRuns: 0,
      rebats: [] // { userId, originalName }
    },
    teamB: {
      players: [],
      captainId: null,
      score: 0,
      wickets: 0,
      outPlayers: [],
      strikerId: null,
      nonStrikerId: null,
      penaltyRuns: 0,
      bonusRuns: 0,
      rebats: []
    },
    innings: 1,
    battingTeamId: null,
    bowlingTeamId: null,
    balls: 0,
    activeBowlerId: null,
    previousBowlerId: null,
    tossWinnerId: null,
    choices: { batChoice: null, bowlChoice: null, bowlNum: null },
    voteHost: { inProgress: false, yesVotes: new Set(), totalNeeded: 0 },
    createdAt: Date.now()
  };
  tours.set(tourId, tour);
  userTourMap.set(hostUser.id, tourId);
  return { success: true, tour };
}

function joinTeam(tourId, user, teamKey) {
    const tour = tours.get(tourId);
    if (!tour) return { success: false, error: 'Tour not found.' };
    
    const targetState = teamKey === 'teamA' ? 'LOBBY_A' : 'LOBBY_B';
    if (tour.state !== targetState) return { success: false, error: 'Team joining window is closed.' };
    
    if (userTourMap.has(user.id) && !tour.teamA.players.find(p => p.id === user.id) && !tour.teamB.players.find(p => p.id === user.id)) {
        return { success: false, error: 'You are already in another match.' };
    }

    const team = tour[teamKey];
    if (team.players.some(p => p.id === user.id)) return { success: false, error: 'Already in team.' };

    team.players.push(user);
    userTourMap.set(user.id, tourId);
    return { success: true, tour };
}

function appointCaptain(tourId, hostId, targetUserId, teamKey) {
    const tour = tours.get(tourId);
    if (!tour || tour.hostId !== hostId) return false;

    const team = tour[teamKey];
    if (!team.players.some(p => p.id === targetUserId)) return false;

    // Remove from current position and move to index 0
    const pIdx = team.players.findIndex(p => p.id === targetUserId);
    const pObj = team.players.splice(pIdx, 1)[0];
    team.players.unshift(pObj); 
    
    team.captainId = targetUserId;
    return true;
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

function setBatsman(tourId, userId, playerIndex, position) {
    const tour = tours.get(tourId);
    if (!tour || (tour.state !== 'SELECT_BATTERS' && tour.state !== 'WICKET_FALL')) return { success: false, error: 'Cannot select batters now.' };
    
    const team = tour[tour.battingTeamId];
    if (tour.hostId !== userId && team.captainId !== userId) return { success: false, error: 'Only host or captain can select.' };

    const player = team.players[playerIndex - 1];
    if (!player) return { success: false, error: 'Invalid player index.' };

    // Check if player is out or already batting (unless rebatting, which is handled via /rebat)
    if (team.outPlayers.includes(player.id)) return { success: false, error: 'Player is already out.' };
    if (player.id === team.strikerId || player.id === team.nonStrikerId) return { success: false, error: 'Player is already batting.' };

    if (position === 'S') team.strikerId = player.id;
    else team.nonStrikerId = player.id;

    return { success: true, player };
}

function setBowler(tourId, userId, playerIndex) {
    const tour = tours.get(tourId);
    if (!tour || tour.state !== 'SELECT_BOWLER') return { success: false, error: 'Cannot select bowler now.' };

    const team = tour[tour.bowlingTeamId];
    if (tour.hostId !== userId && team.captainId !== userId) return { success: false, error: 'Only host or captain can select.' };

    const player = team.players[playerIndex - 1];
    if (!player) return { success: false, error: 'Invalid player index.' };

    if (player.id === tour.previousBowlerId && team.players.length > 1) {
        return { success: false, error: 'Bowler cannot bowl consecutive overs.' };
    }

    tour.activeBowlerId = player.id;
    tour.state = 'PLAYING';
    return { success: true, player };
}

function adjustRuns(tourId, hostId, teamChar, amount, isPenalty) {
    const tour = tours.get(tourId);
    if (!tour || tour.hostId !== hostId) return null;

    const team = teamChar.toUpperCase() === 'A' ? tour.teamA : tour.teamB;
    if (isPenalty) team.penaltyRuns += amount;
    else team.bonusRuns += amount;

    return { teamName: teamChar.toUpperCase() === 'A' ? 'Team A' : 'Team B', total: team.penaltyRuns + team.bonusRuns };
}

function rebatPlayer(tourId, hostId, teamChar, playerIndex) {
    const tour = tours.get(tourId);
    if (!tour || tour.hostId !== hostId) return null;

    const team = teamChar.toUpperCase() === 'A' ? tour.teamA : tour.teamB;
    const player = team.players[playerIndex - 1];
    if (!player) return null;

    const rebatObj = { id: player.id + '_rebat_' + Date.now(), originalId: player.id, first_name: player.first_name + " (rebat)" };
    team.players.push(rebatObj);
    return rebatObj;
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
    
    let res = {
        tour, batNum, bowlNum, batStr, bowlStr,
        ballsThisRound: tour.balls,
        originalBowlerId: tour.activeBowlerId,
        isWicket,
        inningsEnded: false,
        matchEnded: false,
        winnerTeamId: null,
        needsNewBatsman: false,
        needsNewBowler: false,
        tie: false
    };
    
    if (!isWicket) {
        batTeam.score += batNum;
        if ((batNum === 1 || batNum === 3) && batTeam.nonStrikerId) {
            const tmp = batTeam.strikerId;
            batTeam.strikerId = batTeam.nonStrikerId;
            batTeam.nonStrikerId = tmp;
        }
        if (endOfOver && batTeam.nonStrikerId) {
            const tmp = batTeam.strikerId;
            batTeam.strikerId = batTeam.nonStrikerId;
            batTeam.nonStrikerId = tmp;
        }
    } else {
        batTeam.wickets++;
        batTeam.outPlayers.push(batTeam.strikerId);
        batTeam.strikerId = null;
    }
    
    const totalScore = (team) => team.score + team.bonusRuns - team.penaltyRuns;
    const bowlingTeamScore = totalScore(tour[tour.bowlingTeamId]);
    const currentBatTeamScore = totalScore(batTeam);

    const targetPassed = tour.innings === 2 && currentBatTeamScore > bowlingTeamScore;
    const oversFinished = tour.balls >= tour.config.overs * 6;
    const allOut = batTeam.wickets >= tour.config.wickets || (batTeam.strikerId === null && batTeam.nonStrikerId === null && batTeam.players.length > 0);
    
    if (targetPassed || oversFinished || allOut) {
        if (tour.innings === 1) {
            res.inningsEnded = true;
            tour.state = 'INNINGS_BREAK';
        } else {
            res.matchEnded = true;
            tour.state = 'COMPLETED';
            const s1 = totalScore(tour.teamA);
            const s2 = totalScore(tour.teamB);
            if (s1 > s2) res.winnerTeamId = 'teamA';
            else if (s2 > s1) res.winnerTeamId = 'teamB';
            else res.tie = true;
            res.motm = calculateMOTM(tour);
        }
    } else {
        if (isWicket) {
            tour.state = 'WICKET_FALL';
            res.needsNewBatsman = true;
        } else if (endOfOver) {
            tour.state = 'SELECT_BOWLER';
            res.needsNewBowler = true;
            tour.previousBowlerId = tour.activeBowlerId;
            tour.activeBowlerId = null;
        }
    }
    
    return { success: true, ...res };
}

function calculateMOTM(tour) {
    // Basic logic: Higher score/wickets mix. For now: just the highest runs scorer from the winning team.
    const winTeamId = (totalScore(tour.teamA) > totalScore(tour.teamB)) ? 'teamA' : 'teamB';
    const players = tour[winTeamId].players;
    // In a real bot, we'd track per-player stats in the tour object. 
    // For now, let's just return a placeholder or the captain.
    return players[0]; 
}

function totalScore(team) {
    return team.score + team.bonusRuns - team.penaltyRuns;
}

function cleanupExpiredGames() {
  const now = Date.now();
  for (const [key, t] of tours.entries()) {
    if (now - t.createdAt > TOUR_EXPIRE_HOURS * 3600000) {
      deleteTour(key);
    }
  }
}

function getTour(tourId) { return tours.get(tourId); }
function getUserTour(userId) { const id = userTourMap.get(userId); return id ? tours.get(id) : null; }
function deleteTour(tourId) {
    const tour = tours.get(tourId);
    if (!tour) return;
    tour.teamA.players.forEach(p => userTourMap.delete(p.id));
    tour.teamB.players.forEach(p => userTourMap.delete(p.id));
    tours.delete(tourId);
}

function getAllTours() {
    return tours.values();
}

module.exports = {
  createTour, getTour, getUserTour, deleteTour, joinTeam,
  appointCaptain, setBatsman, setBowler, submitPlay, adjustRuns, rebatPlayer,
  totalScore, getAllTours
};
