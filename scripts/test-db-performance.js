import { createClient } from '@supabase/supabase-js';

// You can set these manually or use environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-anon-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testQueryPerformance() {
  console.log('🔍 Testing database query performance...\n');

  try {
    // Test 1: Check if indexes exist
    console.log('📊 Checking index existence...');
    const { data: indexes } = await supabase
      .rpc('analyze_index_usage')
      .limit(20);

    if (indexes && indexes.length > 0) {
      console.log('✅ Performance indexes found:');
      indexes.forEach(idx => {
        if (idx.indexname.startsWith('idx_')) {
          console.log(`   • ${idx.indexname} on ${idx.tablename} (scans: ${idx.idx_scan || 0})`);
        }
      });
    } else {
      console.log('⚠️  No custom indexes found');
    }

    // Test 2: Check table sizes
    console.log('\n📈 Checking table sizes...');
    const { data: tableSizes } = await supabase
      .rpc('get_table_sizes');

    if (tableSizes && tableSizes.length > 0) {
      console.log('✅ Table size information:');
      tableSizes.forEach(table => {
        console.log(`   • ${table.table_name}: ${table.total_size} (${table.row_count || 0} rows)`);
      });
    }

    // Test 3: Perform sample queries to verify performance
    console.log('\n🚀 Testing query execution times...');
    
    // Query 1: Recent transactions (should use idx_transactions_family_created_at)
    const start1 = Date.now();
    const { data: recentTransactions } = await supabase
      .from('transactions')
      .select('id, description, amount, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    const time1 = Date.now() - start1;
    console.log(`   • Recent transactions query: ${time1}ms (${recentTransactions?.length || 0} results)`);

    // Query 2: User's family memberships (should use idx_family_members_user_family)
    const start2 = Date.now();
    const { data: familyMembers } = await supabase
      .from('family_members')
      .select('family_id, role');
    const time2 = Date.now() - start2;
    console.log(`   • Family memberships query: ${time2}ms (${familyMembers?.length || 0} results)`);

    // Query 3: Active financial accounts (should use idx_financial_accounts_family_active)
    const start3 = Date.now();
    const { data: activeAccounts } = await supabase
      .from('financial_accounts')
      .select('id, name, balance')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    const time3 = Date.now() - start3;
    console.log(`   • Active accounts query: ${time3}ms (${activeAccounts?.length || 0} results)`);

    // Query 4: Transaction categories (should use idx_transaction_categories_family_type_name)
    const start4 = Date.now();
    const { data: categories } = await supabase
      .from('transaction_categories')
      .select('id, name, type')
      .order('name');
    const time4 = Date.now() - start4;
    console.log(`   • Categories query: ${time4}ms (${categories?.length || 0} results)`);

    console.log('\n✅ Performance test completed successfully!');
    
    // Performance summary
    const avgTime = (time1 + time2 + time3 + time4) / 4;
    console.log(`📊 Average query time: ${avgTime.toFixed(1)}ms`);
    
    if (avgTime < 100) {
      console.log('🚀 Excellent performance! Queries are executing quickly.');
    } else if (avgTime < 300) {
      console.log('👍 Good performance. Indexes are working effectively.');
    } else {
      console.log('⚠️  Performance could be improved. Check query patterns and indexes.');
    }

  } catch (error) {
    console.error('❌ Error testing database performance:', error.message);
  }
}

// Run the performance test
testQueryPerformance();