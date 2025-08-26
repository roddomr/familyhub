import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zltocuccoirckirzrdzs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsdG9jdWNjb2lyY2tpcnpyZHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NDQ0NjcsImV4cCI6MjA3MTQyMDQ2N30.QfJrj39E_V4Ey1cqaHpgdzA95F0OpsJSsm104vlYGgM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUILogs() {
  console.log('🔍 CHECKING LOGS AS SEEN BY UI...\n');
  
  // 1. Check get_user_logs RPC (what the UI uses)
  console.log('📋 Testing get_user_logs RPC:');
  try {
    const { data: userLogs, error: userLogsError } = await supabase.rpc('get_user_logs', {
      p_user_id: null, // Test with null user_id like UI might do
      p_limit: 50,
      p_level: null,
    });

    if (userLogsError) {
      console.error('❌ Error with get_user_logs (null user):', userLogsError);
    } else {
      console.log(`✅ get_user_logs (null user): ${userLogs?.length || 0} logs`);
    }
  } catch (error) {
    console.error('❌ get_user_logs exception:', error);
  }
  
  // 2. Check recent_errors view (what the UI uses for errors)
  console.log('\n📋 Testing recent_errors view:');
  try {
    const { data: recentErrors, error: errorsError } = await supabase
      .from('recent_errors')
      .select('*')
      .limit(20);

    if (errorsError) {
      console.error('❌ Error with recent_errors:', errorsError);
    } else {
      console.log(`✅ recent_errors view: ${recentErrors?.length || 0} errors`);
      recentErrors?.forEach((error, index) => {
        console.log(`  ${index + 1}. [${error.level}] ${error.message}`);
        console.log(`     📅 ${new Date(error.created_at).toLocaleString()}`);
        console.log(`     📂 ${error.module}/${error.action}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('❌ recent_errors exception:', error);
  }
  
  // 3. Test with a known user_id from the logs
  console.log('\n📋 Testing with specific user ID:');
  const { data: sampleLog } = await supabase
    .from('logs')
    .select('user_id')
    .not('user_id', 'is', null)
    .limit(1);
    
  if (sampleLog && sampleLog.length > 0) {
    const testUserId = sampleLog[0].user_id;
    console.log(`Testing with user_id: ${testUserId}`);
    
    try {
      const { data: specificUserLogs, error: specificError } = await supabase.rpc('get_user_logs', {
        p_user_id: testUserId,
        p_limit: 50,
        p_level: null,
      });

      if (specificError) {
        console.error('❌ Error with get_user_logs (specific user):', specificError);
      } else {
        console.log(`✅ get_user_logs (specific user): ${specificUserLogs?.length || 0} logs`);
      }
    } catch (error) {
      console.error('❌ get_user_logs specific user exception:', error);
    }
  } else {
    console.log('No logs with user_id found to test with');
  }
  
  // 4. Check what functions exist
  console.log('\n📋 Available RPC functions:');
  try {
    const { data: functions, error: funcError } = await supabase
      .from('pg_proc')
      .select('proname')
      .like('proname', '%log%');
      
    if (funcError) {
      console.error('❌ Error getting functions:', funcError);
    } else {
      console.log('Functions with "log" in name:', functions?.map(f => f.proname));
    }
  } catch (error) {
    console.log('Could not check functions (expected)');
  }
}

checkUILogs().catch(console.error);