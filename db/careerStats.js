const fs = require('fs');
const path = require('path');
const sb = require('./supabase');

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

async function getStats(userId) {
    const key = String(userId);
    if (sb.supabase) {
        try {
            const { data, error } = await sb.supabase
                .from('cricket_career_stats')
                .select('*')
                .eq('user_id', userId)
                .single();
            if (error && error.code !== 'PGRST116') {
                console.error("Supabase getStats error:", error);
            }
            if (data) {
                return {
                    runs: data.runs || 0,
                    balls_faced: data.balls_faced || 0,
                    wickets: data.wickets || 0,
                    runs_conceded: data.runs_conceded || 0,
                    balls_bowled: data.balls_bowled || 0,
                    fours: data.fours || 0,
                    sixes: data.sixes || 0,
                    motm: data.motm || 0,
                    dismissals: data.dismissals || 0,
                    wins: data.wins || 0,
                    losses: data.losses || 0,
                    fifties: data.fifties || 0,
                    centuries: data.centuries || 0,
                    threew: data.threew || 0,
                    fivew: data.fivew || 0
                };
            }
        } catch (e) {
            console.error("Failed to fetch stats from Supabase, falling back to local JSON:", e);
        }
    }

    // Local JSON Fallback
    const data = readStats();
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
            losses: 0,
            fifties: 0,
            centuries: 0,
            threew: 0,
            fivew: 0
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
        losses: s.losses || 0,
        fifties: s.fifties || 0,
        centuries: s.centuries || 0,
        threew: s.threew || 0,
        fivew: s.fivew || 0
    };
}

async function incrementStats(userId, updates) {
    const key = String(userId);
    if (sb.supabase) {
        try {
            const { data: existing } = await sb.supabase
                .from('cricket_career_stats')
                .select('*')
                .eq('user_id', userId)
                .single();
                
            const current = existing || {
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
                losses: 0,
                fifties: 0,
                centuries: 0,
                threew: 0,
                fivew: 0
            };
            
            const nextStats = {
                runs: (current.runs || 0) + (updates.runs || 0),
                balls_faced: (current.balls_faced || 0) + (updates.balls_faced || 0),
                wickets: (current.wickets || 0) + (updates.wickets || 0),
                runs_conceded: (current.runs_conceded || 0) + (updates.runs_conceded || 0),
                balls_bowled: (current.balls_bowled || 0) + (updates.balls_bowled || 0),
                fours: (current.fours || 0) + (updates.fours || 0),
                sixes: (current.sixes || 0) + (updates.sixes || 0),
                motm: (current.motm || 0) + (updates.motm || 0),
                dismissals: (current.dismissals || 0) + (updates.dismissals || 0),
                wins: (current.wins || 0) + (updates.wins || 0),
                losses: (current.losses || 0) + (updates.losses || 0),
                fifties: (current.fifties || 0) + (updates.fifties || 0),
                centuries: (current.centuries || 0) + (updates.centuries || 0),
                threew: (current.threew || 0) + (updates.threew || 0),
                fivew: (current.fivew || 0) + (updates.fivew || 0)
            };
            
            const { error: upsertErr } = await sb.supabase
                .from('cricket_career_stats')
                .upsert({
                    user_id: userId,
                    first_name: updates.first_name || current.first_name || `Player ${userId}`,
                    ...nextStats
                });
                
            if (!upsertErr) {
                return nextStats;
            }
            console.error("Supabase stats upsert error:", upsertErr);
        } catch (e) {
            console.error("Failed to save stats to Supabase, falling back to local JSON:", e);
        }
    }

    // Local JSON Fallback
    const data = readStats();
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
            losses: 0,
            fifties: 0,
            centuries: 0,
            threew: 0,
            fivew: 0
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
    s.fifties = (s.fifties || 0) + (updates.fifties || 0);
    s.centuries = (s.centuries || 0) + (updates.centuries || 0);
    s.threew = (s.threew || 0) + (updates.threew || 0);
    s.fivew = (s.fivew || 0) + (updates.fivew || 0);
    writeStats(data);
    return s;
}

async function recordMatchStats(tour, motmPlayerId, winnerTeamId) {
    const processPlayerList = async (players, outPlayers, isBattingTeam, isWinnerTeam, isTie) => {
        const promises = [];
        for (const p of players) {
            if (p.originalId || p.id.toString().includes('_rebat_')) {
                continue;
            }
            const actualId = p.originalId || p.id;
            if (isNaN(Number(actualId))) continue;

            const isMotm = (motmPlayerId && (actualId === motmPlayerId || p.id === motmPlayerId));
            const runsScored = p.runs || 0;
            const wicketsTaken = p.wickets || 0;

            const updates = {
                first_name: p.first_name,
                runs: runsScored,
                balls_faced: p.balls || 0,
                fours: p.fours || 0,
                sixes: p.sixes || 0,
                wickets: wicketsTaken,
                runs_conceded: p.runsConceded || 0,
                balls_bowled: p.ballsBowled || 0,
                dismissals: outPlayers.some(id => id && id.toString() === p.id.toString()) ? 1 : 0,
                motm: isMotm ? 1 : 0,
                wins: (!isTie && isWinnerTeam) ? 1 : 0,
                losses: (!isTie && !isWinnerTeam) ? 1 : 0,
                fifties: (runsScored >= 50 && runsScored < 100) ? 1 : 0,
                centuries: (runsScored >= 100) ? 1 : 0,
                threew: (wicketsTaken >= 3 && wicketsTaken < 5) ? 1 : 0,
                fivew: (wicketsTaken >= 5) ? 1 : 0
            };

            const participated = (updates.runs > 0 || updates.balls_faced > 0 || updates.balls_bowled > 0 || updates.wickets > 0);
            if (participated || isMotm || updates.wins > 0 || updates.losses > 0) {
                promises.push(incrementStats(actualId, updates));
            }
        }
        await Promise.all(promises);
    };

    const isTie = !winnerTeamId;
    await Promise.all([
        processPlayerList(tour.teamA.players, tour.teamA.outPlayers, tour.battingTeamId === 'teamA', winnerTeamId === 'teamA', isTie),
        processPlayerList(tour.teamB.players, tour.teamB.outPlayers, tour.battingTeamId === 'teamB', winnerTeamId === 'teamB', isTie)
    ]);
}

module.exports = {
    getStats,
    incrementStats,
    recordMatchStats
};
