const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://stywpjmmhtfzijlkmqmg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0eXdwam1taHRmemtxbG1xbWciLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcyNDMzODQwNywiZXhwIjoyMDM5OTE0NDA3fQ.6fO8W4YsRjqOhBqHfhk-v6qGWA_KhkR7NL5vHSPDNzE'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkCategories() {
  try {
    console.log('Fetching transaction categories...')
    const { data, error } = await supabase
      .from('transaction_categories')
      .select('*')
      .eq('is_default', true)
      .order('type', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching categories:', error)
      return
    }

    console.log('\n=== DEFAULT CATEGORIES ===')
    console.log('Total categories:', data?.length || 0)
    
    const expenseCategories = data?.filter(cat => cat.type === 'expense') || []
    const incomeCategories = data?.filter(cat => cat.type === 'income') || []
    
    console.log('\n--- EXPENSE CATEGORIES ---')
    expenseCategories.forEach(cat => {
      console.log(`${cat.name} - ${cat.description}`)
    })
    
    console.log('\n--- INCOME CATEGORIES ---')
    incomeCategories.forEach(cat => {
      console.log(`${cat.name} - ${cat.description}`)
    })

  } catch (error) {
    console.error('Script error:', error)
  }
}

checkCategories()