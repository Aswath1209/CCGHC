const tourManager = require('./tourManager');

const triSeriesMap = new Map(); // chatId -> TriSeries
const userTriMap = new Map();   // userId -> chatId

function getTriSeries(chatId) {
  return triSeriesMap.get(chatId.toString());
}

function getUserTriSeries(userId) {
  const chatId = userTriMap.get(userId.toString());
  return chatId ? triSeriesMap.get(chatId.toString()) : null;
}

function deleteTriSeries(chatId) {
  const tri = triSeriesMap.get(chatId.toString());
  if (!tri) return false;
  
  // Clean up user mappings
  tri.teamA.players.forEach(p => userTriMap.delete(p.id.toString()));
  tri.teamB.players.forEach(p => userTriMap.delete(p.id.toString()));
  tri.teamC.players.forEach(p => userTriMap.delete(p.id.toString()));
  userTriMap.delete(tri.hostId.toString());
  
  if (tri.activeTourId) {
    tourManager.deleteTour(tri.activeTourId);
  }
  
  triSeriesMap.delete(chatId.toString());
  return true;
}

function createTriSeries(chatId, hostUser, rounds = 2) {
  const key = chatId.toString();
  // Clean up any stale tours in this group first
  const activeT = [...tourManager.getAllTours()].find(t => t.chatId && t.chatId.toString() === chatId.toString());
  if (activeT) {
    tourManager.deleteTour(activeT.id);
  }

  if (triSeriesMap.has(key)) {
    return { success: false, error: "A Tri-Series is already active in this group!" };
  }
  
  const tri = {
    id: key,
    chatId,
    hostId: hostUser.id,
    hostName: hostUser.first_name,
    rounds: parseInt(rounds) || 2,
    state: 'LOBBY', // LOBBY, PLAYING, FINISHED
    config: {
      overs: 5,
      wickets: 10
    },
    teamA: { key: 'teamA', name: 'Team A', players: [], captainId: null, customName: false },
    teamB: { key: 'teamB', name: 'Team B', players: [], captainId: null, customName: false },
    teamC: { key: 'teamC', name: 'Team C', players: [], captainId: null, customName: false },
    matches: [],
    currentMatchNum: null,
    activeTourId: null,
    stats: {}, // userId -> { name: '', runs: 0, ballsFaced: 0, wickets: 0, ballsBowled: 0, runsConceded: 0 }
    pointsTable: {
      teamA: { played: 0, won: 0, lost: 0, points: 0, runsScored: 0, ballsFaced: 0, runsConceded: 0, ballsBowled: 0 },
      teamB: { played: 0, won: 0, lost: 0, points: 0, runsScored: 0, ballsFaced: 0, runsConceded: 0, ballsBowled: 0 },
      teamC: { played: 0, won: 0, lost: 0, points: 0, runsScored: 0, ballsFaced: 0, runsConceded: 0, ballsBowled: 0 }
    }
  };

  // Round 1 Schedule
  tri.matches.push({ num: 1, team1Key: 'teamA', team2Key: 'teamB', state: 'PENDING', winner: null, resultText: '' });
  tri.matches.push({ num: 2, team1Key: 'teamB', team2Key: 'teamC', state: 'PENDING', winner: null, resultText: '' });
  tri.matches.push({ num: 3, team1Key: 'teamC', team2Key: 'teamA', state: 'PENDING', winner: null, resultText: '' });

  // Round 2 Schedule if double round-robin
  if (tri.rounds === 2) {
    tri.matches.push({ num: 4, team1Key: 'teamB', team2Key: 'teamA', state: 'PENDING', winner: null, resultText: '' });
    tri.matches.push({ num: 5, team1Key: 'teamC', team2Key: 'teamB', state: 'PENDING', winner: null, resultText: '' });
    tri.matches.push({ num: 6, team1Key: 'teamA', team2Key: 'teamC', state: 'PENDING', winner: null, resultText: '' });
  }

  // The Final match
  const finalNum = tri.rounds === 1 ? 4 : 7;
  tri.matches.push({ num: finalNum, isFinal: true, team1Key: null, team2Key: null, state: 'PENDING', winner: null, resultText: '' });

  triSeriesMap.set(key, tri);
  userTriMap.set(hostUser.id.toString(), key);
  
  return { success: true, tri };
}

