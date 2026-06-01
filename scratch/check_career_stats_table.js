const dotenv = require('dotenv');
dotenv.config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
  const { data, error } = await supabase.from('cricket_career_stats').select('*').limit(1);
  console.log("cricket_career_stats query result - Data:", data, "Error:", error);
}
check();
