
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

interface AdMobRewardPayload {
  user_id: string
  reward_type: string
  reward_amount: number
  ad_duration: number
  signature?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Test endpoint for validating configuration
  if (req.method === 'GET' && new URL(req.url).pathname.endsWith('/test')) {
    console.log('Edge Function: Test endpoint accessed')
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'AdMob SSV endpoint is working', 
        timestamp: new Date().toISOString(),
        environment: {
          supabase_url: Deno.env.get('SUPABASE_URL') ? 'configured' : 'missing',
          service_role: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? 'configured' : 'missing'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Handle GET requests from AdMob server-side verification
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const searchParams = url.searchParams
    
    console.log('Edge Function: AdMob SSV raw URL:', req.url)
    
    // Extract AdMob SSV parameters
    const adNetwork = searchParams.get('ad_network')
    const adUnit = searchParams.get('ad_unit')
    const rewardAmount = searchParams.get('reward_amount')
    const rewardItem = searchParams.get('reward_item')
    const timestamp = searchParams.get('timestamp')
    const transactionId = searchParams.get('transaction_id')
    const signature = searchParams.get('signature')
    const keyId = searchParams.get('key_id')
    let userId = searchParams.get('user_id')
    let customData = searchParams.get('custom_data')
    
    console.log('Edge Function: AdMob SSV Request - Raw params:', {
      adNetwork, adUnit, rewardAmount, rewardItem, timestamp, transactionId, signature, keyId, userId, customData
    })
    
    console.log('Edge Function: SSV Request URL:', req.url)
    console.log('Edge Function: SSV Headers:', Object.fromEntries(req.headers.entries()))
    
    // Check for unreplaced placeholders and handle them
    if (userId === '{USER_ID}' || userId === 'USER_ID' || !userId) {
      console.log('Edge Function: userId is placeholder or empty, checking custom_data for real values')
      
      // Try to extract from custom_data if it contains JSON
      if (customData && customData !== '{CUSTOM_DATA}' && customData !== 'CUSTOM_DATA') {
        try {
          const parsedCustomData = JSON.parse(customData)
          if (parsedCustomData.user_id) {
            userId = parsedCustomData.user_id
            console.log('AdMob SSV: Extracted userId from custom_data:', userId)
          }
        } catch (e) {
          console.log('AdMob SSV: Could not parse custom_data as JSON:', customData)
        }
      }
    }
    
    // If still no valid userId, return acknowledgment but don't process reward
    if (!userId || userId === '{USER_ID}' || userId === 'USER_ID') {
      console.log('AdMob SSV: No valid user_id found, returning acknowledgment')
      return new Response(
        JSON.stringify({ 
          message: 'AdMob SSV endpoint acknowledged - no valid user_id provided',
          warning: 'Reward not processed due to missing user_id'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Process the reward for actual user requests
    try {
      // Parse custom data for reward details if available
      let rewardType = 'coins'
      let playerLevel = 1
      
      console.log('Edge Function: Processing custom_data:', customData)
      
      if (customData && customData !== '{CUSTOM_DATA}' && customData !== 'CUSTOM_DATA') {
        try {
          const parsedCustomData = JSON.parse(customData)
          console.log('Edge Function: Parsed custom_data:', parsedCustomData)
          
          if (parsedCustomData.reward_type) {
            rewardType = parsedCustomData.reward_type
          }
          if (parsedCustomData.player_level) {
            playerLevel = parsedCustomData.player_level
          }
        } catch (e) {
          console.log('Edge Function: Could not parse custom_data for reward details:', customData, e)
        }
      }
      
      // Get player level if not in custom data
      if (playerLevel === 1) {
        const { data: garden } = await supabase
          .from('player_gardens')
          .select('level')
          .eq('user_id', userId)
          .single()
        
        if (garden?.level) {
          playerLevel = garden.level
        }
      }
      
      // Calculate reward based on database configuration
      const { data: rewardConfig, error: rewardError } = await supabase
        .rpc('calculate_ad_reward', {
          reward_type_param: rewardType,
          player_level_param: playerLevel
        })
        .single()
      
      if (rewardError || !rewardConfig) {
        console.error('AdMob SSV: Failed to calculate reward:', rewardError)
        return new Response(
          JSON.stringify({ error: 'Failed to calculate reward' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      const adjustedAmount = rewardConfig.calculated_amount
      
      console.log('AdMob SSV: Processing reward for user:', userId, 'Type:', rewardType, 'Amount:', adjustedAmount)
      
      const result = await applyReward(userId, rewardType, adjustedAmount, rewardConfig.duration_minutes || 30)
      
      if (result.success) {
        await updateAdCooldown(userId)
        await logAdReward(userId, rewardType, adjustedAmount, 30)
        
        console.log('AdMob SSV: Successfully processed reward for user:', userId)
        return new Response(
          JSON.stringify({ 
            success: true, 
            applied_amount: adjustedAmount,
            reward_type: rewardType,
            user_id: userId
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        console.error('AdMob SSV: Failed to apply reward:', result.error)
        return new Response(
          JSON.stringify({ error: result.error }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } catch (error) {
      console.error('Error processing AdMob SSV:', error)
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  }

  // Handle POST requests (from web/development)
  try {
    const contentLength = req.headers.get('content-length')
    if (!contentLength || contentLength === '0') {
      return new Response(
        JSON.stringify({ error: 'No request body provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const payload: AdMobRewardPayload = await req.json()
    console.log('AdMob reward validation request (POST):', payload)

    // Validate required fields
    if (!payload.user_id || !payload.reward_type || !payload.reward_amount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check that user exists
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', payload.user_id)
      .single()

    if (userError || !user) {
      console.error('User not found:', userError)
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get player level and calculate actual reward amount
    const { data: garden } = await supabase
      .from('player_gardens')
      .select('level')
      .eq('user_id', payload.user_id)
      .single()
    
    const playerLevel = garden?.level || 1
    
    // Calculate reward based on database configuration
    const { data: rewardConfig, error: rewardError } = await supabase
      .rpc('calculate_ad_reward', {
        reward_type_param: payload.reward_type,
        player_level_param: playerLevel
      })
      .single()
    
    if (rewardError || !rewardConfig) {
      console.error('Failed to calculate reward:', rewardError)
      return new Response(
        JSON.stringify({ error: 'Failed to calculate reward' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const calculatedAmount = rewardConfig.calculated_amount
    const durationMinutes = rewardConfig.duration_minutes || 30
    
    // Apply reward
    const result = await applyReward(payload.user_id, payload.reward_type, calculatedAmount, durationMinutes)

    if (!result.success) {
      console.error('Failed to apply reward:', result.error)
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update cooldown
    await updateAdCooldown(payload.user_id)

    // Log transaction
    await logAdReward(payload.user_id, payload.reward_type, calculatedAmount, durationMinutes)

    console.log(`Successfully applied ${payload.reward_type} reward (${payload.reward_amount}) to user ${payload.user_id}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        applied_amount: calculatedAmount,
        reward_type: payload.reward_type 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in validate-ad-reward:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function calculateAdjustedReward(baseAmount: number, adDuration: number): number {
  // Paliers de récompenses basés sur la durée
  if (adDuration >= 60) return Math.floor(baseAmount * 2.0) // 60s+ = x2
  if (adDuration >= 30) return Math.floor(baseAmount * 1.5) // 30s+ = x1.5
  if (adDuration >= 15) return baseAmount // 15s+ = normal
  return Math.floor(baseAmount * 0.5) // <15s = réduit
}

async function applyReward(userId: string, rewardType: string, amount: number, durationMinutes?: number): Promise<{ success: boolean; error?: string }> {
  try {
    switch (rewardType) {
      case 'coins':
        return await applyCoinsReward(userId, Math.floor(amount))
      case 'gems':
        return await applyGemsReward(userId, Math.floor(amount))
      case 'coin_boost':
      case 'gem_boost':
      case 'growth_boost':
        return await applyBoostReward(userId, rewardType, amount, durationMinutes || 30)
      default:
        return { success: false, error: 'Unknown reward type' }
    }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

async function applyCoinsReward(userId: string, amount: number): Promise<{ success: boolean; error?: string }> {
  const { data: garden, error: fetchError } = await supabase
    .from('player_gardens')
    .select('coins')
    .eq('user_id', userId)
    .single()

  if (fetchError) return { success: false, error: 'Failed to fetch garden' }

  const { error: updateError } = await supabase
    .from('player_gardens')
    .update({ coins: (garden.coins || 0) + amount })
    .eq('user_id', userId)

  if (updateError) return { success: false, error: 'Failed to update coins' }

  // Logger la transaction
  await supabase.from('coin_transactions').insert({
    user_id: userId,
    amount: amount,
    transaction_type: 'ad_reward',
    description: `Récompense pub: ${amount} pièces`
  })

  return { success: true }
}

async function applyGemsReward(userId: string, amount: number): Promise<{ success: boolean; error?: string }> {
  const { data: garden, error: fetchError } = await supabase
    .from('player_gardens')
    .select('gems')
    .eq('user_id', userId)
    .single()

  if (fetchError) return { success: false, error: 'Failed to fetch garden' }

  const { error: updateError } = await supabase
    .from('player_gardens')
    .update({ gems: (garden.gems || 0) + amount })
    .eq('user_id', userId)

  if (updateError) return { success: false, error: 'Failed to update gems' }

  return { success: true }
}

async function applyBoostReward(userId: string, effectType: string, effectValue: number, durationMinutes: number): Promise<{ success: boolean; error?: string }> {
  const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000)

  const { error } = await supabase
    .from('active_effects')
    .insert({
      user_id: userId,
      effect_type: effectType,
      effect_value: effectValue,
      expires_at: expiresAt.toISOString(),
      source: 'ad_reward'
    })

  if (error) return { success: false, error: 'Failed to create boost effect' }

  return { success: true }
}

async function updateAdCooldown(userId: string): Promise<void> {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  console.log('Edge Function: Updating ad cooldown for user:', userId);
  
  // Get current cooldown to increment daily count correctly
  const { data: currentCooldown } = await supabase
    .from('ad_cooldowns')
    .select('daily_count, daily_reset_date')
    .eq('user_id', userId)
    .maybeSingle();

  let newDailyCount = 1;
  
  if (currentCooldown) {
    // If same day, increment counter
    if (currentCooldown.daily_reset_date === today) {
      newDailyCount = (currentCooldown.daily_count || 0) + 1;
    }
    // Otherwise it's a new day, start at 1
  }
  
  const { error } = await supabase
    .from('ad_cooldowns')
    .upsert({
      user_id: userId,
      daily_count: newDailyCount,
      daily_reset_date: today,
      last_ad_watched: now.toISOString(),
      updated_at: now.toISOString()
    });

  if (error) {
    console.error('Edge Function: Failed to update ad cooldown:', error);
    throw error;
  }
  
  console.log(`Edge Function: Ad watched ${newDailyCount}/5 today for user ${userId}`);
}

async function logAdReward(userId: string, rewardType: string, amount: number, adDuration: number): Promise<void> {
  await supabase
    .from('ad_sessions')
    .insert({
      user_id: userId,
      reward_type: rewardType,
      reward_amount: amount,
      reward_data: {
        ad_duration: adDuration,
        applied_at: new Date().toISOString(),
        source: 'server_validation'
      }
    })
}
