import React from 'react';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
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
      case 'coins': return 'from-yellow-100 to-amber-100 border-yellow-200';
      case 'gems': return 'from-purple-100 to-pink-100 border-purple-200';
      case 'coin_boost': return 'from-orange-100 to-red-100 border-orange-200';
      case 'gem_boost': return 'from-indigo-100 to-purple-100 border-indigo-200';
      case 'growth_speed':
      case 'growth_boost':
        return 'from-green-100 to-emerald-100 border-green-200';
      default: return 'from-gray-100 to-slate-100 border-gray-200';
    }
  };

  const getSelectedGradient = (type: string) => {
    switch (type) {
      case 'coins': return 'from-yellow-200 to-amber-200 border-yellow-400 shadow-yellow-400/30';
      case 'gems': return 'from-purple-200 to-pink-200 border-purple-400 shadow-purple-400/30';
      case 'coin_boost': return 'from-orange-200 to-red-200 border-orange-400 shadow-orange-400/30';
      case 'gem_boost': return 'from-indigo-200 to-purple-200 border-indigo-400 shadow-indigo-400/30';
      case 'growth_speed':
      case 'growth_boost':
        return 'from-green-200 to-emerald-200 border-green-400 shadow-green-400/30';
      default: return 'from-gray-200 to-slate-200 border-gray-400 shadow-gray-400/30';
    }
  };

  if (loadingRewards) {
    return (
      <div className="text-center py-8 bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200 rounded-xl">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-gray-500" />
        <div className="text-sm text-gray-600 font-medium">
          Chargement des récompenses...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        Choisissez votre récompense
      </h3>
      <div className="grid gap-3">
        {availableRewards.map((reward, index) => {
          const isSelected = selectedReward?.type === reward.type && selectedReward?.amount === reward.amount;
          const baseGradient = getRewardGradient(reward.type);
          const selectedGradient = getSelectedGradient(reward.type);
          
          return (
            <Card
              key={index}
              className={`p-4 cursor-pointer transition-colors duration-300 border-2 ${
                isSelected 
                  ? `bg-gradient-to-r ${selectedGradient} shadow-lg` 
                  : `bg-gradient-to-r ${baseGradient} hover:brightness-105`
              }`}
              onClick={() => onSelectReward(reward)}
            >
              <div className="flex items-center space-x-3">
                <div className={`text-2xl p-2 rounded-xl ${
                  isSelected 
                    ? 'bg-white/80 shadow-md' 
                    : 'bg-white/60'
                } transition-all duration-300`}>
                  {getRewardIcon(reward.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-800">
                      {reward.description}
                    </span>
                    {isSelected && (
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                  {reward.duration && (
                    <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full mt-1 inline-block">
                      Durée: {reward.duration}min
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}