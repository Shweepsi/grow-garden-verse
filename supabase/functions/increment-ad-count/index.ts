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

    const isPremium = garden?.premium_status || false


    const today = new Date().toISOString().split('T')[0]
    const now = new Date().toISOString()
    const MAX_DAILY_ADS = 5

    // Incrémentation atomique avec UPSERT pour gérer les race conditions
    // Cette requête gère à la fois la création et l'incrémentation de façon thread-safe
    const { data: result, error: upsertError } = await supabaseClient
      .rpc('increment_ad_count_atomic', {
        p_user_id: user.id,
        p_today: today,
        p_now: now,
        p_max_ads: MAX_DAILY_ADS
      })

    if (upsertError) {
      console.error('Atomic increment error:', upsertError)
      
      // Fallback: essayer avec UPSERT classique
      const { data: currentData } = await supabaseClient
        .from('ad_cooldowns')
        .select('daily_count, daily_reset_date')
        .eq('user_id', user.id)
        .maybeSingle()

      let newCount = 1
      if (currentData && currentData.daily_reset_date === today) {
        newCount = (currentData.daily_count || 0) + 1
      }

      if (newCount > MAX_DAILY_ADS) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            current_count: currentData?.daily_count || 0,
            max_daily: MAX_DAILY_ADS,
            message: 'Daily ad limit would be exceeded' 
          }), 
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { error: fallbackError } = await supabaseClient
        .from('ad_cooldowns')
        .upsert({
          user_id: user.id,
          daily_count: newCount,
          daily_reset_date: today,
          last_ad_watched: now,
          updated_at: now
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        })

      if (fallbackError) {
        return new Response(
          JSON.stringify({ success: false, error: 'Database error' }), 
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`📈 Pub regardée (fallback): ${newCount}/${MAX_DAILY_ADS} aujourd'hui pour user ${user.id}`)
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          new_count: newCount,
          max_daily: MAX_DAILY_ADS,
          message: `Ad count incremented to ${newCount}` 
        }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Vérifier le résultat de la fonction atomique
    if (!result || result.success === false) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          current_count: result?.current_count || 0,
          max_daily: MAX_DAILY_ADS,
          message: result?.message || 'Daily ad limit exceeded' 
        }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📈 Pub regardée: ${result.new_count}/${MAX_DAILY_ADS} aujourd'hui pour user ${user.id}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        new_count: result.new_count,
        max_daily: MAX_DAILY_ADS,
        message: `Ad count incremented to ${result.new_count}` 
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