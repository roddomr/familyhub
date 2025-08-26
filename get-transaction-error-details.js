import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zltocuccoirckirzrdzs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsdG9jdWNjb2lyY2tpcnpyZHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NDQ0NjcsImV4cCI6MjA3MTQyMDQ2N30.QfJrj39E_V4Ey1cqaHpgdzA95F0OpsJSsm104vlYGgM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function getTransactionErrorDetails() {
  console.log('🔍 GETTING DETAILED TRANSACTION ERRORS...\n');
  
  // Get detailed transaction error logs
  const { data: errorLogs, error } = await supabase
    .from('logs')
    .select('*')
    .eq('module', 'finance')
    .in('action', ['create_transaction', 'create_account'])
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (error) {
    console.error('❌ Error getting transaction logs:', error);
  } else {
    console.log(`📋 Found ${errorLogs?.length || 0} finance error logs:`);
    errorLogs?.forEach((log, index) => {
      const date = new Date(log.created_at);
      console.log(`\n  ${index + 1}. [${log.level.toUpperCase()}] ${log.message}`);
      console.log(`     📅 ${date.toLocaleDateString()} ⏰ ${date.toLocaleTimeString()}`);
      console.log(`     📂 Module: ${log.module}/${log.action}`);
      console.log(`     🔗 Source: ${log.source}`);
      if (log.error_code) {
        console.log(`     ❌ Error Code: ${log.error_code}`);
      }
      if (log.details) {
        console.log(`     📋 DETAILS:`);
        try {
          const details = JSON.parse(log.details);
          console.log(JSON.stringify(details, null, 6));
        } catch (e) {
          console.log(`     ${log.details}`);
        }
      }
      if (log.stack_trace) {
        console.log(`     📊 STACK TRACE:`);
        console.log(`     ${log.stack_trace}`);
      }
      console.log('     ' + '='.repeat(80));
    });
  }
}

getTransactionErrorDetails().catch(console.error);