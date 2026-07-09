const fs = require('fs');
const path = require('path');
const tourManager = require('./tourManager');

const STATE_FILE = path.join(__dirname, '../db/tournament_state.json');

const triSeriesMap = new Map(); // chatId -> Tournament
const userTriMap = new Map();   // userId -> chatId

function saveState() {
  try {
    const data = {
      triSeries: Array.from(triSeriesMap.entries()),
      userTri: Array.from(userTriMap.entries())
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error("Failed to save tournament state:", e);
  }
}

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const content = fs.readFileSync(STATE_FILE, 'utf-8');
      const data = JSON.parse(content);
      if (data.triSeries) {
        triSeriesMap.clear();
        data.triSeries.forEach(([k, v]) => triSeriesMap.set(k, v));
      }
      if (data.userTri) {
        userTriMap.clear();
        data.userTri.forEach(([k, v]) => userTriMap.set(k, v));
      }
    }
  } catch (e) {
    console.error("Failed to load tournament state:", e);
  }
}

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
  getTeamKeys(tri).forEach(key => {
    tri[key].players.forEach(p => userTriMap.delete(p.id.toString()));
  });
  userTriMap.delete(tri.hostId.toString());
  
  if (tri.activeTourId) {
    tourManager.deleteTour(tri.activeTourId);
  }
  
  triSeriesMap.delete(chatId.toString());
  saveState();
  return true;
}

function getTeamKeys(tri) {
  return Object.keys(tri)
    .filter(k => k.startsWith('team') && k.length === 5)
    .sort(); // Keep sorted alphabetically teamA, teamB, teamC, etc.
}

function createTriSeries(chatId, hostUser, rounds = 1) {
  const key = chatId.toString();
  // Clean up any stale tours in this group first
  const activeT = [...tourManager.getAllTours()].find(t => t.chatId && t.chatId.toString() === chatId.toString());
  if (activeT) {
    tourManager.deleteTour(activeT.id);
  }

  if (triSeriesMap.has(key)) {
    return { success: false, error: "A tournament is already active in this group!" };
  }
  
  const tri = {
    id: key,
    chatId,
    hostId: hostUser.id,
    hostName: hostUser.first_name,
    rounds: parseInt(rounds) || 1,
    state: 'LOBBY', // LOBBY, PLAYING, FINISHED
    config: {
      overs: 5,
      wickets: 10,
      q: 2 // Default qualification count
    },
    teamA: { key: 'teamA', name: 'Team A', players: [], captainId: null, customName: false },
    teamB: { key: 'teamB', name: 'Team B', players: [], captainId: null, customName: false },
    teamC: { key: 'teamC', name: 'Team C', players: [], captainId: null, customName: false },
    teamD: { key: 'teamD', name: 'Team D', players: [], captainId: null, customName: false },
    matches: [],
    currentMatchNum: null,
    activeTourId: null,
    stats: {}, // userId -> stats
    pointsTable: {
      teamA: { played: 0, won: 0, lost: 0, points: 0, runsScored: 0, ballsFaced: 0, runsConceded: 0, ballsBowled: 0 },
      teamB: { played: 0, won: 0, lost: 0, points: 0, runsScored: 0, ballsFaced: 0, runsConceded: 0, ballsBowled: 0 },
      teamC: { played: 0, won: 0, lost: 0, points: 0, runsScored: 0, ballsFaced: 0, runsConceded: 0, ballsBowled: 0 },
      teamD: { played: 0, won: 0, lost: 0, points: 0, runsScored: 0, ballsFaced: 0, runsConceded: 0, ballsBowled: 0 }
    }
  };

  triSeriesMap.set(key, tri);
  userTriMap.set(hostUser.id.toString(), key);
  
  saveState();
  return { success: true, tri };
}

