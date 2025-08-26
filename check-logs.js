import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zltocuccoirckirzrdzs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsdG9jdWNjb2lyY2tpcnpyZHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NDQ0NjcsImV4cCI6MjA3MTQyMDQ2N30.QfJrj39E_V4Ey1cqaHpgdzA95F0OpsJSsm104vlYGgM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentLogs() {
  console.log('🔍 Checking recent logs and data...\n');
  
  // Check recent logs (last 2 hours)
  const { data: logs, error: logsError } = await supabase
    .from('logs')
    .select('*')
    .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // Last 2 hours
    .order('created_at', { ascending: false })
    .limit(100);
    
  if (logsError) {
    console.error('❌ Error querying logs:', logsError);
  } else {
    console.log(`📋 Found ${logs?.length || 0} recent logs:`);
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
  
  // Check accounts
  console.log('\n💳 Checking financial accounts...');
  const { data: accounts, error: accountsError } = await supabase
    .from('financial_accounts')
    .select('*');
    
  if (accountsError) {
    console.error('❌ Error querying accounts:', accountsError);
  } else {
    console.log(`📊 Found ${accounts?.length || 0} accounts:`);
    accounts?.forEach((account, index) => {
      console.log(`  ${index + 1}. ${account.name} (${account.type}) - Balance: ${account.balance} ${account.currency}`);
    });
  }
  
  // Check transactions
  console.log('\n💰 Checking transactions...');
  const { data: transactions, error: transactionsError } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (transactionsError) {
    console.error('❌ Error querying transactions:', transactionsError);
  } else {
    console.log(`📊 Found ${transactions?.length || 0} transactions:`);
    transactions?.forEach((transaction, index) => {
      console.log(`  ${index + 1}. ${transaction.description} - ${transaction.type} ${transaction.amount}`);
      console.log(`     Date: ${transaction.date}, Account: ${transaction.account_id}`);
    });
  }
  
  // Check categories
  console.log('\n🏷️ Checking transaction categories...');
  const { data: categories, error: categoriesError } = await supabase
    .from('transaction_categories')
    .select('*');
    
  if (categoriesError) {
    console.error('❌ Error querying categories:', categoriesError);
  } else {
    console.log(`📊 Found ${categories?.length || 0} categories:`);
    categories?.forEach((category, index) => {
      console.log(`  ${index + 1}. ${category.name} (${category.type})`);
    });
  }
}

checkRecentLogs().catch(console.error);