import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Zap, Clock } from 'lucide-react';
import { AdReward } from '@/types/ads';

interface AdRewardSelectorProps {
  availableRewards: AdReward[];
  selectedReward: AdReward | null;
  loadingRewards: boolean;
  onSelectReward: (reward: AdReward) => void;
}

export function AdRewardSelector({
  availableRewards,
  selectedReward,
  loadingRewards,
  onSelectReward
}: AdRewardSelectorProps) {

  const getRewardIcon = (type: string) => {
    switch (type) {
      case 'coins': return '🪙';
      case 'gems': return '💎';
      case 'coin_boost': return '⚡';
      case 'gem_boost': return '✨';
      case 'growth_speed':
      case 'growth_boost':
        return '🌱';
      default: return '🎁';
    }
  };

  const getRewardGradient = (type: string) => {
    switch (type) {
      case 'coins': return 'from-yellow-100 to-amber-100 border-yellow-200 dark:from-yellow-900/20 dark:to-amber-900/20 dark:border-yellow-800';
      case 'gems': return 'from-purple-100 to-pink-100 border-purple-200 dark:from-purple-900/20 dark:to-pink-900/20 dark:border-purple-800';
      case 'coin_boost': return 'from-orange-100 to-red-100 border-orange-200 dark:from-orange-900/20 dark:to-red-900/20 dark:border-orange-800';
      case 'gem_boost': return 'from-indigo-100 to-purple-100 border-indigo-200 dark:from-indigo-900/20 dark:to-purple-900/20 dark:border-indigo-800';
      case 'growth_speed':
      case 'growth_boost':
        return 'from-green-100 to-emerald-100 border-green-200 dark:from-green-900/20 dark:to-emerald-900/20 dark:border-green-800';
      default: return 'from-gray-100 to-slate-100 border-gray-200 dark:from-gray-900/20 dark:to-slate-900/20 dark:border-gray-800';
    }
  };

  const getSelectedGradient = (type: string) => {
    switch (type) {
      case 'coins': return 'from-yellow-200 to-amber-200 border-yellow-400 shadow-yellow-400/30 dark:from-yellow-800/40 dark:to-amber-800/40 dark:border-yellow-600';
      case 'gems': return 'from-purple-200 to-pink-200 border-purple-400 shadow-purple-400/30 dark:from-purple-800/40 dark:to-pink-800/40 dark:border-purple-600';
      case 'coin_boost': return 'from-orange-200 to-red-200 border-orange-400 shadow-orange-400/30 dark:from-orange-800/40 dark:to-red-800/40 dark:border-orange-600';
      case 'gem_boost': return 'from-indigo-200 to-purple-200 border-indigo-400 shadow-indigo-400/30 dark:from-indigo-800/40 dark:to-purple-800/40 dark:border-indigo-600';
      case 'growth_speed':
      case 'growth_boost':
        return 'from-green-200 to-emerald-200 border-green-400 shadow-green-400/30 dark:from-green-800/40 dark:to-emerald-800/40 dark:border-green-600';
      default: return 'from-gray-200 to-slate-200 border-gray-400 shadow-gray-400/30 dark:from-gray-800/40 dark:to-slate-800/40 dark:border-gray-600';
    }
  };

  const formatRewardValue = (reward: AdReward) => {
    switch (reward.type) {
      case 'coins':
      case 'gems':
        return `+${Math.floor(reward.amount).toLocaleString()}`;
      case 'coin_boost':
      case 'gem_boost':
        return `×${reward.amount}`;
      case 'growth_speed':
      case 'growth_boost':
        // Afficher la réduction en pourcentage pour plus de clarté
        const reductionPercent = Math.round((1 - (1 / reward.amount)) * 100);
        return `Temps -${reductionPercent}%`;
      default:
        return `+${reward.amount}`;
    }
  };

  const getRewardTypeLabel = (type: string) => {
    switch (type) {
      case 'coins': return 'Pièces';
      case 'gems': return 'Gemmes';
      case 'coin_boost': return 'Boost Pièces';
      case 'gem_boost': return 'Boost Gemmes';
      case 'growth_speed':
      case 'growth_boost':
        return 'Boost Croissance';
      default: return 'Récompense';
    }
  };

  if (loadingRewards) {
    return (
      <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/50 dark:to-slate-900/50 border border-gray-200 dark:border-gray-700 rounded-xl">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-500" />
        <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
          Chargement des récompenses depuis Supabase...
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          Configuration basée sur votre niveau
        </div>
      </div>
    );
  }

  if (availableRewards.length === 0) {
    return (
      <div className="text-center py-8 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800 rounded-xl">
        <div className="text-2xl mb-3">😔</div>
        <div className="text-sm text-red-700 dark:text-red-300 font-medium">
          Aucune récompense disponible
        </div>
        <div className="text-xs text-red-600 dark:text-red-400 mt-1">
          Augmentez votre niveau pour débloquer plus de récompenses
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          Choisissez votre récompense
        </h3>
        <Badge variant="outline" className="text-xs">
          {availableRewards.length} disponible{availableRewards.length > 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="grid gap-3 max-h-64 overflow-y-auto">
        {availableRewards.map((reward, index) => {
          const isSelected = selectedReward?.type === reward.type && selectedReward?.amount === reward.amount;
          const baseGradient = getRewardGradient(reward.type);
          const selectedGradient = getSelectedGradient(reward.type);
          
          return (
            <Card
              key={index}
              className={`p-4 cursor-pointer transition-all duration-300 transform-gpu border-2 hover:shadow-md ${
                isSelected 
                  ? `bg-gradient-to-r ${selectedGradient} scale-[1.02] shadow-lg ring-2 ring-blue-400/50` 
                  : `bg-gradient-to-r ${baseGradient} hover:scale-[1.01]`
              }`}
              onClick={() => onSelectReward(reward)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`text-2xl p-2 rounded-xl transition-all duration-300 ${
                    isSelected 
                      ? 'bg-white/90 shadow-lg scale-110' 
                      : 'bg-white/70 hover:bg-white/80'
                  }`}>
                    {getRewardIcon(reward.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-800 dark:text-gray-200">
                        {getRewardTypeLabel(reward.type)}
                      </span>
                      <Badge 
                        variant="secondary" 
                        className="text-xs font-bold bg-white/80 text-gray-700"
                      >
                        {formatRewardValue(reward)}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {reward.description}
                    </div>
                    {reward.duration && (
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3 text-blue-600" />
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                          {reward.duration} minute{reward.duration > 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                {isSelected && (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-white text-sm font-bold">✓</span>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Info sur la source des données */}
      <div className="text-center">
        <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700">
          <span className="flex items-center justify-center gap-1">
            <span>📊</span>
            Récompenses calculées dynamiquement depuis Supabase
          </span>
        </div>
      </div>
    </div>
  );
}