function joinTeam(chatId, user, teamKey) {
  const tri = getTriSeries(chatId);
  if (!tri) return { success: false, error: 'Tri-Series not found.' };
  if (tri.state === 'PLAYING') return { success: false, error: 'Cannot change rosters while a match is currently playing!' };

  const targetTeam = tri[teamKey];
  if (!targetTeam) return { success: false, error: 'Invalid team selected.' };

  const userIdStr = user.id.toString();

  // If already in target team, leave it (toggle)
  const existingIdx = targetTeam.players.findIndex(p => p.id.toString() === userIdStr);
  if (existingIdx !== -1) {
    targetTeam.players.splice(existingIdx, 1);
    userTriMap.delete(userIdStr);
    if (targetTeam.captainId?.toString() === userIdStr) {
      targetTeam.captainId = targetTeam.players.length > 0 ? targetTeam.players[0].id : null;
    }
    return { success: true, action: 'left', teamName: targetTeam.name };
  }

  // Remove from any other team first
  ['teamA', 'teamB', 'teamC'].forEach(key => {
    const team = tri[key];
    const idx = team.players.findIndex(p => p.id.toString() === userIdStr);
    if (idx !== -1) {
      team.players.splice(idx, 1);
      if (team.captainId?.toString() === userIdStr) {
        team.captainId = team.players.length > 0 ? team.players[0].id : null;
      }
    }
  });

  // Join the target team
  targetTeam.players.push({
    id: user.id,
    first_name: user.first_name,
    username: user.username || ''
  });
  
  userTriMap.set(userIdStr, chatId.toString());

  // Auto captain if none exists
  if (!targetTeam.captainId) {
    targetTeam.captainId = user.id;
  }

  return { success: true, action: 'joined', teamName: targetTeam.name };
}

function appointCaptain(chatId, captainId, teamKey) {
  const tri = getTriSeries(chatId);
  if (!tri) return { success: false, error: 'Tri-Series not found.' };
  
  const team = tri[teamKey];
  if (!team) return { success: false, error: 'Invalid team.' };

  const playerExists = team.players.some(p => p.id.toString() === captainId.toString());
  if (!playerExists) {
    return { success: false, error: `This player is not registered in ${team.name}!` };
  }

  team.captainId = captainId;
  return { success: true, teamName: team.name };
}

function renameTeam(chatId, teamKey, newName) {
  const tri = getTriSeries(chatId);
  if (!tri) return { success: false, error: 'Tri-Series not found.' };

  const team = tri[teamKey];
  if (!team) return { success: false, error: 'Invalid team.' };

  team.name = newName.substring(0, 20);
  team.customName = true;
  return { success: true, teamName: team.name };
}

function removePlayer(chatId, playerId) {
  const tri = getTriSeries(chatId);
  if (!tri) return { success: false, error: 'Tri-Series not found.' };
  if (tri.state === 'PLAYING') return { success: false, error: 'Cannot change rosters while a match is currently playing!' };

  let removed = false;
  let teamName = '';

  ['teamA', 'teamB', 'teamC'].forEach(key => {
    const team = tri[key];
    const idx = team.players.findIndex(p => p.id.toString() === playerId.toString());
    if (idx !== -1) {
      team.players.splice(idx, 1);
      userTriMap.delete(playerId.toString());
      if (team.captainId?.toString() === playerId.toString()) {
        team.captainId = team.players.length > 0 ? team.players[0].id : null;
      }
      removed = true;
      teamName = team.name;
    }
  });

  return { success: removed, teamName };
}

function setOvers(chatId, overs) {
  const tri = getTriSeries(chatId);
  if (!tri) return { success: false, error: 'Tri-Series not found.' };
  if (overs < 1 || overs > 20) return { success: false, error: 'Overs must be between 1 and 20.' };
  tri.config.overs = overs;
  return { success: true, overs };
}

