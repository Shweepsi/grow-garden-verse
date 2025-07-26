import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Coins, Gem, TrendingUp, Star, Zap } from 'lucide-react';
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
      case 'coins': return <Coins className="w-6 h-6 text-amber-500" />;
      case 'gems': return <Gem className="w-6 h-6 text-purple-500" />;
      case 'coin_boost': return <TrendingUp className="w-6 h-6 text-emerald-500" />;
      case 'gem_boost': return <Star className="w-6 h-6 text-blue-500" />;
      case 'growth_boost': return <Zap className="w-6 h-6 text-orange-500" />;
      default: return <Coins className="w-6 h-6 text-muted-foreground" />;
    }
  };

  if (loadingRewards) {
    return (
      <div className="text-center py-6 premium-card rounded-lg">
        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-3 text-orange-400" />
        <div className="text-sm text-white/80">Chargement des récompenses...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-white text-center">Choisissez votre récompense :</h3>
      
      <div className="grid gap-3">
        {availableRewards.map((reward) => (
          <Card 
            key={reward.type}
            className={`cursor-pointer transition-all duration-300 premium-card border-white/30 ${
              selectedReward?.type === reward.type 
                ? 'ring-2 ring-orange-400 bg-orange-400/20 shadow-lg transform scale-105' 
                : 'hover:bg-white/10 hover:scale-102 hover:border-orange-400/50'
            }`}
            onClick={() => onSelectReward(reward)}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center">
                {getRewardIcon(reward.type)}
              </div>
              <div className="flex-1">
                <div className="font-bold text-white text-sm">{reward.description}</div>
                <div className="text-xs text-white/70 mt-1">
                  {reward.emoji}
                </div>
              </div>
              {selectedReward?.type === reward.type && (
                <div className="w-5 h-5 bg-orange-400 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}