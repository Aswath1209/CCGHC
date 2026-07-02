const activeGames = new Map();

const ZONES = [
  { id: 1, name: "Third Man" },
  { id: 2, name: "Cover" },
  { id: 3, name: "Long-off" },
  { id: 4, name: "Point" },
  { id: 5, name: "Straight Drive" },
  { id: 6, name: "Mid-on" },
  { id: 7, name: "Fine Leg" },
  { id: 8, name: "Mid-wicket" },
  { id: 9, name: "Long-on" }
];

const ZONE_TYPES = {
  JACKPOT: { type: "jackpot", emoji: "⭐", label: "Jackpot (5x)", multiplier: 5 },
  GAP: { type: "gap", emoji: "🟢", label: "Gap (2x)", multiplier: 2 },
  SINGLE: { type: "single", emoji: "🟡", label: "Single (1x)", multiplier: 1 },
  FIELDER: { type: "fielder", emoji: "🔴", label: "Fielder (0x)", multiplier: 0 }
};

function createGame(userId, betAmount) {
  const gameId = Math.random().toString(36).substring(2, 9);
  
  // Create 9 cards (1 Jackpot, 3 Gaps, 1 Single, 4 Fielders)
  const boardPool = [
    ZONE_TYPES.JACKPOT,
    ZONE_TYPES.GAP, ZONE_TYPES.GAP, ZONE_TYPES.GAP,
    ZONE_TYPES.SINGLE,
    ZONE_TYPES.FIELDER, ZONE_TYPES.FIELDER, ZONE_TYPES.FIELDER, ZONE_TYPES.FIELDER
  ];

  // Fisher-Yates Shuffle
  for (let i = boardPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [boardPool[i], boardPool[j]] = [boardPool[j], boardPool[i]];
  }

  const board = ZONES.map((zone, idx) => ({
    ...zone,
    type: boardPool[idx]
  }));

  const game = {
    gameId,
    userId,
    betAmount,
    board,
    createdAt: Date.now()
  };

  activeGames.set(gameId, game);
  return game;
}

function getGame(gameId) {
  return activeGames.get(gameId);
}

function deleteGame(gameId) {
  activeGames.delete(gameId);
}

// Cleanup stale games (older than 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [gameId, game] of activeGames.entries()) {
    if (now - game.createdAt > 10 * 60 * 1000) {
      activeGames.delete(gameId);
    }
  }
}, 5 * 60 * 1000);

module.exports = {
  createGame,
  getGame,
  deleteGame,
  ZONES
};
