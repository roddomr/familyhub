import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zltocuccoirckirzrdzs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsdG9jdWNjb2lyY2tpcnpyZHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NDQ0NjcsImV4cCI6MjA3MTQyMDQ2N30.QfJrj39E_V4Ey1cqaHpgdzA95F0OpsJSsm104vlYGgM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFinanceLogs() {
  console.log('🔍 Checking finance-related logs...\n');
  
  // Check all logs with finance module (last 5 minutes)
  const { data: logs, error: logsError } = await supabase
    .from('logs')
    .select('*')
    .or('module.ilike.%finance%,action.ilike.%transaction%,action.ilike.%account%,message.ilike.%transaction%,message.ilike.%account%')
    .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(50);
    
  if (logsError) {
    console.error('❌ Error querying logs:', logsError);
  } else {
    console.log(`📋 Found ${logs?.length || 0} finance-related logs:`);
    logs?.forEach((log, index) => {
      const date = new Date(log.created_at);
      const dateStr = date.getFullYear() + '-' + 
                     String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                     String(date.getDate()).padStart(2, '0');
      const timeStr = String(date.getHours()).padStart(2, '0') + ':' + 
                     String(date.getMinutes()).padStart(2, '0') + ':' + 
                     String(date.getSeconds()).padStart(2, '0');
      
      console.log(`  ${index + 1}. [${log.level.toUpperCase()}] ${log.message}`);
      console.log(`     📅 ${dateStr} ⏰ ${timeStr}`);
      console.log(`     📂 Module: ${log.module}/${log.action}`);
      if (log.details) {
        try {
          const details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
          console.log(`     📋 Details:`);
          console.log(JSON.stringify(details, null, 8));
        } catch (e) {
          console.log(`     📋 Details (raw): ${log.details}`);
        }
      }
      if (log.error_code) {
        console.log(`     ❌ Error Code: ${log.error_code}`);
      }
      if (log.stack_trace) {
        console.log(`     📊 Stack: ${log.stack_trace}`);
      }
      console.log('');
    });
  }
  
  // Also check all logs from last 5 minutes
  console.log('\n🔍 All logs from last 5 minutes...\n');
  
  const { data: todayLogs, error: todayError } = await supabase
    .from('logs')
    .select('*')
    .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(50);
    
  if (todayError) {
    console.error('❌ Error querying today logs:', todayError);
  } else {
    console.log(`📋 Found ${todayLogs?.length || 0} logs from last 5 minutes:`);
    todayLogs?.forEach((log, index) => {
      const date = new Date(log.created_at);
      const dateStr = date.getFullYear() + '-' + 
                     String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                     String(date.getDate()).padStart(2, '0');
      const timeStr = String(date.getHours()).padStart(2, '0') + ':' + 
                     String(date.getMinutes()).padStart(2, '0') + ':' + 
                     String(date.getSeconds()).padStart(2, '0');
      
      console.log(`  ${index + 1}. [${log.level.toUpperCase()}] ${log.message}`);
      console.log(`     📅 ${dateStr} ⏰ ${timeStr}`);
      console.log(`     📂 Module: ${log.module}/${log.action}`);
      console.log('');
    });
  }
}

checkFinanceLogs().catch(console.error);