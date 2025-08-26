import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zltocuccoirckirzrdzs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsdG9jdWNjb2lyY2tpcnpyZHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NDQ0NjcsImV4cCI6MjA3MTQyMDQ2N30.QfJrj39E_V4Ey1cqaHpgdzA95F0OpsJSsm104vlYGgM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLogsTable() {
  console.log('🔍 Checking logs table structure...\n');
  
  try {
    // Get table info from information_schema
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'logs')
      .order('ordinal_position');
      
    if (error) {
      console.error('❌ Error checking table structure:', error);
    } else {
      console.log('📋 Logs table structure:');
      data?.forEach((column) => {
        const nullable = column.is_nullable === 'YES' ? '✅' : '❌';
        console.log(`  ${column.column_name} (${column.data_type}) ${nullable} nullable`);
        if (column.column_default) {
          console.log(`    Default: ${column.column_default}`);
        }
      });
    }
    
    // Also check what fields are actually in existing logs
    const { data: sampleLog, error: sampleError } = await supabase
      .from('logs')
      .select('*')
      .limit(1);
      
    if (sampleError) {
      console.error('❌ Error getting sample log:', sampleError);
    } else if (sampleLog && sampleLog.length > 0) {
      console.log('\n📋 Sample log fields:');
      Object.keys(sampleLog[0]).forEach(key => {
        console.log(`  ${key}: ${sampleLog[0][key]}`);
      });
    } else {
      console.log('\n📋 No sample logs found');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkLogsTable().catch(console.error);