function setWickets(chatId, wickets) {
  const tri = getTriSeries(chatId);
  if (!tri) return { success: false, error: 'Tri-Series not found.' };
  if (wickets < 1 || wickets > 10) return { success: false, error: 'Wickets must be between 1 and 10.' };
  tri.config.wickets = wickets;
  return { success: true, wickets };
}

function startMatch(chatId, matchNum, hostUser) {
  const tri = getTriSeries(chatId);
  if (!tri) return { success: false, error: 'Tri-Series not found.' };
  
  // Clean up any stale tours in this group first
  const activeT = [...tourManager.getAllTours()].find(t => t.chatId && t.chatId.toString() === chatId.toString());
  if (activeT) {
    tourManager.deleteTour(activeT.id);
  }

  if (tri.state === 'PLAYING') return { success: false, error: 'A match is already active in this Tri-Series!' };

  const matchIdx = tri.matches.findIndex(m => m.num === parseInt(matchNum));
  if (matchIdx === -1) return { success: false, error: `Invalid Match Number: ${matchNum}` };

  const match = tri.matches[matchIdx];
  if (match.state === 'COMPLETED') return { success: false, error: `Match ${matchNum} has already been played!` };

  // If this is the Final, resolve who team1Key and team2Key are if not set
  if (match.isFinal) {
    const standings = getStandingsSorted(tri);
    match.team1Key = standings[0].key;
    match.team2Key = standings[1].key;
  }

  const team1 = tri[match.team1Key];
  const team2 = tri[match.team2Key];

  if (!team1 || !team2) {
    return { success: false, error: 'Match teams are not determined yet!' };
  }

  if (team1.players.length === 0 || team2.players.length === 0) {
    return { success: false, error: `Both teams must have at least 1 registered player! (${team1.name}: ${team1.players.length}, ${team2.name}: ${team2.players.length})` };
  }

  // Check if either captain is missing
  if (!team1.captainId) team1.captainId = team1.players[0].id;
  if (!team2.captainId) team2.captainId = team2.players[0].id;

  // Initialize a standard tour match
  const matchName = match.isFinal ? '🏆 Tri-Series Grand Final' : `Tri-Series Match ${match.num}`;
  const tourRes = tourManager.createTour(chatId, hostUser, matchName);
  if (!tourRes.success) return { success: false, error: tourRes.error };

  const tour = tourRes.tour;
  
  // Set match configs
  tour.config.overs = tri.config.overs;
  tour.config.wickets = tri.config.wickets;

  // Roster injection
  tour.teamA.name = team1.name;
  tour.teamA.captainId = team1.captainId;
  tour.teamA.customName = true;
  tour.teamA.players = [];
  tour.teamA.triTeamKey = match.team1Key;
  team1.players.forEach(p => tourManager.joinTeam(tour.id, { id: p.id, first_name: p.first_name, username: p.username || '' }, 'teamA'));

  tour.teamB.name = team2.name;
  tour.teamB.captainId = team2.captainId;
  tour.teamB.customName = true;
  tour.teamB.players = [];
  tour.teamB.triTeamKey = match.team2Key;
  team2.players.forEach(p => tourManager.joinTeam(tour.id, { id: p.id, first_name: p.first_name, username: p.username || '' }, 'teamB'));

  // Link to TriSeries
  tour.triSeriesId = tri.id;
  tour.triMatchNum = match.num;

  // Update TriSeries state
  tri.state = 'PLAYING';
  tri.currentMatchNum = match.num;
  tri.activeTourId = tour.id;

  return { success: true, tour, team1Name: team1.name, team2Name: team2.name };
}

function getStandingsSorted(tri) {
  const teamKeys = ['teamA', 'teamB', 'teamC'];
  
  const calculateNRR = (key) => {
    const data = tri.pointsTable[key];
    if (data.played === 0) return 0;
    const runsScored = data.runsScored || 0;
    const ballsFaced = data.ballsFaced || 0;
    const runsConceded = data.runsConceded || 0;
    const ballsBowled = data.ballsBowled || 0;
    
    const batRate = ballsFaced > 0 ? (runsScored / (ballsFaced / 6)) : 0;
    const bowlRate = ballsBowled > 0 ? (runsConceded / (ballsBowled / 6)) : 0;
    return batRate - bowlRate;
  };

  const list = teamKeys.map(key => ({
    key,
    name: tri[key].name,
    pts: tri.pointsTable[key].points,
    nrr: calculateNRR(key)
  }));

  list.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    return b.nrr - a.nrr;
  });

  return list;
}

