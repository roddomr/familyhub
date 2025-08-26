import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zltocuccoirckirzrdzs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsdG9jdWNjb2lyY2tpcnpyZHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NDQ0NjcsImV4cCI6MjA3MTQyMDQ2N30.QfJrj39E_V4Ey1cqaHpgdzA95F0OpsJSsm104vlYGgM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLogger() {
  console.log('🧪 Testing logger...\n');
  
  try {
    // Test direct insert into logs
    const { data, error } = await supabase
      .from('logs')
      .insert({
        message: 'Test log from Node.js script - ' + new Date().toISOString(),
        level: 'info',
        module: 'test',
        action: 'node_test',
        source: 'node_script',
        details: JSON.stringify({ test: true, timestamp: new Date().toISOString() })
      })
      .select();
      
    if (error) {
      console.error('❌ Error inserting log:', error);
    } else {
      console.log('✅ Log inserted successfully:', data);
    }
    
    // Wait a moment then check
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if log was inserted
    const { data: logs, error: logError } = await supabase
      .from('logs')
      .select('*')
      .gte('created_at', new Date(Date.now() - 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (logError) {
      console.error('❌ Error checking logs:', logError);
    } else {
      console.log(`📋 Found ${logs?.length || 0} recent logs:`);
      logs?.forEach((log, index) => {
        console.log(`  ${index + 1}. [${log.level}] ${log.message}`);
        console.log(`     Created: ${log.created_at}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testLogger().catch(console.error);