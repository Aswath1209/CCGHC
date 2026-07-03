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
    if (firstName && existing.first_name !== firstName) {
      await supabase.from('cricket_users').update({ first_name: firstName }).eq('user_id', userId);
      existing.first_name = firstName;
    }
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

async function getUser(userId, currentFirstName = null) {
  if (!supabase) return null;
  const { data } = await supabase.from('cricket_users').select('*').eq('user_id', userId).single();
  if (data && currentFirstName && data.first_name !== currentFirstName) {
    // Asynchronously update name in the background
    supabase.from('cricket_users').update({ first_name: currentFirstName }).eq('user_id', userId)
      .then(() => {
        console.log(`Updated user ${userId} name to "${currentFirstName}"`);
      })
      .catch(err => console.error("Error updating user first name:", err));
    data.first_name = currentFirstName;
  }
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

async function claimDaily(userId, currentFirstName = null) {
  if (!supabase) return { success: false, error: 'Database disabled' };
  
  while (userLocks.get(userId)) {
      await new Promise(resolve => setTimeout(resolve, 50));
  }
  userLocks.set(userId, true);
  
  try {
      const user = await getUser(userId, currentFirstName);
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
    .gte('user_id', 0)
    .order(type, { ascending: false })
    .limit(10);
  return data;
}

// Database-backed system configuration utilities
async function getSystemData(systemId, defaultVal = []) {
  if (!supabase) return defaultVal;
  try {
    const { data, error } = await supabase
      .from('cricket_users')
      .select('first_name')
      .eq('user_id', systemId)
      .single();
      
    if (error || !data || !data.first_name) {
      return defaultVal;
    }
    return JSON.parse(data.first_name);
  } catch (e) {
    console.error(`Error loading system data for ${systemId}:`, e);
    return defaultVal;
  }
}

async function saveSystemData(systemId, value) {
  if (!supabase) return;
  try {
    await supabase.from('cricket_users').upsert({
      user_id: systemId,
      first_name: JSON.stringify(value),
      coins: 0,
      wins: 0,
      losses: 0
    });
  } catch (e) {
    console.error(`Error saving system data for ${systemId}:`, e);
  }
}

async function recordGroupInteraction(chatId) {
  const groups = await getSystemData(-1);
  if (!groups.includes(chatId)) {
    groups.push(chatId);
    await saveSystemData(-1, groups);
  }
}

async function getAllGroupIds() {
  return getSystemData(-1);
}

async function getAllUserIds() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.from('cricket_users').select('user_id').gte('user_id', 0);
    if (error) {
      console.error("Error fetching all user IDs:", error);
      return [];
    }
    return (data || []).map(u => u.user_id);
  } catch (e) {
    console.error("Exception in getAllUserIds:", e);
    return [];
  }
}

async function saveBroadcastMessage(chatId, messageId) {
  const messages = await getSystemData(-2);
  messages.push({ chatId: Number(chatId), messageId: Number(messageId) });
  await saveSystemData(-2, messages);
}

async function getLastBroadcastMessages() {
  return getSystemData(-2);
}

async function clearLastBroadcastMessages() {
  await saveSystemData(-2, []);
}

async function getUserRank(userId, type = 'coins') {
  if (!supabase) return { rank: 0, total: 0, value: 0 };
  try {
    const { data: user, error: userErr } = await supabase
      .from('cricket_users')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    if (userErr || !user) {
      return { rank: 0, total: 0, value: 0 };
    }
    
    const value = user[type] || 0;
    
    const { count: higherCount } = await supabase
      .from('cricket_users')
      .select('user_id', { count: 'exact', head: true })
      .gte('user_id', 0)
      .gt(type, value);
      
    const { count: totalCount } = await supabase
      .from('cricket_users')
      .select('user_id', { count: 'exact', head: true })
      .gte('user_id', 0);
      
    return {
      rank: (higherCount || 0) + 1,
      total: totalCount || 0,
      value: value
    };
  } catch (e) {
    console.error("Error in getUserRank:", e);
    return { rank: 0, total: 0, value: 0 };
  }
}

async function getCardCooldown(userId) {
  const cooldowns = await getSystemData(-3, {});
  return cooldowns[userId] || 0;
}

async function setCardCooldown(userId, timestamp) {
  const cooldowns = await getSystemData(-3, {});
  cooldowns[userId] = timestamp;
  
  // Clean up old cooldowns older than 30 minutes to keep the row small
  const now = Date.now();
  const THIRTY_MINUTES = 30 * 60 * 1000;
  for (const uid in cooldowns) {
    if (now - cooldowns[uid] > THIRTY_MINUTES) {
      delete cooldowns[uid];
    }
  }
  
  await saveSystemData(-3, cooldowns);
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
  getLeaderboard,
  getUserRank,
  recordGroupInteraction,
  getAllGroupIds,
  getAllUserIds,
  saveBroadcastMessage,
  getLastBroadcastMessages,
  clearLastBroadcastMessages,
  getCardCooldown,
  setCardCooldown
};
