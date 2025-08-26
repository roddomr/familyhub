import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zltocuccoirckirzrdzs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsdG9jdWNjb2lyY2tpcnpyZHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NDQ0NjcsImV4cCI6MjA3MTQyMDQ2N30.QfJrj39E_V4Ey1cqaHpgdzA95F0OpsJSsm104vlYGgM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserFamilyStatus() {
  console.log('🔍 Checking user and family status for RLS debugging...\n');
  
  // Check all users
  console.log('👥 All users in system:');
  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('*')
    .limit(10);
    
  if (usersError) {
    console.error('❌ Error getting users:', usersError);
  } else {
    console.log(`Found ${users?.length || 0} users:`);
    users?.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} (ID: ${user.id})`);
    });
  }
  
  // Check all families
  console.log('\n🏠 All families in system:');
  const { data: families, error: familiesError } = await supabase
    .from('families')
    .select('*')
    .limit(10);
    
  if (familiesError) {
    console.error('❌ Error getting families:', familiesError);
  } else {
    console.log(`Found ${families?.length || 0} families:`);
    families?.forEach((family, index) => {
      console.log(`  ${index + 1}. ${family.name} (ID: ${family.id})`);
    });
  }
  
  // Check all family members
  console.log('\n👨‍👩‍👧‍👦 All family memberships:');
  const { data: members, error: membersError } = await supabase
    .from('family_members')
    .select(`
      *,
      families(name),
      profiles(email)
    `)
    .limit(20);
    
  if (membersError) {
    console.error('❌ Error getting family members:', membersError);
  } else {
    console.log(`Found ${members?.length || 0} family memberships:`);
    members?.forEach((member, index) => {
      console.log(`  ${index + 1}. ${member.profiles?.email || 'Unknown'} → ${member.families?.name || 'Unknown Family'}`);
      console.log(`     User ID: ${member.user_id}`);
      console.log(`     Family ID: ${member.family_id}`);
      console.log(`     Status: ${member.status}`);
      console.log(`     Role: ${member.role}`);
      console.log('');
    });
  }
  
  // Check current RLS policies
  console.log('\n🛡️  Current RLS policies on transactions:');
  try {
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'transactions');
      
    if (policiesError) {
      console.log('Could not check policies (expected)');
    } else {
      console.log('Policies:', policies);
    }
  } catch (error) {
    console.log('Could not check policies (expected)');
  }
  
  // Practical test - try to see what user would be used
  console.log('\n🧪 What happens when we check auth from different contexts:');
  
  // Test 1: Direct auth check (this will be null from Node.js)
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) {
    console.log('❌ Auth error from Node.js:', authError.message);
  } else if (user) {
    console.log('✅ User from Node.js:', user.email, user.id);
  } else {
    console.log('❌ No user from Node.js (expected - no browser session)');
  }
  
  console.log('\n🎯 RECOMMENDATION:');
  console.log('1. Apply the RLS migration in Supabase Dashboard');
  console.log('2. After applying, try creating a transaction again');
  console.log('3. If it still fails, we may need to check browser authentication');
}

checkUserFamilyStatus().catch(console.error);