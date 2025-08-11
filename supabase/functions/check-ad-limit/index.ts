import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authorization' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Vérifier le statut premium
    const { data: garden, error: gardenError } = await supabaseClient
      .from('player_gardens')
      .select('premium_status')
      .eq('user_id', user.id)
      .maybeSingle()

    if (gardenError) {
      console.error('Error fetching premium status:', gardenError)
    }


    const today = new Date().toISOString().split('T')[0]
    const MAX_DAILY_ADS = 5

    // Récupérer l'état actuel de façon thread-safe
    const { data: cooldownData, error: selectError } = await supabaseClient
      .from('ad_cooldowns')
      .select('daily_count, daily_reset_date')
      .eq('user_id', user.id)
      .maybeSingle()

    if (selectError) {
      console.error('Select error:', selectError)
      return new Response(
        JSON.stringify({ success: false, error: 'Database error' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let currentCount = 0

    if (cooldownData) {
      // Si c'est un nouveau jour, le compteur est effectivement à 0
      if (cooldownData.daily_reset_date === today) {
        currentCount = cooldownData.daily_count || 0
      }
      // Sinon, nouveau jour = compteur à 0
    }

    // Vérifier la limite
    if (currentCount >= MAX_DAILY_ADS) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          current_count: currentCount,
          max_daily: MAX_DAILY_ADS,
          message: 'Daily ad limit reached' 
        }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        current_count: currentCount,
        max_daily: MAX_DAILY_ADS
      }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})