import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('Processing recurring transactions...')

    // Call the database function to process recurring transactions
    const { data, error } = await supabaseClient.rpc('process_recurring_transactions')

    if (error) {
      console.error('Error processing recurring transactions:', error)
      throw error
    }

    const result = data[0] // Function returns array with single result object
    
    console.log('Processing completed:', {
      processed: result.processed_count,
      failed: result.failed_count,
      errors: result.error_messages?.length || 0
    })

    // Log audit entry for automated processing
    if (result.processed_count > 0 || result.failed_count > 0) {
      await supabaseClient.from('audit_logs').insert({
        action: 'AUTOMATED_PROCESSING',
        table_name: 'recurring_transactions',
        risk_level: result.failed_count > 0 ? 'HIGH' : 'LOW',
        operation_context: 'automated_recurring_transaction_processing',
        new_data: {
          processed_count: result.processed_count,
          failed_count: result.failed_count,
          error_messages: result.error_messages,
          processed_at: new Date().toISOString()
        },
        created_by: '00000000-0000-0000-0000-000000000000' // System user
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          processed_count: result.processed_count,
          failed_count: result.failed_count,
          error_messages: result.error_messages || [],
          timestamp: new Date().toISOString()
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Function error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})