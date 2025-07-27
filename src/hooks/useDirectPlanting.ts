import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGameData } from '@/hooks/useGameData';
import { useGameMultipliers } from '@/hooks/useGameMultipliers';
import { EconomyService } from '@/services/EconomyService';
import { toast } from 'sonner';
import { MAX_PLOTS } from '@/constants';

export const useDirectPlanting = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: gameData } = useGameData();

  const plantDirectMutation = useMutation({
    mutationFn: async ({ plotNumber, plantTypeId, expectedCost }: {
      plotNumber: number;
      plantTypeId: string;
      expectedCost: number;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Validation stricte du numéro de parcelle
      if (!plotNumber || plotNumber < 1 || plotNumber > MAX_PLOTS) {
        throw new Error('Numéro de parcelle invalide');
      }

      console.log(`🌱 Début de la plantation directe sur la parcelle ${plotNumber}`);

      // Récupérer les infos de la parcelle
      const { data: plot, error: plotError } = await supabase
        .from('garden_plots')
        .select('*')
        .eq('user_id', user.id)
        .eq('plot_number', plotNumber)
        .single();

      if (plotError) {
        console.error('❌ Erreur parcelle:', plotError);
        throw new Error(`Erreur lors de la récupération de la parcelle: ${plotError.message}`);
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

      // Récupérer le type de plante
      const { data: plantType, error: plantTypeError } = await supabase
        .from('plant_types')
        .select('*')
        .eq('id', plantTypeId)
        .single();

      if (plantTypeError || !plantType) {
        throw new Error('Type de plante non trouvé');
      }

      console.log('🌱 Type de plante:', plantType.display_name);

      // Obtenir les données du jardin
      const { data: garden, error: gardenError } = await supabase
        .from('player_gardens')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (gardenError || !garden) {
        throw new Error('Jardin non trouvé');
      }

      // Vérifier le niveau requis
      const playerLevel = garden.level || 1;
      const requiredLevel = plantType.level_required || 1;
      
      if (playerLevel < requiredLevel) {
        throw new Error(`Niveau ${requiredLevel} requis pour cette plante`);
      }

      // Obtenir les multiplicateurs complets (permanent + boosts)
      let multipliers;
      try {
        const { getCompleteMultipliers } = useGameMultipliers();
        multipliers = getCompleteMultipliers();
        console.log('💪 Multiplicateurs complets (permanent + boosts):', multipliers);
      } catch (error) {
        console.warn('⚠️ Erreur lors de la récupération des multiplicateurs, utilisation des valeurs par défaut:', error);
        multipliers = { harvest: 1, growth: 1 };
      }

      // Calculer le coût avec multiplicateurs
      const baseCost = EconomyService.getPlantDirectCost(requiredLevel);
      const actualCost = EconomyService.getAdjustedPlantCost(baseCost, multipliers.plantCostReduction || 1);

      // Vérification du coût attendu (sécurité anti-cheat basique)
      if (Math.abs(actualCost - expectedCost) > 1) {
        console.warn(`⚠️ Écart de coût détecté: attendu ${expectedCost}, calculé ${actualCost}`);
        throw new Error('Erreur de coût, veuillez recharger la page');
      }

      // Vérifier les fonds
      if (!EconomyService.canAffordPlant(garden.coins, actualCost)) {
        throw new Error('Pas assez de pièces pour planter');
      }

      console.log(`💰 Coût de plantation: ${actualCost} pièces`);

      // Calculer le temps de croissance ajusté
      const baseGrowthSeconds = plantType.base_growth_seconds || 60;
      const adjustedGrowthTime = EconomyService.getAdjustedGrowthTime(baseGrowthSeconds, multipliers.growth || 1);

      console.log(`⏰ Temps de croissance: ${adjustedGrowthTime}s (base: ${baseGrowthSeconds}s)`);

      const now = new Date().toISOString();

      // Planter sur la parcelle
      const { error: updatePlotError } = await supabase
        .from('garden_plots')
        .update({
          plant_type: plantTypeId,
          planted_at: now,
          growth_time_seconds: adjustedGrowthTime,
          updated_at: now
        })
        .eq('user_id', user.id)
        .eq('plot_number', plotNumber);

      if (updatePlotError) {
        console.error('❌ Erreur plantation:', updatePlotError);
        throw new Error(`Erreur lors de la plantation: ${updatePlotError.message}`);
      }

      console.log('🌱 Plantation réussie sur la parcelle');

      // Déduire le coût du jardin
      const { error: updateGardenError } = await supabase
        .from('player_gardens')
        .update({
          coins: garden.coins - actualCost,
          last_played: now
        })
        .eq('user_id', user.id);

      if (updateGardenError) {
        console.error('❌ Erreur mise à jour jardin:', updateGardenError);
        throw new Error(`Erreur lors de la mise à jour du jardin: ${updateGardenError.message}`);
      }

      console.log('🏡 Jardin mis à jour');

      // Enregistrer la transaction
      try {
        await supabase
          .from('coin_transactions')
          .insert({
            user_id: user.id,
            amount: -actualCost,
            transaction_type: 'plant',
            description: `Plantation de ${plantType.display_name}`
          });
        console.log('💳 Transaction enregistrée');
      } catch (error) {
        console.warn('⚠️ Erreur lors de l\'enregistrement de la transaction:', error);
      }

      console.log('✅ Plantation directe terminée avec succès');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameData'] });
    },
    onError: (error: any) => {
      console.error('💥 Erreur lors de la plantation directe:', error);
      toast.error(error.message || 'Erreur lors de la plantation');
    }
  });

  const { getCompleteMultipliers } = useGameMultipliers();

  return {
    plantDirect: (plotNumber: number, plantTypeId: string, expectedCost: number) => 
      plantDirectMutation.mutate({ plotNumber, plantTypeId, expectedCost }),
    isPlanting: plantDirectMutation.isPending,
    isPlantingPlot: (plotNumber: number) => plantDirectMutation.isPending,
    getActiveMultipliers: getCompleteMultipliers
  };
};