function recordMatchEnd(chatId, matchNum, tour, winnerKeyOverride = null) {
  const tri = getTriSeries(chatId);
  if (!tri) return null;

  const matchIdx = tri.matches.findIndex(m => m.num === parseInt(matchNum));
  if (matchIdx === -1) return null;

  const match = tri.matches[matchIdx];

  // 1. Gather stats from match
  // Identify the winner of the tour match
  let winnerKey = ''; // 'team1' or 'team2' or 'tie'
  let resultText = '';

  const totalScore = (t) => Math.max(0, (t.score || 0) + (t.bonusRuns || 0) - (t.penaltyRuns || 0));
  const scoreA = totalScore(tour.teamA);
  const scoreB = totalScore(tour.teamB);

  const team1Key = match.team1Key;
  const team2Key = match.team2Key;

  // Let's identify the maps to correct keys
  const getTriKey = (tourTeamName) => {
    if (team1Key && tri[team1Key] && tourTeamName === tri[team1Key].name) return team1Key;
    if (team2Key && tri[team2Key] && tourTeamName === tri[team2Key].name) return team2Key;
    return null;
  };

  const keyA = tour.teamA.triTeamKey || getTriKey(tour.teamA.name);
  const keyB = tour.teamB.triTeamKey || getTriKey(tour.teamB.name);

  if (winnerKeyOverride) {
    winnerKey = winnerKeyOverride;
    resultText = `Won by forfeit / Free Win`;
  } else {
    if (scoreA > scoreB) {
      winnerKey = keyA;
      const margin = scoreA - scoreB;
      resultText = `${tour.teamA.name} won by ${margin} runs`;
    } else if (scoreB > scoreA) {
      winnerKey = keyB;
      const margin = tour.config.wickets - tour.teamB.wickets;
      resultText = `${tour.teamB.name} won by ${margin} wickets`;
    } else {
      winnerKey = 'tie';
      resultText = `Match tied`;
    }
  }

  // 2. Accumulate NRR data if not forfeit
  if (!winnerKeyOverride && winnerKey !== 'tie') {
    const isABatFirst = tour.firstBattingTeamId === 'teamA';
    
    // Team A bat stats
    const tARuns = scoreA;
    // Standard NRR rule: if bowled out, count full quota of balls
    const tABallsFaced = (tour.teamA.wickets === tour.config.wickets) ? (tour.config.overs * 6) : (tour.innings1Balls || (tour.innings === 1 ? tour.balls : tour.config.overs * 6));
    
    // Team B bat stats
    const tBRuns = scoreB;
    const tBBallsFaced = (tour.teamB.wickets === tour.config.wickets) ? (tour.config.overs * 6) : (tour.innings2Balls || (tour.innings === 2 ? tour.balls : tour.config.overs * 6));

    if (keyA && keyB) {
      // Update Standings
      tri.pointsTable[keyA].runsScored += tARuns;
      tri.pointsTable[keyA].ballsFaced += tABallsFaced;
      tri.pointsTable[keyA].runsConceded += tBRuns;
      tri.pointsTable[keyA].ballsBowled += tBBallsFaced;

      tri.pointsTable[keyB].runsScored += tBRuns;
      tri.pointsTable[keyB].ballsFaced += tBBallsFaced;
      tri.pointsTable[keyB].runsConceded += tARuns;
      tri.pointsTable[keyB].ballsBowled += tABallsFaced;
    }
  }

  // Update Played, Won, Lost, Points
  if (keyA && keyB) {
    tri.pointsTable[keyA].played += 1;
    tri.pointsTable[keyB].played += 1;

    if (winnerKey === keyA) {
      tri.pointsTable[keyA].won += 1;
      tri.pointsTable[keyA].points += 2;
      tri.pointsTable[keyB].lost += 1;
    } else if (winnerKey === keyB) {
      tri.pointsTable[keyB].won += 1;
      tri.pointsTable[keyB].points += 2;
      tri.pointsTable[keyA].lost += 1;
    } else {
      // Tie
      tri.pointsTable[keyA].points += 1;
      tri.pointsTable[keyB].points += 1;
    }
  }

  // 3. Accumulate Player Career Stats for Series Awards
  const updatePlayerStats = (tourTeam) => {
    tourTeam.players.forEach(p => {
      const pidStr = p.id.toString();
      if (!tri.stats[pidStr]) {
        tri.stats[pidStr] = {
          name: p.first_name,
          runs: 0,
          ballsFaced: 0,
          wickets: 0,
          ballsBowled: 0,
          runsConceded: 0
        };
      }
      
      const stats = tri.stats[pidStr];
      stats.runs += p.runs || 0;
      stats.ballsFaced += p.balls || 0;
      stats.wickets += p.wickets || 0;
      stats.ballsBowled += p.ballsBowled || 0;
      stats.runsConceded += p.runsConceded || 0;
    });
  };

  updatePlayerStats(tour.teamA);
  updatePlayerStats(tour.teamB);

  // 4. Update match object
  match.state = 'COMPLETED';
  match.winner = winnerKey;
  match.resultText = resultText;

  // 5. Clean up active match states
  tri.state = 'SCHEDULED';
  tri.currentMatchNum = null;
  tri.activeTourId = null;

  // If this was the Final, finish the entire Tri-Series
  if (match.isFinal) {
    tri.state = 'FINISHED';
  } else {
    // If all group matches are done, prepare the Final match details
    const groupMatchesDone = tri.matches.filter(m => !m.isFinal).every(m => m.state === 'COMPLETED');
    if (groupMatchesDone) {
      const finalMatch = tri.matches.find(m => m.isFinal);
      const standings = getStandingsSorted(tri);
      finalMatch.team1Key = standings[0].key;
      finalMatch.team2Key = standings[1].key;
    }
  }

  return { match, tri };
}

