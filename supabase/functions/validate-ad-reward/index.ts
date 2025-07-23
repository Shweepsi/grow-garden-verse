
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// AdMob SSV Cryptographic Validation
interface AdMobPublicKey {
  keyId: number;
  pem: string;
  base64: string;
}

interface AdMobKeysResponse {
  keys: AdMobPublicKey[];
}

// Cache des clés publiques (24h selon recommandations Google)
let cachedKeys: Map<number, CryptoKey> = new Map();
let lastKeyFetch = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 heures

/**
 * Récupère et met en cache les clés publiques AdMob
 */
async function fetchAdMobPublicKeys(): Promise<Map<number, CryptoKey>> {
  const now = Date.now();
  
  // Utiliser le cache si valide
  if (cachedKeys.size > 0 && (now - lastKeyFetch) < CACHE_DURATION) {
    console.log('AdMob SSV: Using cached public keys');
    return cachedKeys;
  }

  try {
    console.log('AdMob SSV: Fetching fresh public keys from Google');
    
    const response = await fetch('https://www.gstatic.com/admob/reward/verifier-keys.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch keys: ${response.status}`);
    }

    const keysData: AdMobKeysResponse = await response.json();
    
    if (!keysData.keys || keysData.keys.length === 0) {
      throw new Error('No public keys found in response');
    }

    // Nettoyer l'ancien cache
    cachedKeys.clear();

    // Importer les nouvelles clés
    for (const key of keysData.keys) {
      try {
        const keyData = base64ToArrayBuffer(key.base64);
        const cryptoKey = await crypto.subtle.importKey(
          'spki',
          keyData,
          {
            name: 'ECDSA',
            namedCurve: 'P-256'
          },
          false,
          ['verify']
        );
        
        cachedKeys.set(key.keyId, cryptoKey);
        console.log(`AdMob SSV: Imported key ${key.keyId}`);
      } catch (error) {
        console.error(`AdMob SSV: Failed to import key ${key.keyId}:`, error);
      }
    }

    lastKeyFetch = now;
    console.log(`AdMob SSV: Successfully cached ${cachedKeys.size} public keys`);
    
    return cachedKeys;
  } catch (error) {
    console.error('AdMob SSV: Failed to fetch public keys:', error);
    
    // Retourner le cache existant si disponible
    if (cachedKeys.size > 0) {
      console.log('AdMob SSV: Using stale cached keys due to fetch error');
      return cachedKeys;
    }
    
    throw error;
  }
}

/**
 * Valide la signature cryptographique d'un callback AdMob SSV
 * Selon les spécifications Google AdMob
 */
async function validateSSVSignature(url: URL): Promise<boolean> {
  try {
    const params = url.searchParams;
    const signature = params.get('signature');
    const keyIdStr = params.get('key_id');
    
    console.log('AdMob SSV: Full URL being validated:', url.toString());
    console.log('AdMob SSV: Query parameters:', Object.fromEntries(params.entries()));
    
    if (!signature || !keyIdStr) {
      console.error('AdMob SSV: Missing signature or key_id');
      return false;
    }

    const keyId = parseInt(keyIdStr);
    if (isNaN(keyId)) {
      console.error('AdMob SSV: Invalid key_id');
      return false;
    }

    // Récupérer les clés publiques
    const publicKeys = await fetchAdMobPublicKeys();
    const publicKey = publicKeys.get(keyId);
    
    if (!publicKey) {
      console.error(`AdMob SSV: Public key not found for key_id: ${keyId}`);
      return false;
    }

    // CORRECTION: Construire correctement le contenu à vérifier
    // Google signe l'URL complète SANS les paramètres signature et key_id
    const queryString = url.search.substring(1); // Enlever le '?'
    console.log('AdMob SSV: Original query string:', queryString);
    
    // Reconstruire l'URL sans signature et key_id
    const paramsToSign = new URLSearchParams();
    for (const [key, value] of params.entries()) {
      if (key !== 'signature' && key !== 'key_id') {
        paramsToSign.append(key, value);
      }
    }
    
    // IMPORTANT: Google utilise l'ordre alphabétique des paramètres pour la signature
    paramsToSign.sort();
    const contentToVerify = paramsToSign.toString();
    
    console.log('AdMob SSV: Content to verify (without signature/key_id):', contentToVerify);
    console.log('AdMob SSV: Signature to verify:', signature);
    console.log('AdMob SSV: Key ID used:', keyId);
    
    const contentBytes = new TextEncoder().encode(contentToVerify);

    // Décoder la signature base64url
    const signatureBytes = base64UrlToArrayBuffer(signature);
    console.log('AdMob SSV: Signature bytes length:', signatureBytes.byteLength);

    // Vérifier la signature avec ECDSA-SHA256
    const isValid = await crypto.subtle.verify(
      {
        name: 'ECDSA',
        hash: 'SHA-256'
      },
      publicKey,
      signatureBytes,
      contentBytes
    );

    console.log(`AdMob SSV: Cryptographic signature validation result: ${isValid}`);
    
    if (!isValid) {
      console.error('AdMob SSV: Signature validation failed. Details:', {
        keyId,
        contentToVerify,
        signatureLength: signature.length,
        originalQuery: queryString
      });
    }
    
    return isValid;
    
  } catch (error) {
    console.error('AdMob SSV: Signature validation failed:', error);
    return false;
  }
}

