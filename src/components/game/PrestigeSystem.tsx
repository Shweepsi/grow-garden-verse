import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PlayerGarden } from '@/types/game';
import { Crown, Star, Zap, AlertTriangle, Gem } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { useUpgrades } from '@/hooks/useUpgrades';
import { LevelUpgrade } from '@/types/upgrades';

interface PrestigeSystemProps {
  garden: PlayerGarden;
  onPrestige: () => void;
}

export const PrestigeSystem = ({ garden, onPrestige }: PrestigeSystemProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [prestigeUpgrades, setPrestigeUpgrades] = useState<LevelUpgrade[]>([]);
  const { availableUpgrades, isUpgradePurchased } = useUpgrades();

  useEffect(() => {
    // Filtrer les améliorations de prestige
    const prestige = availableUpgrades.filter(upgrade => upgrade.effect_type === 'prestige');
    setPrestigeUpgrades(prestige.sort((a, b) => a.effect_value - b.effect_value));
  }, [availableUpgrades]);

  // Obtenir la prochaine amélioration de prestige disponible
  const getNextPrestigeUpgrade = () => {
    return prestigeUpgrades.find(upgrade => !isUpgradePurchased(upgrade.id));
  };

  const nextPrestige = getNextPrestigeUpgrade();
  const currentPrestigeLevel = prestigeUpgrades.filter(upgrade => isUpgradePurchased(upgrade.id)).length;
  const canPrestige = nextPrestige && 
    garden.coins >= nextPrestige.cost_coins && 
    (garden.gems || 0) >= nextPrestige.cost_gems &&
    garden.level >= nextPrestige.level_required;
  const isMaxPrestige = currentPrestigeLevel >= prestigeUpgrades.length;

  const handlePrestige = async () => {
    if (!canPrestige || isProcessing || !nextPrestige) return;

    try {
      setIsProcessing(true);

      // Acheter l'amélioration de prestige
      const { error: upgradeError } = await supabase
        .from('player_upgrades')
        .insert({
          user_id: garden.user_id,
          upgrade_id: nextPrestige.id
        });

      if (upgradeError) throw upgradeError;

      // Reset des améliorations (sauf prestige)
      await supabase
        .from('player_upgrades')
        .delete()
        .eq('user_id', garden.user_id)
        .neq('upgrade_id', nextPrestige.id)
        .in('upgrade_id', availableUpgrades.filter(u => u.effect_type !== 'prestige').map(u => u.id));

      // Effectuer le reset SANS réinitialiser total_harvests
      const { error } = await supabase
        .from('player_gardens')
        .update({
          coins: garden.coins - nextPrestige.cost_coins + 50, // Déduire le coût + reset à 50
          gems: (garden.gems || 0) - nextPrestige.cost_gems,
          experience: 0,
          level: 1,
          permanent_multiplier: nextPrestige.effect_value,
          prestige_level: currentPrestigeLevel + 1,
          prestige_points: (garden.prestige_points || 0) + 1
        })
        .eq('user_id', garden.user_id);

      if (error) throw error;

      // Reset des parcelles (garder seulement la première débloquée)
      await supabase
        .from('garden_plots')
        .update({
          plant_type: null,
          planted_at: null,
          growth_time_seconds: null,
          plant_metadata: null,
          unlocked: false
        })
        .eq('user_id', garden.user_id)
        .neq('plot_number', 1);

      // S'assurer que la première parcelle reste débloquée
      await supabase
        .from('garden_plots')
        .update({
          plant_type: null,
          planted_at: null,
          growth_time_seconds: null,
          plant_metadata: null,
          unlocked: true
        })
        .eq('user_id', garden.user_id)
        .eq('plot_number', 1);

      // Enregistrer la transaction
      await supabase
        .from('coin_transactions')
        .insert({
          user_id: garden.user_id,
          amount: -nextPrestige.cost_coins,
          transaction_type: 'prestige',
          description: `Prestige ${nextPrestige.display_name}`
        });

      toast.success(`🎉 ${nextPrestige.display_name} accompli ! Multiplicateur permanent : X${nextPrestige.effect_value}`, {
        description: `Vous repartez de zéro avec un bonus permanent de X${nextPrestige.effect_value} sur tous les gains !`
      });

      onPrestige();
    } catch (error: any) {
      toast.error('Erreur lors du prestige', {
        description: error.message
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const progressPercentage = nextPrestige ? Math.min((garden.coins / nextPrestige.cost_coins) * 100, 100) : 0;

  return (
    <Card className="border-2 border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-700">
          <Crown className="h-6 w-6" />
          Système de Prestige
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statut actuel */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            <span className="text-lg font-bold">
              Prestige {currentPrestigeLevel}
            </span>
          </div>
          <div className="flex items-center justify-center gap-2 text-purple-600">
            <Zap className="h-4 w-4" />
            <span className="font-semibold">
              Multiplicateur actuel : X{garden.permanent_multiplier || 1}
            </span>
          </div>
        </div>

        {!isMaxPrestige && nextPrestige ? (
          <>
            {/* Progression vers le prochain prestige */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progrès vers {nextPrestige.display_name}</span>
                <div className="text-right">
                  <div>{garden.coins.toLocaleString()} / {nextPrestige.cost_coins.toLocaleString()} pièces</div>
                  <div className="flex items-center gap-1 text-purple-600">
                    <Gem className="h-3 w-3" />
                    {garden.gems || 0} / {nextPrestige.cost_gems} gemmes
                  </div>
                </div>
              </div>
              <Progress value={progressPercentage} className="h-3" />
              <div className="text-center text-sm text-purple-600">
                Prochain multiplicateur : X{nextPrestige.effect_value}
              </div>
            </div>

            {/* Avertissement */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <div className="font-semibold mb-1">Attention !</div>
                  <div>Le prestige remet votre progression à zéro :</div>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Niveau → 1</li>
                    <li>Pièces → 50</li>
                    <li>Expérience → 0</li>
                    <li>Améliorations → supprimées</li>
                    <li>Parcelles → seule la première reste débloquée</li>
                    <li>Toutes les plantes sont supprimées</li>
                  </ul>
                  <div className="font-semibold mt-2 text-green-700">
                    ✓ Vous gardez : total des récoltes & multiplicateur permanent X{nextPrestige.effect_value}
                  </div>
                </div>
              </div>
            </div>

            {/* Coût du prestige */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="text-sm text-purple-800">
                <div className="font-semibold mb-2">Coût du {nextPrestige.display_name} :</div>
                <div className="flex justify-between items-center">
                  <span>💰 {nextPrestige.cost_coins.toLocaleString()} pièces</span>
                  <span className="flex items-center gap-1">
                    <Gem className="h-4 w-4" />
                    {nextPrestige.cost_gems} gemmes
                  </span>
                </div>
                <div className="mt-1 text-xs">
                  Niveau requis : {nextPrestige.level_required}
                </div>
              </div>
            </div>

            {/* Bouton de prestige */}
            <Button
              onClick={handlePrestige}
              disabled={!canPrestige || isProcessing}
              variant={canPrestige ? "default" : "secondary"}
              size="lg"
              className="w-full"
            >
              {isProcessing ? (
                "Prestige en cours..."
              ) : canPrestige ? (
                <>
                  <Crown className="h-4 w-4 mr-2" />
                  Effectuer le {nextPrestige.display_name}
                </>
              ) : (
                `Conditions non remplies`
              )}
            </Button>
          </>
        ) : (
          <div className="text-center space-y-3">
            <div className="text-lg font-bold text-purple-700">
              🏆 Prestige Maximum Atteint !
            </div>
            <div className="text-purple-600">
              Vous avez atteint le niveau de prestige maximum avec un multiplicateur permanent de X{garden.permanent_multiplier || 1}.
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="text-sm text-purple-800">
                Félicitations ! Vous pouvez maintenant profiter pleinement de votre jardin avec le multiplicateur maximum.
              </div>
            </div>
          </div>
        )}

        {/* Historique des prestiges */}
        {(garden.prestige_points || 0) > 0 && (
          <div className="border-t pt-3">
            <div className="text-center text-sm text-gray-600">
              Points de prestige totaux : {garden.prestige_points || 0}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};