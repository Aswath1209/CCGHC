// In-memory store for active games and user->game mapping
const games = new Map();
const userGameMap = new Map(); // userId -> gameId

const GAME_EXPIRE_HOURS = 1;

function generateGameId() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function createGame(chatId, messageId, hostUser, bet = 0) {
  // Check if GC already has a game
  for (const g of games.values()) {
    if (g.chatId === chatId) return { success: false, error: "A match is already active in this group!" };
  }
  // Check if user is in any game
  if (userGameMap.has(hostUser.id)) return { success: false, error: "You are already in an active match!" };

  const gameId = generateGameId();
  const game = {
    id: gameId,
    chatId: chatId,
    messageId: messageId, // the GC message to edit
    state: 'WAITING',
    bet: bet,
    players: [hostUser], // [{ id, first_name }]
    tossWinnerId: null,
    tossLoserId: null,
    batsmanId: null,
    bowlerId: null,
    batChoice: null,
    bowlChoice: null,
    score1: 0,
    score2: 0,
    innings: 1,
    balls: 0,
    createdAt: Date.now(),
    halfCenturyAnnounced: false,
    centuryAnnounced: false,
  };
  games.set(gameId, game);
  userGameMap.set(hostUser.id, gameId);
  return { success: true, game };
}

function getAllGames() {
    return games.values();
}

function getGame(gameId) {
  return games.get(gameId);
}

function getUserGame(userId) {
  const gameId = userGameMap.get(userId);
  if (!gameId) return null;
  const game = games.get(gameId);
  if (!game) { userGameMap.delete(userId); return null; }
  return game;
}

function deleteGame(gameId) {
  const game = games.get(gameId);
  if (game) {
    game.players.forEach(p => userGameMap.delete(p.id));
  }
  games.delete(gameId);
}

function joinGame(gameId, user) {
  const game = games.get(gameId);
  if (!game) return { success: false, error: 'Game expired or not found.' };
  if (game.state !== 'WAITING') return { success: false, error: 'Game already started.' };
  if (game.players.some(p => p.id === user.id)) return { success: false, error: 'You are already in this game.' };
  if (userGameMap.has(user.id)) return { success: false, error: 'You are already in another match.' };

  game.players.push(user);
  game.state = 'TOSS';
  userGameMap.set(user.id, gameId);
  return { success: true, game };
}

function handleToss(gameId, userId, choice) {
  const game = games.get(gameId);
  if (!game || game.state !== 'TOSS') return null;
  if (game.players[0].id !== userId) return null; // only initiator (P1) picks

  const tossResult = Math.random() < 0.5 ? 'heads' : 'tails';
  const won = choice === tossResult;

  game.tossWinnerId = won ? game.players[0].id : game.players[1].id;
  game.tossLoserId = won ? game.players[1].id : game.players[0].id;
  game.state = 'CHOOSE';

  return { game, tossResult, winner: game.players.find(p => p.id === game.tossWinnerId) };
}

function chooseBatBowl(gameId, userId, choice) {
  const game = games.get(gameId);
  if (!game || game.state !== 'CHOOSE') return null;
  if (game.tossWinnerId !== userId) return null;

  const otherPlayerId = game.players.find(p => p.id !== userId).id;

  if (choice === 'bat') {
    game.batsmanId = userId;
    game.bowlerId = otherPlayerId;
  } else {
    game.batsmanId = otherPlayerId;
    game.bowlerId = userId;
  }

  game.state = 'PLAYING';
  return game;
}