function createTeam(chatId) {
  const tri = getTriSeries(chatId);
  if (!tri) return { success: false, error: 'Tournament not found.' };
  if (tri.state !== 'LOBBY') return { success: false, error: 'Teams can only be added in the LOBBY state.' };

  const keys = getTeamKeys(tri);
  if (keys.length >= 8) {
    return { success: false, error: 'Maximum 8 teams allowed!' };
  }

  // Next letter
  const nextLetter = String.fromCharCode(65 + keys.length); // 65 is 'A'
  const newKey = `team${nextLetter}`;

  tri[newKey] = { key: newKey, name: `Team ${nextLetter}`, players: [], captainId: null, customName: false };
  tri.pointsTable[newKey] = { played: 0, won: 0, lost: 0, points: 0, runsScored: 0, ballsFaced: 0, runsConceded: 0, ballsBowled: 0 };

  saveState();
  return { success: true, teamName: tri[newKey].name, teamKey: newKey };
}

function removeTeam(chatId, teamChar) {
  const tri = getTriSeries(chatId);
  if (!tri) return { success: false, error: 'Tournament not found.' };
  if (tri.state !== 'LOBBY') return { success: false, error: 'Teams can only be removed in the LOBBY state.' };

  const targetChar = teamChar.toUpperCase();
  const targetKey = `team${targetChar}`;
  const keys = getTeamKeys(tri);

  if (!tri[targetKey]) {
    return { success: false, error: `Team ${targetChar} does not exist.` };
  }
  if (keys.length <= 4) {
    return { success: false, error: 'Minimum 4 teams are required!' };
  }

  // Unregister players from user map
  tri[targetKey].players.forEach(p => userTriMap.delete(p.id.toString()));

  // Shift logic
  const idx = keys.indexOf(targetKey);
  for (let i = idx; i < keys.length - 1; i++) {
    const currentKey = keys[i];
    const nextKey = keys[i + 1];
    
    tri[currentKey] = tri[nextKey];
    tri[currentKey].key = currentKey;
    
    // Shift name if not custom
    const nextLetter = nextKey.replace('team', '');
    const currentLetter = currentKey.replace('team', '');
    if (!tri[currentKey].customName && tri[currentKey].name === `Team ${nextLetter}`) {
      tri[currentKey].name = `Team ${currentLetter}`;
    }
    
    tri.pointsTable[currentKey] = tri.pointsTable[nextKey];
  }

  // Delete last key
  const lastKey = keys[keys.length - 1];
  delete tri[lastKey];
  delete tri.pointsTable[lastKey];

  // Adjust qualifies count if it exceeds total teams
  const newLength = keys.length - 1;
  if (tri.config.q >= newLength) {
    tri.config.q = newLength - 1;
  }

  saveState();
  return { success: true };
}

function setQ(chatId, q) {
  const tri = getTriSeries(chatId);
  if (!tri) return { success: false, error: 'Tournament not found.' };

  const parsedQ = parseInt(q);
  if (isNaN(parsedQ) || parsedQ < 2 || parsedQ > 4) {
    return { success: false, error: 'Qualification count must be between 2 and 4.' };
  }

  const teamCount = getTeamKeys(tri).length;
  if (parsedQ >= teamCount) {
    return { success: false, error: `Qualification count must be strictly less than total teams (${teamCount}).` };
  }

  tri.config.q = parsedQ;
  saveState();
  return { success: true, q: parsedQ };
}

