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

    // UPSERT pour éviter les conflits, puis incrémenter atomiquement
    const { data: currentData, error: selectError } = await supabaseClient
      .from('ad_cooldowns')
      .select('*')
      .eq('user_id', user.id)
      .single()

    let newCount = 1

    if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Select error:', selectError)
      return new Response(
        JSON.stringify({ success: false, error: 'Database error' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!selectError && currentData) {
      // L'enregistrement existe, vérifier la date et incrémenter
      if (currentData.daily_reset_date === today) {
        newCount = currentData.daily_count + 1
      } else {
        newCount = 1 // Nouveau jour, reset à 1
      }

      // Vérifier la limite avant d'incrémenter
      if (newCount > MAX_DAILY_ADS) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            current_count: currentData.daily_count,
            max_daily: MAX_DAILY_ADS,
            message: 'Daily ad limit would be exceeded' 
          }), 
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Mise à jour atomique
      const { error: updateError } = await supabaseClient
        .from('ad_cooldowns')
        .update({
          daily_count: newCount,
          daily_reset_date: today,
          last_ad_watched: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Update error:', updateError)
        return new Response(
          JSON.stringify({ success: false, error: 'Database error' }), 
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      // Nouvel enregistrement - UPSERT pour éviter les conflits de race condition
      const { error: upsertError } = await supabaseClient
        .from('ad_cooldowns')
        .upsert({
          user_id: user.id,
          daily_count: 1,
          daily_reset_date: today,
          last_ad_watched: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        })

      if (upsertError) {
        console.error('Upsert error:', upsertError)
        // En cas de conflit, on peut essayer de refaire un update
        const { error: fallbackError } = await supabaseClient
          .from('ad_cooldowns')
          .update({
            daily_count: supabaseClient.raw('daily_count + 1'),
            last_ad_watched: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)

        if (fallbackError) {
          console.error('Fallback update error:', fallbackError)
          return new Response(
            JSON.stringify({ success: false, error: 'Database error' }), 
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
    }

    console.log(`📈 Pub regardée: ${newCount}/${MAX_DAILY_ADS} aujourd'hui pour user ${user.id}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        new_count: newCount,
        max_daily: MAX_DAILY_ADS,
        message: `Ad count incremented to ${newCount}` 
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