function giveFreeWin(chatId, winnerKeyOverride) {
  const tri = getTriSeries(chatId);
  if (!tri) return { success: false, error: 'Tri-Series not found.' };
  if (tri.state !== 'PLAYING') return { success: false, error: 'No active match is currently playing!' };

  const tour = tourManager.getTour(tri.activeTourId);
  if (!tour) return { success: false, error: 'Active match state not found.' };

  const matchNum = tri.currentMatchNum;
  const res = recordMatchEnd(chatId, matchNum, tour, winnerKeyOverride);
  
  if (tour.id) {
    tourManager.deleteTour(tour.id);
  }

  return { success: true, res };
}

function calculateAwards(tri) {
  const players = Object.entries(tri.stats).map(([id, s]) => ({
    id,
    name: s.name,
    runs: s.runs || 0,
    ballsFaced: s.ballsFaced || 0,
    wickets: s.wickets || 0,
    runsConceded: s.runsConceded || 0,
    ballsBowled: s.ballsBowled || 0,
    // MVP / POTS points formula: runs * 1 + wickets * 20
    potsPoints: (s.runs || 0) + (s.wickets || 0) * 20
  }));

  if (players.length === 0) return null;

  // Sort for individual stats
  const mostRuns = [...players].sort((a, b) => b.runs - a.runs)[0];
  const mostWickets = [...players].sort((a, b) => b.wickets - a.wickets)[0];
  const pots = [...players].sort((a, b) => b.potsPoints - a.potsPoints)[0];

  return { pots, mostRuns, mostWickets };
}

function getAllTriSeries() {
  return Array.from(triSeriesMap.values());
}

module.exports = {
  createTriSeries, getTriSeries, getUserTriSeries, deleteTriSeries,
  joinTeam, appointCaptain, renameTeam, removePlayer,
  setOvers, setWickets, startMatch, recordMatchEnd, giveFreeWin,
  calculateAwards, getStandingsSorted, getAllTriSeries
};
