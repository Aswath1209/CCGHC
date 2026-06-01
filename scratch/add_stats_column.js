const dotenv = require('dotenv');
dotenv.config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function alter() {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: 'ALTER TABLE cricket_users ADD COLUMN IF NOT EXISTS career_stats jsonb;' });
    console.log("RPC Result - Data:", data, "Error:", error);
  } catch (e) {
    console.error("Exception:", e.message);
  }
}
alter();
