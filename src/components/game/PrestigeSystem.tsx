import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PlayerGarden } from '@/types/game';
import { Crown, Star, Zap, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
interface PrestigeSystemProps {
  garden: PlayerGarden;
  onPrestige: () => void;
}
export const PrestigeSystem = ({
  garden,
  onPrestige
}: PrestigeSystemProps) => {
  const [isProcessing, setIsProcessing] = useState(false);

  // Calculer les seuils de prestige
  const getPrestigeThreshold = (level: number) => {
    switch (level) {
      case 0:
        return 100000;
      // 100k pièces pour X2
      case 1:
        return 500000;
      // 500k pièces pour X5  
      case 2:
        return 2000000;
      // 2M pièces pour X10
      default:
        return Infinity;
    }
  };
  const getPrestigeMultiplier = (level: number) => {
    switch (level) {
      case 0:
        return 2;
      case 1:
        return 5;
      case 2:
        return 10;
      default:
        return 10;
    }
  };
  const prestigeLevel = garden.prestige_level || 0;
  const costCoins = Math.pow(10, prestigeLevel + 3); // 1000, 10000, 100000...
  const costGems = Math.pow(2, prestigeLevel) * 10; // 10, 20, 40...
  const nextMultiplier = getPrestigeMultiplier(prestigeLevel);
  const canPrestige = garden.coins >= costCoins && (garden.gems || 0) >= costGems && prestigeLevel < 3;
  const isMaxPrestige = prestigeLevel >= 3;
  const handlePrestige = async () => {
    if (!canPrestige || isProcessing) return;
    try {
      setIsProcessing(true);

      // Coût du prestige basé sur le niveau actuel
      const prestigeLevel = garden.prestige_level || 0;
      const costCoins = Math.pow(10, prestigeLevel + 3); // 1000, 10000, 100000...
      const costGems = Math.pow(2, prestigeLevel) * 10; // 10, 20, 40...

      // Vérifier les fonds
      if (garden.coins < costCoins || (garden.gems || 0) < costGems) {
        toast.error('Fonds insuffisants pour le prestige');
        setIsProcessing(false);
        return;
      }

      // Effectuer le reset avec le nouveau niveau de prestige
      const {
        error
      } = await supabase.from('player_gardens').update({
        coins: 100,
        // Remettre à 100 pièces après avoir payé le coût
        gems: (garden.gems || 0) - costGems,
        // Déduire le coût des gemmes
        experience: 0,
        level: 1,
        prestige_level: (garden.prestige_level || 0) + 1,
        permanent_multiplier: nextMultiplier,
        prestige_points: (garden.prestige_points || 0) + 1
      }).eq('user_id', garden.user_id);
      if (error) throw error;

      // Désactiver les améliorations débloquées au lieu de les supprimer
      await supabase
        .from('player_upgrades')
        .update({ active: false })
        .eq('user_id', garden.user_id);

      // Reset des parcelles (garder seulement la première débloquée)
      await supabase.from('garden_plots').update({
        plant_type: null,
        planted_at: null,
        growth_time_seconds: null,
        plant_metadata: null,
        unlocked: false
      }).eq('user_id', garden.user_id).neq('plot_number', 1);

      // S'assurer que la première parcelle reste débloquée
      await supabase.from('garden_plots').update({
        plant_type: null,
        planted_at: null,
        growth_time_seconds: null,
        plant_metadata: null,
        unlocked: true
      }).eq('user_id', garden.user_id).eq('plot_number', 1);
      toast.success(`🎉 Prestige accompli ! Multiplicateur permanent : X${nextMultiplier}`, {
        description: `Vous repartez de zéro avec un bonus permanent de X${nextMultiplier} sur tous les gains !`
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
  const progressPercentage = Math.min(garden.coins / costCoins * 100, 100);
  return <Card className="border-2 border-purple-200">
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
              Prestige {garden.prestige_level || 0}
            </span>
          </div>
          <div className="flex items-center justify-center gap-2 text-purple-600">
            <Zap className="h-4 w-4" />
            <span className="font-semibold">
              Multiplicateur actuel : X{garden.permanent_multiplier || 1}
            </span>
          </div>
        </div>

        {!isMaxPrestige ? <>
            {/* Coût du prestige */}
            <div className="space-y-3">
              <div className="text-center">
                <h3 className="font-semibold text-purple-700 mb-2">Coût du Prestige {prestigeLevel + 1}</h3>
                <div className="flex justify-center gap-4">
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-600">🪙</span>
                    <span className={`font-medium ${garden.coins >= costCoins ? 'text-green-600' : 'text-red-500'}`}>
                      {costCoins.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-purple-600">💎</span>
                    <span className={`font-medium ${(garden.gems || 0) >= costGems ? 'text-green-600' : 'text-red-500'}`}>
                      {costGems.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-center text-sm text-purple-600">
                Prochain multiplicateur : X{nextMultiplier}
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
                    <li>Pièces → 100</li>
                    <li>Améliorations → toutes réinitialisées</li>
                    
                    <li>Parcelles → seule la première reste débloquée</li>
                    
                  </ul>
                  <div className="font-semibold mt-2 text-green-700">
                    ✓ Vous gardez : multiplicateur permanent X{nextMultiplier}
                  </div>
                </div>
              </div>
            </div>

            {/* Bouton de prestige */}
            <Button onClick={handlePrestige} disabled={!canPrestige || isProcessing} variant={canPrestige ? "default" : "secondary"} size="lg" className="w-full">
              {isProcessing ? "Prestige en cours..." : canPrestige ? <>
                  <Crown className="h-4 w-4 mr-2" />
                  Effectuer le Prestige (X{nextMultiplier})
                </> : `Fonds insuffisants`}
            </Button>
          </> : <div className="text-center space-y-3">
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
          </div>}

        {/* Historique des prestiges */}
        {(garden.prestige_points || 0) > 0}
      </CardContent>
    </Card>;
};