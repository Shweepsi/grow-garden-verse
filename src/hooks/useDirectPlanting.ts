
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { PlantGrowthService } from '@/services/PlantGrowthService';
import { EconomyService } from '@/services/EconomyService';
import { useUpgrades } from '@/hooks/useUpgrades';
import { useAnimations } from '@/contexts/AnimationContext';

export const useDirectPlanting = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { getActiveMultipliers } = useUpgrades();
  const { triggerCoinAnimation } = useAnimations();

  const plantDirectMutation = useMutation({
    mutationFn: async ({ plotNumber, plantTypeId, cost }: { plotNumber: number; plantTypeId: string; cost: number }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Validation stricte des paramètres
      if (!plotNumber || plotNumber < 1 || plotNumber > 9) {
        throw new Error('Numéro de parcelle invalide');
      }
      
      if (!plantTypeId || !cost || cost < 0) {
        throw new Error('Paramètres de plantation invalides');
      }

      console.log(`🌱 Début de la plantation sur la parcelle ${plotNumber}`);
      console.log(`📋 Type de plante: ${plantTypeId}, Coût: ${cost}`);

      // Vérifier les fonds avec protection des 100 pièces minimum
      const { data: garden, error: gardenError } = await supabase
        .from('player_gardens')
        .select('coins, level')
        .eq('user_id', user.id)
        .single();

      if (gardenError) {
        console.error('❌ Erreur récupération jardin:', gardenError);
        throw new Error('Erreur lors de la récupération des données du jardin');
      }

      if (!garden) {
        throw new Error('Jardin non trouvé');
      }

      const currentCoins = garden.coins || 0;
      
      // Vérification avec protection des 100 pièces
      if (!EconomyService.canAffordPlant(currentCoins, cost)) {
        if (currentCoins < cost) {
          throw new Error(`Pas assez de pièces (${currentCoins}/${cost})`);
        } else {
          throw new Error(`Vous devez garder au moins 100 pièces pour pouvoir acheter une carotte`);
        }
      }

      console.log(`💰 Fonds suffisants avec protection: ${currentCoins} >= ${cost + EconomyService.MINIMUM_COINS}`);

      // Obtenir les multiplicateurs actifs
      let multipliers;
      try {
        multipliers = getActiveMultipliers();
        console.log('💪 Multiplicateurs actifs:', multipliers);
      } catch (error) {
        console.warn('⚠️ Erreur lors de la récupération des multiplicateurs:', error);
        multipliers = { harvest: 1, growth: 1 };
      }

      // Vérifier que la parcelle est débloquée et vide
      const { data: plot, error: plotCheckError } = await supabase
        .from('garden_plots')
        .select('unlocked, plant_type')
        .eq('user_id', user.id)
        .eq('plot_number', plotNumber)
        .single();

      if (plotCheckError) {
        console.error('❌ Erreur vérification parcelle:', plotCheckError);
        throw new Error('Erreur lors de la vérification de la parcelle');
      }

      if (!plot) {
        throw new Error('Parcelle non trouvée');
      }

      if (!plot.unlocked) {
        throw new Error('Cette parcelle n\'est pas encore débloquée');
      }

      if (plot.plant_type) {
        throw new Error('Cette parcelle contient déjà une plante');
      }

      console.log('✅ Parcelle valide et disponible');

      // Obtenir les infos de la plante
      const { data: plantType, error: plantError } = await supabase
        .from('plant_types')
        .select('*')
        .eq('id', plantTypeId)
        .single();

      if (plantError) {
        console.error('❌ Erreur récupération plante:', plantError);
        throw new Error('Type de plante non trouvé');
      }

      if (!plantType) {
        throw new Error('Type de plante non trouvé');
      }

      // Vérifier le niveau requis
      const playerLevel = garden.level || 1;
      const requiredLevel = plantType.level_required || 1;
      
      if (playerLevel < requiredLevel) {
        throw new Error(`Niveau ${requiredLevel} requis (vous êtes niveau ${playerLevel})`);
      }

      console.log(`🌱 Plante validée: ${plantType.display_name}`);

      // Calculer le temps de croissance ajusté
      const baseGrowthSeconds = Math.max(1, plantType.base_growth_seconds || 60);
      const growthMultiplier = Math.max(0.1, multipliers.growth || 1);
      const adjustedGrowthTime = EconomyService.getAdjustedGrowthTime(
        baseGrowthSeconds,
        growthMultiplier
      );

      console.log(`⏰ Temps de croissance: ${baseGrowthSeconds}s → ${adjustedGrowthTime}s (x${growthMultiplier})`);

      const now = new Date().toISOString();

      // Planter la plante
      const { error: plantError2 } = await supabase
        .from('garden_plots')
        .update({
          plant_type: plantTypeId,
          planted_at: now,
          growth_time_seconds: adjustedGrowthTime,
          updated_at: now
        })
        .eq('user_id', user.id)
        .eq('plot_number', plotNumber);

      if (plantError2) {
        console.error('❌ Erreur plantation:', plantError2);
        throw new Error('Erreur lors de la plantation');
      }

      console.log('🌱 Plante plantée avec succès');

      // Déduire le coût
      const newCoins = Math.max(0, currentCoins - cost);
      const { error: updateCoinsError } = await supabase
        .from('player_gardens')
        .update({
          coins: newCoins,
          last_played: now
        })
        .eq('user_id', user.id);

      if (updateCoinsError) {
        console.error('❌ Erreur mise à jour pièces:', updateCoinsError);
        throw new Error('Erreur lors de la déduction du coût');
      }

      // Déclencher l'animation de déduction des pièces
      triggerCoinAnimation(-cost);

      console.log(`💰 Coût déduit: ${currentCoins} → ${newCoins}`);

      // Enregistrer la transaction
      try {
        await supabase
          .from('coin_transactions')
          .insert({
            user_id: user.id,
            amount: -cost,
            transaction_type: 'plant_direct',
            description: `Plantation directe de ${plantType.display_name}`
          });
        console.log('💳 Transaction enregistrée');
      } catch (error) {
        console.warn('⚠️ Erreur lors de l\'enregistrement de la transaction:', error);
      }

      console.log('✅ Plantation terminée avec succès');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameData'] });
    },
    onError: (error: any) => {
      console.error('💥 Erreur lors de la plantation:', error);
      toast.error(error.message || 'Erreur lors de la plantation');
    }
  });

  return {
    plantDirect: (plotNumber: number, plantTypeId: string, cost: number) => 
      plantDirectMutation.mutate({ plotNumber, plantTypeId, cost }),
    isPlanting: plantDirectMutation.isPending
  };
};
