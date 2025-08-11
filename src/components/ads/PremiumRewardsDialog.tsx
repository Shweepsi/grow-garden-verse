import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PremiumAdAutoReward } from '@/components/ads/PremiumAdAutoReward';
import { AdRewardService } from '@/services/AdRewardService';
import { useAdRewards } from '@/hooks/useAdRewards';
import { Crown } from 'lucide-react';

interface PremiumRewardsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerLevel: number;
}

export const PremiumRewardsDialog: React.FC<PremiumRewardsDialogProps> = ({ open, onOpenChange, playerLevel }) => {
  const [rewards, setRewards] = useState<Array<{ type: string; amount: number; description: string; emoji: string }>>([]);
  const { watchAd, loading } = useAdRewards();

  useEffect(() => {
    let cancelled = false;
    const loadRewards = async () => {
      try {
        const list = await AdRewardService.getAvailableRewards(playerLevel || 1);
        if (!cancelled) {
          setRewards(
            list.map(r => ({
              type: r.type,
              amount: r.amount,
              description: r.description,
              emoji: r.emoji,
            }))
          );
        }
      } catch (e) {
        // Silent fallback: component has defaults
      }
    };

    if (open) loadRewards();
    return () => {
      cancelled = true;
    };
  }, [open, playerLevel]);

  const handleClaim = async (rewardType: string, amount: number) => {
    return watchAd(rewardType, amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Récompenses Premium
          </DialogTitle>
          <DialogDescription>
            Réclamez vos récompenses instantanément — sans publicité.
          </DialogDescription>
        </DialogHeader>
        <PremiumAdAutoReward
          onRewardClaimed={handleClaim}
          loading={loading}
          availableRewards={rewards}
        />
      </DialogContent>
    </Dialog>
  );
};
