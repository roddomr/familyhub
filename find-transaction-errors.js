import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zltocuccoirckirzrdzs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsdG9jdWNjb2lyY2tpcnpyZHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NDQ0NjcsImV4cCI6MjA3MTQyMDQ2N30.QfJrj39E_V4Ey1cqaHpgdzA95F0OpsJSsm104vlYGgM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function findTransactionErrors() {
  console.log('🔍 SEARCHING FOR TRANSACTION ERRORS...\n');
  
  // Search by message content
  const { data: logs1, error: error1 } = await supabase
    .from('logs')
    .select('*')
    .ilike('message', '%transaction%')
    .order('created_at', { ascending: false })
    .limit(20);
    
  console.log(`📋 Logs with "transaction" in message: ${logs1?.length || 0}`);
  logs1?.forEach((log, index) => {
    const date = new Date(log.created_at);
    console.log(`\n  ${index + 1}. [${log.level}] ${log.message}`);
    console.log(`     📅 ${date.toLocaleDateString()} ⏰ ${date.toLocaleTimeString()}`);
    console.log(`     📂 ${log.module}/${log.action} | Source: ${log.source}`);
    if (log.error_code) console.log(`     ❌ ${log.error_code}`);
    if (log.details) {
      console.log(`     📋 Details:`);
      try {
        const details = JSON.parse(log.details);
        console.log(JSON.stringify(details, null, 8));
      } catch (e) {
        console.log(`     ${log.details}`);
      }
    }
    console.log('     ' + '-'.repeat(60));
  });
  
  // Search by error level in recent time
  console.log('\n\n🔍 RECENT ERROR LOGS:');
  const { data: logs2, error: error2 } = await supabase
    .from('logs')
    .select('*')
    .eq('level', 'error')
    .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // Last 2 hours
    .order('created_at', { ascending: false })
    .limit(10);
    
  console.log(`📋 Recent error logs: ${logs2?.length || 0}`);
  logs2?.forEach((log, index) => {
    const date = new Date(log.created_at);
    console.log(`\n  ${index + 1}. [${log.level}] ${log.message}`);
    console.log(`     📅 ${date.toLocaleDateString()} ⏰ ${date.toLocaleTimeString()}`);
    console.log(`     📂 ${log.module}/${log.action} | Source: ${log.source}`);
    if (log.error_code) console.log(`     ❌ ${log.error_code}`);
    if (log.details) {
      console.log(`     📋 Details:`);
      try {
        const details = JSON.parse(log.details);
        console.log(JSON.stringify(details, null, 8));
      } catch (e) {
        console.log(`     ${log.details}`);
      }
    }
    if (log.stack_trace) {
      console.log(`     📊 Stack:`);
      console.log(`     ${log.stack_trace}`);
    }
    console.log('     ' + '='.repeat(60));
  });
  
  // Also check what's in recent_errors view
  console.log('\n\n🔍 RECENT_ERRORS VIEW (First 5 with details):');
  const { data: recentErrors, error: recentError } = await supabase
    .from('recent_errors')
    .select('*')
    .limit(5);
    
  if (recentError) {
    console.error('Error getting recent_errors:', recentError);
  } else {
    console.log(`📋 Recent errors: ${recentErrors?.length || 0}`);
    recentErrors?.forEach((error, index) => {
      const date = new Date(error.created_at);
      console.log(`\n  ${index + 1}. [${error.level}] ${error.message}`);
      console.log(`     📅 ${date.toLocaleDateString()} ⏰ ${date.toLocaleTimeString()}`);
      console.log(`     📂 ${error.module}/${error.action}`);
      if (error.error_code) console.log(`     ❌ ${error.error_code}`);
      if (error.details) {
        console.log(`     📋 Details:`);
        try {
          const details = typeof error.details === 'string' ? JSON.parse(error.details) : error.details;
          console.log(JSON.stringify(details, null, 8));
        } catch (e) {
          console.log(`     ${error.details}`);
        }
      }
      console.log('     ' + '='.repeat(60));
    });
  }
}

findTransactionErrors().catch(console.error);