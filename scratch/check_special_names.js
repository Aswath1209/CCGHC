require('dotenv').config();
const { supabase } = require('../db/supabase');

async function check() {
  if (!supabase) {
    console.error("Supabase client is not initialized.");
    return;
  }
  
  const ids = ['7239756972', '13115564307', '8138366453'];
  console.log(`Checking database users for IDs: ${ids.join(', ')}...`);
  
  const { data, error } = await supabase
    .from('cricket_users')
    .select('user_id, first_name')
    .in('user_id', ids);
    
  if (error) {
    console.error("Database error (cricket_users):", error);
  }
  
  const { data: pData, error: pError } = await supabase
    .from('profiles')
    .select('user_id, first_name')
    .in('user_id', ids);

  if (pError) {
    console.error("Database error (profiles):", pError);
  }
  
  console.log("cricket_users Results:");
  if (data && data.length > 0) {
    data.forEach(user => {
      console.log(`ID: ${user.user_id} | Name: "${user.first_name}"`);
      const codes = [...user.first_name].map(c => `U+${c.codePointAt(0).toString(16).toUpperCase()}`).join(' ');
      console.log(`  Codepoints: ${codes}`);
    });
  } else {
    console.log("No users found in 'cricket_users' table.");
  }

  console.log("\nprofiles Results:");
  if (pData && pData.length > 0) {
    pData.forEach(user => {
      console.log(`ID: ${user.user_id} | Name: "${user.first_name}"`);
      const codes = [...user.first_name].map(c => `U+${c.codePointAt(0).toString(16).toUpperCase()}`).join(' ');
      console.log(`  Codepoints: ${codes}`);
    });
  } else {
    console.log("No users found in 'profiles' table.");
  }
}

check();
