const fs = require('fs');
const path = require('path');

const STATS_FILE = path.join(__dirname, 'career_stats.json');

function readStats() {
    try {
        if (fs.existsSync(STATS_FILE)) {
            const content = fs.readFileSync(STATS_FILE, 'utf-8');
            return JSON.parse(content);
        }
    } catch (e) {
        console.error("Error reading career stats file:", e);
    }
    return {};
}

function writeStats(data) {
    try {
        fs.writeFileSync(STATS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
        console.error("Error writing career stats file:", e);
    }
}

function getStats(userId) {
    const data = readStats();
    const key = String(userId);
    if (!data[key]) {
        return {
            runs: 0,
            balls_faced: 0,
            wickets: 0,
            runs_conceded: 0,
            balls_bowled: 0,
            fours: 0,
            sixes: 0,
            motm: 0,
            dismissals: 0,
            wins: 0,
            losses: 0
        };
    }
    const s = data[key];
    return {
        runs: s.runs || 0,
        balls_faced: s.balls_faced || 0,
        wickets: s.wickets || 0,
        runs_conceded: s.runs_conceded || 0,
        balls_bowled: s.balls_bowled || 0,
        fours: s.fours || 0,
        sixes: s.sixes || 0,
        motm: s.motm || 0,
        dismissals: s.dismissals || 0,
        wins: s.wins || 0,
        losses: s.losses || 0
    };
}

function incrementStats(userId, updates) {
    const data = readStats();
    const key = String(userId);
    if (!data[key]) {
        data[key] = {
            runs: 0,
            balls_faced: 0,
            wickets: 0,
            runs_conceded: 0,
            balls_bowled: 0,
            fours: 0,
            sixes: 0,
            motm: 0,
            dismissals: 0,
            wins: 0,
            losses: 0
        };
    }
    const s = data[key];
    s.runs = (s.runs || 0) + (updates.runs || 0);
    s.balls_faced = (s.balls_faced || 0) + (updates.balls_faced || 0);
    s.wickets = (s.wickets || 0) + (updates.wickets || 0);
    s.runs_conceded = (s.runs_conceded || 0) + (updates.runs_conceded || 0);
    s.balls_bowled = (s.balls_bowled || 0) + (updates.balls_bowled || 0);
    s.fours = (s.fours || 0) + (updates.fours || 0);
    s.sixes = (s.sixes || 0) + (updates.sixes || 0);
    s.motm = (s.motm || 0) + (updates.motm || 0);
    s.dismissals = (s.dismissals || 0) + (updates.dismissals || 0);
    s.wins = (s.wins || 0) + (updates.wins || 0);
    s.losses = (s.losses || 0) + (updates.losses || 0);
    writeStats(data);
    return s;
}

function recordMatchStats(tour, motmPlayerId, winnerTeamId) {
    const processPlayerList = (players, outPlayers, isBattingTeam, isWinnerTeam, isTie) => {
        players.forEach(p => {
            const actualId = p.originalId || p.id;
            if (isNaN(Number(actualId))) return;

            const isMotm = (motmPlayerId && (actualId === motmPlayerId || p.id === motmPlayerId));

            const updates = {
                runs: p.runs || 0,
                balls_faced: p.balls || 0,
                fours: p.fours || 0,
                sixes: p.sixes || 0,
                wickets: p.wickets || 0,
                runs_conceded: p.runsConceded || 0,
                balls_bowled: p.ballsBowled || 0,
                dismissals: (isBattingTeam && outPlayers.includes(p.id)) ? 1 : 0,
                motm: isMotm ? 1 : 0,
                wins: (!isTie && isWinnerTeam) ? 1 : 0,
                losses: (!isTie && !isWinnerTeam) ? 1 : 0
            };

            const participated = (updates.runs > 0 || updates.balls_faced > 0 || updates.balls_bowled > 0 || updates.wickets > 0);
            if (participated || isMotm || updates.wins > 0 || updates.losses > 0) {
                incrementStats(actualId, updates);
            }
        });
    };

    const isTie = !winnerTeamId;
    processPlayerList(tour.teamA.players, tour.teamA.outPlayers, tour.battingTeamId === 'teamA', winnerTeamId === 'teamA', isTie);
    processPlayerList(tour.teamB.players, tour.teamB.outPlayers, tour.battingTeamId === 'teamB', winnerTeamId === 'teamB', isTie);
}

module.exports = {
    getStats,
    incrementStats,
    recordMatchStats
};
