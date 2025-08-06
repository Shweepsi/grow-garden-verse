import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useStripePayment = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const createPayment = async () => {
    try {
      setIsLoading(true);
      
      console.log('🚀 Démarrage du processus de paiement...');
      
      const { data, error } = await supabase.functions.invoke('create-payment');
      
      if (error) {
        console.error('❌ Erreur lors de la création du paiement:', error);
        throw error;
      }

      if (!data?.url) {
        throw new Error('URL de paiement non reçue');
      }

      console.log('✅ URL de paiement reçue, ouverture de Stripe...');
      
      // Rediriger vers Stripe dans le même onglet pour mobile
      window.location.href = data.url;
      
      toast({
        title: "Redirection vers Stripe",
        description: "Complétez votre paiement",
      });

      return { success: true, sessionId: data.sessionId };
      
    } catch (error: any) {
      console.error('❌ Erreur payment:', error);
      
      toast({
        variant: "destructive",
        title: "Erreur de paiement",
        description: error.message || "Impossible de créer le paiement",
      });
      
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const verifyPayment = async (sessionId: string) => {
    try {
      console.log('🔍 Vérification du paiement:', sessionId);
      
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { sessionId }
      });
      
      if (error) {
        console.error('❌ Erreur vérification:', error);
        throw error;
      }

      if (data?.verified) {
        console.log('✅ Paiement vérifié avec succès');
        
        if (!data.alreadyProcessed) {
          toast({
            title: "Paiement confirmé !",
            description: `${data.gemsAwarded} gemmes ajoutées à votre compte`,
          });
        }
        
        return { verified: true, gemsAwarded: data.gemsAwarded };
      }
      
      return { verified: false };
      
    } catch (error: any) {
      console.error('❌ Erreur vérification payment:', error);
      
      toast({
        variant: "destructive",
        title: "Erreur de vérification",
        description: "Impossible de vérifier le paiement",
      });
      
      return { verified: false, error: error.message };
    }
  };

  return {
    createPayment,
    verifyPayment,
    isLoading
  };
};