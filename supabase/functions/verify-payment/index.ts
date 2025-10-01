import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔍 [Verify] Starting payment verification");

    const { sessionId } = await req.json();
    
    if (!sessionId) {
      console.error("❌ [Verify] No session ID provided");
      throw new Error("Session ID manquant");
    }

    console.log("ℹ️ [Verify] Session ID:", sessionId);

    // Verify environment variables
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeSecretKey) {
      console.error("❌ [Verify] Missing Stripe secret key");
      throw new Error("Stripe n'est pas configuré");
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("❌ [Verify] Missing Supabase credentials");
      throw new Error("Configuration du serveur incomplète");
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    console.log("✅ [Verify] Stripe initialized");

    // Retrieve Stripe session
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId);
      console.log("✅ [Verify] Stripe session retrieved:", {
        id: session.id,
        status: session.payment_status,
        amount: session.amount_total
      });
    } catch (stripeError: any) {
      console.error("❌ [Verify] Stripe session retrieval error:", stripeError.message);
      throw new Error("Session de paiement non trouvée");
    }
    
    if (session.payment_status !== "paid") {
      console.warn("⚠️ [Verify] Payment not completed:", session.payment_status);
      return new Response(
        JSON.stringify({ 
          verified: false, 
          status: session.payment_status 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.log("✅ [Verify] Payment confirmed as paid");

    // Create Supabase client with service role key
    const supabaseService = createClient(
      supabaseUrl,
      supabaseServiceKey,
      { auth: { persistSession: false } }
    );

    // Get purchase from database
    const { data: purchase, error: purchaseError } = await supabaseService
      .from("purchases")
      .select("*")
      .eq("stripe_session_id", sessionId)
      .single();

    if (purchaseError) {
      console.error("❌ [Verify] Purchase lookup error:", purchaseError.message);
      throw new Error("Achat non trouvé dans la base de données");
    }

    if (!purchase) {
      console.error("❌ [Verify] Purchase not found for session:", sessionId);
      throw new Error("Achat non trouvé");
    }

    console.log("✅ [Verify] Purchase found:", {
      id: purchase.id,
      userId: purchase.user_id,
      status: purchase.status
    });

    // Check if already processed
    if (purchase.status === "completed") {
      console.log("ℹ️ [Verify] Purchase already processed");
      return new Response(
        JSON.stringify({ 
          verified: true, 
          alreadyProcessed: true 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Award gems and premium status
    const rewardGems = purchase.reward_data?.gems || 100;
    console.log("ℹ️ [Verify] Awarding gems:", rewardGems);
    
    // Get current gems
    const { data: currentGarden, error: gardenError } = await supabaseService
      .from("player_gardens")
      .select("gems")
      .eq("user_id", purchase.user_id)
      .single();

    if (gardenError) {
      console.error("❌ [Verify] Garden lookup error:", gardenError.message);
      throw new Error("Erreur lors de la récupération du jardin");
    }

    const currentGems = currentGarden?.gems || 0;
    const newGemsTotal = currentGems + rewardGems;
    
    console.log("ℹ️ [Verify] Gems update:", {
      current: currentGems,
      reward: rewardGems,
      new: newGemsTotal
    });

    // Update player garden with gems and premium status
    const { error: updateGemsError } = await supabaseService
      .from("player_gardens")
      .update({ 
        gems: newGemsTotal,
        premium_status: true,
        premium_purchased_at: new Date().toISOString()
      })
      .eq("user_id", purchase.user_id);

    if (updateGemsError) {
      console.error("❌ [Verify] Gems update error:", updateGemsError.message);
      throw new Error("Erreur lors de l'attribution des gemmes");
    }

    console.log("✅ [Verify] Gems and premium status updated");

    // Mark purchase as completed
    const { error: updatePurchaseError } = await supabaseService
      .from("purchases")
      .update({ 
        status: "completed",
        updated_at: new Date().toISOString()
      })
      .eq("id", purchase.id);

    if (updatePurchaseError) {
      console.error("❌ [Verify] Purchase update error:", updatePurchaseError.message);
      throw new Error("Erreur lors de la mise à jour de l'achat");
    }

    console.log("✅ [Verify] Purchase marked as completed");
    console.log("✅ [Verify] Payment verification successful");

    return new Response(
      JSON.stringify({ 
        verified: true,
        gemsAwarded: rewardGems,
        alreadyProcessed: false
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("❌ [Verify] Fatal error:", error.message);
    console.error("❌ [Verify] Stack:", error.stack);

    return new Response(
      JSON.stringify({ 
        error: error.message || "Erreur lors de la vérification du paiement",
        details: Deno.env.get("ENV") === "development" ? error.stack : undefined
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});