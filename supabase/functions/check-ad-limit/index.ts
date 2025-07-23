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

    const today = new Date().toISOString().split('T')[0]
    const MAX_DAILY_ADS = 5

    // UPSERT pour éviter les conflits de clés
    const { data: cooldownData, error: upsertError } = await supabaseClient
      .from('ad_cooldowns')
      .upsert({
        user_id: user.id,
        daily_count: 0,
        daily_reset_date: today,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id',
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (upsertError) {
      console.error('Upsert error:', upsertError)
      return new Response(
        JSON.stringify({ success: false, error: 'Database error' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Vérifier si c'est un nouveau jour et reset si nécessaire
    const { data: currentData, error: selectError } = await supabaseClient
      .from('ad_cooldowns') 
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (selectError) {
      console.error('Select error:', selectError)
      return new Response(
        JSON.stringify({ success: false, error: 'Database error' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let finalCount = currentData.daily_count

    // Reset le compteur si on est un nouveau jour
    if (currentData.daily_reset_date !== today) {
      const { error: resetError } = await supabaseClient
        .from('ad_cooldowns')
        .update({
          daily_count: 0,
          daily_reset_date: today,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      if (resetError) {
        console.error('Reset error:', resetError)
        return new Response(
          JSON.stringify({ success: false, error: 'Database error' }), 
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      finalCount = 0
    }

    // Vérifier la limite
    if (finalCount >= MAX_DAILY_ADS) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          current_count: finalCount,
          max_daily: MAX_DAILY_ADS,
          message: 'Daily ad limit reached' 
        }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        current_count: finalCount,
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