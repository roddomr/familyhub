import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zltocuccoirckirzrdzs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsdG9jdWNjb2lyY2tpcnpyZHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NDQ0NjcsImV4cCI6MjA3MTQyMDQ2N30.QfJrj39E_V4Ey1cqaHpgdzA95F0OpsJSsm104vlYGgM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllRecentLogs() {
  console.log('🔍 Checking ALL recent logs (last 10 minutes)...\n');
  
  const { data: logs, error: logsError } = await supabase
    .from('logs')
    .select('*')
    .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(100);
    
  if (logsError) {
    console.error('❌ Error querying logs:', logsError);
  } else {
    console.log(`📋 Found ${logs?.length || 0} logs in last 10 minutes:`);
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
      console.log(`     📂 Module: ${log.module}/${log.action} | Source: ${log.source}`);
      if (log.details) {
        try {
          const details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
          console.log(`     📋 Details:`);
          console.log(JSON.stringify(details, null, 6));
        } catch (e) {
          console.log(`     📋 Details (raw): ${log.details}`);
        }
      }
      if (log.error_code) {
        console.log(`     ❌ Error Code: ${log.error_code}`);
      }
      console.log('');
    });
  }
}

checkAllRecentLogs().catch(console.error);