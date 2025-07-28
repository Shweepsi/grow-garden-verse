import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Settings, RefreshCw, Database } from 'lucide-react';
import { useAdRewards } from '@/hooks/useAdRewards';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function AdRewardAdminPanel() {
  const { availableRewards, isLoadingRewards, refreshRewards, clearRewardsCache } = useAdRewards();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  // Fonction pour tester la mise à jour dynamique d'une récompense
  const updateGemBoostReward = async () => {
    setIsUpdating(true);
    try {
      // Exemple : modifier la récompense gem_boost pour démontrer l'affichage dynamique
      const newAmount = Math.random() > 0.5 ? 1.5 : 2.0;
      const newEmoji = Math.random() > 0.5 ? '✨' : '💎';
      
      const { error } = await supabase
        .from('ad_reward_configs')
        .update({
          base_amount: newAmount,
          emoji: newEmoji,
          description: `Boost gemmes x${newAmount} (Test dynamique)`
        })
        .eq('reward_type', 'gem_boost');

      if (error) throw error;

      // Forcer le rafraîchissement pour voir les changements immédiatement
      await refreshRewards();

      toast({
        title: "Récompense mise à jour",
        description: `Gem Boost modifié : x${newAmount} ${newEmoji}`,
      });
    } catch (error) {
      console.error('Error updating reward:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la récompense",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Fonction pour restaurer les valeurs par défaut
  const resetToDefaults = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('ad_reward_configs')
        .update({
          base_amount: 1.5,
          emoji: '✨',
          description: 'Boost gemmes x1.5'
        })
        .eq('reward_type', 'gem_boost');

      if (error) throw error;

      await refreshRewards();

      toast({
        title: "Récompenses restaurées",
        description: "Valeurs par défaut appliquées",
      });
    } catch (error) {
      console.error('Error resetting rewards:', error);
      toast({
        title: "Erreur",
        description: "Impossible de restaurer les récompenses",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-blue-800">Panneau d'administration - Récompenses dynamiques</h3>
        </div>

        <div className="text-sm text-blue-700 bg-blue-100 p-3 rounded-lg">
          <p>✨ <strong>Affichage dynamique actif :</strong> Les récompenses se mettent à jour automatiquement depuis Supabase.</p>
          <p>🔄 <strong>Rafraîchissement :</strong> Toutes les 30 secondes ou manuellement.</p>
          <p>💾 <strong>Cache intelligent :</strong> Optimisation des performances avec invalidation automatique.</p>
        </div>

        {/* État des récompenses actuelles */}
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700 flex items-center gap-2">
            <Database className="h-4 w-4" />
            Récompenses actuelles ({availableRewards.length})
          </h4>
          
          {isLoadingRewards ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement des données Supabase...
            </div>
          ) : (
            <div className="grid gap-2 max-h-32 overflow-y-auto">
              {availableRewards.map((reward, index) => (
                <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{reward.emoji}</span>
                    <span className="text-sm font-medium">{reward.type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {reward.type.includes('boost') ? `×${reward.amount}` : `+${Math.floor(reward.amount)}`}
                    </Badge>
                    {reward.duration && (
                      <Badge variant="secondary" className="text-xs">
                        {reward.duration}min
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions de test */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshRewards}
            disabled={isLoadingRewards}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`h-3 w-3 ${isLoadingRewards ? 'animate-spin' : ''}`} />
            Rafraîchir
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={updateGemBoostReward}
            disabled={isUpdating || isLoadingRewards}
            className="flex items-center gap-1 text-purple-700 border-purple-300 hover:bg-purple-50"
          >
            {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <span>💎</span>}
            Test Gem Boost
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefaults}
            disabled={isUpdating || isLoadingRewards}
            className="flex items-center gap-1 text-gray-600 border-gray-300 hover:bg-gray-50"
          >
            {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <span>🔄</span>}
            Restaurer
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={clearRewardsCache}
            disabled={isLoadingRewards}
            className="flex items-center gap-1 text-red-600 border-red-300 hover:bg-red-50"
          >
            <span>🗑️</span>
            Vider cache
          </Button>
        </div>

        <div className="text-xs text-gray-500">
          <p>💡 <strong>Test :</strong> Cliquez sur "Test Gem Boost" pour modifier dynamiquement la récompense et voir l'affichage se mettre à jour en temps réel.</p>
        </div>
      </div>
    </Card>
  );
}