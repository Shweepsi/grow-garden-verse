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
    // Créer le client Supabase pour l'authentification
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Récupérer l'utilisateur authentifié
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Autorisation requise");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user?.email) {
      throw new Error("Utilisateur non authentifié");
    }

    // Initialiser Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Vérifier si le client Stripe existe
    const customers = await stripe.customers.list({ 
      email: user.email, 
      limit: 1 
    });
    
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Déterminer les URLs de retour selon la plateforme
    const body = await req.json().catch(() => ({}));
    const platform = body?.platform ?? 'web';

    const successUrl = platform === 'android'
      ? 'idlegrow://payment/success?session_id={CHECKOUT_SESSION_ID}'
      : `${req.headers.get("origin")}/store?payment=success&session_id={CHECKOUT_SESSION_ID}`;

    const cancelUrl = platform === 'android'
      ? 'idlegrow://payment/cancelled'
      : `${req.headers.get("origin")}/store?payment=cancelled`;

    // Créer la session de paiement pour Early Access (100 gemmes - 10€)
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { 
              name: "🚀 Early Access Pack",
              description: "100 Gemmes Premium pour débloquer des fonctionnalités exclusives"
            },
            unit_amount: 999, // 9,99€ en centimes
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        user_id: user.id,
        product_type: "gems",
        reward_gems: "100"
      }
    });

    // Enregistrer l'achat dans la base de données
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { error: insertError } = await supabaseService
      .from("purchases")
      .insert({
        user_id: user.id,
        stripe_session_id: session.id,
        amount: 999,
        currency: "eur",
        status: "pending",
        product_type: "gems",
        reward_data: { gems: 100 }
      });

    if (insertError) {
      throw new Error("Erreur lors de l'enregistrement de l'achat");
    }

    return new Response(
      JSON.stringify({ 
        url: session.url,
        sessionId: session.id 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Erreur lors de la création du paiement" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});