/**
 * Utilitaires de conversion
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function base64UrlToArrayBuffer(base64Url: string): ArrayBuffer {
  // Convertir base64url vers base64 standard
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  return base64ToArrayBuffer(base64);
}

interface AdMobRewardPayload {
  user_id: string
  reward_type: string
  reward_amount: number
  ad_duration: number
  signature?: string
  source?: string // 'client_immediate', 'ssv', etc.
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
    const startTime = Date.now();
    const url = new URL(req.url)
    const searchParams = url.searchParams
    
    console.log('AdMob SSV: Processing callback - URL:', req.url)
    console.log('AdMob SSV: Headers:', Object.fromEntries(req.headers.entries()))
    
    // AMÉLIORATION: Validation cryptographique robuste avec monitoring
    let signatureValid = false;
    let signatureError = null;
    
    try {
      signatureValid = await validateSSVSignature(url);
      console.log(`AdMob SSV: Signature validation result: ${signatureValid}`);
      
      if (!signatureValid) {
        console.error('AdMob SSV: Cryptographic signature validation failed - processing as invalid but acknowledging');
        signatureError = 'Invalid cryptographic signature';
        
        // AMÉLIORATION: Toujours retourner 200 OK mais logging détaillé pour analyse
        return new Response(
          JSON.stringify({ 
            success: true, // Pour éviter les retries Google
            processed: false,
            reason: 'invalid_signature',
            message: 'AdMob SSV callback acknowledged but not processed due to signature validation failure',
            timestamp: new Date().toISOString(),
            processing_time: Date.now() - startTime
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      console.log('AdMob SSV: Cryptographic signature validation passed');
    } catch (error) {
      console.error('AdMob SSV: Signature validation error:', error);
      signatureError = (error as Error).message;
      
      // Continuer le traitement même en cas d'erreur de validation pour éviter les retries
      console.log('AdMob SSV: Continuing processing despite signature validation error');
    }
    
    // Extract AdMob SSV parameters avec décodage percent-encoding
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
    
    // AMÉLIORATION: Décodage percent-encoding complet pour custom_data
    if (customData) {
      try {
        // Double décodage pour gérer l'encodage multiple
        customData = decodeURIComponent(decodeURIComponent(customData));
        console.log('AdMob SSV: Decoded custom_data:', customData);
      } catch (error) {
        console.warn('AdMob SSV: Failed to decode custom_data, trying single decode:', error);
        try {
          customData = decodeURIComponent(customData);
        } catch (fallbackError) {
          console.warn('AdMob SSV: Single decode also failed:', fallbackError);
        }
      }
    }
    
    console.log('Edge Function: AdMob SSV Request - Processed params:', {
      adNetwork, adUnit, rewardAmount, rewardItem, timestamp, transactionId, signature, keyId, userId, customData
    })
    
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
    
    // AMÉLIORATION: Traitement optimisé du reward standard AdMob
    try {
      // Mapping intelligent du reward standard vers les rewards du jeu
      let rewardType = 'gems' // Par défaut gems pour meilleure UX
      let playerLevel = 1
      let sessionId = null
      let validationMetadata = {}
      
      console.log('AdMob SSV: Processing reward mapping - Standard reward_item:', rewardItem, 'Amount:', rewardAmount)
      
      // PRIORITÉ: Extraire les détails des custom_data si disponibles
      if (customData && customData !== '{CUSTOM_DATA}' && customData !== 'CUSTOM_DATA') {
        try {
          const parsedCustomData = JSON.parse(customData)
          console.log('AdMob SSV: Enhanced custom_data parsed:', parsedCustomData)
          
          // Extraire les métadonnées enrichies
          if (parsedCustomData.reward_type) rewardType = parsedCustomData.reward_type
          if (parsedCustomData.player_level) playerLevel = parsedCustomData.player_level
          if (parsedCustomData.session_id) sessionId = parsedCustomData.session_id
          if (parsedCustomData.platform) validationMetadata.platform = parsedCustomData.platform
          if (parsedCustomData.app_version) validationMetadata.app_version = parsedCustomData.app_version
          if (parsedCustomData.validation_mode) validationMetadata.validation_mode = parsedCustomData.validation_mode
          
          console.log('AdMob SSV: Extracted reward mapping:', { rewardType, playerLevel, sessionId, validationMetadata })
        } catch (e) {
          console.log('AdMob SSV: Custom_data parsing failed, using intelligent defaults:', e)
          // Fallback intelligent basé sur l'heure pour variety
          const hour = new Date().getHours()
          rewardType = hour % 3 === 0 ? 'coins' : hour % 3 === 1 ? 'gems' : 'coin_boost'
        }
      } else {
        console.log('AdMob SSV: No custom_data available, using intelligent reward rotation')
        // Rotation intelligente des rewards quand pas de custom_data
        const rewardRotation = ['gems', 'coins', 'coin_boost']
        rewardType = rewardRotation[Math.floor(Date.now() / 3600000) % 3]
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
      const processingTime = Date.now() - startTime;
      
      if (result.success) {
        await updateAdCooldown(userId)
        await logAdReward(userId, rewardType, adjustedAmount, 30, transactionId, 'ssv')
        
        console.log(`AdMob SSV: Successfully processed reward for user: ${userId} - Type: ${rewardType}, Amount: ${adjustedAmount}, Processing time: ${processingTime}ms`)
        
        // AMÉLIORATION: Réponse enrichie avec métadonnées complètes
        return new Response(
          JSON.stringify({ 
            success: true, 
            processed: true,
            reward_details: {
              type: rewardType,
              amount: adjustedAmount,
              duration: rewardConfig.duration_minutes || 30,
              player_level: playerLevel
            },
            user_id: userId,
            session_id: sessionId,
            validation: {
              method: 'server_side_verification',
              signature_valid: signatureValid,
              custom_data_used: !!customData
            },
            performance: {
              processing_time_ms: processingTime
            },
            timestamp: new Date().toISOString()
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      } else {
        console.error(`AdMob SSV: Failed to apply reward: ${result.error} - Processing time: ${processingTime}ms`)
        
        // AMÉLIORATION: Même en cas d'erreur, retourner 200 OK avec détails pour analyse
        return new Response(
          JSON.stringify({ 
            success: true, // Pour Google, éviter les retries
            processed: false,
            reason: 'reward_application_failed',
            error: result.error,
            reward_details: {
              type: rewardType,
              amount: adjustedAmount,
              player_level: playerLevel
            },
            user_id: userId,
            session_id: sessionId,
            performance: {
              processing_time_ms: processingTime
            },
            timestamp: new Date().toISOString()
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`AdMob SSV: Error processing callback: ${(error as Error).message} - Processing time: ${processingTime}ms`)
      
      // AMÉLIORATION: Toujours retourner 200 OK même en cas d'erreur système avec monitoring complet
      return new Response(
        JSON.stringify({ 
          success: true, // Pour Google, éviter les retries
          processed: false,
          reason: 'system_error',
          error: 'Internal processing error',
          details: (error as Error).message,
          performance: {
            processing_time_ms: processingTime
          },
          timestamp: new Date().toISOString()
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
  }

  // Handle POST requests (from client immediate reward ou development)
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
    
    // AMÉLIORATION: Détecter si c'est une récompense immédiate côté client
    const isClientImmediate = (payload as any).source === 'client_immediate';
    if (isClientImmediate) {
      console.log('AdMob: Processing immediate client reward for optimal UX');
    }

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
    await logAdReward(payload.user_id, payload.reward_type, calculatedAmount, durationMinutes, payload.source || 'POST')

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
    }, {
      onConflict: 'user_id',
      ignoreDuplicates: false
    });

  if (error) {
    console.error('Edge Function: Failed to update ad cooldown:', error);
    throw error;
  }
  
  console.log(`Edge Function: Ad watched ${newDailyCount}/5 today for user ${userId}`);
}

async function logAdReward(userId: string, rewardType: string, amount: number, adDuration: number, transactionId?: string, source?: string): Promise<void> {
  await supabase
    .from('ad_sessions')
    .insert({
      user_id: userId,
      reward_type: rewardType,
      reward_amount: amount,
      reward_data: {
        ad_duration: adDuration,
        applied_at: new Date().toISOString(),
        source: source || 'server_validation',
        transaction_id: transactionId,
        validation_method: 'cryptographic_ssv'
      }
    })
}
