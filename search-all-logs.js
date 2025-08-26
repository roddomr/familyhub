import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zltocuccoirckirzrdzs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsdG9jdWNjb2lyY2tpcnpyZHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NDQ0NjcsImV4cCI6MjA3MTQyMDQ2N30.QfJrj39E_V4Ey1cqaHpgdzA95F0OpsJSsm104vlYGgM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function searchAllLogs() {
  console.log('🔍 COMPREHENSIVE LOG SEARCH...\n');
  
  // 1. Get total count of logs
  const { count, error: countError } = await supabase
    .from('logs')
    .select('*', { count: 'exact', head: true });
    
  if (countError) {
    console.error('❌ Error counting logs:', countError);
  } else {
    console.log(`📊 Total logs in database: ${count}\n`);
  }
  
  // 2. Get last 50 logs (no time filter)
  console.log('📋 Last 50 logs in database:');
  const { data: allLogs, error: allError } = await supabase
    .from('logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
    
  if (allError) {
    console.error('❌ Error getting all logs:', allError);
  } else {
    console.log(`Found ${allLogs?.length || 0} logs:`);
    allLogs?.forEach((log, index) => {
      const date = new Date(log.created_at);
      console.log(`  ${index + 1}. [${log.level}] ${log.message.substring(0, 80)}${log.message.length > 80 ? '...' : ''}`);
      console.log(`     📅 ${date.toLocaleDateString()} ⏰ ${date.toLocaleTimeString()}`);
      console.log(`     📂 ${log.module}/${log.action} | Source: ${log.source || 'null'}`);
      if (log.error_code) console.log(`     ❌ ${log.error_code}`);
      console.log('');
    });
  }
  
  // 3. Search specifically for finance-related logs
  console.log('\n🔍 FINANCE-SPECIFIC SEARCH:');
  const { data: financeLogs, error: financeError } = await supabase
    .from('logs')
    .select('*')
    .or('module.eq.finance,action.ilike.%account%,action.ilike.%transaction%,message.ilike.%transaction%,message.ilike.%account%,message.ilike.%balance%')
    .order('created_at', { ascending: false })
    .limit(20);
    
  if (financeError) {
    console.error('❌ Error getting finance logs:', financeError);
  } else {
    console.log(`Found ${financeLogs?.length || 0} finance logs:`);
    financeLogs?.forEach((log, index) => {
      const date = new Date(log.created_at);
      console.log(`  ${index + 1}. [${log.level}] ${log.message}`);
      console.log(`     📅 ${date.toLocaleDateString()} ⏰ ${date.toLocaleTimeString()}`);
      console.log(`     📂 ${log.module}/${log.action}`);
      if (log.details) {
        try {
          const details = JSON.parse(log.details);
          console.log(`     📋 Details:`, details);
        } catch (e) {
          console.log(`     📋 Details: ${log.details}`);
        }
      }
      console.log('');
    });
  }
  
  // 4. Search for error logs
  console.log('\n🔍 ERROR LOGS:');
  const { data: errorLogs, error: errorError } = await supabase
    .from('logs')
    .select('*')
    .eq('level', 'error')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (errorError) {
    console.error('❌ Error getting error logs:', errorError);
  } else {
    console.log(`Found ${errorLogs?.length || 0} error logs:`);
    errorLogs?.forEach((log, index) => {
      const date = new Date(log.created_at);
      console.log(`  ${index + 1}. [${log.level}] ${log.message}`);
      console.log(`     📅 ${date.toLocaleDateString()} ⏰ ${date.toLocaleTimeString()}`);
      console.log(`     📂 ${log.module}/${log.action} | Code: ${log.error_code}`);
      console.log('');
    });
  }
}

searchAllLogs().catch(console.error);