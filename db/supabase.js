const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log("Supabase Client Initialized for Cricket Bot");
} else {
  console.log("WARNING: Supabase URL or Key missing. Database features will fail.");
}

const INITIAL_COINS = 4000;
const DAILY_REWARD = 2000;

async function registerUser(userId, firstName) {
  if (!supabase) return { success: false, error: 'Database disabled' };
  
  const { data: existing } = await supabase.from('cricket_users').select('*').eq('user_id', userId).single();
  if (existing) {
    return { success: false, error: 'Already registered', user: existing };
  }

  const { data, error } = await supabase.from('cricket_users').insert({
    user_id: userId,
    first_name: firstName,
    coins: INITIAL_COINS,
    wins: 0,
    losses: 0
  }).select().single();

  if (error) {
    console.error("Register Error:", error);
    return { success: false, error: error.message };
  }
  
  return { success: true, user: data };
}

async function getUser(userId) {
  if (!supabase) return null;
  const { data } = await supabase.from('cricket_users').select('*').eq('user_id', userId).single();
  return data;
}

async function updateCoins(userId, amount) {
  if (!supabase) return null;
  const user = await getUser(userId);
  if (!user) return null;

  const newCoins = user.coins + amount;
  const { data, error } = await supabase.from('cricket_users').update({ coins: newCoins }).eq('user_id', userId).select().single();
  if (error) {
    console.error("Update coins error:", error);
    return null;
  }
  return data;
}

const userLocks = new Map();

async function claimDaily(userId) {
  if (!supabase) return { success: false, error: 'Database disabled' };
  
  while (userLocks.get(userId)) {
      await new Promise(resolve => setTimeout(resolve, 50));
  }
  userLocks.set(userId, true);
  
  try {
      const user = await getUser(userId);
      if (!user) return { success: false, error: 'User not found. Please /register first.' };

      const now = new Date();
      if (user.last_daily) {
        const lastClaim = new Date(user.last_daily);
        const diffHours = (now - lastClaim) / (1000 * 60 * 60);
        if (diffHours < 24) {
          return { success: false, error: 'Come back tomorrow!' };
        }
      }

  const newCoins = user.coins + DAILY_REWARD;
  const { data, error } = await supabase.from('cricket_users').update({ 
    coins: newCoins, 
    last_daily: now.toISOString() 
  }).eq('user_id', userId).select().single();

      if (error) {
        console.error("Daily claim error:", error);
        return { success: false, error: error.message };
      }

      return { success: true, user: data };
  } finally {
      userLocks.delete(userId);
  }
}

async function recordMatchEnd(winnerId, loserId, betAmount) {
  if (!supabase) return;

  // Update Winner
  const winner = await getUser(winnerId);
  if (winner) {
    await supabase.from('cricket_users').update({ 
      wins: winner.wins + 1,
      coins: winner.coins + (betAmount > 0 ? betAmount * 2 : 0) // if 100 bet, winner gets 200 (100 returned + 100 profit)
    }).eq('user_id', winnerId);
  }

  // Update Loser
  const loser = await getUser(loserId);
  if (loser) {
    await supabase.from('cricket_users').update({
      losses: loser.losses + 1,
      coins: loser.coins - betAmount
    }).eq('user_id', loserId);
  }
}

async function getLeaderboard(type = 'coins') {
  if (!supabase) return [];
  // type is 'coins' or 'wins'
  const { data } = await supabase.from('cricket_users')
    .select('*')
    .order(type, { ascending: false })
    .limit(10);
  return data;
}

module.exports = {
  supabase,
  INITIAL_COINS,
  DAILY_REWARD,
  registerUser,
  getUser,
  updateCoins,
  claimDaily,
  recordMatchEnd,
  getLeaderboard
};
