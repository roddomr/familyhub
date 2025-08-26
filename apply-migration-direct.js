import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Using service role key for admin operations
const supabaseUrl = 'https://zltocuccoirckirzrdzs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsdG9jdWNjb2lyY2tpcnpyZHpzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTg0NDQ2NywiZXhwIjoyMDcxNDIwNDY3fQ.oJMkOBPeEwMiHkJnFqZlMnGhIbWZaGvNlPNV8R-d6b4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🔧 Applying RLS migration directly to database...\n');
  
  try {
    // Read migration file
    const migrationSQL = readFileSync('./supabase/migrations/20250823070700_fix_transactions_rls.sql', 'utf8');
    
    console.log('📋 Executing migration SQL...');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && stmt !== '');
    
    console.log(`Found ${statements.length} SQL statements to execute\n`);
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}:`);
      console.log(`  ${stmt.substring(0, 80)}${stmt.length > 80 ? '...' : ''}`);
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql: stmt });
        
        if (error) {
          console.log(`  ❌ Error:`, error.message);
          // Continue with other statements
        } else {
          console.log(`  ✅ Success`);
        }
      } catch (err) {
        console.log(`  ❌ Exception:`, err.message);
        // Try alternative approach for DDL statements
        console.log(`  🔄 Trying direct SQL execution...`);
        
        try {
          // For DDL statements, we need to use a different approach
          const { error: directError } = await supabase
            .from('_dummy_')
            .select('*')
            .limit(0); // This is just to establish connection
            
          console.log(`  ⚠️  Cannot execute DDL from client. Need to run in Supabase Dashboard.`);
        } catch (directErr) {
          console.log(`  ⚠️  Cannot execute DDL from client. Need to run in Supabase Dashboard.`);
        }
      }
      console.log('');
    }
    
    console.log('🎯 IMPORTANT:');
    console.log('DDL statements (CREATE POLICY, etc.) cannot be executed from client.');
    console.log('Please run the migration in Supabase Dashboard SQL Editor.');
    
    console.log('\n📋 Full migration to run in Dashboard:');
    console.log('='.repeat(60));
    console.log(migrationSQL);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    
    console.log('\n🎯 MANUAL SOLUTION:');
    console.log('1. Go to Supabase Dashboard: https://supabase.com/dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste this migration:');
    console.log('   supabase/migrations/20250823070700_fix_transactions_rls.sql');
    console.log('4. Execute the SQL');
  }
}

applyMigration().catch(console.error);