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
      "https://osfexuqvlpxrfaukfobn.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zZmV4dXF2bHB4cmZhdWtmb2JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4NDY3ODIsImV4cCI6MjA2NjQyMjc4Mn0.wu17C74K3kUs8mjRoHwFVAhjgEBmi91gRiJiGkYPICY"
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

    console.log(`💎 Création du paiement pour l'utilisateur: ${user.email}`);

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
      console.log(`✅ Client Stripe existant trouvé: ${customerId}`);
    } else {
      console.log(`🆕 Nouveau client Stripe pour: ${user.email}`);
    }

    // Créer la session de paiement pour Early Access (100 gemmes - 9,99€)
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
      success_url: `${req.headers.get("origin")}/profile?payment=success`,
      cancel_url: `${req.headers.get("origin")}/profile?payment=cancelled`,
      metadata: {
        user_id: user.id,
        product_type: "gems",
        reward_gems: "100"
      }
    });

    // Enregistrer l'achat dans la base de données
    const supabaseService = createClient(
      "https://osfexuqvlpxrfaukfobn.supabase.co",
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
      console.error("❌ Erreur lors de l'enregistrement:", insertError);
      throw new Error("Erreur lors de l'enregistrement de l'achat");
    }

    console.log(`🎯 Session créée: ${session.id}`);

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
    console.error("❌ Erreur create-payment:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});