// Called when a player sends text in DM
// Returns { success, waiting?, ...roundResult }
function submitPlay(gameId, userId, rawInput) {
  const game = games.get(gameId);
  if (!game || game.state !== 'PLAYING') return { success: false, error: 'Invalid state' };
  if (userId !== game.batsmanId && userId !== game.bowlerId) return { success: false, error: 'Not in game' };

  const isBatsman = userId === game.batsmanId;

  // Validate input
  const BATSMAN_OPTIONS = new Set(['0','1','2','3','4','6']);
  const BOWLER_MAP = { 'rs':'0', 'bouncer':'1', 'yorker':'2', 'short':'3', 'slower':'4', 'knuckle':'6' };

  if (isBatsman) {
    if (!BATSMAN_OPTIONS.has(rawInput)) return { success: false, error: 'Invalid shot! Send one of: 0, 1, 2, 3, 4, 6' };
    if (game.batChoice !== null) return { success: false, error: 'Already sent your shot for this ball.' };
    game.batChoice = rawInput;
  } else {
    const mapped = BOWLER_MAP[rawInput.toLowerCase()];
    if (!mapped) return { success: false, error: 'Invalid delivery! Send one of: RS, Bouncer, Yorker, Short, Slower, Knuckle' };
    if (game.bowlChoice !== null) return { success: false, error: 'Already sent your delivery for this ball.' };
    game.bowlChoice = rawInput; // store display name
    game._bowlNum = mapped;     // store numeric
  }

  // If not both ready, wait
  if (game.batChoice === null || game.bowlChoice === null) {
    return { success: true, waiting: true };
  }

  // Both played — resolve
  const batNum = parseInt(game.batChoice);
  const bowlNum = parseInt(game._bowlNum);
  const bowlStr = game.bowlChoice;
  const batStr = game.batChoice;

  game.batChoice = null;
  game.bowlChoice = null;
  game._bowlNum = null;
  game.balls++;

  const isWicket = batNum === bowlNum;

  let roundResult = {
    game, batNum, bowlNum, batStr, bowlStr,
    ballsThisRound: game.balls,
    originalBowlerId: game.bowlerId,
    isWicket,
    inningsEnded: false,
    matchEnded: false,
    winnerId: null,
    loserId: null,
    tie: false,
    hit50: false,
    hit100: false,
  };

  if (game.innings === 1) {
    if (isWicket) {
      game.innings = 2;
      game.balls = 0;
      const tmp = game.batsmanId;
      game.batsmanId = game.bowlerId;
      game.bowlerId = tmp;
      game.halfCenturyAnnounced = false;
      game.centuryAnnounced = false;
      roundResult.inningsEnded = true;
    } else {
      game.score1 += batNum;
      if (game.score1 >= 50 && !game.halfCenturyAnnounced) { game.halfCenturyAnnounced = true; roundResult.hit50 = true; }
      if (game.score1 >= 100 && !game.centuryAnnounced)    { game.centuryAnnounced = true;      roundResult.hit100 = true; }
    }
  } else {
    if (isWicket) {
      game.state = 'COMPLETED';
      roundResult.matchEnded = true;
      if (game.score2 > game.score1)      { roundResult.winnerId = game.batsmanId; roundResult.loserId = game.bowlerId; }
      else if (game.score2 < game.score1) { roundResult.winnerId = game.bowlerId;  roundResult.loserId = game.batsmanId; }
      else                                { roundResult.tie = true; }
    } else {
      game.score2 += batNum;
      if (game.score2 >= 50 && !game.halfCenturyAnnounced) { game.halfCenturyAnnounced = true; roundResult.hit50 = true; }
      if (game.score2 >= 100 && !game.centuryAnnounced)    { game.centuryAnnounced = true;      roundResult.hit100 = true; }
      if (game.score2 > game.score1) {
        game.state = 'COMPLETED';
        roundResult.matchEnded = true;
        roundResult.winnerId = game.batsmanId;
        roundResult.loserId = game.bowlerId;
      }
    }
  }

  return { success: true, ...roundResult };
}

function cleanupExpiredGames() {
  const now = Date.now();
  for (const [key, game] of games.entries()) {
    if (now - game.createdAt > GAME_EXPIRE_HOURS * 3600000) {
      game.players.forEach(p => userGameMap.delete(p.id));
      games.delete(key);
    }
  }
}
setInterval(cleanupExpiredGames, 3600000);

module.exports = {
  createGame, getGame, getUserGame, deleteGame, joinGame,
  handleToss, chooseBatBowl, submitPlay, getAllGames
};
