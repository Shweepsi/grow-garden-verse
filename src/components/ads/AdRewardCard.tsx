import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClaimRewardButton } from './ClaimRewardButton';
import { useUnifiedRewards } from '@/hooks/useUnifiedRewards';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';

export function AdRewardCard() {
  const { rewardState, getStatusMessage } = useUnifiedRewards();
  const { isPremium } = usePremiumStatus();

  const dailyLimitReached = rewardState.dailyCount >= rewardState.maxDaily;

  return (
    <Card className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-orange-200 dark:border-orange-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold text-center bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
          {isPremium ? '👑 Récompenses Premium' : '📺 Récompenses Publicitaires'}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status section */}
        <div className="space-y-3">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span className="text-gray-600">Progression quotidienne</span>
              <span className="text-orange-600">{rewardState.dailyCount}/{rewardState.maxDaily}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div 
                className="h-2.5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.min((rewardState.dailyCount / rewardState.maxDaily) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Status message */}
          <div className="text-center">
            <p className="text-sm text-gray-600 font-medium">
              {getStatusMessage()}
            </p>
          </div>
        </div>

        {/* Action section */}
        <div className="pt-2">
          <div className="space-y-3">
            {/* Bouton unifié */}
            <ClaimRewardButton 
              variant="default"
              className="w-full"
            />

            {/* Helper text */}
            <p className="text-xs text-center text-gray-500 leading-relaxed">
              {dailyLimitReached 
                ? 'Revenez demain pour plus de récompenses !' 
                : isPremium 
                  ? 'Récompenses automatiques sans publicités'
                  : 'Regardez une courte publicité pour obtenir des récompenses'
              }
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}