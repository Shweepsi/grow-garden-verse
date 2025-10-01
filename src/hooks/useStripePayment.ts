import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

export const useStripePayment = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const createPayment = async () => {
    try {
      setIsLoading(true);
      console.log('🚀 Démarrage du processus de paiement...');

      const platform = Capacitor.getPlatform() === 'android' ? 'android' : 'web';

      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { platform }
      });

      if (error) {
        console.error('❌ Erreur lors de la création du paiement:', error);
        throw new Error(error.message || 'Erreur de création du paiement');
      }

      if (!data) {
        throw new Error('Aucune donnée reçue du serveur');
      }

      // Check if data contains an error (backend error response)
      if (data.error) {
        console.error('❌ Erreur serveur:', data.error);
        throw new Error(data.error);
      }

      if (!data.url) {
        throw new Error('URL de paiement non reçue');
      }

      console.log('✅ URL de paiement reçue, ouverture de Stripe...', { platform });

      if (platform === 'android') {
        // Ouvre dans le navigateur in-app et retour via deep link
        await Browser.open({ url: data.url, presentationStyle: 'fullscreen' });
      } else {
        // Web: redirection classique
        window.location.href = data.url;
      }

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