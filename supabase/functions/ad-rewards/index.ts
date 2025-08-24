import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.3'
import { corsHeaders } from '../_shared/cors.ts'

interface RewardRequest {
  reward_type: string;
  reward_amount: number;
  is_premium?: boolean;
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

    // GET: Check current reward state
    if (req.method === 'GET') {
      const today = new Date().toISOString().split('T')[0]
      const MAX_DAILY = 5 // Same limit for all users

      // Get or create cooldown record with automatic daily reset
      let { data: cooldownData, error: selectError } = await supabaseClient
        .from('ad_cooldowns')
        .select('daily_count, daily_reset_date')
        .eq('user_id', user.id)
        .maybeSingle()

      if (selectError) {
        console.error('Error fetching cooldown:', selectError)
        return new Response(
          JSON.stringify({ success: false, error: 'Database error' }), 
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      let currentCount = 0

      if (!cooldownData) {
        // Create new record
        const { error: createError } = await supabaseClient
          .from('ad_cooldowns')
          .insert({
            user_id: user.id,
            daily_count: 0,
            daily_reset_date: today,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (createError) {
          console.error('Error creating cooldown record:', createError)
          return new Response(
            JSON.stringify({ success: false, error: 'Database creation error' }), 
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        currentCount = 0
      } else if (cooldownData.daily_reset_date !== today) {
        // Automatic daily reset
        const { error: resetError } = await supabaseClient
          .from('ad_cooldowns')
          .update({
            daily_count: 0,
            daily_reset_date: today,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)

        if (resetError) {
          console.error('Error resetting daily count:', resetError)
          return new Response(
            JSON.stringify({ success: false, error: 'Database reset error' }), 
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        currentCount = 0
        console.log(`Daily reset completed for user ${user.id}`)
      } else {
        currentCount = cooldownData.daily_count || 0
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          available: currentCount < MAX_DAILY,
          dailyCount: currentCount,
          maxDaily: MAX_DAILY,
          timeUntilNext: 0 // No cooldown between ads, only daily limit
        }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST: Claim reward
    if (req.method === 'POST') {
      const body: RewardRequest = await req.json()
      const { reward_type, reward_amount, is_premium = false } = body

      if (!reward_type || !reward_amount) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing reward data' }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const today = new Date().toISOString().split('T')[0]
      const MAX_DAILY = 5 // Same limit for all users

      // Use atomic increment function for thread safety
      const { data: incrementResult, error: incrementError } = await supabaseClient
        .rpc('increment_ad_count_atomic', {
          p_user_id: user.id,
          p_today: today,
          p_now: new Date().toISOString(),
          p_max_ads: MAX_DAILY
        })

      if (incrementError || !incrementResult?.success) {
        console.error('Error incrementing ad count:', incrementError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: incrementResult?.message || 'Daily limit reached',
            dailyCount: incrementResult?.current_count || MAX_DAILY
          }), 
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Transaction unique pour optimiser les performances
      try {
        const now = new Date().toISOString()
        const expiresAt = new Date()
        expiresAt.setMinutes(expiresAt.getMinutes() + (reward_amount || 30))

        // Insérer la session et l'effet en parallèle pour optimiser
        const [sessionResult, boostResult, gardenResult] = await Promise.all([
          // Session d'audit
          supabaseClient
            .from('ad_sessions')
            .insert({
              user_id: user.id,
              reward_type,
              reward_amount,
              reward_data: { is_premium, claimed_at: now },
              watched_at: now,
              created_at: now
            })
            .select('id')
            .single(),
          
          // Effet boost
          supabaseClient
            .from('active_effects')
            .insert({
              user_id: user.id,
              effect_type: reward_type,
              effect_value: 2.0, // 2x multiplier
              expires_at: expiresAt.toISOString(),
              source: is_premium ? 'premium_reward' : 'ad_reward',
              created_at: now
            }),
          
          // Mise à jour last_played
          supabaseClient
            .from('player_gardens')
            .update({ last_played: now })
            .eq('user_id', user.id)
        ])

        if (boostResult.error) {
          console.error('Error creating boost effect:', boostResult.error)
          throw new Error(`Failed to create boost: ${boostResult.error.message}`)
        }

        if (sessionResult.error) {
          console.warn('Session logging failed but continuing:', sessionResult.error)
        }

        if (gardenResult.error) {
          console.warn('Garden update failed but continuing:', gardenResult.error)
        }

        console.log(`✅ Boost applied successfully: ${reward_type} x2.0 for ${reward_amount}min to user ${user.id} (premium: ${is_premium})`)

        return new Response(
          JSON.stringify({ 
            success: true,
            sessionId: sessionResult.data?.id,
            message: 'Boost claimed successfully',
            dailyCount: incrementResult.new_count,
            maxDaily: MAX_DAILY
          }), 
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      } catch (rewardError) {
        console.error('Error distributing reward:', rewardError)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to distribute reward' }), 
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }), 
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})