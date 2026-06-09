const crypto = require('crypto');

const tours = new Map();
const userTourMap = new Map(); // userId -> tourId
const chatTourMap = new Map(); // chatId -> tourId

const TOUR_EXPIRE_HOURS = 2; // longer expire for tours

function generateTourId() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

function getBasePlayerId(id) {
    if (!id) return null;
    const str = id.toString();
    if (str.includes('_rebat_')) {
        return str.split('_rebat_')[0];
    }
    return str;
}

function createTour(chatId, hostUser, name = '') {
  if (chatTourMap.has(chatId)) return { success: false, error: "A match is already active in this group!" };
  if (userTourMap.has(hostUser.id)) return { success: false, error: "You are already in an active match!" };

  const tourId = generateTourId();
  const tour = {
    id: tourId,
    name: name || '',
    chatId: chatId,
    hostId: hostUser.id,
    powerSurge: false,
    state: 'LOBBY', // Initial state is LOBBY
    config: {
      overs: 5,
      wickets: 10,
      bet: 0
    },
    teamA: {
      name: 'Team A',
      players: [],
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
      name: 'Team B',
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
  chatTourMap.set(chatId, tourId);
  return { success: true, tour };
}

function joinTeam(tourId, user, teamKey) {
    const tour = tours.get(tourId);
    if (!tour) return { success: false, error: 'Tour not found.' };
    
    if (userTourMap.has(user.id) && userTourMap.get(user.id) !== tourId) {
        return { success: false, error: 'You are already in another match.' };
    }

    const team = tour[teamKey];
    const otherTeamKey = teamKey === 'teamA' ? 'teamB' : 'teamA';
    const otherTeam = tour[otherTeamKey];

    // If in other team, switch teams
    const otherIdx = otherTeam.players.findIndex(p => p.id === user.id);
    if (otherIdx !== -1) {
        otherTeam.players.splice(otherIdx, 1);
        if (otherTeam.captainId === user.id) {
            otherTeam.captainId = otherTeam.players.length > 0 ? otherTeam.players[0].id : null;
            if (otherTeam.captainId && !otherTeam.customName) {
                const newCap = otherTeam.players[0];
                otherTeam.name = `${newCap.first_name}'s XI`;
            } else if (!otherTeam.captainId && !otherTeam.customName) {
                otherTeam.name = otherTeamKey === 'teamA' ? 'Team A' : 'Team B';
            }
        }
    }

    // Toggle join: if already in team and in LOBBY state, click leaves
    if (team.players.some(p => p.id === user.id)) {
        if (tour.state === 'LOBBY') {
            team.players = team.players.filter(p => p.id !== user.id);
            userTourMap.delete(user.id);
            if (team.captainId === user.id) {
                team.captainId = team.players.length > 0 ? team.players[0].id : null;
                if (team.captainId && !team.customName) {
                    const newCap = team.players[0];
                    team.name = `${newCap.first_name}'s XI`;
                } else if (!team.captainId && !team.customName) {
                    team.name = teamKey === 'teamA' ? 'Team A' : 'Team B';
                }
            }
            return { success: true, left: true, tour };
        }
        return { success: false, error: 'Already in team.' };
    }

    team.players.push({
        id: user.id,
        first_name: user.first_name,
        runs: 0,
        balls: 0,
        wickets: 0,
        runsConceded: 0,
        ballsBowled: 0,
        fours: 0,
        sixes: 0
    });
    userTourMap.set(user.id, tourId);

    // Auto-appoint captain if team had none
    if (!team.captainId) {
        team.captainId = user.id;
        if (!team.customName) {
            team.name = `${user.first_name}'s XI`;
        }
    }
    return { success: true, tour };
}

function appointCaptain(tourId, callerId, targetUserId, teamKey) {
    const tour = tours.get(tourId);
    if (!tour) return false;

    const team = tour[teamKey];
    if (tour.hostId !== callerId && team.captainId !== callerId) return false;
    if (!team.players.some(p => p.id === targetUserId)) return false;

    // Move player to index 0
    const pIdx = team.players.findIndex(p => p.id === targetUserId);
    const pObj = team.players.splice(pIdx, 1)[0];
    team.players.unshift(pObj); 
    
    team.captainId = targetUserId;
    if (!team.customName) {
        team.name = `${pObj.first_name}'s XI`;
    }
    return true;
}

function renameTeam(tourId, userId, newName) {
    const tour = tours.get(tourId);
    if (!tour) return { success: false, error: 'Tour not found.' };

    let teamKey = null;
    if (tour.teamA.captainId === userId) teamKey = 'teamA';
    else if (tour.teamB.captainId === userId) teamKey = 'teamB';
    
    if (tour.hostId === userId && !teamKey) {
        if (tour.teamA.players.some(p => p.id === userId)) teamKey = 'teamA';
        else if (tour.teamB.players.some(p => p.id === userId)) teamKey = 'teamB';
    }

    if (!teamKey) return { success: false, error: 'Only captains or players on the team can rename it.' };

    const team = tour[teamKey];
    team.name = newName.trim().substring(0, 30);
    team.customName = true;
    return { success: true, teamName: team.name };
}

function removePlayer(tourId, requesterId, targetUserId) {
    const tour = tours.get(tourId);
    if (!tour) return { success: false, error: 'Tour not found.' };

    const isHost = tour.hostId === requesterId;
    const isCapA = tour.teamA.captainId === requesterId;
    const isCapB = tour.teamB.captainId === requesterId;
    const isSelf = requesterId === targetUserId;
    if (!isHost && !isCapA && !isCapB && !isSelf) {
        return { success: false, error: 'Only the host, captains, or the players themselves can remove players.' };
    }

    let teamKey = null;
    if (tour.teamA.players.some(p => p.id === targetUserId)) teamKey = 'teamA';
    else if (tour.teamB.players.some(p => p.id === targetUserId)) teamKey = 'teamB';

    if (!teamKey) return { success: false, error: 'Player not found in any team.' };

    if (!isHost && ((teamKey === 'teamA' && !isCapA) || (teamKey === 'teamB' && !isCapB))) {
        return { success: false, error: 'Captains can only remove players from their own team.' };
    }

    const team = tour[teamKey];
    const player = team.players.find(p => p.id === targetUserId);
    team.players = team.players.filter(p => p.id !== targetUserId);
    team.outPlayers = team.outPlayers.filter(id => id !== targetUserId);
    userTourMap.delete(targetUserId);

    let clearedActive = false;
    if (team.strikerId === targetUserId) {
        team.strikerId = null;
        clearedActive = true;
        if (tour.state === 'PLAYING') tour.state = 'SELECT_BATTERS';
    }
    if (team.nonStrikerId === targetUserId) {
        team.nonStrikerId = null;
        clearedActive = true;
        if (tour.state === 'PLAYING') tour.state = 'SELECT_BATTERS';
    }
    if (tour.activeBowlerId === targetUserId) {
        tour.activeBowlerId = null;
        clearedActive = true;
        if (tour.state === 'PLAYING') tour.state = 'SELECT_BOWLER';
    }

    if (clearedActive) {
        tour.choices = { batChoice: null, bowlChoice: null, bowlNum: null };
    }

    if (team.captainId === targetUserId) {
        team.captainId = team.players.length > 0 ? team.players[0].id : null;
        if (team.captainId && !team.customName) {
            const newCap = team.players[0];
            team.name = `${newCap.first_name}'s XI`;
        } else if (!team.captainId && !team.customName) {
            team.name = teamKey === 'teamA' ? 'Team A' : 'Team B';
        }
    }

    return { success: true, player, tour, clearedActive };
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

    // Apply defaults to names if not customized
    if (!tour.teamA.customName) {
        const cap = tour.teamA.players.find(p => p.id === tour.teamA.captainId) || tour.teamA.players[0];
        tour.teamA.name = `${cap.first_name}'s XI`;
    }
    if (!tour.teamB.customName) {
        const cap = tour.teamB.players.find(p => p.id === tour.teamB.captainId) || tour.teamB.players[0];
        tour.teamB.name = `${cap.first_name}'s XI`;
    }
    
    tour.teamA.inningsRemainingWickets = tour.config.wickets;
    tour.teamB.inningsRemainingWickets = tour.config.wickets;
    tour.maxBalls = tour.config.overs * 6;
    
    tour.state = 'TOSS';
    return { success: true, tour };
}

function handleToss(tourId, userId, choice) {
    const tour = tours.get(tourId);
    if (!tour || tour.state !== 'TOSS') return null;
    if (tour.teamA.captainId !== userId) return null; // Team A captain chooses Heads/Tails
    
    const tossResult = Math.random() < 0.5 ? 'heads' : 'tails';
    const won = choice === tossResult;
    
    tour.tossWinnerId = won ? tour.teamA.captainId : tour.teamB.captainId;
    tour.state = 'CHOOSE';
    return { tour, tossResult, winnerTeam: won ? 'A' : 'B' };
}

function setBatsman(tourId, userId, playerIndex, position) {
    const tour = tours.get(tourId);
    if (!tour || (tour.state !== 'SELECT_BATTERS' && tour.state !== 'WICKET_FALL' && tour.state !== 'PLAYING')) {
        return { success: false, error: 'Cannot select batters now.' };
    }
    
    const team = tour[tour.battingTeamId];
    if (tour.hostId !== userId && team.captainId !== userId) return { success: false, error: 'Only host or captain can select.' };

    const player = team.players[playerIndex - 1];
    if (!player) return { success: false, error: 'Invalid player index.' };

    if (team.outPlayers.includes(player.id)) return { success: false, error: 'Player is already out.' };

    if (tour.balls > 0 && tour.balls % 6 === 0 && team.strikerId === null && team.nonStrikerId !== null) {
        // Wicket fell on the last ball of the over.
        // The batsman who was non-striker becomes the striker for the next over.
        // The new batsman enters as the non-striker.
        team.strikerId = team.nonStrikerId;
        team.nonStrikerId = player.id;
    } else {
        if (position === 'S') {
            if (player.id === team.nonStrikerId) {
                team.nonStrikerId = team.strikerId;
            }
            team.strikerId = player.id;
        } else {
            if (player.id === team.strikerId) {
                team.strikerId = team.nonStrikerId;
            }
            team.nonStrikerId = player.id;
        }
    }

    // Reset choices for this ball since active batsman changed
    tour.choices = { batChoice: null, bowlChoice: null, bowlNum: null };

    // Auto-progress state
    const activeCount = team.players.length - team.outPlayers.length;
    const battingCount = (team.strikerId ? 1 : 0) + (team.nonStrikerId ? 1 : 0);
    
    if (battingCount === Math.min(2, activeCount)) {
        if (tour.state === 'SELECT_BATTERS' || tour.state === 'WICKET_FALL') {
            if (!tour.activeBowlerId) tour.state = 'SELECT_BOWLER';
            else tour.state = 'PLAYING';
        }
    }

    return { success: true, player };
}

function setBowler(tourId, userId, playerIndex) {
    const tour = tours.get(tourId);
    if (!tour || (tour.state !== 'SELECT_BOWLER' && tour.state !== 'PLAYING')) {
        return { success: false, error: 'Cannot select bowler now.' };
    }

    const team = tour[tour.bowlingTeamId];
    if (tour.hostId !== userId && team.captainId !== userId) return { success: false, error: 'Only host or captain can select.' };

    const player = team.players[playerIndex - 1];
    if (!player) return { success: false, error: 'Invalid player index.' };

    if (player.id === tour.previousBowlerId && team.players.length > 1) {
        return { success: false, error: 'Bowler cannot bowl consecutive overs.' };
    }

    tour.activeBowlerId = player.id;
    
    // Reset choices for this ball since bowler changed
    tour.choices = { batChoice: null, bowlChoice: null, bowlNum: null };

    if (tour.state === 'SELECT_BOWLER') {
        tour.state = 'PLAYING';
    }
    return { success: true, player };
}

function adjustRuns(tourId, hostId, teamChar, amount, isPenalty) {
    const tour = tours.get(tourId);
    if (!tour || tour.hostId !== hostId) return null;

    const charUpper = teamChar.toUpperCase();
    if (charUpper !== 'A' && charUpper !== 'B') return null;

    const team = charUpper === 'A' ? tour.teamA : tour.teamB;
    if (isPenalty) team.penaltyRuns += amount;
    else team.bonusRuns += amount;

    return { teamName: team.name, total: team.penaltyRuns + team.bonusRuns };
}

function rebatPlayer(tourId, hostId, teamChar, playerIndex) {
    const tour = tours.get(tourId);
    if (!tour || tour.hostId !== hostId) return null;

    const charUpper = teamChar.toUpperCase();
    if (charUpper !== 'A' && charUpper !== 'B') return null;

    const team = charUpper === 'A' ? tour.teamA : tour.teamB;
    const player = team.players[playerIndex - 1];
    if (!player) return null;

    const rebatObj = {
        id: player.id + '_rebat_' + Date.now(),
        originalId: player.id,
        first_name: player.first_name + " (rebat)",
        runs: 0,
        balls: 0,
        wickets: 0,
        runsConceded: 0,
        ballsBowled: 0,
        fours: 0,
        sixes: 0
    };
    team.players.push(rebatObj);
    return rebatObj;
}

function triggerLMS(tourId, userId) {
    const tour = tours.get(tourId);
    if (!tour) return { success: false, error: 'Match not found.' };
    
    const team = tour[tour.battingTeamId];
    if (tour.hostId !== userId && team.captainId !== userId) {
        return { success: false, error: 'Only the host or team captain can enable LMS.' };
    }
    
    if (tour.state !== 'WICKET_FALL' && tour.state !== 'SELECT_BATTERS') {
        return { success: false, error: 'Cannot enable LMS in the current match state.' };
    }
    
    // If striker is null (after wicket), make the remaining non-striker the striker
    if (!team.strikerId && team.nonStrikerId) {
        team.strikerId = team.nonStrikerId;
        team.nonStrikerId = null;
    }
    
    if (!team.strikerId) {
        return { success: false, error: 'No batsman is currently set. Please select at least one batsman first.' };
    }
    
    // Transition state
    const isOverEnd = (tour.balls > 0 && tour.balls % 6 === 0);
    if (tour.balls === 0 && !tour.activeBowlerId) {
        tour.state = 'SELECT_BOWLER';
    } else if (isOverEnd) {
        tour.state = 'SELECT_BOWLER';
    } else {
        tour.state = 'PLAYING';
    }
    
    return { success: true, tour };
}

function submitPlay(tourId, userId, rawInput) {
    const tour = tours.get(tourId);
    if (!tour || tour.state !== 'PLAYING') return { success: false, error: 'Not currently playing.' };
    

    if (tour.processingBall) return { success: false, error: 'Please wait for the current ball animation to finish.' };
    
    const batTeam = tour[tour.battingTeamId];
    
    const isStriker = userId.toString() === getBasePlayerId(batTeam.strikerId);
    const isBowler = userId.toString() === getBasePlayerId(tour.activeBowlerId);
    
    if (!isStriker && !isBowler) {
        const debugInfo = `You are not the active striker or bowler.\n` +
                          `Debug details:\n` +
                          `- Sender ID: ${userId} (${typeof userId})\n` +
                          `- Striker ID: ${batTeam.strikerId} (${typeof batTeam.strikerId})\n` +
                          `- Base Striker ID: ${getBasePlayerId(batTeam.strikerId)}\n` +
                          `- Active Bowler ID: ${tour.activeBowlerId} (${typeof tour.activeBowlerId})\n` +
                          `- Base Bowler ID: ${getBasePlayerId(tour.activeBowlerId)}`;
        return { success: false, error: debugInfo };
    }
    
    const BATSMAN_OPTIONS = tour.powerSurge 
        ? new Set(['0','1','2','3','4','5','6']) 
        : new Set(['0','1','2','3','4','6']);
    const BOWLER_MAP = { 'rs':'0', 'bouncer':'1', 'yorker':'2', 'short':'3', 'slower':'4', 'knuckle':'6' };
    if (tour.powerSurge) {
        BOWLER_MAP['leg cutter'] = '5';
        BOWLER_MAP['legcutter'] = '5';
    }
    
    if (isStriker) {
        if (!BATSMAN_OPTIONS.has(rawInput)) {
            return { 
                success: false, 
                error: tour.powerSurge 
                    ? 'Invalid shot! Send one of: 0, 1, 2, 3, 4, 5, 6' 
                    : 'Invalid shot! Send one of: 0, 1, 2, 3, 4, 6' 
            };
        }
        if (tour.choices.batChoice !== null) return { success: false, error: 'You already played this ball.' };
        tour.choices.batChoice = rawInput;
    } else {
        const mapped = BOWLER_MAP[rawInput.toLowerCase()];
        if (!mapped) {
            return { 
                success: false, 
                error: tour.powerSurge 
                    ? 'Invalid delivery! Send one of: RS, Bouncer, Yorker, Short, Slower, Leg Cutter, Knuckle' 
                    : 'Invalid delivery! Send one of: RS, Bouncer, Yorker, Short, Slower, Knuckle' 
            };
        }
        if (tour.choices.bowlChoice !== null) return { success: false, error: 'You already bowled this ball.' };
        tour.choices.bowlChoice = rawInput;
        tour.choices.bowlNum = mapped;
    }
    
    if (tour.choices.batChoice === null || tour.choices.bowlChoice === null) {
        return { success: true, waiting: true };
    }
    
    tour.processingBall = true;
    
    // RESOLUTION
    const batNum = parseInt(tour.choices.batChoice);
    const bowlNum = parseInt(tour.choices.bowlNum);
    const bowlStr = tour.choices.bowlChoice;
    const batStr = tour.choices.batChoice;
    
    tour.choices = { batChoice: null, bowlChoice: null, bowlNum: null };
    tour.balls++;
    
    const isWicket = batNum === bowlNum;
    
    // Update player stats
    const striker = batTeam.players.find(p => p.id === batTeam.strikerId);
    const bowlTeam = tour[tour.bowlingTeamId];
    const bowler = bowlTeam.players.find(p => p.id === tour.activeBowlerId);

    let hit50 = false;
    let hit100 = false;
    let hitDuck = false;
    let hitHattrick = false;
    let hitThreeWickets = false;
    let hitFiveWickets = false;
    let batsmanName = "";
    let bowlerName = "";

    if (striker) {
        if (striker.runs === undefined) striker.runs = 0;
        if (striker.balls === undefined) striker.balls = 0;
        if (striker.fours === undefined) striker.fours = 0;
        if (striker.sixes === undefined) striker.sixes = 0;
        striker.balls++;
        batsmanName = striker.first_name;
        if (!isWicket) {
            striker.runs += batNum;
            if (batNum === 4) striker.fours++;
            if (batNum === 6) striker.sixes++;
            if (striker.runs >= 50 && !striker.halfCenturyAnnounced) {
                striker.halfCenturyAnnounced = true;
                hit50 = true;
            }
            if (striker.runs >= 100 && !striker.centuryAnnounced) {
                striker.centuryAnnounced = true;
                hit100 = true;
            }
        } else {
            if (striker.runs === 0) {
                hitDuck = true;
            }
        }
    }
    if (bowler) {
        if (bowler.wickets === undefined) bowler.wickets = 0;
        if (bowler.runsConceded === undefined) bowler.runsConceded = 0;
        if (bowler.ballsBowled === undefined) bowler.ballsBowled = 0;
        bowler.ballsBowled++;
        bowlerName = bowler.first_name;
        if (isWicket) {
            bowler.wickets++;
            bowler.consecutiveWickets = (bowler.consecutiveWickets || 0) + 1;
            if (bowler.consecutiveWickets === 3) {
                hitHattrick = true;
            }
            if (bowler.wickets === 3 && !bowler.threeWicketHaulAnnounced) {
                bowler.threeWicketHaulAnnounced = true;
                hitThreeWickets = true;
            }
            if (bowler.wickets === 5 && !bowler.fiveWicketHaulAnnounced) {
                bowler.fiveWicketHaulAnnounced = true;
                hitFiveWickets = true;
            }
        } else {
            bowler.runsConceded += batNum;
            bowler.consecutiveWickets = 0;
        }
    }

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
        tie: false,
        hit50,
        hit100,
        hitDuck,
        hitHattrick,
        hitThreeWickets,
        hitFiveWickets,
        batsmanName,
        bowlerName
    };
    
    if (!isWicket) {
        batTeam.score += batNum;
        if ((batNum === 1 || batNum === 3 || batNum === 5) && batTeam.nonStrikerId) {
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
    const maxOvers = tour.isSuperOver ? 1 : tour.config.overs;
    const oversFinished = tour.balls >= maxOvers * 6;
    const maxWickets = tour.isSuperOver ? 2 : (tour.config.wickets || 10);
    const allOut = batTeam.wickets >= batTeam.players.length || batTeam.wickets >= maxWickets;
    
    if (targetPassed || oversFinished || allOut) {
        if (tour.innings === 1) {
            res.inningsEnded = true;
            tour.innings1Balls = tour.balls;
            tour.state = 'INNINGS_BREAK';
        } else {
            res.matchEnded = true;
            tour.innings2Balls = tour.balls;
            tour.state = 'COMPLETED';
            const s1 = totalScore(tour.teamA);
            const s2 = totalScore(tour.teamB);
            if (s1 > s2) res.winnerTeamId = 'teamA';
            else if (s2 > s1) res.winnerTeamId = 'teamB';
            else res.tie = true;
            res.motm = calculateMOTM(tour, res.winnerTeamId);
        }
    } else {
        if (isWicket) {
            tour.state = 'WICKET_FALL';
            res.needsNewBatsman = true;
            if (endOfOver) {
                tour.previousBowlerId = tour.activeBowlerId;
                tour.activeBowlerId = null;
            }
        } else if (endOfOver) {
            tour.state = 'SELECT_BOWLER';
            res.needsNewBowler = true;
            tour.previousBowlerId = tour.activeBowlerId;
            tour.activeBowlerId = null;
        }
    }
    
    return { success: true, ...res };
}

function calculateMOTM(tour, winnerTeamId) {
    let bestPlayer = null;
    let maxPoints = -1;
    
    const eligibleTeams = [];
    if (winnerTeamId === 'teamA') {
        eligibleTeams.push(tour.teamA);
    } else if (winnerTeamId === 'teamB') {
        eligibleTeams.push(tour.teamB);
    } else {
        eligibleTeams.push(tour.teamA, tour.teamB);
    }
    
    const allPlayers = eligibleTeams.flatMap(t => t.players);
    for (const p of allPlayers) {
        const points = (p.runs || 0) + (p.wickets || 0) * 20;
        if (points > maxPoints) {
            maxPoints = points;
            bestPlayer = p;
        }
    }
    
    if (!bestPlayer) {
        const fallbackTeam = tour[winnerTeamId] || tour.teamA;
        bestPlayer = fallbackTeam.players[0];
    }
    return bestPlayer;
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
setInterval(cleanupExpiredGames, 3600000);

function getTour(tourId) { return tours.get(tourId); }
function getUserTour(userId) { const id = userTourMap.get(userId); return id ? tours.get(id) : null; }
function deleteTour(tourId) {
    const tour = tours.get(tourId);
    if (!tour) return;
    tour.teamA.players.forEach(p => userTourMap.delete(p.id));
    tour.teamB.players.forEach(p => userTourMap.delete(p.id));
    userTourMap.delete(tour.hostId);
    chatTourMap.delete(tour.chatId);
    tours.delete(tourId);
}

function getAllTours() {
    return tours.values();
}

module.exports = {
  createTour, getTour, getUserTour, deleteTour, joinTeam,
  appointCaptain, renameTeam, removePlayer, startTour, handleToss,
  setBatsman, setBowler, submitPlay, adjustRuns, rebatPlayer,
  triggerLMS, totalScore, getAllTours, getBasePlayerId, calculateMOTM
};
