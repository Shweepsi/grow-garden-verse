import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();
    
    if (!sessionId) {
      throw new Error("Session ID manquant");
    }

    

    // Initialiser Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Récupérer la session Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status !== "paid") {
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

    // Client Supabase avec clé service pour bypasser RLS
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Récupérer l'achat depuis la DB
    const { data: purchase, error: purchaseError } = await supabaseService
      .from("purchases")
      .select("*")
      .eq("stripe_session_id", sessionId)
      .single();

    if (purchaseError || !purchase) {
      throw new Error("Achat non trouvé dans la base de données");
    }

    // Vérifier si déjà traité
    if (purchase.status === "completed") {
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

    // Attribuer les gemmes et le statut premium au joueur
    const rewardGems = purchase.reward_data?.gems || 100;
    
    // D'abord récupérer les gemmes actuelles
    const { data: currentGarden, error: gardenError } = await supabaseService
      .from("player_gardens")
      .select("gems")
      .eq("user_id", purchase.user_id)
      .single();

    if (gardenError) {
      throw new Error("Erreur lors de la récupération du jardin");
    }

    const currentGems = currentGarden?.gems || 0;
    const newGemsTotal = currentGems + rewardGems;
    
    const { error: updateGemsError } = await supabaseService
      .from("player_gardens")
      .update({ 
        gems: newGemsTotal,
        premium_status: true,
        premium_purchased_at: new Date().toISOString()
      })
      .eq("user_id", purchase.user_id);

    if (updateGemsError) {
      throw new Error("Erreur lors de l'attribution des gemmes");
    }

    // Marquer l'achat comme terminé
    const { error: updatePurchaseError } = await supabaseService
      .from("purchases")
      .update({ 
        status: "completed",
        updated_at: new Date().toISOString()
      })
      .eq("id", purchase.id);

    if (updatePurchaseError) {
      throw new Error("Erreur lors de la mise à jour de l'achat");
    }

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

  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Erreur lors de la vérification du paiement" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});