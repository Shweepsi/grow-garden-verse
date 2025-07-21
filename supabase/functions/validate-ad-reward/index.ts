
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

  // Handle GET requests from AdMob server-side verification
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const searchParams = url.searchParams
    
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
    
    console.log('AdMob SSV Request - Raw params:', {
      adNetwork, adUnit, rewardAmount, rewardItem, timestamp, transactionId, signature, keyId, userId, customData
    })
    
    // Check for unreplaced placeholders and handle them
    if (userId === '{USER_ID}' || userId === 'USER_ID' || !userId) {
      console.log('AdMob SSV: userId is placeholder or empty, checking custom_data for real values')
      
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
      let adjustedAmount = parseInt(rewardAmount || '1')
      
      if (customData && customData !== '{CUSTOM_DATA}' && customData !== 'CUSTOM_DATA') {
        try {
          const parsedCustomData = JSON.parse(customData)
          if (parsedCustomData.reward_type) {
            rewardType = parsedCustomData.reward_type
          }
          if (parsedCustomData.reward_amount) {
            adjustedAmount = parsedCustomData.reward_amount
          }
        } catch (e) {
          console.log('AdMob SSV: Could not parse custom_data for reward details:', customData)
        }
      }
      
      // Apply duration-based adjustment (default 30s if not specified)
      adjustedAmount = calculateAdjustedReward(adjustedAmount, 30)
      
      console.log('AdMob SSV: Processing reward for user:', userId, 'Type:', rewardType, 'Amount:', adjustedAmount)
      
      const result = await applyReward(userId, rewardType, adjustedAmount)
      
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

    // Apply reward
    const result = await applyReward(payload.user_id, payload.reward_type, payload.reward_amount)

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
    await logAdReward(payload.user_id, payload.reward_type, payload.reward_amount, 30)

    console.log(`Successfully applied ${payload.reward_type} reward (${payload.reward_amount}) to user ${payload.user_id}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        applied_amount: payload.reward_amount,
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

async function applyReward(userId: string, rewardType: string, amount: number): Promise<{ success: boolean; error?: string }> {
  try {
    switch (rewardType) {
      case 'coins':
        return await applyCoinsReward(userId, amount)
      case 'gems':
        return await applyGemsReward(userId, amount)
      case 'coin_boost':
        return await applyBoostReward(userId, 'coin_boost', 2.0, 60) // x2 pendant 1h
      case 'gem_boost':
        return await applyBoostReward(userId, 'gem_boost', 1.5, 30) // x1.5 pendant 30min
      case 'growth_boost':
        return await applyBoostReward(userId, 'growth_boost', 0.5, 30) // -50% temps pendant 30min
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
  const now = new Date()
  
  await supabase
    .from('ad_cooldowns')
    .upsert({
      user_id: userId,
      last_ad_watched: now.toISOString(),
      daily_count: 0, // Reset car nous gérons différemment
      daily_reset_date: now.toISOString().split('T')[0],
      fixed_cooldown_duration: 7200, // 2 heures
      updated_at: now.toISOString()
    })
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
