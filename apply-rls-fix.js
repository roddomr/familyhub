import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://zltocuccoirckirzrdzs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsdG9jdWNjb2lyY2tpcnpyZHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NDQ0NjcsImV4cCI6MjA3MTQyMDQ2N30.QfJrj39E_V4Ey1cqaHpgdzA95F0OpsJSsm104vlYGgM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyRLSFix() {
  console.log('🔧 Applying RLS fix for transactions...\n');
  
  try {
    // Read the migration file
    const migration = readFileSync('./supabase/migrations/20250823070700_fix_transactions_rls.sql', 'utf8');
    
    console.log('📋 Migration content:');
    console.log(migration.substring(0, 200) + '...\n');
    
    console.log('⚠️  Note: This script cannot execute DDL commands (CREATE POLICY, etc.)');
    console.log('⚠️  These need to be run in Supabase Dashboard SQL Editor\n');
    
    console.log('🎯 SOLUTION:');
    console.log('1. Go to Supabase Dashboard → SQL Editor');
    console.log('2. Copy and paste the contents of:');
    console.log('   supabase/migrations/20250823070700_fix_transactions_rls.sql');
    console.log('3. Run the migration');
    
    // Test current state
    console.log('\n🧪 Testing current user authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('❌ Not authenticated - this explains the RLS issue!');
      console.log('Error:', authError.message);
    } else if (user) {
      console.log('✅ User authenticated:', user.email);
      console.log('🆔 User ID:', user.id);
      
      // Check if user is in family_members
      console.log('\n🏠 Checking family membership...');
      const { data: membership, error: memberError } = await supabase
        .from('family_members')
        .select('*')
        .eq('user_id', user.id);
        
      if (memberError) {
        console.log('❌ Error checking family membership:', memberError.message);
      } else {
        console.log('👥 Family memberships:', membership);
        if (membership.length === 0) {
          console.log('⚠️  User is not a member of any family! This could be the issue.');
        }
      }
    } else {
      console.log('❌ No user found - authentication issue');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

applyRLSFix().catch(console.error);