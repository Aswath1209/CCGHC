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

function backfillLegacyStats(s) {
    // 1. Batting Innings
    if ((s.batting_innings === 0 || !s.batting_innings) && (s.runs > 0 || s.balls_faced > 0)) {
        s.batting_innings = Math.max(1, s.dismissals || 0);
    } else {
        s.batting_innings = s.batting_innings || 0;
    }

    // 2. Bowling Innings
    if ((s.bowling_innings === 0 || !s.bowling_innings) && s.balls_bowled > 0) {
        s.bowling_innings = Math.max(1, Math.round(s.balls_bowled / 6));
    } else {
        s.bowling_innings = s.bowling_innings || 0;
    }

    // Keep all other original values exactly as they are in the DB
    s.highscore = s.highscore || 0;
    s.ducks = s.ducks || 0;
    s.best_wickets = s.best_wickets || 0;
    s.best_runs_conceded = s.best_runs_conceded || 0;

    return s;
}

async function getStats(userId) {
    const key = String(userId);
    let rawStats = null;
    let isSupabase = false;

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
                rawStats = data;
                isSupabase = true;
            }
        } catch (e) {
            console.error("Failed to fetch stats from Supabase, falling back to local JSON:", e);
        }
    }

    if (!rawStats) {
        const localData = readStats();
        if (localData[key]) {
            rawStats = localData[key];
        }
    }

    if (!rawStats) {
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
            fivew: 0,
            highscore: 0,
            ducks: 0,
            best_wickets: 0,
            best_runs_conceded: 0,
            batting_innings: 0,
            bowling_innings: 0
        };
    }

    const s = {
        runs: rawStats.runs || 0,
        balls_faced: rawStats.balls_faced || 0,
        wickets: rawStats.wickets || 0,
        runs_conceded: rawStats.runs_conceded || 0,
        balls_bowled: rawStats.balls_bowled || 0,
        fours: rawStats.fours || 0,
        sixes: rawStats.sixes || 0,
        motm: rawStats.motm || 0,
        dismissals: rawStats.dismissals || 0,
        wins: rawStats.wins || 0,
        losses: rawStats.losses || 0,
        fifties: rawStats.fifties || 0,
        centuries: rawStats.centuries || 0,
        threew: rawStats.threew || 0,
        fivew: rawStats.fivew || 0,
        highscore: rawStats.highscore || 0,
        ducks: rawStats.ducks || 0,
        best_wickets: rawStats.best_wickets || 0,
        best_runs_conceded: rawStats.best_runs_conceded || 0,
        batting_innings: rawStats.batting_innings || 0,
        bowling_innings: rawStats.bowling_innings || 0
    };

    const needsBackfill = (
        (s.runs > 0 || s.balls_faced > 0) && s.batting_innings === 0
    ) || (
        s.balls_bowled > 0 && s.bowling_innings === 0
    );

    if (needsBackfill) {
        backfillLegacyStats(s);
        
        if (isSupabase) {
            sb.supabase.from('cricket_career_stats')
                .update({
                    batting_innings: s.batting_innings,
                    bowling_innings: s.bowling_innings
                })
                .eq('user_id', userId)
                .then(({ error }) => {
                    if (error) console.error("Error saving backfilled stats to Supabase:", error);
                });
        } else {
            const localData = readStats();
            localData[key] = {
                ...localData[key],
                batting_innings: s.batting_innings,
                bowling_innings: s.bowling_innings
            };
            writeStats(localData);
        }
    }

    return s;
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
                fivew: 0,
                highscore: 0,
                ducks: 0,
                best_wickets: 0,
                best_runs_conceded: 0,
                batting_innings: 0,
                bowling_innings: 0
            };
            
            const currentBestW = current.best_wickets || 0;
            const currentBestR = current.best_runs_conceded || 0;
            const matchW = updates.best_wickets || 0;
            const matchR = updates.best_runs_conceded || 0;
            const bowledThisMatch = (updates.balls_bowled || 0) > 0;

            let nextBestW = currentBestW;
            let nextBestR = currentBestR;

            if (bowledThisMatch) {
                if (currentBestW === 0 && currentBestR === 0) {
                    nextBestW = matchW;
                    nextBestR = matchR;
                } else if (matchW > currentBestW) {
                    nextBestW = matchW;
                    nextBestR = matchR;
                } else if (matchW === currentBestW && matchR < currentBestR) {
                    nextBestW = matchW;
                    nextBestR = matchR;
                }
            }

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
                fivew: (current.fivew || 0) + (updates.fivew || 0),
                highscore: Math.max(current.highscore || 0, updates.highscore || 0),
                ducks: (current.ducks || 0) + (updates.ducks || 0),
                best_wickets: nextBestW,
                best_runs_conceded: nextBestR,
                batting_innings: (current.batting_innings || 0) + (updates.batting_innings || 0),
                bowling_innings: (current.bowling_innings || 0) + (updates.bowling_innings || 0)
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
            fivew: 0,
            highscore: 0,
            ducks: 0,
            best_wickets: 0,
            best_runs_conceded: 0,
            batting_innings: 0,
            bowling_innings: 0
        };
    }
    const s = data[key];
    
    const currentBestW = s.best_wickets || 0;
    const currentBestR = s.best_runs_conceded || 0;
    const matchW = updates.best_wickets || 0;
    const matchR = updates.best_runs_conceded || 0;
    const bowledThisMatch = (updates.balls_bowled || 0) > 0;

    let nextBestW = currentBestW;
    let nextBestR = currentBestR;

    if (bowledThisMatch) {
        if (currentBestW === 0 && currentBestR === 0) {
            nextBestW = matchW;
            nextBestR = matchR;
        } else if (matchW > currentBestW) {
            nextBestW = matchW;
            nextBestR = matchR;
        } else if (matchW === currentBestW && matchR < currentBestR) {
            nextBestW = matchW;
            nextBestR = matchR;
        }
    }

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
    s.highscore = Math.max(s.highscore || 0, updates.highscore || 0);
    s.ducks = (s.ducks || 0) + (updates.ducks || 0);
    s.best_wickets = nextBestW;
    s.best_runs_conceded = nextBestR;
    s.batting_innings = (s.batting_innings || 0) + (updates.batting_innings || 0);
    s.bowling_innings = (s.bowling_innings || 0) + (updates.bowling_innings || 0);
    
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
            const hasOut = outPlayers.some(id => id && id.toString() === p.id.toString());

            const updates = {
                first_name: p.first_name,
                runs: runsScored,
                balls_faced: p.balls || 0,
                fours: p.fours || 0,
                sixes: p.sixes || 0,
                wickets: wicketsTaken,
                runs_conceded: p.runsConceded || 0,
                balls_bowled: p.ballsBowled || 0,
                dismissals: hasOut ? 1 : 0,
                motm: isMotm ? 1 : 0,
                wins: (!isTie && isWinnerTeam) ? 1 : 0,
                losses: (!isTie && !isWinnerTeam) ? 1 : 0,
                fifties: (runsScored >= 50 && runsScored < 100) ? 1 : 0,
                centuries: (runsScored >= 100) ? 1 : 0,
                threew: (wicketsTaken >= 3 && wicketsTaken < 5) ? 1 : 0,
                fivew: (wicketsTaken >= 5) ? 1 : 0,
                highscore: runsScored,
                ducks: (runsScored === 0 && hasOut) ? 1 : 0,
                best_wickets: wicketsTaken,
                best_runs_conceded: p.runsConceded || 0,
                batting_innings: (p.balls > 0 || runsScored > 0) ? 1 : 0,
                bowling_innings: (p.ballsBowled > 0) ? 1 : 0
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

async function getTopLists() {
    let statsList = [];
    if (sb.supabase) {
        try {
            const { data, error } = await sb.supabase
                .from('cricket_career_stats')
                .select('*');
            if (!error && data) {
                statsList = data;
            }
        } catch (e) {
            console.error("Supabase getTopLists error, falling back to local JSON:", e);
        }
    }
    
    if (statsList.length === 0) {
        const localData = readStats();
        statsList = Object.entries(localData).map(([userId, stats]) => ({
            user_id: userId,
            first_name: stats.first_name || `Player ${userId}`,
            ...stats
        }));
    }

    // Apply backfill to all stats in the list
    statsList = statsList.map(s => backfillLegacyStats({
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
        fivew: s.fivew || 0,
        highscore: s.highscore || 0,
        ducks: s.ducks || 0,
        best_wickets: s.best_wickets || 0,
        best_runs_conceded: s.best_runs_conceded || 0,
        batting_innings: s.batting_innings || 0,
        bowling_innings: s.bowling_innings || 0,
        first_name: s.first_name,
        user_id: s.user_id
    }));

    const topRuns = [...statsList].sort((a, b) => (b.runs || 0) - (a.runs || 0)).slice(0, 10);
    const topWickets = [...statsList].sort((a, b) => (b.wickets || 0) - (a.wickets || 0)).slice(0, 10);
    const topMvps = [...statsList].sort((a, b) => (b.motm || 0) - (a.motm || 0)).slice(0, 10);
    const topDucks = [...statsList].sort((a, b) => (b.ducks || 0) - (a.ducks || 0)).slice(0, 10);
    const topHighscores = [...statsList].sort((a, b) => (b.highscore || 0) - (a.highscore || 0)).slice(0, 10);
    const topBestBowling = [...statsList]
        .filter(p => (p.best_wickets || 0) > 0)
        .sort((a, b) => {
            if ((b.best_wickets || 0) !== (a.best_wickets || 0)) {
                return (b.best_wickets || 0) - (a.best_wickets || 0);
            }
            return (a.best_runs_conceded || 0) - (b.best_runs_conceded || 0);
        })
        .slice(0, 10);

    return {
        topRuns,
        topWickets,
        topMvps,
        topDucks,
        topHighscores,
        topBestBowling
    };
}

module.exports = {
    getStats,
    incrementStats,
    recordMatchStats,
    getTopLists
};