function joinTeam(chatId, user, teamKey) {
  const tri = getTriSeries(chatId);
  if (!tri) return { success: false, error: 'Tournament not found.' };

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
    saveState();
    return { success: true, action: 'left', teamName: targetTeam.name };
  }

  // Remove from any other team first
  getTeamKeys(tri).forEach(key => {
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

  saveState();
  return { success: true, action: 'joined', teamName: targetTeam.name };
}

function appointCaptain(chatId, captainId, teamKey) {
  const tri = getTriSeries(chatId);
  if (!tri) return { success: false, error: 'Tournament not found.' };
  
  const team = tri[teamKey];
  if (!team) return { success: false, error: 'Invalid team.' };

  const playerExists = team.players.some(p => p.id.toString() === captainId.toString());
  if (!playerExists) {
    return { success: false, error: `This player is not registered in ${team.name}!` };
  }

  team.captainId = captainId;
  saveState();
  return { success: true, teamName: team.name };
}

function renameTeam(chatId, teamKey, newName) {
  const tri = getTriSeries(chatId);
  if (!tri) return { success: false, error: 'Tournament not found.' };

  const team = tri[teamKey];
  if (!team) return { success: false, error: 'Invalid team.' };

  team.name = newName.substring(0, 20);
  team.customName = true;
  saveState();
  return { success: true, teamName: team.name };
}

function removePlayer(chatId, playerId) {
  const tri = getTriSeries(chatId);
  if (!tri) return { success: false, error: 'Tournament not found.' };

  let removed = false;
  let teamName = '';

  getTeamKeys(tri).forEach(key => {
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

  saveState();
  return { success: removed, teamName };
}

function setOvers(chatId, overs) {
  const tri = getTriSeries(chatId);
  if (!tri) return { success: false, error: 'Tournament not found.' };
  if (overs < 1 || overs > 20) return { success: false, error: 'Overs must be between 1 and 20.' };
  tri.config.overs = overs;
  saveState();
  return { success: true, overs };
}

function setWickets(chatId, wickets) {
  const tri = getTriSeries(chatId);
  if (!tri) return { success: false, error: 'Tournament not found.' };
  if (wickets < 1 || wickets > 10) return { success: false, error: 'Wickets must be between 1 and 10.' };
  tri.config.wickets = wickets;
  saveState();
  return { success: true, wickets };
}

function generateSchedule(tri) {
  const teamKeys = getTeamKeys(tri);
  const rounds = tri.rounds || 1;
  const matches = [];
  const list = [...teamKeys];
  const n = list.length;
  
  const hasBye = (n % 2 !== 0);
  if (hasBye) {
    list.push(null);
  }
  
  const numTeams = list.length;
  const numRounds = numTeams - 1;
  let matchNum = 1;
  
  for (let r = 0; r < numRounds; r++) {
    for (let i = 0; i < numTeams / 2; i++) {
      const t1 = list[i];
      const t2 = list[numTeams - 1 - i];
      if (t1 !== null && t2 !== null) {
        matches.push({
          num: matchNum++,
          team1Key: t1,
          team2Key: t2,
          state: 'PENDING',
          winner: null,
          resultText: ''
        });
      }
    }
    list.splice(1, 0, list.pop());
  }
  
  if (rounds === 2) {
    const r1Count = matches.length;
    for (let i = 0; i < r1Count; i++) {
      matches.push({
        num: matchNum++,
        team1Key: matches[i].team2Key,
        team2Key: matches[i].team1Key,
        state: 'PENDING',
        winner: null,
        resultText: ''
      });
    }
  }
  
  tri.matches = matches;
  tri.totalGroupMatches = matches.length;
}

function startTournament(chatId) {
  const tri = getTriSeries(chatId);
  if (!tri) return { success: false, error: 'Tournament not found.' };
  
  const teamKeys = getTeamKeys(tri);
  if (teamKeys.length < 4) return { success: false, error: 'Tournament requires at least 4 teams!' };
  
  for (const key of teamKeys) {
    if (tri[key].players.length === 0) {
      return { success: false, error: `All teams must have at least 1 registered player! (${tri[key].name} is empty)` };
    }
  }
  
  generateSchedule(tri);
  tri.state = 'SCHEDULED';
  saveState();
  return { success: true, tri };
}

function preparePlayoffs(tri) {
  const q = tri.config.q;
  const standings = getStandingsSorted(tri);
  const matches = tri.matches.filter(m => !m.isPlayoff); // Keep only group matches
  let nextNum = matches.length + 1;
  
  if (q === 2) {
    matches.push({
      num: nextNum,
      isPlayoff: true,
      isFinal: true,
      name: '🏆 Grand Final',
      team1Key: standings[0].key,
      team2Key: standings[1].key,
      state: 'PENDING',
      winner: null,
      resultText: ''
    });
  } else if (q === 3) {
    matches.push({
      num: nextNum,
      isPlayoff: true,
      isQualifier: true,
      name: '🏏 Qualifier (2nd vs 3rd)',
      team1Key: standings[1].key,
      team2Key: standings[2].key,
      state: 'PENDING',
      winner: null,
      resultText: ''
    });
    matches.push({
      num: nextNum + 1,
      isPlayoff: true,
      isFinal: true,
      name: '🏆 Grand Final',
      team1Key: standings[0].key,
      team2Key: null, // Winner of Qualifier
      state: 'PENDING',
      winner: null,
      resultText: ''
    });
  } else if (q === 4) {
    matches.push({
      num: nextNum,
      isPlayoff: true,
      isSemi: true,
      name: '🏏 Semi-Final 1 (1st vs 4th)',
      team1Key: standings[0].key,
      team2Key: standings[3].key,
      state: 'PENDING',
      winner: null,
      resultText: ''
    });
    matches.push({
      num: nextNum + 1,
      isPlayoff: true,
      isSemi: true,
      name: '🏏 Semi-Final 2 (2nd vs 3rd)',
      team1Key: standings[1].key,
      team2Key: standings[2].key,
      state: 'PENDING',
      winner: null,
      resultText: ''
    });
    matches.push({
      num: nextNum + 2,
      isPlayoff: true,
      isFinal: true,
      name: '🏆 Grand Final',
      team1Key: null, // Winner SF1
      team2Key: null, // Winner SF2
      state: 'PENDING',
      winner: null,
      resultText: ''
    });
  }
  
  tri.matches = matches;
}

function startMatch(chatId, matchNum, hostUser, targetChatId = null) {
  const tri = getTriSeries(chatId);
  if (!tri) return { success: false, error: 'Tournament not found.' };

  const matchIdx = tri.matches.findIndex(m => m.num === parseInt(matchNum));
  if (matchIdx === -1) return { success: false, error: `Invalid Match Number: ${matchNum}` };

  const match = tri.matches[matchIdx];
  if (match.state === 'COMPLETED') return { success: false, error: `Match ${matchNum} has already been played!` };
  if (match.state === 'PLAYING') return { success: false, error: `Match ${matchNum} is currently playing!` };

  // Resolve teams for playoffs if not fully set
  if (match.isPlayoff) {
    const q = tri.config.q;
    const standings = getStandingsSorted(tri);
    if (match.isFinal) {
      if (q === 2) {
        match.team1Key = standings[0].key;
        match.team2Key = standings[1].key;
      }
      // For q=3 and q=4, team1Key and team2Key are resolved sequentially as semis/qualifiers finish.
    }
  }

  const team1 = tri[match.team1Key];
  const team2 = tri[match.team2Key];

  if (!team1 || !team2) {
    return { success: false, error: 'Match teams are not determined yet!' };
  }

  // Check if either team is already playing in another active match
  const activeTeamMatch = tri.matches.find(m => 
    m.state === 'PLAYING' && 
    (m.team1Key === match.team1Key || m.team2Key === match.team1Key || 
     m.team1Key === match.team2Key || m.team2Key === match.team2Key)
  );
  if (activeTeamMatch) {
    return { success: false, error: `Cannot start match! One of the teams is already playing in Match ${activeTeamMatch.num}.` };
  }

  if (team1.players.length === 0 || team2.players.length === 0) {
    return { success: false, error: `Both teams must have at least 1 registered player! (${team1.name}: ${team1.players.length}, ${team2.name}: ${team2.players.length})` };
  }

  // Check if either captain is missing
  if (!team1.captainId) team1.captainId = team1.players[0].id;
  if (!team2.captainId) team2.captainId = team2.players[0].id;

  const matchName = match.name || `Match ${match.num}`;
  
  // Create tour in targetChatId (if simultaneous play) or local chatId
  const playChatId = targetChatId || chatId;

  // Clean up any stale tours in playChatId
  const activeT = [...tourManager.getAllTours()].find(t => t.chatId && t.chatId.toString() === playChatId.toString());
  if (activeT) {
    if (activeT.state !== 'LOBBY' && activeT.state !== 'COMPLETED') {
      return { success: false, error: 'An active match is already being played in this group! Please wait for it to finish or cancel it.' };
    }
    tourManager.deleteTour(activeT.id);
  }

  const tourRes = tourManager.createTour(playChatId, hostUser, matchName);
  if (!tourRes.success) return { success: false, error: tourRes.error };

  const tour = tourRes.tour;
  if (!tour || !tour.config) return { success: false, error: 'Failed to initialize match.' };
  
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

  // Link to Tournament
  tour.triSeriesId = tri.id;
  tour.triMatchNum = match.num;

  // Update match state
  match.state = 'PLAYING';
  tri.state = 'PLAYING';

  saveState();
  return { success: true, tour, team1Name: team1.name, team2Name: team2.name };
}

function getStandingsSorted(tri) {
  const teamKeys = getTeamKeys(tri);
  
  const calculateNRR = (key) => {
    const data = tri.pointsTable[key];
    if (!data || data.played === 0) return 0;
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
    pts: tri.pointsTable[key]?.points || 0,
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
  let winnerKey = ''; // 'team1' or 'team2' or 'tie'
  let resultText = '';

  const totalScore = (t) => Math.max(0, (t.score || 0) + (t.bonusRuns || 0) - (t.penaltyRuns || 0));
  const scoreA = totalScore(tour.teamA);
  const scoreB = totalScore(tour.teamB);

  const team1Key = match.team1Key;
  const team2Key = match.team2Key;

  const getTriKey = (tourTeamName) => {
    if (team1Key && tri[team1Key] && tourTeamName === tri[team1Key].name) return team1Key;
    if (team2Key && tri[team2Key] && tourTeamName === tri[team2Key].name) return team2Key;
    return null;
  };

  let keyA = tour.teamA.triTeamKey || getTriKey(tour.teamA.name);
  let keyB = tour.teamB.triTeamKey || getTriKey(tour.teamB.name);
  
  if (!keyA && team1Key) keyA = team1Key;
  if (!keyB && team2Key) keyB = team2Key;

  if (winnerKeyOverride) {
    winnerKey = winnerKeyOverride;
    resultText = `Won by forfeit / Free Win`;
  } else {
    const firstBat = tour.firstBattingTeamId || 'teamA';
    
    if (tour.mainMatchTeamA) {
      if (scoreA > scoreB) winnerKey = keyA;
      else if (scoreB > scoreA) winnerKey = keyB;
      else winnerKey = 'tie';

      if (winnerKey !== 'tie') {
          const winnerName = winnerKey === keyA ? tour.teamA.name : tour.teamB.name;
          const superOverRunsMargin = Math.abs(scoreA - scoreB);
          resultText = `${winnerName} won the Super Over by ${superOverRunsMargin} run${superOverRunsMargin > 1 ? 's' : ''}`;
      } else {
          resultText = `Match tied in Super Over`;
      }
    } else {
      if (scoreA > scoreB) {
        winnerKey = keyA;
        if (firstBat === 'teamA') {
          const margin = scoreA - scoreB;
          resultText = `${tour.teamA.name} won by ${margin} runs`;
        } else {
          const margin = tour.config.wickets - tour.teamA.wickets;
          resultText = `${tour.teamA.name} won by ${margin} wicket${margin !== 1 ? 's' : ''}`;
        }
      } else if (scoreB > scoreA) {
        winnerKey = keyB;
        if (firstBat === 'teamB') {
          const margin = scoreB - scoreA;
          resultText = `${tour.teamB.name} won by ${margin} runs`;
        } else {
          const margin = tour.config.wickets - tour.teamB.wickets;
          resultText = `${tour.teamB.name} won by ${margin} wicket${margin !== 1 ? 's' : ''}`;
        }
      } else {
        winnerKey = 'tie';
        resultText = `Match tied`;
      }
    }
  }

  // 2. Accumulate NRR data if not forfeit
  if (!winnerKeyOverride) {
    const tARuns = scoreA;
    const tABallsFaced = (tour.teamA.wickets >= tour.config.wickets) ? (tour.config.overs * 6) : (tour.innings1Balls || (tour.innings === 1 ? tour.balls : tour.config.overs * 6));
    
    const tBRuns = scoreB;
    const tBBallsFaced = (tour.teamB.wickets >= tour.config.wickets) ? (tour.config.overs * 6) : (tour.innings2Balls || (tour.innings === 2 ? tour.balls : tour.config.overs * 6));

    if (keyA && keyB) {
      if (!tri.pointsTable[keyA]) tri.pointsTable[keyA] = { played: 0, won: 0, lost: 0, points: 0, runsScored: 0, ballsFaced: 0, runsConceded: 0, ballsBowled: 0 };
      if (!tri.pointsTable[keyB]) tri.pointsTable[keyB] = { played: 0, won: 0, lost: 0, points: 0, runsScored: 0, ballsFaced: 0, runsConceded: 0, ballsBowled: 0 };

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
    if (!tri.pointsTable[keyA]) tri.pointsTable[keyA] = { played: 0, won: 0, lost: 0, points: 0, runsScored: 0, ballsFaced: 0, runsConceded: 0, ballsBowled: 0 };
    if (!tri.pointsTable[keyB]) tri.pointsTable[keyB] = { played: 0, won: 0, lost: 0, points: 0, runsScored: 0, ballsFaced: 0, runsConceded: 0, ballsBowled: 0 };

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

  // 3. Accumulate Player Career Stats
  const updatePlayerStats = (tourTeam) => {
    tourTeam.players.forEach(p => {
      const baseId = tourManager.getBasePlayerId(p.id);
      if (!baseId) return;
      const pidStr = baseId.toString();
      const cleanName = p.first_name.replace(/\s*\(rebat\)/gi, '');
      if (!tri.stats[pidStr]) {
        tri.stats[pidStr] = {
          name: cleanName,
          runs: 0,
          ballsFaced: 0,
          wickets: 0,
          ballsBowled: 0,
          runsConceded: 0,
          potsPoints: 0
        };
      }
      
      const stats = tri.stats[pidStr];
      if (stats.potsPoints === undefined) stats.potsPoints = 0;
      stats.runs += p.runs || 0;
      stats.ballsFaced += p.balls || 0;
      stats.wickets += p.wickets || 0;
      stats.ballsBowled += p.ballsBowled || 0;
      stats.runsConceded += p.runsConceded || 0;

      let matchPts = 0;
      const runs = p.runs || 0;
      matchPts += runs;
      matchPts += (p.fours || 0) * 1;
      matchPts += (p.sixes || 0) * 2;
      
      if (runs >= 100) matchPts += 16;
      else if (runs >= 50) matchPts += 8;
      else if (runs >= 30) matchPts += 4;
      
      const ballsFaced = p.balls || 0;
      if (ballsFaced >= 3) {
          const sr = (runs / ballsFaced) * 100;
          if (sr > 170) matchPts += 6;
          else if (sr >= 150) matchPts += 4;
          else if (sr >= 130) matchPts += 2;
          else if (sr >= 60 && sr < 70) matchPts -= 2;
          else if (sr >= 50 && sr < 60) matchPts -= 4;
          else if (sr < 50) matchPts -= 6;
      }
      
      const wickets = p.wickets || 0;
      matchPts += wickets * 25;
      
      if (wickets >= 5) matchPts += 16;
      else if (wickets >= 3) matchPts += 8;
      
      matchPts += (p.dotBalls || 0) * 1;
      
      const ballsBowled = p.ballsBowled || 0;
      const runsConceded = p.runsConceded || 0;
      if (ballsBowled >= 3) {
          const econ = (runsConceded / ballsBowled) * 6;
          if (econ < 5) matchPts += 6;
          else if (econ < 7) matchPts += 4;
          else if (econ < 9) matchPts += 2;
          else if (econ > 15) matchPts -= 6;
          else if (econ > 13) matchPts -= 4;
          else if (econ > 11) matchPts -= 2;
      }

      let tieBreaker = 0;
      tieBreaker += wickets * 0.01;
      tieBreaker += runs * 0.001;
      tieBreaker -= runsConceded * 0.0001;
      tieBreaker -= ballsFaced * 0.00001;
      tieBreaker -= ballsBowled * 0.000001;

      stats.potsPoints += (matchPts + tieBreaker);
    });
  };

  updatePlayerStats(tour.teamA);
  updatePlayerStats(tour.teamB);

  // 4. Update match object
  match.state = 'COMPLETED';
  match.winner = winnerKey;
  match.resultText = resultText;

  // 5. Check Progression
  if (match.isPlayoff) {
    const q = tri.config.q;
    if (match.isFinal) {
      tri.state = 'FINISHED';
    } else {
      if (q === 3 && match.isQualifier) {
        const finalMatch = tri.matches.find(m => m.isFinal);
        if (finalMatch) {
          finalMatch.team2Key = winnerKey;
        }
      } else if (q === 4 && match.isSemi) {
        const sfMatches = tri.matches.filter(m => m.isSemi);
        const allSfDone = sfMatches.every(m => m.state === 'COMPLETED');
        if (allSfDone) {
          const finalMatch = tri.matches.find(m => m.isFinal);
          if (finalMatch) {
            // Find which matches they correspond to
            finalMatch.team1Key = sfMatches[0].winner;
            finalMatch.team2Key = sfMatches[1].winner;
          }
        }
      }
    }
  } else {
    // Check if all group stage matches are completed
    const groupMatchesDone = tri.matches.filter(m => !m.isPlayoff).every(m => m.state === 'COMPLETED');
    if (groupMatchesDone) {
      preparePlayoffs(tri);
    }
  }

  saveState();
  return { match, tri };
}

function giveFreeWin(chatId, winnerKeyOverride) {
  const tri = getTriSeries(chatId);
  if (!tri) return { success: false, error: 'Tournament not found.' };

  const matchNum = tri.currentMatchNum;
  if (!matchNum) return { success: false, error: 'No active match index found.' };

  const match = tri.matches.find(m => m.num === matchNum);
  if (!match || match.state !== 'PLAYING') return { success: false, error: 'Specified match is not active.' };

  // If there's an active tour running, delete it
  const activeT = [...tourManager.getAllTours()].find(t => t.triSeriesId === tri.id && t.triMatchNum === matchNum);
  const res = recordMatchEnd(chatId, matchNum, activeT || { teamA: { name: tri[match.team1Key].name }, teamB: { name: tri[match.team2Key].name } }, winnerKeyOverride);
  
  if (activeT) {
    tourManager.deleteTour(activeT.id);
  }

  saveState();
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
    potsPoints: s.potsPoints || 0
  }));

  if (players.length === 0) return null;

  const mostRuns = [...players].sort((a, b) => b.runs - a.runs)[0];
  const mostWickets = [...players].sort((a, b) => b.wickets - a.wickets)[0];
  const pots = [...players].sort((a, b) => b.potsPoints - a.potsPoints)[0];

  return { pots, mostRuns, mostWickets };
}

function addPlayerToRosterForce(chatId, user, teamKey) {
  const tri = getTriSeries(chatId);
  if (!tri) return false;
  
  const team = tri[teamKey];
  if (!team) return false;
  
  const userIdStr = user.id.toString();
  if (team.players.some(p => p.id.toString() === userIdStr)) return true; // already in team
  
  // Remove from any other team first
  getTeamKeys(tri).forEach(key => {
    const t = tri[key];
    const idx = t.players.findIndex(p => p.id.toString() === userIdStr);
    if (idx !== -1) {
      t.players.splice(idx, 1);
      if (t.captainId?.toString() === userIdStr) {
        t.captainId = t.players.length > 0 ? t.players[0].id : null;
      }
    }
  });
  
  team.players.push({
    id: user.id,
    first_name: user.first_name,
    username: user.username || ''
  });
  userTriMap.set(userIdStr, chatId.toString());
  
  if (!team.captainId) {
    team.captainId = user.id;
  }
  saveState();
  return true;
}

function removePlayerFromRosterForce(chatId, playerId) {
  const tri = getTriSeries(chatId);
  if (!tri) return false;
  
  let removed = false;
  getTeamKeys(tri).forEach(key => {
    const team = tri[key];
    const idx = team.players.findIndex(p => p.id.toString() === playerId.toString());
    if (idx !== -1) {
      team.players.splice(idx, 1);
      userTriMap.delete(playerId.toString());
      if (team.captainId?.toString() === playerId.toString()) {
        team.captainId = team.players.length > 0 ? team.players[0].id : null;
      }
      removed = true;
    }
  });
  saveState();
  return removed;
}

function getAllTriSeries() {
  return Array.from(triSeriesMap.values());
}

// Load state immediately on startup
loadState();

module.exports = {
  createTriSeries, getTriSeries, getUserTriSeries, deleteTriSeries,
  joinTeam, appointCaptain, renameTeam, removePlayer,
  setOvers, setWickets, startMatch, recordMatchEnd, giveFreeWin,
  calculateAwards, getStandingsSorted, getAllTriSeries,
  addPlayerToRosterForce, removePlayerFromRosterForce,
  createTeam, removeTeam, setQ, getTeamKeys, startTournament,
  saveState
};
